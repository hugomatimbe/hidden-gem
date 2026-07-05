import type { NextApiRequest, NextApiResponse } from 'next';
import { getDb } from '../../../../lib/db';
import { requireAdmin } from '../../../../lib/auth';

const db = getDb();

const VALID_STATUSES = ['open', 'resolved', 'dismissed', 'all'];
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

  const statusParam = typeof req.query.status === 'string' ? req.query.status : 'open';
  const status = VALID_STATUSES.includes(statusParam) ? statusParam : 'open';

  const page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(String(req.query.pageSize || DEFAULT_PAGE_SIZE), 10) || DEFAULT_PAGE_SIZE));
  const offset = (page - 1) * pageSize;

  const whereClause = status === 'all' ? '' : 'WHERE reports.status = ?';
  const whereParams = status === 'all' ? [] : [status];

  const baseQuery = `
    FROM reports
    LEFT JOIN gems ON reports.targetId = gems.id AND reports.targetType = 'gem'
    LEFT JOIN users ON reports.reporterId = users.id
    ${whereClause}
  `;

  const total = (db.prepare(`SELECT COUNT(*) as c ${baseQuery}`).get(...whereParams) as { c: number }).c;

  const rows = db
    .prepare(
      `SELECT reports.*, gems.title as gemTitle, users.displayName as reporterName
       ${baseQuery}
       ORDER BY reports.createdAt DESC
       LIMIT ? OFFSET ?`
    )
    .all(...whereParams, pageSize, offset);

  res.status(200).json({ items: rows, total, page, pageSize });
}
