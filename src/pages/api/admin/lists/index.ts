import type { NextApiRequest, NextApiResponse } from 'next';
import { getDb } from '../../../../lib/db';
import { requireAdmin } from '../../../../lib/auth';

const db = getDb();

// Strips accents/punctuation into a URL-safe slug (e.g. "Cafés Escondidos"
// -> "cafes-escondidos"). Falls back to a generic word if the title is
// entirely non-latin/punctuation so we never insert an empty slug.
function slugify(title: string): string {
  const combiningDiacritics = new RegExp('[\\u0300-\\u036f]', 'g');
  const base = title
    .normalize('NFD')
    .replace(combiningDiacritics, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-+|-+$)/g, '');
  return base || 'lista';
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const admin = requireAdmin(req, db);
  if (!admin) {
    return res.status(403).json({ error: 'Acesso negado.' });
  }

  if (req.method === 'GET') {
    const lists = db
      .prepare(
        `SELECT lists.*, COUNT(list_items.gemId) as itemCount
         FROM lists
         LEFT JOIN list_items ON list_items.listId = lists.id
         GROUP BY lists.id
         ORDER BY lists.createdAt DESC`
      )
      .all();
    return res.status(200).json(lists);
  }

  if (req.method === 'POST') {
    const title = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
    if (!title) {
      return res.status(400).json({ error: 'Título é obrigatório.' });
    }

    const id = `list_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const baseSlug = slugify(title);
    let slug = baseSlug;
    let suffix = 2;
    while (db.prepare('SELECT 1 FROM lists WHERE slug = ?').get(slug)) {
      slug = `${baseSlug}-${suffix++}`;
    }

    const now = new Date().toISOString();
    db.prepare(
      `INSERT INTO lists (id, title, slug, description, coverImage, isPublished, createdBy, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?)`
    ).run(id, title, slug, req.body?.description || null, req.body?.coverImage || null, admin.id, now, now);

    return res.status(201).json(db.prepare('SELECT * FROM lists WHERE id = ?').get(id));
  }

  res.setHeader('Allow', ['GET', 'POST']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
