import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { getDb } from '../../../lib/db';
import { hashPassword, consumeAuthToken } from '../../../lib/auth';

const db = getDb();

const resetSchema = z.object({
  token: z.string().min(1, 'Token em falta'),
  password: z.string().min(8, 'A password deve ter pelo menos 8 caracteres'),
});

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const data = resetSchema.parse(req.body);

    // consumeAuthToken deletes the token as it reads it, so a link can only
    // ever be used once even if the request is retried or replayed.
    const userId = consumeAuthToken(db, data.token, 'password_reset');
    if (!userId) {
      return res.status(400).json({ error: 'Este link expirou ou já foi usado. Peça um novo.' });
    }

    const { salt, hash } = hashPassword(data.password);
    db.prepare('UPDATE users SET passwordHash = ?, salt = ? WHERE id = ?').run(hash, salt, userId);

    // Changing the password invalidates every existing session — if someone
    // else had access to the account, this logs them out everywhere.
    db.prepare('DELETE FROM sessions WHERE userId = ?').run(userId);

    res.status(200).json({ message: 'Password redefinida com sucesso.' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstIssue = error.issues[0];
      res.status(400).json({ error: firstIssue?.message || 'Dados inválidos' });
    } else {
      console.error('Error resetting password:', error);
      res.status(500).json({ error: 'Erro ao redefinir a password. Tente novamente.' });
    }
  }
}
