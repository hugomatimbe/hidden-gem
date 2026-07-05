import type { NextApiRequest, NextApiResponse } from 'next';
import { getDb } from '../../lib/db';
import { parseGemRow } from '../../lib/gems';

// Site-wide search over approved gems — matches title, description, or tags
// (tags are stored as a JSON array string, so a plain LIKE against the raw
// column is a loose but effective match for single-word tags like "#cafe").
// Also backs the header's live-suggestions dropdown (see SearchBox.tsx),
// which passes a small `limit` for fast incremental typing.
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  if (q.length < 2) {
    return res.status(200).json([]);
  }

  const rawLimit = typeof req.query.limit === 'string' ? parseInt(req.query.limit, 10) : 30;
  const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 50) : 30;

  const db = getDb();
  const contains = `%${q}%`;
  const startsWith = `${q}%`;
  const wholeWord = `% ${q}%`;

  const rows = db
    .prepare(
      `SELECT * FROM gems
       WHERE status = 'approved'
         AND (title LIKE ? COLLATE NOCASE OR description LIKE ? COLLATE NOCASE OR tags LIKE ? COLLATE NOCASE)
       ORDER BY
         CASE
           WHEN title LIKE ? COLLATE NOCASE THEN 0
           WHEN title LIKE ? COLLATE NOCASE THEN 1
           WHEN title LIKE ? COLLATE NOCASE THEN 2
           ELSE 3
         END,
         createdAt DESC
       LIMIT ?`
    )
    .all(contains, contains, contains, startsWith, wholeWord, contains, limit) as any[];

  res.status(200).json(rows.map(parseGemRow));
}
