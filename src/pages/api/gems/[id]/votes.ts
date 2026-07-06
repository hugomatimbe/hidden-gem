import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { getDb } from '../../../../lib/db';
import { getSessionUser } from '../../../../lib/auth';

const db = getDb();

// `voterId` used to be a random UUID the client generated and stashed in
// localStorage — meaning clearing storage, using a private window, or
// switching browsers let anyone vote again on the same gem with no real
// limit, and there was nothing stopping a submitter from upvoting their own
// listing. Voting now requires an account (same trust model as saving a
// gem or submitting one) and the voter's id always comes from the session,
// never from the request body — this column still exists in the `votes`
// table under its old name, but it's a real user id now.
const voteSchema = z.object({
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
    // Reading the current tally is public (anyone viewing the gem sees the
    // score); only casting a vote requires login. Whether *this* visitor
    // has already voted is only knowable if they're signed in.
    const sessionUser = getSessionUser(req, db);
    const counts = getCounts(gemId);
    let userVote: 'up' | 'down' | null = null;
    if (sessionUser) {
      const row = db.prepare('SELECT type FROM votes WHERE gemId = ? AND voterId = ?').get(gemId, sessionUser.id) as { type: 'up' | 'down' } | undefined;
      userVote = row ? row.type : null;
    }

    return res.status(200).json({ ...counts, userVote });
  }

  if (req.method === 'POST') {
    try {
      const sessionUser = getSessionUser(req, db);
      if (!sessionUser) {
        return res.status(401).json({ error: 'É preciso entrar na sua conta para votar.' });
      }

      const gem = db.prepare('SELECT submittedBy FROM gems WHERE id = ?').get(gemId) as { submittedBy: string | null } | undefined;
      if (!gem) {
        return res.status(404).json({ error: 'Gem not found' });
      }
      if (gem.submittedBy && gem.submittedBy === sessionUser.id) {
        return res.status(403).json({ error: 'Não pode votar no seu próprio lugar.' });
      }

      const { type } = voteSchema.parse(req.body);
      const voterId = sessionUser.id;

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
