import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

type Status = 'verifying' | 'success' | 'error';

export default function VerifyEmailPage() {
  const { t } = useLanguage();
  const { refreshUser } = useAuth();
  const router = useRouter();
  const [status, setStatus] = useState<Status>('verifying');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!router.isReady) return;
    const token = typeof router.query.token === 'string' ? router.query.token : '';

    if (!token) {
      setStatus('error');
      setError(t('auth.verify_invalid_desc'));
      return;
    }

    fetch('/api/auth/verify-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          setStatus('error');
          setError(data.error || t('auth.generic_error'));
        } else {
          setStatus('success');
          refreshUser();
        }
      })
      .catch((err) => {
        console.error('Error verifying email:', err);
        setStatus('error');
        setError(t('auth.generic_error'));
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady, router.query.token]);

  return (
    <Layout title="Hidden Gem - Confirmar Email">
      <div className="bg-white dark:bg-ink-800 py-16">
        <div className="container mx-auto px-4 max-w-md">
          <div className="polaroid bg-white dark:bg-ink-800 p-8 text-center -rotate-1">
            {status === 'verifying' && (
              <>
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-sm text-ink/60 dark:text-sand-300">{t('auth.verify_checking')}</p>
              </>
            )}

            {status === 'success' && (
              <>
                <div className="w-14 h-14 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
                  <svg className="w-7 h-7 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h1 className="text-xl font-display font-semibold text-ink dark:text-sand-50 mb-2">
                  {t('auth.verify_success_title')}
                </h1>
                <p className="text-sm text-ink/60 dark:text-sand-300 mb-4">{t('auth.verify_success_desc')}</p>
                <Link href="/">
                  <a className="bg-primary text-white px-5 py-2 inline-block font-bold rotate-1 hover:rotate-0 transition-transform shadow-[3px_3px_0_rgba(59,42,30,0.18)]">
                    {t('auth.verify_go_home')}
                  </a>
                </Link>
              </>
            )}

            {status === 'error' && (
              <>
                <div className="w-14 h-14 mx-auto mb-4 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                  <svg className="w-7 h-7 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <h1 className="text-xl font-display font-semibold text-ink dark:text-sand-50 mb-2">
                  {t('auth.verify_invalid_title')}
                </h1>
                <p className="text-sm text-ink/60 dark:text-sand-300">{error}</p>
              </>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
