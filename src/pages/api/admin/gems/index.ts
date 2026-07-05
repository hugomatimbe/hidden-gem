import type { NextApiRequest, NextApiResponse } from 'next';
import { getDb } from '../../../../lib/db';
import { requireAdmin } from '../../../../lib/auth';

const db = getDb();

const VALID_STATUSES = ['pending', 'approved', 'rejected', 'all'];
const DEFAULT_PAGE_SIZE = 20;

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const admin = requireAdmin(req, db);
  if (!admin) {
    return res.status(403).json({ error: 'Acesso negado.' });
  }

  const statusParam = typeof req.query.status === 'string' ? req.query.status : 'pending';
  const status = VALID_STATUSES.includes(statusParam) ? statusParam : 'pending';

  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';

  const page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(String(req.query.pageSize || DEFAULT_PAGE_SIZE), 10) || DEFAULT_PAGE_SIZE));
  const offset = (page - 1) * pageSize;

  const conditions: string[] = [];
  const params: any[] = [];
  if (status !== 'all') {
    conditions.push('gems.status = ?');
    params.push(status);
  }
  if (q) {
    conditions.push('gems.title LIKE ? COLLATE NOCASE');
    params.push(`%${q}%`);
  }
  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const baseQuery = `
    FROM gems
    LEFT JOIN users ON gems.submittedBy = users.id
    ${whereClause}
  `;

  const total = (db.prepare(`SELECT COUNT(*) as c ${baseQuery}`).get(...params) as { c: number }).c;

  const rows = db
    .prepare(
      `SELECT gems.*, users.displayName as submitterName, users.email as submitterEmail
       ${baseQuery}
       ORDER BY gems.createdAt DESC
       LIMIT ? OFFSET ?`
    )
    .all(...params, pageSize, offset);

  const gems = rows.map((row: any) => {
    const { lat, lng, address, ...rest } = row;
    return {
      ...rest,
      location: {
        lat: Number(lat),
        lng: Number(lng),
        address: address || null,
      },
      tags: JSON.parse(row.tags),
      images: row.images ? JSON.parse(row.images) : [],
      isAnonymous: !!row.isAnonymous,
    };
  });

  res.status(200).json({ items: gems, total, page, pageSize });
}
