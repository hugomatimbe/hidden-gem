import type { NextApiRequest, NextApiResponse } from 'next';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import { getDb } from '../../../../lib/db';
import { getSessionUser } from '../../../../lib/auth';

const db = getDb();

const photoSchema = z.object({
  imageUrl: z.string().min(1, 'imageUrl em falta'),
  caption: z.string().trim().max(200).optional(),
});

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const gemId = req.query.id;
  if (typeof gemId !== 'string' || !gemId) {
    return res.status(400).json({ error: 'Missing gem id' });
  }

  if (req.method === 'GET') {
    const rows = db
      .prepare(
        `SELECT gem_photos.*, users.displayName as posterName, users.avatarUrl as posterAvatar
         FROM gem_photos
         LEFT JOIN users ON users.id = gem_photos.userId
         WHERE gem_photos.gemId = ?
         ORDER BY gem_photos.createdAt DESC`
      )
      .all(gemId);
    return res.status(200).json(rows);
  }

  if (req.method === 'POST') {
    const sessionUser = getSessionUser(req, db);
    if (!sessionUser) {
      return res.status(401).json({ error: 'É preciso entrar na sua conta para partilhar uma foto.' });
    }

    const gem = db.prepare('SELECT id FROM gems WHERE id = ?').get(gemId);
    if (!gem) {
      return res.status(404).json({ error: 'Lugar não encontrado.' });
    }

    try {
      const data = photoSchema.parse(req.body);
      const photo = {
        id: randomUUID(),
        gemId,
        userId: sessionUser.id,
        imageUrl: data.imageUrl,
        caption: data.caption || null,
        createdAt: new Date().toISOString(),
      };

      db.prepare(
        `INSERT INTO gem_photos (id, gemId, userId, imageUrl, caption, createdAt)
         VALUES (@id, @gemId, @userId, @imageUrl, @caption, @createdAt)`
      ).run(photo);

      return res.status(201).json({
        ...photo,
        posterName: sessionUser.displayName,
        posterAvatar: sessionUser.avatarUrl,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Dados inválidos' });
      }
      console.error('Error saving photo:', error);
      return res.status(500).json({ error: 'Erro ao guardar a foto. Tente novamente.' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
