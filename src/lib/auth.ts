import crypto from 'crypto';
import type { NextApiRequest, NextApiResponse } from 'next';

// Server-only auth helpers. No new npm dependencies: password hashing uses
// Node's built-in scrypt, and sessions are opaque random tokens stored in
// SQLite (not signed JWTs) so there's no separate secret to manage/rotate.

export const SESSION_COOKIE = 'hg_session';
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  createdAt: string;
  isAdmin: boolean;
  emailVerified: boolean;
  avatarUrl: string | null;
}

// Emails listed in ADMIN_EMAILS are granted admin on every login/register.
// This only bootstraps the first admin(s) — from then on, admin status is
// just a flag in the users table that other admins can toggle.
export function isBootstrapAdminEmail(email: string): boolean {
  const list = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(email.trim().toLowerCase());
}

// Local-dev fallback for "forgot password" when no email service is
// configured (see isEmailConfigured in lib/email.ts) — there's no way to
// prove inbox ownership without email, so instead of a reset link we hand
// back a one-time password directly. Not used once real email is wired up.
// Excludes visually ambiguous characters (0/O, 1/l/I) since it's meant to be
// read off a screen and retyped.
const TEMP_PASSWORD_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
export function generateTempPassword(length = 10): string {
  const bytes = crypto.randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i++) {
    out += TEMP_PASSWORD_CHARS[bytes[i] % TEMP_PASSWORD_CHARS.length];
  }
  return out;
}

export function hashPassword(password: string): { salt: string; hash: string } {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { salt, hash };
}

export function verifyPassword(password: string, salt: string, hash: string): boolean {
  const candidate = crypto.scryptSync(password, salt, 64);
  const stored = Buffer.from(hash, 'hex');
  if (candidate.length !== stored.length) return false;
  return crypto.timingSafeEqual(candidate, stored);
}

// Single-use tokens backing password-reset and email-verify links (see the
// auth_tokens table in lib/db.ts). Kept separate from sessions since they
// have different lifetimes and are consumed (deleted) on first use.
export function createAuthToken(
  db: any,
  userId: string,
  purpose: 'password_reset' | 'email_verify',
  ttlMs: number
): string {
  const token = crypto.randomBytes(32).toString('hex');
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlMs);
  db.prepare('INSERT INTO auth_tokens (token, userId, purpose, createdAt, expiresAt) VALUES (?, ?, ?, ?, ?)').run(
    token,
    userId,
    purpose,
    now.toISOString(),
    expiresAt.toISOString()
  );
  return token;
}

// Looks up and deletes (consumes) a token in one go. Returns the associated
// userId, or null if the token doesn't exist, is expired, or is for the
// wrong purpose (e.g. someone reusing a verify link as a reset link).
export function consumeAuthToken(db: any, token: string, purpose: 'password_reset' | 'email_verify'): string | null {
  const row = db.prepare('SELECT * FROM auth_tokens WHERE token = ?').get(token) as
    | { token: string; userId: string; purpose: string; expiresAt: string }
    | undefined;

  if (!row || row.purpose !== purpose) return null;

  db.prepare('DELETE FROM auth_tokens WHERE token = ?').run(token);

  if (new Date(row.expiresAt).getTime() < Date.now()) return null;

  return row.userId;
}

export function createSession(db: any, userId: string): string {
  const token = crypto.randomBytes(32).toString('hex');
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_DURATION_MS);

  db.prepare('INSERT INTO sessions (token, userId, createdAt, expiresAt) VALUES (?, ?, ?, ?)').run(
    token,
    userId,
    now.toISOString(),
    expiresAt.toISOString()
  );

  return token;
}

export function setSessionCookie(res: NextApiResponse, token: string) {
  const maxAge = Math.floor(SESSION_DURATION_MS / 1000);
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE}=${token}; HttpOnly; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`
  );
}

export function clearSessionCookie(res: NextApiResponse) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${SESSION_COOKIE}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax${secure}`);
}

export function getSessionUser(req: NextApiRequest, db: any): AuthUser | null {
  const token = req.cookies?.[SESSION_COOKIE];
  if (!token) return null;

  const session = db.prepare('SELECT * FROM sessions WHERE token = ?').get(token) as
    | { token: string; userId: string; createdAt: string; expiresAt: string }
    | undefined;
  if (!session) return null;

  if (new Date(session.expiresAt).getTime() < Date.now()) {
    db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
    return null;
  }

  const row = db
    .prepare(
      'SELECT id, email, displayName, createdAt, isAdmin, isBanned, emailVerified, avatarUrl FROM users WHERE id = ?'
    )
    .get(session.userId) as
    | {
        id: string;
        email: string;
        displayName: string;
        createdAt: string;
        isAdmin: number;
        isBanned: number;
        emailVerified: number;
        avatarUrl: string | null;
      }
    | undefined;

  if (!row) return null;

  // A banned account is treated as logged out everywhere — this is the one
  // place that matters, since every authenticated route goes through here.
  if (row.isBanned) {
    db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
    return null;
  }

  return {
    id: row.id,
    email: row.email,
    displayName: row.displayName,
    createdAt: row.createdAt,
    isAdmin: !!row.isAdmin,
    emailVerified: !!row.emailVerified,
    avatarUrl: row.avatarUrl,
  };
}

// Same as getSessionUser, but also requires the account to be an admin.
// Every /api/admin/* route should gate on this, not just on the client-side
// UI check — the client check is only there to avoid flashing admin UI at
// people who don't have access.
export function requireAdmin(req: NextApiRequest, db: any): AuthUser | null {
  const user = getSessionUser(req, db);
  if (!user || !user.isAdmin) return null;
  return user;
}
