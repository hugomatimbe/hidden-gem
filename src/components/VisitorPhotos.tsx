import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

interface VisitorPhoto {
  id: string;
  gemId: string;
  userId: string;
  imageUrl: string;
  caption: string | null;
  createdAt: string;
  posterName: string | null;
  posterAvatar: string | null;
}

const TILTS = ['rotate-2', '-rotate-2', 'rotate-1', '-rotate-1', 'rotate-3'];
const tiltFor = (index: number) => TILTS[index % TILTS.length];

interface VisitorPhotosProps {
  gemId: string;
}

export default function VisitorPhotos({ gemId }: VisitorPhotosProps) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [photos, setPhotos] = useState<VisitorPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [caption, setCaption] = useState('');
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/gems/${gemId}/photos`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setPhotos(data))
      .catch((err) => console.error('Error loading photos:', err))
      .finally(() => setLoading(false));
  }, [gemId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) setPendingFile(file);
  };

  const handlePost = async () => {
    if (!pendingFile) return;
    setError('');
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('images', pendingFile);
      const uploadRes = await fetch('/api/upload-images', { method: 'POST', body: formData });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok || !uploadData.urls?.[0]) throw new Error('upload failed');

      const res = await fetch(`/api/gems/${gemId}/photos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: uploadData.urls[0], caption: caption.trim() || undefined }),
      });
      const photo = await res.json();
      if (!res.ok) throw new Error(photo.error || 'post failed');

      setPhotos((prev) => [photo, ...prev]);
      setPendingFile(null);
      setCaption('');
    } catch (err) {
      console.error('Error posting photo:', err);
      setError(t('photos.upload_error'));
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('photos.confirm_delete'))) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/photos/${id}`, { method: 'DELETE' });
      if (res.ok) setPhotos((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      console.error('Error deleting photo:', err);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="polaroid bg-white dark:bg-ink-800 p-6 -rotate-1">
      <h3 className="text-xl font-display italic font-semibold mb-4 text-ink dark:text-sand-50">
        {t('photos.title')} ({photos.length})
      </h3>

      {/* Add a photo */}
      {!user ? (
        <div className="border-2 border-dashed border-ink/15 dark:border-sand-100/20 px-4 py-3 mb-6 flex items-center justify-between gap-3 flex-wrap">
          <p className="text-sm text-ink/60 dark:text-sand-300">{t('photos.login_required')}</p>
          <Link href={`/login?redirect=${encodeURIComponent(router.asPath)}`}>
            <a className="text-primary text-sm font-bold hover:underline flex-shrink-0">{t('nav.login')}</a>
          </Link>
        </div>
      ) : (
        <div className="mb-6">
          {error && <p className="text-primary-700 dark:text-primary-300 text-sm mb-2">{error}</p>}
          {pendingFile ? (
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder={t('photos.caption_placeholder')}
                maxLength={200}
                className="flex-grow px-4 py-2 border-2 border-ink/15 dark:border-sand-100/20 bg-white dark:bg-ink-900 text-ink dark:text-sand-100 focus:ring-primary focus:border-primary text-sm"
              />
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={handlePost}
                  disabled={uploading}
                  className="bg-primary text-white px-4 py-2 text-sm font-bold shadow-[3px_3px_0_rgba(59,42,30,0.18)] disabled:opacity-50"
                >
                  {uploading ? t('photos.posting') : t('photos.post')}
                </button>
                <button
                  onClick={() => {
                    setPendingFile(null);
                    setCaption('');
                  }}
                  disabled={uploading}
                  className="text-ink/60 dark:text-sand-300 px-2"
                >
                  ×
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full sm:w-auto border-2 border-dashed border-ink/25 dark:border-sand-100/25 text-ink/70 dark:text-sand-200 px-4 py-2.5 text-sm font-bold hover:border-primary hover:text-primary transition-colors"
            >
              + {t('photos.add')}
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      )}

      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
        </div>
      ) : photos.length === 0 ? (
        <p className="text-ink/50 dark:text-sand-300/70 text-center py-4">{t('photos.empty')}</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
          {photos.map((photo, index) => (
            <div key={photo.id} className={`polaroid bg-white dark:bg-ink-800 p-1.5 pb-3 ${tiltFor(index)} hover:rotate-0 transition-transform`}>
              <div className="relative">
                <img src={photo.imageUrl} alt={photo.caption || ''} className="w-full h-28 object-cover" />
                {(photo.userId === user?.id || user?.isAdmin) && (
                  <button
                    onClick={() => handleDelete(photo.id)}
                    disabled={busyId === photo.id}
                    className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/50 text-white text-xs flex items-center justify-center hover:bg-black/70 disabled:opacity-50"
                    aria-label="Delete"
                  >
                    ×
                  </button>
                )}
              </div>
              <div className="px-1 pt-2">
                {photo.caption && (
                  <p className="text-xs text-ink/70 dark:text-sand-300 line-clamp-2 mb-1">{photo.caption}</p>
                )}
                <p className="text-[11px] text-ink/40 dark:text-sand-300/50 truncate">{photo.posterName || t('admin.unknown_user')}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
