import type { NextApiRequest, NextApiResponse } from 'next';
import { getDb } from '../../../lib/db';
import { getSessionUser } from '../../../lib/auth';

const db = getDb();

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const user = getSessionUser(req, db);
  if (!user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  res.status(200).json(user);
}
