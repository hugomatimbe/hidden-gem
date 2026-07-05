import type { NextApiRequest, NextApiResponse } from 'next';
import { getDb } from '../../../../lib/db';
import { requireAdmin } from '../../../../lib/auth';

const db = getDb();

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const admin = requireAdmin(req, db);
  if (!admin) {
    return res.status(403).json({ error: 'Acesso negado.' });
  }

  const id = req.query.id as string;
  const existing = db.prepare('SELECT * FROM lists WHERE id = ?').get(id) as any;

  if (req.method === 'GET') {
    if (!existing) {
      return res.status(404).json({ error: 'Lista não encontrada.' });
    }
    const items = db
      .prepare(
        `SELECT list_items.gemId, list_items.position, list_items.note, gems.title, gems.images
         FROM list_items
         JOIN gems ON gems.id = list_items.gemId
         WHERE list_items.listId = ?
         ORDER BY list_items.position ASC`
      )
      .all(id) as any[];

    return res.status(200).json({
      ...existing,
      items: items.map((item) => ({
        gemId: item.gemId,
        position: item.position,
        note: item.note,
        title: item.title,
        image: item.images ? JSON.parse(item.images)[0] || null : null,
      })),
    });
  }

  if (req.method === 'PATCH') {
    if (!existing) {
      return res.status(404).json({ error: 'Lista não encontrada.' });
    }

    const title = typeof req.body?.title === 'string' && req.body.title.trim() ? req.body.title.trim() : existing.title;
    const description = req.body?.description !== undefined ? req.body.description : existing.description;
    const coverImage = req.body?.coverImage !== undefined ? req.body.coverImage : existing.coverImage;
    const isPublished = typeof req.body?.isPublished === 'boolean' ? (req.body.isPublished ? 1 : 0) : existing.isPublished;

    db.prepare(
      `UPDATE lists SET title = ?, description = ?, coverImage = ?, isPublished = ?, updatedAt = ? WHERE id = ?`
    ).run(title, description, coverImage, isPublished, new Date().toISOString(), id);

    return res.status(200).json(db.prepare('SELECT * FROM lists WHERE id = ?').get(id));
  }

  if (req.method === 'DELETE') {
    db.prepare('DELETE FROM list_items WHERE listId = ?').run(id);
    const result = db.prepare('DELETE FROM lists WHERE id = ?').run(id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Lista não encontrada.' });
    }
    return res.status(200).json({ message: 'List deleted' });
  }

  res.setHeader('Allow', ['GET', 'PATCH', 'DELETE']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
