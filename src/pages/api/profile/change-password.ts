import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { getDb } from '../../../lib/db';
import { getSessionUser, verifyPassword, hashPassword, SESSION_COOKIE } from '../../../lib/auth';

const db = getDb();

const changeSchema = z.object({
  currentPassword: z.string().min(1, 'Password atual é obrigatória'),
  newPassword: z.string().min(8, 'A nova password deve ter pelo menos 8 caracteres'),
});

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const user = getSessionUser(req, db);
  if (!user) {
    return res.status(401).json({ error: 'É preciso entrar na sua conta.' });
  }

  try {
    const data = changeSchema.parse(req.body);

    const row = db.prepare('SELECT passwordHash, salt FROM users WHERE id = ?').get(user.id) as
      | { passwordHash: string; salt: string }
      | undefined;

    if (!row || !verifyPassword(data.currentPassword, row.salt, row.passwordHash)) {
      return res.status(401).json({ error: 'Password atual incorreta.' });
    }

    const { salt, hash } = hashPassword(data.newPassword);
    db.prepare('UPDATE users SET passwordHash = ?, salt = ? WHERE id = ?').run(hash, salt, user.id);

    // Log out every other session on this account, but keep the one making
    // this request valid — no reason to also sign the user themselves out.
    const currentToken = req.cookies?.[SESSION_COOKIE];
    db.prepare('DELETE FROM sessions WHERE userId = ? AND token != ?').run(user.id, currentToken || '');

    res.status(200).json({ message: 'Password alterada com sucesso.' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstIssue = error.issues[0];
      res.status(400).json({ error: firstIssue?.message || 'Dados inválidos' });
    } else {
      console.error('Error changing password:', error);
      res.status(500).json({ error: 'Erro ao alterar a password. Tente novamente.' });
    }
  }
}
