import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { getDb } from '../../../lib/db';
import { getSessionUser } from '../../../lib/auth';

const db = getDb();

const gemIdSchema = z.object({
  gemId: z.string().min(1, 'gemId em falta'),
});

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = getSessionUser(req, db);
  if (!user) {
    return res.status(401).json({ error: 'É preciso entrar na sua conta.' });
  }

  if (req.method === 'GET') {
    const rows = db
      .prepare(
        `SELECT gems.* FROM saved_gems
         JOIN gems ON gems.id = saved_gems.gemId
         WHERE saved_gems.userId = ?
         ORDER BY saved_gems.createdAt DESC`
      )
      .all(user.id);

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

    return res.status(200).json(gems);
  }

  if (req.method === 'POST') {
    try {
      const { gemId } = gemIdSchema.parse(req.body);
      const gem = db.prepare('SELECT id FROM gems WHERE id = ?').get(gemId);
      if (!gem) {
        return res.status(404).json({ error: 'Lugar não encontrado.' });
      }
      db.prepare('INSERT OR IGNORE INTO saved_gems (userId, gemId, createdAt) VALUES (?, ?, ?)').run(
        user.id,
        gemId,
        new Date().toISOString()
      );
      return res.status(200).json({ message: 'Guardado.' });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Dados inválidos' });
      }
      console.error('Error saving gem:', error);
      return res.status(500).json({ error: 'Erro ao guardar. Tente novamente.' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const { gemId } = gemIdSchema.parse(req.body);
      db.prepare('DELETE FROM saved_gems WHERE userId = ? AND gemId = ?').run(user.id, gemId);
      return res.status(200).json({ message: 'Removido.' });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Dados inválidos' });
      }
      console.error('Error unsaving gem:', error);
      return res.status(500).json({ error: 'Erro ao remover. Tente novamente.' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
