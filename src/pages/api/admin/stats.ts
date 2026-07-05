import type { NextApiRequest, NextApiResponse } from 'next';
import { getDb } from '../../../lib/db';
import { requireAdmin } from '../../../lib/auth';

const db = getDb();

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const admin = requireAdmin(req, db);
  if (!admin) {
    return res.status(403).json({ error: 'Acesso negado.' });
  }

  const gemCounts = db
    .prepare(
      `SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected
      FROM gems`
    )
    .get() as { total: number; pending: number; approved: number; rejected: number };

  const totalUsers = (db.prepare('SELECT COUNT(*) as c FROM users').get() as { c: number }).c;
  const totalComments = (db.prepare('SELECT COUNT(*) as c FROM comments').get() as { c: number }).c;
  const totalVotes = (db.prepare('SELECT COUNT(*) as c FROM votes').get() as { c: number }).c;
  const openReports = (
    db.prepare("SELECT COUNT(*) as c FROM reports WHERE status = 'open'").get() as { c: number }
  ).c;

  const recentPendingGems = db
    .prepare("SELECT id, title, createdAt FROM gems WHERE status = 'pending' ORDER BY createdAt DESC LIMIT 5")
    .all();

  const recentUsers = db
    .prepare('SELECT id, displayName, email, createdAt FROM users ORDER BY createdAt DESC LIMIT 5')
    .all();

  const recentOpenReports = db
    .prepare(
      `SELECT reports.id, reports.reason, reports.targetId, gems.title as gemTitle
       FROM reports
       LEFT JOIN gems ON reports.targetId = gems.id AND reports.targetType = 'gem'
       WHERE reports.status = 'open'
       ORDER BY reports.createdAt DESC
       LIMIT 5`
    )
    .all();

  res.status(200).json({
    gems: {
      total: gemCounts.total || 0,
      pending: gemCounts.pending || 0,
      approved: gemCounts.approved || 0,
      rejected: gemCounts.rejected || 0,
    },
    totalUsers,
    totalComments,
    totalVotes,
    openReports,
    recentPendingGems,
    recentUsers,
    recentOpenReports,
  });
}
