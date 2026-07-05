import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { getDb } from '../../../../lib/db';
import { requireAdmin } from '../../../../lib/auth';
import { logAdminAction } from '../../../../lib/adminLog';

const db = getDb();

const patchSchema = z.object({
  isAdmin: z.boolean().optional(),
  isBanned: z.boolean().optional(),
});

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

  try {
    const data = patchSchema.parse(req.body);

    if (id === admin.id) {
      if (data.isAdmin === false) {
        return res.status(400).json({ error: 'Não pode remover o seu próprio acesso de admin.' });
      }
      if (data.isBanned === true) {
        return res.status(400).json({ error: 'Não pode desativar a sua própria conta.' });
      }
    }

    const target = db.prepare('SELECT id, displayName, email FROM users WHERE id = ?').get(id) as
      | { id: string; displayName: string; email: string }
      | undefined;
    if (!target) {
      return res.status(404).json({ error: 'Utilizador não encontrado.' });
    }

    if (typeof data.isAdmin === 'boolean') {
      db.prepare('UPDATE users SET isAdmin = ? WHERE id = ?').run(data.isAdmin ? 1 : 0, id);
      logAdminAction(
        db,
        admin.id,
        data.isAdmin ? 'user_make_admin' : 'user_remove_admin',
        'user',
        id,
        `${target.displayName} (${target.email})`
      );
    }
    if (typeof data.isBanned === 'boolean') {
      db.prepare('UPDATE users SET isBanned = ? WHERE id = ?').run(data.isBanned ? 1 : 0, id);
      logAdminAction(
        db,
        admin.id,
        data.isBanned ? 'user_ban' : 'user_unban',
        'user',
        id,
        `${target.displayName} (${target.email})`
      );
      // Banning someone should end their active sessions immediately rather
      // than waiting for their session to naturally expire or be checked.
      if (data.isBanned) {
        db.prepare('DELETE FROM sessions WHERE userId = ?').run(id);
      }
    }

    res.status(200).json({ message: 'Utilizador atualizado' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Dados inválidos' });
    } else {
      console.error('Error updating user:', error);
      res.status(500).json({ error: 'Erro ao atualizar o utilizador.' });
    }
  }
}
