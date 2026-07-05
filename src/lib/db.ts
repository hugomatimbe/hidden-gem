import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

declare global {
  // eslint-disable-next-line no-var
  var __hiddenGemDb: any;
}

function createConnection() {
  // Local dev (and any deploy with a plain persistent disk mounted at the
  // project root) just uses ./data, same as always. On a host where the
  // persistent volume is mounted somewhere else (e.g. Railway, where a
  // service only gets one mount path), set STORAGE_DIR to that path and the
  // db file — and, via scripts/prepare-storage.js, the uploads folder — live
  // under it instead. Nothing changes for anyone who doesn't set it.
  const dataDir = process.env.STORAGE_DIR ? path.join(process.env.STORAGE_DIR, 'data') : path.resolve('./data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const dbPath = path.join(dataDir, 'gems.db');
  const db = new Database(dbPath);

  // WAL evita "database is locked" quando várias rotas da API acessam o
  // mesmo ficheiro ao mesmo tempo (comum no Windows com next dev + HMR).
  db.pragma('journal_mode = WAL');

  db.prepare(`
    CREATE TABLE IF NOT EXISTS gems (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL,
      tags TEXT NOT NULL,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      address TEXT,
      images TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      submittedBy TEXT,
      isAnonymous INTEGER,
      openingHours TEXT,
      priceRange TEXT,
      wheelchairAccessible INTEGER,
      familyFriendly INTEGER,
      petFriendly INTEGER,
      safetyNotes TEXT,
      bestTimeToVisit TEXT,
      contact TEXT
    )
  `).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS votes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      gemId TEXT NOT NULL,
      voterId TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('up', 'down')),
      createdAt TEXT NOT NULL,
      UNIQUE(gemId, voterId)
    )
  `).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY,
      gemId TEXT NOT NULL,
      author TEXT NOT NULL,
      content TEXT NOT NULL,
      createdAt TEXT NOT NULL
    )
  `).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      passwordHash TEXT NOT NULL,
      salt TEXT NOT NULL,
      displayName TEXT NOT NULL,
      createdAt TEXT NOT NULL
    )
  `).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      expiresAt TEXT NOT NULL
    )
  `).run();

  // Single-use tokens for password reset and email verification links. Both
  // share a shape (token -> user, with an expiry), so one table covers both
  // via a `purpose` column rather than duplicating the table twice.
  db.prepare(`
    CREATE TABLE IF NOT EXISTS auth_tokens (
      token TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      purpose TEXT NOT NULL CHECK(purpose IN ('password_reset', 'email_verify')),
      createdAt TEXT NOT NULL,
      expiresAt TEXT NOT NULL
    )
  `).run();

  // Per-account bookmarks, replacing the old client-only "saved gems" state
  // (which lived only in React memory and was lost on every refresh).
  db.prepare(`
    CREATE TABLE IF NOT EXISTS saved_gems (
      userId TEXT NOT NULL,
      gemId TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      PRIMARY KEY (userId, gemId)
    )
  `).run();

  // Visitor-submitted photos of a gem — separate from the gem's own listing
  // photos (gems.images, set by whoever originally submitted the place).
  // Not nested under comments so someone can share a photo without also
  // having to write text, and so a site-wide feed is a simple flat query.
  db.prepare(`
    CREATE TABLE IF NOT EXISTS gem_photos (
      id TEXT PRIMARY KEY,
      gemId TEXT NOT NULL,
      userId TEXT NOT NULL,
      imageUrl TEXT NOT NULL,
      caption TEXT,
      createdAt TEXT NOT NULL
    )
  `).run();

  // A local, bulk-imported slice of Overture Maps' free "Places" dataset
  // (see scripts/import-overture-places.js), scoped to the Maputo area.
  // Lets the add-gem search box find businesses that live-Nominatim/OSM
  // doesn't have mapped yet, without any per-request API calls. This is a
  // snapshot, not a live feed — re-run the import script periodically to
  // pick up newer places.
  db.prepare(`
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
  `).run();
  db.prepare(`CREATE INDEX IF NOT EXISTS idx_place_seeds_name ON place_seeds(name)`).run();

  // User-submitted reports/flags. targetType is a generic discriminator
  // (only 'gem' is wired up in the UI today, via the gem detail page's
  // Report button) so comments/photos can reuse the same table later
  // without a schema change. reporterId is nullable at the schema level
  // for that same forward-compat reason, even though the current API
  // route requires login before accepting a report.
  db.prepare(`
    CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY,
      targetType TEXT NOT NULL DEFAULT 'gem',
      targetId TEXT NOT NULL,
      reporterId TEXT,
      reason TEXT NOT NULL,
      details TEXT,
      status TEXT NOT NULL DEFAULT 'open',
      createdAt TEXT NOT NULL
    )
  `).run();
  db.prepare(`CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status)`).run();

  // Admin-curated collections of gems (e.g. "Hidden Cafes of Maputo"),
  // replacing the old /lists page's hardcoded fake data. Only admins can
  // create/edit lists — see /api/admin/lists — matching the "curated" (not
  // user-generated) shape the feature was asked for.
  db.prepare(`
    CREATE TABLE IF NOT EXISTS lists (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      description TEXT,
      coverImage TEXT,
      isPublished INTEGER NOT NULL DEFAULT 1,
      createdBy TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    )
  `).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS list_items (
      listId TEXT NOT NULL,
      gemId TEXT NOT NULL,
      position INTEGER NOT NULL DEFAULT 0,
      note TEXT,
      PRIMARY KEY (listId, gemId)
    )
  `).run();
  db.prepare(`CREATE INDEX IF NOT EXISTS idx_list_items_list ON list_items(listId)`).run();

  // Audit trail for moderation-relevant admin actions (gem approve/reject/
  // delete, user ban/admin toggles, report resolve/dismiss). targetType +
  // targetId are a generic pair (like reports.targetType) so the same table
  // can log actions against gems, users, or reports without three separate
  // tables. details holds a short free-text note (e.g. the rejection reason)
  // for context when reviewing the log later.
  db.prepare(`
    CREATE TABLE IF NOT EXISTS admin_actions (
      id TEXT PRIMARY KEY,
      adminId TEXT NOT NULL,
      action TEXT NOT NULL,
      targetType TEXT NOT NULL,
      targetId TEXT NOT NULL,
      details TEXT,
      createdAt TEXT NOT NULL
    )
  `).run();
  db.prepare(`CREATE INDEX IF NOT EXISTS idx_admin_actions_created ON admin_actions(createdAt)`).run();

  // Lightweight migrations: better-sqlite3's CREATE TABLE IF NOT EXISTS above
  // won't add columns to a table that already exists from an earlier version
  // of the schema, so new columns are added by hand here, guarded by a
  // PRAGMA table_info check. Returns true the first time a column is added
  // (i.e. this is an existing db being migrated), so callers can backfill.
  function ensureColumn(table: string, column: string, definition: string): boolean {
    const columns = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
    const exists = columns.some((c) => c.name === column);
    if (!exists) {
      db.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`).run();
    }
    return !exists;
  }

  const statusJustAdded = ensureColumn('gems', 'status', "TEXT NOT NULL DEFAULT 'pending'");
  if (statusJustAdded) {
    // Gems inserted before moderation existed were effectively already public
    // — treat them as approved rather than having them vanish from the site.
    db.prepare("UPDATE gems SET status = 'approved'").run();
  }
  ensureColumn('gems', 'rejectionReason', 'TEXT');
  ensureColumn('users', 'isAdmin', 'INTEGER NOT NULL DEFAULT 0');
  ensureColumn('users', 'isBanned', 'INTEGER NOT NULL DEFAULT 0');

  const emailVerifiedJustAdded = ensureColumn('users', 'emailVerified', 'INTEGER NOT NULL DEFAULT 0');
  if (emailVerifiedJustAdded) {
    // Accounts created before verification existed never got a verification
    // email to click — treat them as already verified instead of nagging
    // people who've been using the site for a while.
    db.prepare('UPDATE users SET emailVerified = 1').run();
  }
  ensureColumn('users', 'avatarUrl', 'TEXT');

  // Comments used to be fully anonymous (free-text author name, no session
  // check). Now that posting requires login, new comments always carry a
  // userId — old anonymous comments just keep userId = NULL and their
  // original free-text author name.
  ensureColumn('comments', 'userId', 'TEXT');

  // Restaurant menu photos — the Add Gem form has always had an upload
  // field for these (shown only for the "restaurant" category), but the
  // column to actually store them was never added, so every menu photo
  // anyone uploaded was silently dropped before it reached the database.
  ensureColumn('gems', 'menuImages', 'TEXT');

  return db;
}

// Reaproveita uma única conexão entre recarregamentos do Next.js em modo dev
// (HMR recompila cada rota da API isoladamente; sem isto, cada recarregamento
// abriria mais uma conexão persistente com o mesmo ficheiro SQLite).
export function getDb() {
  if (!global.__hiddenGemDb) {
    global.__hiddenGemDb = createConnection();
  }
  return global.__hiddenGemDb;
}
