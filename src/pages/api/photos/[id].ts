import type { NextApiRequest, NextApiResponse } from 'next';
import { getDb } from '../../../lib/db';
import { getSessionUser } from '../../../lib/auth';

const db = getDb();

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'DELETE') {
    res.setHeader('Allow', ['DELETE']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const user = getSessionUser(req, db);
  if (!user) {
    return res.status(401).json({ error: 'É preciso entrar na sua conta.' });
  }

  const id = req.query.id as string;
  const photo = db.prepare('SELECT id, userId FROM gem_photos WHERE id = ?').get(id) as
    | { id: string; userId: string }
    | undefined;

  if (!photo) {
    return res.status(404).json({ error: 'Foto não encontrada.' });
  }

  // A photo can be removed by whoever posted it, or by an admin — same
  // ownership-or-admin pattern as everywhere else moderation happens.
  if (photo.userId !== user.id && !user.isAdmin) {
    return res.status(403).json({ error: 'Não tem permissão para remover esta foto.' });
  }

  db.prepare('DELETE FROM gem_photos WHERE id = ?').run(id);
  res.status(200).json({ message: 'Foto removida.' });
}
