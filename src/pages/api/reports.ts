import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { getDb } from '../../lib/db';
import { getSessionUser } from '../../lib/auth';

const REASONS = ['spam', 'inappropriate', 'incorrect_info', 'closed', 'other'] as const;

const reportSchema = z.object({
  targetType: z.literal('gem').default('gem'),
  targetId: z.string().min(1),
  reason: z.enum(REASONS),
  details: z.string().max(500).optional(),
});

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const db = getDb();

  // Reporting requires an account, same as comments/photos — keeps the
  // queue from being trivially spammed by anonymous drive-bys.
  const sessionUser = getSessionUser(req, db);
  if (!sessionUser) {
    return res.status(401).json({ error: 'É preciso entrar na sua conta para denunciar um lugar.' });
  }

  try {
    const body = reportSchema.parse(req.body);

    const gem = db.prepare('SELECT id FROM gems WHERE id = ?').get(body.targetId);
    if (!gem) {
      return res.status(404).json({ error: 'Lugar não encontrado.' });
    }

    const id = `report_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    db.prepare(
      `INSERT INTO reports (id, targetType, targetId, reporterId, reason, details, status, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, 'open', ?)`
    ).run(id, body.targetType, body.targetId, sessionUser.id, body.reason, body.details || null, new Date().toISOString());

    res.status(201).json({ message: 'Report received' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.format() });
    } else {
      console.error('Error saving report:', error);
      res.status(500).json({ error: 'Failed to save report' });
    }
  }
}
