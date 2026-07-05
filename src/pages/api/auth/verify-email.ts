import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { getDb } from '../../../lib/db';
import { consumeAuthToken } from '../../../lib/auth';

const db = getDb();

const verifySchema = z.object({
  token: z.string().min(1, 'Token em falta'),
});

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const data = verifySchema.parse(req.body);

    const userId = consumeAuthToken(db, data.token, 'email_verify');
    if (!userId) {
      return res.status(400).json({ error: 'Este link expirou ou já foi usado.' });
    }

    db.prepare('UPDATE users SET emailVerified = 1 WHERE id = ?').run(userId);

    res.status(200).json({ message: 'Email confirmado com sucesso.' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Dados inválidos' });
    } else {
      console.error('Error verifying email:', error);
      res.status(500).json({ error: 'Erro ao confirmar o email. Tente novamente.' });
    }
  }
}
