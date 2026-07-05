import type { NextApiRequest, NextApiResponse } from 'next';
import { getDb } from '../../../../lib/db';
import { requireAdmin } from '../../../../lib/auth';
import { logAdminAction } from '../../../../lib/adminLog';

const db = getDb();

const VALID_STATUSES = ['open', 'resolved', 'dismissed'];

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PATCH') {
    res.setHeader('Allow', ['PATCH']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const admin = requireAdmin(req, db);
  if (!admin) {
    return res.status(403).json({ error: 'Acesso negado.' });
  }

  const id = req.query.id as string;
  const status = req.body?.status;

  if (!VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: 'Status inválido.' });
  }

  try {
    const existing = db.prepare('SELECT targetType, targetId, reason FROM reports WHERE id = ?').get(id) as
      | { targetType: string; targetId: string; reason: string }
      | undefined;

    const result = db.prepare('UPDATE reports SET status = ? WHERE id = ?').run(status, id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Denúncia não encontrada.' });
    }

    if (existing) {
      logAdminAction(
        db,
        admin.id,
        status === 'resolved' ? 'report_resolve' : 'report_dismiss',
        existing.targetType,
        existing.targetId,
        existing.reason
      );
    }

    res.status(200).json({ message: 'Report updated' });
  } catch (error) {
    console.error('Error updating report:', error);
    res.status(500).json({ error: 'Erro ao atualizar a denúncia.' });
  }
}
