import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

export default function RegisterPage() {
  const { t } = useLanguage();
  const { register } = useAuth();
  const router = useRouter();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const redirectTo = typeof router.query.redirect === 'string' ? router.query.redirect : '/';
  const loginHref = `/login?redirect=${encodeURIComponent(redirectTo)}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    const result = await register(email, password, displayName);
    setIsSubmitting(false);

    if (result.success) {
      router.push(redirectTo);
    } else {
      setError(result.error || '');
    }
  };

  return (
    <Layout title="Hidden Gem - Criar Conta">
      <div className="bg-white dark:bg-ink-800 py-16">
        <div className="container mx-auto px-4 max-w-md">
          <div className="polaroid bg-white dark:bg-ink-800 p-8 rotate-1">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-display font-semibold text-ink dark:text-sand-50 mb-2">
                {t('auth.register_title')}
              </h1>
              <p className="text-ink/60 dark:text-sand-300 text-sm">{t('auth.register_subtitle')}</p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-6">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="displayName" className="block text-sm font-medium text-ink/80 dark:text-sand-200 mb-1">
                  {t('auth.display_name')}
                </label>
                <input
                  type="text"
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                  maxLength={60}
                  className="w-full px-4 py-2 border border-sand-300 dark:border-ink-700 rounded-lg bg-white dark:bg-ink-900 text-ink dark:text-sand-100 focus:ring-primary focus:border-primary"
                />
              </div>

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

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-ink/80 dark:text-sand-200 mb-1">
                  {t('auth.password')}
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
                <p className="text-xs text-ink/50 dark:text-sand-300/70 mt-1">{t('auth.password_hint')}</p>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-primary text-white py-3 font-bold -rotate-1 hover:rotate-0 transition-transform shadow-[4px_4px_0_rgba(59,42,30,0.18)] disabled:opacity-50"
              >
                {isSubmitting ? t('auth.creating_account') : t('auth.register_button')}
              </button>
            </form>

            <p className="text-center text-sm text-ink/60 dark:text-sand-300 mt-6">
              {t('auth.have_account')}{' '}
              <Link href={loginHref}>
                <a className="text-primary font-medium hover:underline">{t('auth.login_here')}</a>
              </Link>
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
