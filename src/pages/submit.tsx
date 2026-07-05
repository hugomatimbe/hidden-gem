import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import Form from '../components/Form';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';

export default function SubmitPage() {
  const { t } = useLanguage();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string>('');
  const [submittedGemId, setSubmittedGemId] = useState<string>('');


  const handleSubmit = async (data: any) => {
    setIsSubmitting(true);
    setSubmitError('');

    try {
      const response = await fetch('/api/gems', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save gem');
      }

      setSubmittedGemId(data.id);
      setIsSubmitted(true);
    } catch (error) {
      console.error('Error submitting gem:', error);
      setSubmitError(error instanceof Error ? error.message : 'Erro ao enviar o lugar. Por favor, tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddAnother = () => {
    setIsSubmitted(false);
    setSubmitError('');
    setSubmittedGemId('');
    // The form will be reset by the Form component when isSubmitted becomes false
  };

  return (
    <Layout title="Hidden Gem - Adicionar Local">
      <div className="relative overflow-hidden bg-white dark:bg-ink-800 py-12">
        <div className="hidden xl:block pointer-events-none absolute inset-0" aria-hidden="true">
          {/* Pin being dropped, left */}
          <svg className="absolute top-24 left-12 w-16 h-16 text-primary/25 -rotate-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.2}>
            <path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {/* Photo frame, left lower */}
          <svg className="absolute bottom-32 left-20 w-24 h-20 text-secondary/25 rotate-6" viewBox="0 0 100 80" fill="none" stroke="currentColor" strokeWidth={2}>
            <rect x="6" y="6" width="88" height="68" strokeDasharray="3 5" />
            <circle cx="30" cy="30" r="8" />
            <path d="M6 60l24-20 16 14 14-10 34 20" />
          </svg>
          {/* Star, right */}
          <svg className="absolute top-20 right-16 w-10 h-10 text-primary/25 rotate-12" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 1l2.6 7.9H23l-6.7 4.9L18.9 22 12 16.9 5.1 22l2.6-8.2L1 8.9h8.4z" />
          </svg>
          {/* Compass rose, right lower */}
          <svg className="absolute bottom-24 right-12 w-20 h-20 text-secondary/25 rotate-6" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <circle cx="50" cy="50" r="38" strokeDasharray="4 5" />
            <path d="M50 20L58 50L50 80L42 50Z" strokeWidth={1} />
          </svg>
          <span className="absolute top-1/2 left-8 w-1.5 h-1.5 rounded-full bg-primary/30" />
          <span className="absolute bottom-16 right-32 w-1 h-1 rounded-full bg-secondary/30" />
        </div>

        <div className="container mx-auto px-4 max-w-3xl relative">
          <div className="text-center mb-10">
            <h1 className="text-3xl font-display font-semibold mb-4 text-ink dark:text-sand-50">{t('submit.title')}</h1>
            <p className="text-ink/70 dark:text-sand-300 max-w-2xl mx-auto">
              {t('submit.subtitle')}
            </p>
          </div>

          {authLoading ? (
            <div className="text-center py-16">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto"></div>
            </div>
          ) : !user ? (
            <div className="polaroid bg-white dark:bg-ink-800 p-8 text-center -rotate-1">
              <div className="w-16 h-16 border-2 border-dashed border-primary rounded-full flex items-center justify-center mx-auto mb-4 -rotate-6">
                <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 11-12 0 6 6 0 0112 0zM12 12.75a3.75 3.75 0 00-3.75 3.75 3.75 3.75 0 007.5 0 3.75 3.75 0 00-3.75-3.75z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.5 20.25a8.25 8.25 0 0115 0" />
                </svg>
              </div>
              <h2 className="text-2xl font-display font-bold mb-2 text-ink dark:text-sand-50">
                {t('submit.login_required_title')}
              </h2>
              <p className="text-ink/70 dark:text-sand-300 mb-6 max-w-sm mx-auto">
                {t('submit.login_required_desc')}
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <Link href={`/login?redirect=${encodeURIComponent(router.asPath)}`}>
                  <a className="inline-block bg-primary text-white px-6 py-3 font-bold rotate-1 hover:rotate-0 transition-transform shadow-[4px_4px_0_rgba(59,42,30,0.18)]">
                    {t('submit.login_required_button')}
                  </a>
                </Link>
                <Link href={`/register?redirect=${encodeURIComponent(router.asPath)}`}>
                  <a className="inline-block bg-white dark:bg-ink-800 border-2 border-ink/15 dark:border-sand-100/20 text-ink/80 dark:text-sand-200 px-6 py-3 font-bold -rotate-1 hover:rotate-0 transition-transform">
                    {t('submit.login_required_register')}
                  </a>
                </Link>
              </div>
            </div>
          ) : isSubmitted ? (
            <div className="polaroid bg-white dark:bg-ink-800 p-8 text-center -rotate-1">
              <div className="w-16 h-16 border-2 border-dashed border-secondary rounded-full flex items-center justify-center mx-auto mb-4 -rotate-6">
                <svg className="w-8 h-8 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-display font-bold mb-2 text-ink dark:text-sand-50">{t('message.submit_success').split('.')[0]}!</h2>
              <p className="text-ink/70 dark:text-sand-300 mb-4">
                {t('message.submit_success')}
              </p>
              <p className="text-sm text-ink/50 dark:text-sand-300/70 mb-6">
                {t('message.submit_success_approval')}
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <Link href="/c/maputo">
                  <a className="inline-block bg-primary text-white px-6 py-3 font-bold rotate-1 hover:rotate-0 transition-transform shadow-[4px_4px_0_rgba(59,42,30,0.18)]">
                    {t('message.explore_more')}
                  </a>
                </Link>
                <button
                  onClick={handleAddAnother}
                  className="inline-block bg-white dark:bg-ink-800 border-2 border-ink/15 dark:border-sand-100/20 text-ink/80 dark:text-sand-200 px-6 py-3 font-bold -rotate-1 hover:rotate-0 transition-transform"
                >
                  {t('message.submit_another')}
                </button>
              </div>
            </div>
          ) : (
            <div className="polaroid bg-white dark:bg-ink-800 p-6 md:p-8 rotate-1">
              {submitError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-red-800">{submitError}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="mb-8 pb-8 border-b border-dashed border-sand-300 dark:border-ink-700">
                <h3 className="text-lg font-display font-semibold mb-4 text-ink dark:text-sand-50">{t('submit.guidelines_title')}</h3>
                <ul className="space-y-2 text-ink/70 dark:text-sand-300 text-sm">
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-secondary mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>{t('submit.guideline_1')}</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-secondary mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>{t('submit.guideline_2')}</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-secondary mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>{t('submit.guideline_3')}</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-secondary mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>{t('submit.guideline_4')}</span>
                  </li>
                </ul>
              </div>

              <Form onSubmit={handleSubmit} isSubmitting={isSubmitting} submitError={submitError} resetForm={!isSubmitted} />
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
