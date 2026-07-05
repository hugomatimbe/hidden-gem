import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '../components/Layout';
import { useLanguage } from '../contexts/LanguageContext';

export default function ResetPasswordPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const token = typeof router.query.token === 'string' ? router.query.token : '';
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError(t('auth.passwords_dont_match'));
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || t('auth.generic_error'));
      } else {
        setDone(true);
      }
    } catch (err) {
      console.error('Error resetting password:', err);
      setError(t('auth.generic_error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Layout title="Hidden Gem - Redefinir Password">
      <div className="bg-white dark:bg-ink-800 py-16">
        <div className="container mx-auto px-4 max-w-md">
          <div className="polaroid bg-white dark:bg-ink-800 p-8 -rotate-1">
            {!token ? (
              <div className="text-center">
                <h1 className="text-xl font-display font-semibold text-ink dark:text-sand-50 mb-2">
                  {t('auth.reset_invalid_title')}
                </h1>
                <p className="text-sm text-ink/60 dark:text-sand-300 mb-4">{t('auth.reset_invalid_desc')}</p>
                <Link href="/forgot-password">
                  <a className="text-primary font-medium hover:underline">{t('auth.forgot_button')}</a>
                </Link>
              </div>
            ) : done ? (
              <div className="text-center">
                <div className="w-14 h-14 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
                  <svg className="w-7 h-7 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h1 className="text-xl font-display font-semibold text-ink dark:text-sand-50 mb-2">
                  {t('auth.reset_success_title')}
                </h1>
                <p className="text-sm text-ink/60 dark:text-sand-300 mb-4">{t('auth.reset_success_desc')}</p>
                <Link href="/login">
                  <a className="bg-primary text-white px-5 py-2 inline-block font-bold rotate-1 hover:rotate-0 transition-transform shadow-[3px_3px_0_rgba(59,42,30,0.18)]">
                    {t('auth.login_button')}
                  </a>
                </Link>
              </div>
            ) : (
              <>
                <div className="text-center mb-8">
                  <h1 className="text-2xl font-display font-semibold text-ink dark:text-sand-50 mb-2">
                    {t('auth.reset_title')}
                  </h1>
                  <p className="text-ink/60 dark:text-sand-300 text-sm">{t('auth.reset_subtitle')}</p>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-6">
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-ink/80 dark:text-sand-200 mb-1">
                      {t('auth.reset_new_password')}
                    </label>
                    <input
                      type="password"
                      id="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={8}
                      className="w-full px-4 py-2 border border-sand-300 dark:border-ink-700 rounded-lg bg-white dark:bg-ink-900 text-ink dark:text-sand-100 focus:ring-primary focus:border-primary"
                    />
                    <p className="text-xs text-ink/40 dark:text-sand-300/50 mt-1">{t('auth.password_hint')}</p>
                  </div>

                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-ink/80 dark:text-sand-200 mb-1">
                      {t('auth.reset_confirm_password')}
                    </label>
                    <input
                      type="password"
                      id="confirmPassword"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength={8}
                      className="w-full px-4 py-2 border border-sand-300 dark:border-ink-700 rounded-lg bg-white dark:bg-ink-900 text-ink dark:text-sand-100 focus:ring-primary focus:border-primary"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-primary text-white py-3 font-bold rotate-1 hover:rotate-0 transition-transform shadow-[4px_4px_0_rgba(59,42,30,0.18)] disabled:opacity-50"
                  >
                    {isSubmitting ? t('auth.reset_saving') : t('auth.reset_button')}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
