import type { NextApiRequest, NextApiResponse } from 'next';
import { getDb } from '../../../lib/db';

const db = getDb();

interface PlaceSeedResult {
  id: string;
  name: string;
  category: string | null;
  lat: number;
  lng: number;
  address: string | null;
}

// Searches the locally-imported Overture Places slice (see
// scripts/import-overture-places.js) — instant, no network round-trip,
// and covers businesses that live OSM/Nominatim search doesn't have
// mapped yet. Meant to be queried alongside, not instead of, Nominatim.
export default function handler(req: NextApiRequest, res: NextApiResponse<PlaceSeedResult[] | { error: string }>) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  if (q.length < 3) {
    return res.status(200).json([]);
  }

  try {
    // Prefix matches ("costa" -> "Costa do Sol") rank above places that
    // merely contain the term elsewhere in the name.
    const rows = db
      .prepare(
        `SELECT id, name, category, lat, lng, address
         FROM place_seeds
         WHERE name LIKE @contains COLLATE NOCASE
         ORDER BY
           CASE WHEN name LIKE @prefix COLLATE NOCASE THEN 0 ELSE 1 END,
           length(name) ASC
         LIMIT 6`
      )
      .all({ contains: `%${q}%`, prefix: `${q}%` }) as PlaceSeedResult[];

    return res.status(200).json(rows);
  } catch (error) {
    console.error('Error searching place_seeds:', error);
    return res.status(500).json({ error: 'Erro ao pesquisar locais.' });
  }
}
