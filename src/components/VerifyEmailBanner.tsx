import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

export default function VerifyEmailBanner() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (!user || user.emailVerified || dismissed) return null;

  const resend = async () => {
    setSending(true);
    try {
      const res = await fetch('/api/auth/resend-verification', { method: 'POST' });
      if (res.ok) setSent(true);
    } catch (err) {
      console.error('Error resending verification email:', err);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-900/40">
      <div className="container mx-auto px-4 py-2.5 flex items-center justify-between gap-3 flex-wrap text-sm">
        <p className="text-amber-800 dark:text-amber-300">
          {sent ? t('auth.verify_banner_sent') : t('auth.verify_banner_text')}
        </p>
        <div className="flex items-center gap-4">
          {!sent && (
            <button
              onClick={resend}
              disabled={sending}
              className="font-bold text-amber-900 dark:text-amber-200 hover:underline disabled:opacity-50"
            >
              {sending ? t('auth.verify_banner_sending') : t('auth.verify_banner_resend')}
            </button>
          )}
          <button
            onClick={() => setDismissed(true)}
            aria-label="Dismiss"
            className="text-amber-800/60 dark:text-amber-300/60 hover:text-amber-900 dark:hover:text-amber-200"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  );
}
