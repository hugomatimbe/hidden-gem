import { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';

export default function ProfilePassword() {
  const { t } = useLanguage();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (newPassword !== confirmPassword) {
      setError(t('auth.passwords_dont_match'));
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/profile/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || t('auth.generic_error'));
      } else {
        setMessage(t('profile.password_changed'));
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err) {
      console.error('Error changing password:', err);
      setError(t('auth.generic_error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-lg polaroid bg-white dark:bg-ink-800 p-8 rotate-1">
      {message && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-6">
          <p className="text-sm text-green-800">{message}</p>
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-6">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="currentPassword" className="block text-sm font-medium text-ink/80 dark:text-sand-200 mb-1">
            {t('profile.current_password')}
          </label>
          <input
            type="password"
            id="currentPassword"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
            className="w-full px-4 py-2 border border-sand-300 dark:border-ink-700 rounded-lg bg-white dark:bg-ink-900 text-ink dark:text-sand-100 focus:ring-primary focus:border-primary"
          />
        </div>

        <div>
          <label htmlFor="newPassword" className="block text-sm font-medium text-ink/80 dark:text-sand-200 mb-1">
            {t('auth.reset_new_password')}
          </label>
          <input
            type="password"
            id="newPassword"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
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
          className="bg-primary text-white px-5 py-2.5 font-bold rotate-1 hover:rotate-0 transition-transform shadow-[3px_3px_0_rgba(59,42,30,0.18)] disabled:opacity-50"
        >
          {isSubmitting ? t('profile.saving') : t('profile.change_password_button')}
        </button>
      </form>
    </div>
  );
}
