import type { NextApiRequest, NextApiResponse } from 'next';
import { getDb } from '../../../lib/db';
import { SESSION_COOKIE, clearSessionCookie } from '../../../lib/auth';

const db = getDb();

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const token = req.cookies?.[SESSION_COOKIE];
  if (token) {
    db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
  }

  clearSessionCookie(res);
  res.status(200).json({ message: 'Logged out' });
}
