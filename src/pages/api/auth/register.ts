import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import crypto from 'crypto';
import { getDb } from '../../../lib/db';
import { hashPassword, createSession, setSessionCookie, isBootstrapAdminEmail, createAuthToken } from '../../../lib/auth';
import { sendVerificationEmail, getBaseUrl } from '../../../lib/email';

const VERIFY_TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

const db = getDb();

const registerSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'A password deve ter pelo menos 8 caracteres'),
  displayName: z.string().min(1, 'Nome é obrigatório').max(60, 'Nome deve ter no máximo 60 caracteres'),
});

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const data = registerSchema.parse(req.body);
    const email = data.email.trim().toLowerCase();
    const displayName = data.displayName.trim();

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      return res.status(409).json({ error: 'Já existe uma conta com este email.' });
    }

    const { salt, hash } = hashPassword(data.password);
    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    const isAdmin = isBootstrapAdminEmail(email) ? 1 : 0;

    db.prepare(
      'INSERT INTO users (id, email, passwordHash, salt, displayName, createdAt, isAdmin) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(id, email, hash, salt, displayName, createdAt, isAdmin);

    const token = createSession(db, id);
    setSessionCookie(res, token);

    // Best-effort: a failure to send the verification email shouldn't block
    // account creation — the user can request a new one from the reminder
    // banner (see /api/auth/resend-verification).
    const verifyToken = createAuthToken(db, id, 'email_verify', VERIFY_TOKEN_TTL_MS);
    const verifyUrl = `${getBaseUrl(req)}/verify-email?token=${verifyToken}`;
    sendVerificationEmail(email, verifyUrl).catch((err) =>
      console.error('Error sending verification email:', err)
    );

    res.status(201).json({ id, email, displayName, createdAt, isAdmin: !!isAdmin, emailVerified: false, avatarUrl: null });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstIssue = error.issues[0];
      res.status(400).json({ error: firstIssue?.message || 'Dados inválidos' });
    } else {
      console.error('Error registering user:', error);
      res.status(500).json({ error: 'Erro ao criar conta. Tente novamente.' });
    }
  }
}
