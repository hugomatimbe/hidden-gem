import { useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

interface ReportButtonProps {
  gemId: string;
  className?: string;
}

const REASONS = ['spam', 'inappropriate', 'incorrect_info', 'closed', 'other'] as const;

// Mirrors SaveButton's "redirect to login if logged out" pattern, and
// VisitorPhotos' "expand an inline panel instead of a modal" pattern — kept
// as its own component (rather than inline in g/[slug].tsx) so the same
// report flow can be reused for comments/photos later without duplicating
// the form.
export default function ReportButton({ gemId, className = '' }: ReportButtonProps) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<(typeof REASONS)[number]>('spam');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleToggle = () => {
    if (!user) {
      router.push(`/login?redirect=${encodeURIComponent(router.asPath)}`);
      return;
    }
    setOpen((prev) => !prev);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setStatus('idle');
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetType: 'gem', targetId: gemId, reason, details: details.trim() || undefined }),
      });
      if (!res.ok) throw new Error('failed');
      setStatus('success');
      setDetails('');
    } catch (err) {
      console.error('Error submitting report:', err);
      setStatus('error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleToggle}
        className={className}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        {t('common.report')}
      </button>

      {open && (
        <div className="w-full mt-1 polaroid bg-white dark:bg-ink-800 p-5 rotate-0">
          {status === 'success' ? (
            <p className="text-sm text-green-700 dark:text-green-400">{t('report.success')}</p>
          ) : (
            <form onSubmit={handleSubmit}>
              <h4 className="font-display font-semibold text-ink dark:text-sand-50 mb-3">{t('report.title')}</h4>

              <label className="block text-sm font-medium text-ink/80 dark:text-sand-200 mb-1">
                {t('report.reason_label')}
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value as typeof reason)}
                className="w-full mb-3 px-3 py-2 border-2 border-ink/15 dark:border-sand-100/20 bg-white dark:bg-ink-900 text-ink dark:text-sand-100 text-sm"
              >
                {REASONS.map((r) => (
                  <option key={r} value={r}>
                    {t(`report.reason_${r}`)}
                  </option>
                ))}
              </select>

              <label className="block text-sm font-medium text-ink/80 dark:text-sand-200 mb-1">
                {t('report.details_label')}
              </label>
              <textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder={t('report.details_placeholder')}
                maxLength={500}
                rows={3}
                className="w-full mb-3 px-3 py-2 border-2 border-ink/15 dark:border-sand-100/20 bg-white dark:bg-ink-900 text-ink dark:text-sand-100 text-sm"
              />

              {status === 'error' && (
                <p className="text-sm text-primary-700 dark:text-primary-300 mb-3">{t('report.error')}</p>
              )}

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-primary text-white px-4 py-2 text-sm font-bold shadow-[3px_3px_0_rgba(59,42,30,0.18)] disabled:opacity-50"
                >
                  {submitting ? t('report.submitting') : t('report.submit')}
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="text-ink/60 dark:text-sand-300 px-2 text-sm"
                >
                  {t('report.cancel')}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </>
  );
}
