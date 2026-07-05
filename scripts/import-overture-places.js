#!/usr/bin/env node
/**
 * Imports a Maputo-area slice of the Overture Maps Foundation's free,
 * open "Places" dataset (https://overturemaps.org) into the app's local
 * SQLite database, so the add-gem location search can find businesses
 * that OpenStreetMap/Nominatim doesn't have mapped yet.
 *
 * This is a one-time (or periodically re-run) bulk import, not a live API
 * call — Overture publishes new releases roughly monthly, so the local
 * data will drift out of date over time. Re-run this script every so
 * often (e.g. `npm run import:places`) to refresh it. Each run fully
 * replaces the previous Overture-sourced rows, so it's safe to re-run.
 *
 * Requires the `duckdb` package (devDependency — only needed to run this
 * script, not at app runtime) and network access to Overture's
 * S3-hosted data. Takes a minute or two depending on connection speed.
 *
 * Usage:
 *   npm run import:places
 *   npm run import:places -- --min-confidence=0.3
 */

const path = require('path');
const fs = require('fs');
const duckdb = require('duckdb');
const Database = require('better-sqlite3');

// Bump this periodically — see https://docs.overturemaps.org/release-calendar
// for the current release. Using a pinned version (rather than querying
// Overture's STAC "latest" catalog) keeps this script simple and its
// output reproducible.
const OVERTURE_RELEASE = '2026-06-17.0';

// Same bounding box used for the live Nominatim search bias in
// LocationPicker.tsx — greater Maputo, not just the city center.
const BBOX = { minLng: 32.35, maxLng: 32.75, minLat: -26.10, maxLat: -25.75 };

const args = process.argv.slice(2);
const minConfidenceArg = args.find((a) => a.startsWith('--min-confidence='));
const MIN_CONFIDENCE = minConfidenceArg ? parseFloat(minConfidenceArg.split('=')[1]) : 0.4;

function runDuckDb(connection, sql) {
  return new Promise((resolve, reject) => {
    connection.all(sql, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

async function fetchOverturePlaces() {
  const db = new duckdb.Database(':memory:');
  const connection = db.connect();

  console.log('Setting up DuckDB spatial + httpfs extensions...');
  await runDuckDb(connection, 'INSTALL spatial; LOAD spatial;');
  await runDuckDb(connection, 'INSTALL httpfs; LOAD httpfs;');
  await runDuckDb(connection, "SET s3_region='us-west-2';");

  console.log(`Querying Overture release ${OVERTURE_RELEASE} for the Maputo bounding box (this can take a minute)...`);
  const rows = await runDuckDb(
    connection,
    `
    SELECT
      id,
      names.primary AS name,
      categories.primary AS category,
      ST_X(geometry) AS lng,
      ST_Y(geometry) AS lat,
      addresses[1].freeform AS address,
      confidence
    FROM read_parquet(
      's3://overturemaps-us-west-2/release/${OVERTURE_RELEASE}/theme=places/type=place/*',
      filename=true, hive_partitioning=1
    )
    WHERE bbox.xmin BETWEEN ${BBOX.minLng} AND ${BBOX.maxLng}
      AND bbox.ymin BETWEEN ${BBOX.minLat} AND ${BBOX.maxLat}
      AND names.primary IS NOT NULL
      AND (confidence IS NULL OR confidence >= ${MIN_CONFIDENCE})
    `
  );

  return rows;
}

function importIntoAppDb(rows) {
  // Mirrors lib/db.ts's STORAGE_DIR handling, so running this script against
  // a deployed instance (e.g. `railway run node scripts/import-overture-places.js`)
  // writes into the same db file the running app actually reads from.
  const dataDir = process.env.STORAGE_DIR ? path.join(process.env.STORAGE_DIR, 'data') : path.resolve('./data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  const db = new Database(path.join(dataDir, 'gems.db'));
  db.pragma('journal_mode = WAL');

  // Self-sufficient: create the table here too, in case this script runs
  // before the Next.js app has ever started (src/lib/db.ts creates the
  // same table with the same definition).
  db.prepare(
    `
    CREATE TABLE IF NOT EXISTS place_seeds (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      address TEXT,
      source TEXT NOT NULL DEFAULT 'overture',
      importedAt TEXT NOT NULL
    )
  `
  ).run();
  db.prepare(`CREATE INDEX IF NOT EXISTS idx_place_seeds_name ON place_seeds(name)`).run();

  const importedAt = new Date().toISOString();
  const insert = db.prepare(
    `INSERT OR REPLACE INTO place_seeds (id, name, category, lat, lng, address, source, importedAt)
     VALUES (@id, @name, @category, @lat, @lng, @address, 'overture', @importedAt)`
  );

  const importBatch = db.transaction((batch) => {
    db.prepare(`DELETE FROM place_seeds WHERE source = 'overture'`).run();
    for (const row of batch) {
      if (typeof row.lat !== 'number' || typeof row.lng !== 'number' || !row.name) continue;
      insert.run({
        id: `overture:${row.id}`,
        name: row.name,
        category: row.category || null,
        lat: row.lat,
        lng: row.lng,
        address: row.address || null,
        importedAt,
      });
    }
  });

  importBatch(rows);
  db.close();
}

async function main() {
  const rows = await fetchOverturePlaces();
  console.log(`Fetched ${rows.length} places from Overture. Importing into data/gems.db...`);
  importIntoAppDb(rows);
  console.log(`Done — place_seeds table now has ${rows.length} Overture-sourced rows.`);
}

main().catch((err) => {
  console.error('Import failed:', err);
  process.exit(1);
});
