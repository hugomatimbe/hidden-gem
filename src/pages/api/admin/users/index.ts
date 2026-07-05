import type { NextApiRequest, NextApiResponse } from 'next';
import { getDb } from '../../../../lib/db';
import { requireAdmin } from '../../../../lib/auth';

const db = getDb();

const DEFAULT_PAGE_SIZE = 20;

const SORT_COLUMNS: Record<string, string> = {
  name: 'users.displayName',
  email: 'users.email',
  createdAt: 'users.createdAt',
  gemCount: 'gemCount',
};

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const admin = requireAdmin(req, db);
  if (!admin) {
    return res.status(403).json({ error: 'Acesso negado.' });
  }

  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  const sortKey = typeof req.query.sort === 'string' && SORT_COLUMNS[req.query.sort] ? req.query.sort : 'createdAt';
  const dir = req.query.dir === 'asc' ? 'ASC' : 'DESC';

  const page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(String(req.query.pageSize || DEFAULT_PAGE_SIZE), 10) || DEFAULT_PAGE_SIZE));
  const offset = (page - 1) * pageSize;

  const whereClause = q ? 'WHERE users.displayName LIKE ? COLLATE NOCASE OR users.email LIKE ? COLLATE NOCASE' : '';
  const whereParams = q ? [`%${q}%`, `%${q}%`] : [];

  const total = (
    db.prepare(`SELECT COUNT(*) as c FROM users ${whereClause}`).get(...whereParams) as { c: number }
  ).c;

  const rows = db
    .prepare(
      `SELECT
        users.id, users.email, users.displayName, users.createdAt, users.isAdmin, users.isBanned,
        (SELECT COUNT(*) FROM gems WHERE gems.submittedBy = users.id) as gemCount
      FROM users
      ${whereClause}
      ORDER BY ${SORT_COLUMNS[sortKey]} ${dir}
      LIMIT ? OFFSET ?`
    )
    .all(...whereParams, pageSize, offset);

  const users = rows.map((row: any) => ({
    ...row,
    isAdmin: !!row.isAdmin,
    isBanned: !!row.isBanned,
  }));

  res.status(200).json({ items: users, total, page, pageSize });
}
