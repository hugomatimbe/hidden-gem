import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { getDb } from '../../../lib/db';
import { getSessionUser } from '../../../lib/auth';

const db = getDb();

const patchSchema = z.object({
  displayName: z.string().min(1, 'Nome é obrigatório').max(60, 'Nome deve ter no máximo 60 caracteres').optional(),
  avatarUrl: z.string().nullable().optional(),
});

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = getSessionUser(req, db);
  if (!user) {
    return res.status(401).json({ error: 'É preciso entrar na sua conta.' });
  }

  if (req.method === 'GET') {
    return res.status(200).json(user);
  }

  if (req.method === 'PATCH') {
    try {
      const data = patchSchema.parse(req.body);

      if (typeof data.displayName === 'string') {
        db.prepare('UPDATE users SET displayName = ? WHERE id = ?').run(data.displayName.trim(), user.id);
      }
      if (data.avatarUrl !== undefined) {
        db.prepare('UPDATE users SET avatarUrl = ? WHERE id = ?').run(data.avatarUrl, user.id);
      }

      const updated = getSessionUser(req, db);
      return res.status(200).json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const firstIssue = error.issues[0];
        return res.status(400).json({ error: firstIssue?.message || 'Dados inválidos' });
      }
      console.error('Error updating profile:', error);
      return res.status(500).json({ error: 'Erro ao atualizar o perfil. Tente novamente.' });
    }
  }

  res.setHeader('Allow', ['GET', 'PATCH']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
