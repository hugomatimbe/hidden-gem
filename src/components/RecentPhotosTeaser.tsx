import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useLanguage } from '../contexts/LanguageContext';

interface FeedPhoto {
  id: string;
  gemId: string;
  imageUrl: string;
  caption: string | null;
  posterName: string | null;
  gemTitle: string | null;
}

const TILTS = ['rotate-2', '-rotate-2', 'rotate-1', '-rotate-1', 'rotate-3', '-rotate-3'];
const tiltFor = (index: number) => TILTS[index % TILTS.length];

export default function RecentPhotosTeaser() {
  const { t } = useLanguage();
  const [photos, setPhotos] = useState<FeedPhoto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/photos?limit=8')
      .then((res) => (res.ok ? res.json() : { photos: [] }))
      .then((data) => setPhotos(data.photos || []))
      .catch((err) => console.error('Error loading recent photos:', err))
      .finally(() => setLoading(false));
  }, []);

  // Nothing to show yet (empty site) and not worth a loading skeleton for a
  // section that might just render empty — quietly show nothing instead.
  if (!loading && photos.length === 0) return null;

  return (
    <section className="py-16 bg-white dark:bg-ink-800">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-display font-semibold mb-4 text-ink dark:text-sand-50">
            {t('index.recent_photos_title')}
          </h2>
          <p className="text-ink/60 dark:text-sand-300 max-w-2xl mx-auto">{t('index.recent_photos_subtitle')}</p>
        </div>

        {loading ? (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-5">
            {photos.map((photo, index) => (
              <Link key={photo.id} href={`/g/${photo.gemId}`}>
                <a className={`polaroid block bg-white dark:bg-ink-800 p-1.5 pb-3 ${tiltFor(index)} hover:rotate-0 hover:-translate-y-1 transition-transform`}>
                  <div className="h-24 overflow-hidden">
                    <img src={photo.imageUrl} alt={photo.caption || photo.gemTitle || ''} className="w-full h-full object-cover" />
                  </div>
                  {photo.gemTitle && (
                    <p className="text-[11px] text-ink/50 dark:text-sand-300/60 truncate px-1 pt-2">{photo.gemTitle}</p>
                  )}
                </a>
              </Link>
            ))}
          </div>
        )}

        <div className="text-center mt-10">
          <Link href="/photos">
            <a className="inline-flex items-center text-primary font-medium hover:underline">
              {t('index.view_all_photos')}
              <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </a>
          </Link>
        </div>
      </div>
    </section>
  );
}
