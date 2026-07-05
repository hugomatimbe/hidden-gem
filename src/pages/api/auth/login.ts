import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { getDb } from '../../../lib/db';
import { verifyPassword, createSession, setSessionCookie, isBootstrapAdminEmail } from '../../../lib/auth';

const db = getDb();

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Password é obrigatória'),
});

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const data = loginSchema.parse(req.body);
    const email = data.email.trim().toLowerCase();

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as
      | {
          id: string;
          email: string;
          passwordHash: string;
          salt: string;
          displayName: string;
          createdAt: string;
          isAdmin: number;
          isBanned: number;
          emailVerified: number;
          avatarUrl: string | null;
        }
      | undefined;

    if (!user || !verifyPassword(data.password, user.salt, user.passwordHash)) {
      return res.status(401).json({ error: 'Email ou password incorretos.' });
    }

    if (user.isBanned) {
      return res.status(403).json({ error: 'Esta conta foi desativada.' });
    }

    // Keep bootstrap admins in sync in case ADMIN_EMAILS changed since this
    // account was created (e.g. the site owner adds a second admin email).
    const shouldBeAdmin = isBootstrapAdminEmail(user.email);
    if (shouldBeAdmin && !user.isAdmin) {
      db.prepare('UPDATE users SET isAdmin = 1 WHERE id = ?').run(user.id);
      user.isAdmin = 1;
    }

    const token = createSession(db, user.id);
    setSessionCookie(res, token);

    res.status(200).json({
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      createdAt: user.createdAt,
      isAdmin: !!user.isAdmin,
      emailVerified: !!user.emailVerified,
      avatarUrl: user.avatarUrl,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstIssue = error.issues[0];
      res.status(400).json({ error: firstIssue?.message || 'Dados inválidos' });
    } else {
      console.error('Error logging in:', error);
      res.status(500).json({ error: 'Erro ao entrar. Tente novamente.' });
    }
  }
}
