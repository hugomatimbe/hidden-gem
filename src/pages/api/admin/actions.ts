import type { NextApiRequest, NextApiResponse } from 'next';
import { getDb } from '../../../lib/db';
import { requireAdmin } from '../../../lib/auth';

const db = getDb();

const DEFAULT_PAGE_SIZE = 25;

// Read-only view over the admin_actions audit trail (see lib/adminLog.ts
// for what writes to it: gem moderation/delete, user ban/admin toggles,
// report resolve/dismiss).
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const admin = requireAdmin(req, db);
  if (!admin) {
    return res.status(403).json({ error: 'Acesso negado.' });
  }

  const page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(String(req.query.pageSize || DEFAULT_PAGE_SIZE), 10) || DEFAULT_PAGE_SIZE));
  const offset = (page - 1) * pageSize;

  const total = (db.prepare('SELECT COUNT(*) as c FROM admin_actions').get() as { c: number }).c;

  const rows = db
    .prepare(
      `SELECT admin_actions.*, users.displayName as adminName
       FROM admin_actions
       LEFT JOIN users ON admin_actions.adminId = users.id
       ORDER BY admin_actions.createdAt DESC
       LIMIT ? OFFSET ?`
    )
    .all(pageSize, offset);

  res.status(200).json({ items: rows, total, page, pageSize });
}
