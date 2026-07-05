import type { NextApiRequest, NextApiResponse } from 'next';
import { getDb } from '../../../../lib/db';
import { requireAdmin } from '../../../../lib/auth';

const db = getDb();

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'DELETE') {
    res.setHeader('Allow', ['DELETE']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const admin = requireAdmin(req, db);
  if (!admin) {
    return res.status(403).json({ error: 'Acesso negado.' });
  }

  const id = req.query.id as string;

  try {
    const result = db.prepare('DELETE FROM comments WHERE id = ?').run(id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Comentário não encontrado.' });
    }
    res.status(200).json({ message: 'Comentário removido' });
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({ error: 'Erro ao remover o comentário.' });
  }
}
