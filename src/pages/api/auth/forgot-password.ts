import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { getDb } from '../../../lib/db';
import { createAuthToken, generateTempPassword, hashPassword } from '../../../lib/auth';
import { sendPasswordResetEmail, getBaseUrl, isEmailConfigured } from '../../../lib/email';

const db = getDb();

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

const forgotSchema = z.object({
  email: z.string().email('Email inválido'),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const data = forgotSchema.parse(req.body);
    const email = data.email.trim().toLowerCase();

    const user = db.prepare('SELECT id, isBanned FROM users WHERE email = ?').get(email) as
      | { id: string; isBanned: number }
      | undefined;

    const emailConfigured = isEmailConfigured();

    // Always respond with the same generic message/shape whether or not the
    // account exists — otherwise this endpoint becomes a way to check which
    // emails are registered (email enumeration). The one exception is the
    // dev-mode temp password below, which necessarily reveals whether the
    // account exists — acceptable only because it's local-only (see
    // isEmailConfigured) and disappears the moment real email is wired up.
    if (user && !user.isBanned) {
      if (emailConfigured) {
        const token = createAuthToken(db, user.id, 'password_reset', RESET_TOKEN_TTL_MS);
        const resetUrl = `${getBaseUrl(req)}/reset-password?token=${token}`;
        await sendPasswordResetEmail(email, resetUrl);
      } else {
        // No email service configured — there's no way to prove the
        // requester owns this inbox, so this ONLY makes sense as a local
        // dev/testing convenience. See generateTempPassword's doc comment.
        const tempPassword = generateTempPassword();
        const { salt, hash } = hashPassword(tempPassword);
        db.prepare('UPDATE users SET passwordHash = ?, salt = ? WHERE id = ?').run(hash, salt, user.id);
        db.prepare('DELETE FROM sessions WHERE userId = ?').run(user.id);

        return res.status(200).json({
          message: 'Password temporária gerada (modo de desenvolvimento — sem serviço de email configurado).',
          devTempPassword: tempPassword,
        });
      }
    }

    res.status(200).json({
      message: 'Se existir uma conta com este email, enviámos um link para redefinir a password.',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstIssue = error.issues[0];
      res.status(400).json({ error: firstIssue?.message || 'Dados inválidos' });
    } else {
      console.error('Error requesting password reset:', error);
      res.status(500).json({ error: 'Erro ao processar o pedido. Tente novamente.' });
    }
  }
}
