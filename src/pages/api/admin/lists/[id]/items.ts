import type { NextApiRequest, NextApiResponse } from 'next';
import { getDb } from '../../../../../lib/db';
import { requireAdmin } from '../../../../../lib/auth';

const db = getDb();

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const admin = requireAdmin(req, db);
  if (!admin) {
    return res.status(403).json({ error: 'Acesso negado.' });
  }

  const listId = req.query.id as string;
  const list = db.prepare('SELECT id FROM lists WHERE id = ?').get(listId);
  if (!list) {
    return res.status(404).json({ error: 'Lista não encontrada.' });
  }

  if (req.method === 'POST') {
    const gemId = req.body?.gemId;
    if (!gemId || typeof gemId !== 'string') {
      return res.status(400).json({ error: 'gemId é obrigatório.' });
    }
    const gem = db.prepare('SELECT id FROM gems WHERE id = ?').get(gemId);
    if (!gem) {
      return res.status(404).json({ error: 'Lugar não encontrado.' });
    }

    const maxPos = db.prepare('SELECT MAX(position) as m FROM list_items WHERE listId = ?').get(listId) as {
      m: number | null;
    };
    const position = (maxPos.m ?? -1) + 1;

    db.prepare(
      `INSERT INTO list_items (listId, gemId, position, note) VALUES (?, ?, ?, ?)
       ON CONFLICT(listId, gemId) DO NOTHING`
    ).run(listId, gemId, position, req.body?.note || null);

    return res.status(201).json({ message: 'Added' });
  }

  if (req.method === 'DELETE') {
    const gemId = req.query.gemId as string;
    db.prepare('DELETE FROM list_items WHERE listId = ? AND gemId = ?').run(listId, gemId);
    return res.status(200).json({ message: 'Removed' });
  }

  if (req.method === 'PATCH') {
    // Full reorder — body { gemIds: string[] } is the new top-to-bottom
    // order for every item currently in the list.
    const gemIds = req.body?.gemIds;
    if (!Array.isArray(gemIds)) {
      return res.status(400).json({ error: 'gemIds deve ser um array.' });
    }
    const update = db.prepare('UPDATE list_items SET position = ? WHERE listId = ? AND gemId = ?');
    const reorder = db.transaction((ids: string[]) => {
      ids.forEach((gemId, index) => update.run(index, listId, gemId));
    });
    reorder(gemIds);
    return res.status(200).json({ message: 'Reordered' });
  }

  res.setHeader('Allow', ['POST', 'DELETE', 'PATCH']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
