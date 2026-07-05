import type { NextApiRequest, NextApiResponse } from 'next';
import { getDb } from '../../../lib/db';
import { getSessionUser, createAuthToken } from '../../../lib/auth';
import { sendVerificationEmail, getBaseUrl } from '../../../lib/email';

const db = getDb();

const VERIFY_TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const user = getSessionUser(req, db);
  if (!user) {
    return res.status(401).json({ error: 'É preciso entrar na sua conta.' });
  }

  if (user.emailVerified) {
    return res.status(200).json({ message: 'Este email já está confirmado.' });
  }

  try {
    const token = createAuthToken(db, user.id, 'email_verify', VERIFY_TOKEN_TTL_MS);
    const verifyUrl = `${getBaseUrl(req)}/verify-email?token=${token}`;
    const sent = await sendVerificationEmail(user.email, verifyUrl);

    if (!sent) {
      return res.status(500).json({ error: 'Não foi possível enviar o email. Tente novamente mais tarde.' });
    }

    res.status(200).json({ message: 'Email de confirmação reenviado.' });
  } catch (error) {
    console.error('Error resending verification email:', error);
    res.status(500).json({ error: 'Erro ao reenviar o email. Tente novamente.' });
  }
}
