import type { NextApiRequest, NextApiResponse } from 'next';
import { getDb } from '../../../lib/db';

const db = getDb();

const DEFAULT_LIMIT = 24;
const MAX_LIMIT = 60;

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const limitParam = parseInt(String(req.query.limit || ''), 10);
  const offsetParam = parseInt(String(req.query.offset || ''), 10);
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), MAX_LIMIT) : DEFAULT_LIMIT;
  const offset = Number.isFinite(offsetParam) && offsetParam > 0 ? offsetParam : 0;

  // Only photos on approved gems are shown site-wide — a pending/rejected
  // gem's page 404s publicly, so its photos shouldn't leak through the feed
  // or homepage teaser either.
  const rows = db
    .prepare(
      `SELECT gem_photos.*, users.displayName as posterName, users.avatarUrl as posterAvatar,
        gems.title as gemTitle
       FROM gem_photos
       JOIN gems ON gems.id = gem_photos.gemId AND gems.status = 'approved'
       LEFT JOIN users ON users.id = gem_photos.userId
       ORDER BY gem_photos.createdAt DESC
       LIMIT ? OFFSET ?`
    )
    .all(limit + 1, offset);

  const hasMore = rows.length > limit;
  const photos = hasMore ? rows.slice(0, limit) : rows;

  res.status(200).json({ photos, hasMore });
}
