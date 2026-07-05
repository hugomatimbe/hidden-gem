import { useRef, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';

export default function ProfileDetails() {
  const { user, refreshUser } = useAuth();
  const { t } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  if (!user) return null;

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    setError('');
    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append('images', file);
      const uploadRes = await fetch('/api/upload-images', { method: 'POST', body: formData });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok || !uploadData.urls?.[0]) {
        throw new Error('upload failed');
      }

      const patchRes = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatarUrl: uploadData.urls[0] }),
      });
      if (!patchRes.ok) throw new Error('patch failed');

      await refreshUser();
      setMessage(t('profile.saved'));
    } catch (err) {
      console.error('Error uploading avatar:', err);
      setError(t('profile.avatar_error'));
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setIsSaving(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || t('auth.generic_error'));
      } else {
        await refreshUser();
        setMessage(t('profile.saved'));
      }
    } catch (err) {
      console.error('Error updating profile:', err);
      setError(t('auth.generic_error'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-lg polaroid bg-white dark:bg-ink-800 p-8 -rotate-1">
      <div className="flex items-center gap-5 mb-8">
        <div className="relative">
          {user.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.displayName}
              className="w-20 h-20 rounded-full object-cover border-2 border-ink/10 dark:border-sand-100/20"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-primary/15 text-primary flex items-center justify-center font-display text-3xl">
              {user.displayName.charAt(0).toUpperCase()}
            </div>
          )}
          {uploadingAvatar && (
            <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
            </div>
          )}
        </div>
        <div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingAvatar}
            className="text-sm font-bold text-primary hover:underline disabled:opacity-50"
          >
            {t('profile.change_avatar')}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            className="hidden"
            onChange={handleAvatarChange}
          />
          <p className="text-xs text-ink/40 dark:text-sand-300/50 mt-1">{t('profile.avatar_hint')}</p>
        </div>
      </div>

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
          <label className="block text-sm font-medium text-ink/80 dark:text-sand-200 mb-1">{t('auth.email')}</label>
          <p className="px-4 py-2 text-ink/50 dark:text-sand-300/60 bg-sand-100 dark:bg-ink-700 rounded-lg">
            {user.email}
          </p>
        </div>

        <button
          type="submit"
          disabled={isSaving}
          className="bg-primary text-white px-5 py-2.5 font-bold rotate-1 hover:rotate-0 transition-transform shadow-[3px_3px_0_rgba(59,42,30,0.18)] disabled:opacity-50"
        >
          {isSaving ? t('profile.saving') : t('profile.save_changes')}
        </button>
      </form>
    </div>
  );
}
