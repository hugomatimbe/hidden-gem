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
    return res.status(401).json({ error: 'É preciso entrar na sua conta.' });
  }

  const rows = db
    .prepare('SELECT * FROM gems WHERE submittedBy = ? ORDER BY createdAt DESC')
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

  res.status(200).json(gems);
}
