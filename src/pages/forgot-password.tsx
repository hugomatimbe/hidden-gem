import { useState } from 'react';
import Link from 'next/link';
import Layout from '../components/Layout';
import { useLanguage } from '../contexts/LanguageContext';

export default function ForgotPasswordPage() {
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || t('auth.generic_error'));
      } else {
        if (data.devTempPassword) setTempPassword(data.devTempPassword);
        setSubmitted(true);
      }
    } catch (err) {
      console.error('Error requesting password reset:', err);
      setError(t('auth.generic_error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyTempPassword = async () => {
    if (!tempPassword) return;
    try {
      await navigator.clipboard.writeText(tempPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Error copying to clipboard:', err);
    }
  };

  return (
    <Layout title="Hidden Gem - Recuperar Password">
      <div className="bg-white dark:bg-ink-800 py-16">
        <div className="container mx-auto px-4 max-w-md">
          <div className="polaroid bg-white dark:bg-ink-800 p-8 -rotate-1">
            {submitted && tempPassword ? (
              <div className="text-center">
                <div className="w-14 h-14 mx-auto mb-4 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center">
                  <svg className="w-7 h-7 text-amber-700 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h1 className="text-xl font-display font-semibold text-ink dark:text-sand-50 mb-2">
                  {t('auth.forgot_dev_title')}
                </h1>
                <p className="text-sm text-ink/60 dark:text-sand-300 mb-4">{t('auth.forgot_dev_desc')}</p>
                <div className="flex items-center gap-2 bg-sand-100 dark:bg-ink-700 rounded-lg px-4 py-3 mb-2">
                  <code className="flex-grow text-left font-mono text-lg text-ink dark:text-sand-50 tracking-wider">
                    {tempPassword}
                  </code>
                  <button
                    onClick={copyTempPassword}
                    className="text-xs font-bold text-primary hover:underline flex-shrink-0"
                  >
                    {copied ? t('auth.forgot_dev_copied') : t('auth.forgot_dev_copy')}
                  </button>
                </div>
                <p className="text-xs text-ink/40 dark:text-sand-300/50 mb-6">{t('auth.forgot_dev_note')}</p>
                <Link href="/login">
                  <a className="bg-primary text-white px-5 py-2 inline-block font-bold rotate-1 hover:rotate-0 transition-transform shadow-[3px_3px_0_rgba(59,42,30,0.18)]">
                    {t('auth.login_button')}
                  </a>
                </Link>
              </div>
            ) : submitted ? (
              <div className="text-center">
                <div className="w-14 h-14 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
                  <svg className="w-7 h-7 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h1 className="text-xl font-display font-semibold text-ink dark:text-sand-50 mb-2">
                  {t('auth.forgot_check_email_title')}
                </h1>
                <p className="text-sm text-ink/60 dark:text-sand-300">{t('auth.forgot_check_email_desc')}</p>
              </div>
            ) : (
              <>
                <div className="text-center mb-8">
                  <h1 className="text-2xl font-display font-semibold text-ink dark:text-sand-50 mb-2">
                    {t('auth.forgot_title')}
                  </h1>
                  <p className="text-ink/60 dark:text-sand-300 text-sm">{t('auth.forgot_subtitle')}</p>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-6">
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-ink/80 dark:text-sand-200 mb-1">
                      {t('auth.email')}
                    </label>
                    <input
                      type="email"
                      id="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full px-4 py-2 border border-sand-300 dark:border-ink-700 rounded-lg bg-white dark:bg-ink-900 text-ink dark:text-sand-100 focus:ring-primary focus:border-primary"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-primary text-white py-3 font-bold rotate-1 hover:rotate-0 transition-transform shadow-[4px_4px_0_rgba(59,42,30,0.18)] disabled:opacity-50"
                  >
                    {isSubmitting ? t('auth.forgot_sending') : t('auth.forgot_button')}
                  </button>
                </form>
              </>
            )}

            <p className="text-center text-sm text-ink/60 dark:text-sand-300 mt-6">
              <Link href="/login">
                <a className="text-primary font-medium hover:underline">{t('auth.back_to_login')}</a>
              </Link>
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
