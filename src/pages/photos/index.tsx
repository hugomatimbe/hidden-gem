import { useEffect, useState } from 'react';
import Link from 'next/link';
import Layout from '../../components/Layout';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';

interface FeedPhoto {
  id: string;
  gemId: string;
  userId: string;
  imageUrl: string;
  caption: string | null;
  posterName: string | null;
  posterAvatar: string | null;
  gemTitle: string | null;
  createdAt: string;
}

const TILTS = ['rotate-2', '-rotate-2', 'rotate-1', '-rotate-1', 'rotate-3', '-rotate-3'];
const tiltFor = (index: number) => TILTS[index % TILTS.length];

const PAGE_SIZE = 24;

export default function PhotosPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [photos, setPhotos] = useState<FeedPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadPage = async (offset: number) => {
    const res = await fetch(`/api/photos?limit=${PAGE_SIZE}&offset=${offset}`);
    if (!res.ok) return { photos: [], hasMore: false };
    return res.json();
  };

  useEffect(() => {
    loadPage(0)
      .then((data) => {
        setPhotos(data.photos || []);
        setHasMore(!!data.hasMore);
      })
      .catch((err) => console.error('Error loading photos feed:', err))
      .finally(() => setLoading(false));
  }, []);

  const handleLoadMore = async () => {
    setLoadingMore(true);
    try {
      const data = await loadPage(photos.length);
      setPhotos((prev) => [...prev, ...(data.photos || [])]);
      setHasMore(!!data.hasMore);
    } catch (err) {
      console.error('Error loading more photos:', err);
    } finally {
      setLoadingMore(false);
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
    <Layout title={`${t('photos.feed_title')} - Hidden Gem`}>
      <div className="container mx-auto px-4 py-10 md:py-14">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-display font-semibold mb-4 text-ink dark:text-sand-50">
            {t('photos.feed_title')}
          </h1>
          <p className="text-ink/60 dark:text-sand-300 max-w-2xl mx-auto">{t('photos.feed_subtitle')}</p>
        </div>

        {loading ? (
          <div className="text-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto"></div>
          </div>
        ) : photos.length === 0 ? (
          <p className="text-center py-16 text-ink/50 dark:text-sand-300/70">{t('photos.feed_empty')}</p>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-8">
              {photos.map((photo, index) => (
                <div key={photo.id} className={`polaroid bg-white dark:bg-ink-800 p-2 pb-4 ${tiltFor(index)} hover:rotate-0 transition-transform`}>
                  <Link href={`/g/${photo.gemId}`}>
                    <a className="block relative h-40 overflow-hidden">
                      <img src={photo.imageUrl} alt={photo.caption || photo.gemTitle || ''} className="w-full h-full object-cover" />
                    </a>
                  </Link>
                  <div className="px-1 pt-3">
                    {photo.caption && (
                      <p className="text-sm text-ink/80 dark:text-sand-200 line-clamp-2 mb-1">{photo.caption}</p>
                    )}
                    {photo.gemTitle && (
                      <Link href={`/g/${photo.gemId}`}>
                        <a className="text-xs font-display italic text-primary dark:text-primary-300 hover:underline">
                          {photo.gemTitle}
                        </a>
                      </Link>
                    )}
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-[11px] text-ink/40 dark:text-sand-300/50 truncate">
                        {photo.posterName || t('admin.unknown_user')}
                      </p>
                      {(photo.userId === user?.id || user?.isAdmin) && (
                        <button
                          onClick={() => handleDelete(photo.id)}
                          disabled={busyId === photo.id}
                          className="text-[11px] text-red-600 dark:text-red-400 font-bold disabled:opacity-50 flex-shrink-0"
                        >
                          {t('admin.delete')}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {hasMore && (
              <div className="text-center mt-12">
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="bg-white dark:bg-ink-800 border-2 border-ink/15 dark:border-sand-100/20 text-ink dark:text-sand-50 px-6 py-2.5 font-bold rotate-1 hover:rotate-0 transition-transform disabled:opacity-50"
                >
                  {loadingMore ? t('photos.loading_more') : t('photos.load_more')}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
