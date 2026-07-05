import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { getDb } from '../../../../lib/db';

const db = getDb();

const voteSchema = z.object({
  voterId: z.string().min(1).max(100),
  type: z.enum(['up', 'down', 'undo']),
});

function getCounts(gemId: string) {
  const up = db.prepare("SELECT COUNT(*) as c FROM votes WHERE gemId = ? AND type = 'up'").get(gemId) as { c: number };
  const down = db.prepare("SELECT COUNT(*) as c FROM votes WHERE gemId = ? AND type = 'down'").get(gemId) as { c: number };
  return { upvotes: up.c, downvotes: down.c };
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const gemId = req.query.id;
  if (typeof gemId !== 'string' || !gemId) {
    return res.status(400).json({ error: 'Missing gem id' });
  }

  if (req.method === 'GET') {
    const voterIdParam = req.query.voterId;
    const voterId = typeof voterIdParam === 'string' ? voterIdParam : undefined;

    const counts = getCounts(gemId);
    let userVote: 'up' | 'down' | null = null;
    if (voterId) {
      const row = db.prepare('SELECT type FROM votes WHERE gemId = ? AND voterId = ?').get(gemId, voterId) as { type: 'up' | 'down' } | undefined;
      userVote = row ? row.type : null;
    }

    return res.status(200).json({ ...counts, userVote });
  }

  if (req.method === 'POST') {
    try {
      const { voterId, type } = voteSchema.parse(req.body);

      if (type === 'undo') {
        db.prepare('DELETE FROM votes WHERE gemId = ? AND voterId = ?').run(gemId, voterId);
      } else {
        db.prepare(`
          INSERT INTO votes (gemId, voterId, type, createdAt)
          VALUES (@gemId, @voterId, @type, @createdAt)
          ON CONFLICT(gemId, voterId) DO UPDATE SET type = excluded.type, createdAt = excluded.createdAt
        `).run({ gemId, voterId, type, createdAt: new Date().toISOString() });
      }

      const counts = getCounts(gemId);
      const userVote = type === 'undo' ? null : type;
      return res.status(200).json({ ...counts, userVote });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid input', details: error.format() });
      }
      console.error('Error saving vote:', error);
      return res.status(500).json({ error: 'Failed to save vote' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
