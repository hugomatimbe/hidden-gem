import { Resend } from 'resend';
import type { NextApiRequest } from 'next';

// Lazily constructed so the app doesn't crash on import if RESEND_API_KEY
// isn't set yet (e.g. during initial setup before the key is added).
function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  return new Resend(apiKey);
}

// Lets callers (e.g. forgot-password) branch between the real email flow and
// a local-dev fallback, without duplicating the "is the key set" check.
export function isEmailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY;
}

// Resend's sandbox address (onboarding@resend.dev) can only deliver to the
// email you signed up to Resend with, until you verify your own domain at
// resend.com/domains and point RESEND_FROM_EMAIL at an address on it.
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'Hidden Gem <onboarding@resend.dev>';

// Builds an absolute URL back to this app from within an API route, without
// needing a hardcoded site-URL env var — works in both dev and prod.
export function getBaseUrl(req: NextApiRequest): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return configured.replace(/\/$/, '');
  const proto = (req.headers['x-forwarded-proto'] as string) || 'http';
  const host = req.headers.host;
  return `${proto}://${host}`;
}

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<boolean> {
  const resend = getResendClient();
  if (!resend) {
    console.error('RESEND_API_KEY not set — cannot send password reset email. Add it to .env.local.');
    return false;
  }
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: 'Reset your Hidden Gem password',
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color: #B5502B;">Reset your password</h2>
          <p>Someone (hopefully you) asked to reset the password for your Hidden Gem account.</p>
          <p><a href="${resetUrl}" style="display:inline-block;background:#B5502B;color:#fff;padding:10px 20px;text-decoration:none;font-weight:bold;">Reset password</a></p>
          <p>This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
        </div>
      `,
    });
    return true;
  } catch (error) {
    console.error('Error sending password reset email:', error);
    return false;
  }
}

// Gem titles/rejection reasons are user-submitted free text, so they need
// escaping before going into an HTML email body — unlike JSX, template
// literals don't escape anything automatically.
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Lets the submitter know their gem was reviewed, instead of them having to
// notice the status change by revisiting their profile. Silently returns
// false (rather than throwing) when email isn't configured or the send
// fails — moderation itself should still succeed either way, this is a
// best-effort notification, not part of the moderation transaction.
export async function sendGemModerationEmail(
  to: string,
  gemTitle: string,
  status: 'approved' | 'rejected',
  gemUrl: string,
  rejectionReason?: string
): Promise<boolean> {
  const resend = getResendClient();
  if (!resend) {
    console.error('RESEND_API_KEY not set — skipping gem moderation email.');
    return false;
  }
  const safeTitle = escapeHtml(gemTitle);
  const safeReason = rejectionReason ? escapeHtml(rejectionReason) : undefined;

  try {
    if (status === 'approved') {
      await resend.emails.send({
        from: FROM_EMAIL,
        to,
        subject: `"${gemTitle}" was approved!`,
        html: `
          <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
            <h2 style="color: #B5502B;">Your place is live 🎉</h2>
            <p><strong>${safeTitle}</strong> has been reviewed and approved — it's now visible to everyone on Hidden Gem.</p>
            <p><a href="${gemUrl}" style="display:inline-block;background:#B5502B;color:#fff;padding:10px 20px;text-decoration:none;font-weight:bold;">View your place</a></p>
          </div>
        `,
      });
    } else {
      await resend.emails.send({
        from: FROM_EMAIL,
        to,
        subject: `"${gemTitle}" wasn't approved`,
        html: `
          <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
            <h2 style="color: #B5502B;">Your submission wasn't approved</h2>
            <p><strong>${safeTitle}</strong> was reviewed and wasn't approved for publication.</p>
            ${safeReason ? `<p><strong>Reason:</strong> ${safeReason}</p>` : ''}
            <p>You can edit and resubmit it from your profile.</p>
          </div>
        `,
      });
    }
    return true;
  } catch (error) {
    console.error('Error sending gem moderation email:', error);
    return false;
  }
}

export async function sendVerificationEmail(to: string, verifyUrl: string): Promise<boolean> {
  const resend = getResendClient();
  if (!resend) {
    console.error('RESEND_API_KEY not set — cannot send verification email. Add it to .env.local.');
    return false;
  }
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: 'Confirm your Hidden Gem email',
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color: #B5502B;">Welcome to Hidden Gem!</h2>
          <p>Please confirm your email address to finish setting up your account.</p>
          <p><a href="${verifyUrl}" style="display:inline-block;background:#B5502B;color:#fff;padding:10px 20px;text-decoration:none;font-weight:bold;">Confirm email</a></p>
          <p>This link expires in 24 hours.</p>
        </div>
      `,
    });
    return true;
  } catch (error) {
    console.error('Error sending verification email:', error);
    return false;
  }
}
