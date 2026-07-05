import type { NextApiRequest, NextApiResponse } from 'next';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import { getDb } from '../../../../lib/db';
import { getSessionUser } from '../../../../lib/auth';

const db = getDb();

const commentSchema = z.object({
  content: z.string().trim().min(1).max(500),
});

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const gemId = req.query.id;
  if (typeof gemId !== 'string' || !gemId) {
    return res.status(400).json({ error: 'Missing gem id' });
  }

  if (req.method === 'GET') {
    const rows = db.prepare('SELECT * FROM comments WHERE gemId = ? ORDER BY createdAt DESC').all(gemId);
    return res.status(200).json(rows);
  }

  if (req.method === 'POST') {
    // Comments used to allow a free-text author name from anyone, logged in
    // or not. Now that photos can be attached to visitor activity too, we
    // require a real account so there's accountability behind what gets
    // posted — see the "require login" decision for the photos feature.
    const sessionUser = getSessionUser(req, db);
    if (!sessionUser) {
      return res.status(401).json({ error: 'É preciso entrar na sua conta para comentar.' });
    }

    try {
      const { content } = commentSchema.parse(req.body);
      const comment = {
        id: randomUUID(),
        gemId,
        userId: sessionUser.id,
        author: sessionUser.displayName,
        content,
        createdAt: new Date().toISOString(),
      };

      db.prepare(`
        INSERT INTO comments (id, gemId, userId, author, content, createdAt)
        VALUES (@id, @gemId, @userId, @author, @content, @createdAt)
      `).run(comment);

      return res.status(201).json(comment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid input', details: error.format() });
      }
      console.error('Error saving comment:', error);
      return res.status(500).json({ error: 'Failed to save comment' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
