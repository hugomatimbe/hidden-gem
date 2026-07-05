import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Gem } from '../../lib/types';
import { useLanguage } from '../../contexts/LanguageContext';

interface MyGem extends Gem {
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason: string | null;
}

export default function ProfileMyGems() {
  const { t } = useLanguage();
  const [gems, setGems] = useState<MyGem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/profile/gems')
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setGems(data))
      .catch((err) => console.error('Error loading my gems:', err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
      </div>
    );
  }

  if (gems.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-ink/50 dark:text-sand-300/70 mb-4">{t('profile.no_gems')}</p>
        <Link href="/submit">
          <a className="text-primary font-bold hover:underline">{t('nav.add')}</a>
        </Link>
      </div>
    );
  }

  const statusLabel = (status: MyGem['status']) => {
    if (status === 'approved') return t('admin.gems_filter_approved');
    if (status === 'rejected') return t('admin.gems_filter_rejected');
    return t('admin.gems_filter_pending');
  };

  const statusClasses = (status: MyGem['status']) => {
    if (status === 'approved') return 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300';
    if (status === 'rejected') return 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300';
    return 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300';
  };

  return (
    <div className="space-y-5 max-w-2xl">
      {gems.map((gem, index) => {
        const info = (
          <div className="flex gap-4">
            {gem.images?.[0] && (
              <img src={gem.images[0]} alt={gem.title} className="w-24 h-24 object-cover flex-shrink-0" />
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h3 className="font-display font-semibold text-ink dark:text-sand-50">{gem.title}</h3>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${statusClasses(gem.status)}`}>
                  {statusLabel(gem.status)}
                </span>
              </div>
              <p className="text-sm text-ink/60 dark:text-sand-300 line-clamp-2">{gem.description}</p>
              {gem.status === 'rejected' && gem.rejectionReason && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-2">{gem.rejectionReason}</p>
              )}
              {gem.status === 'pending' && (
                <p className="text-xs text-ink/40 dark:text-sand-300/50 mt-2">{t('profile.pending_note')}</p>
              )}
            </div>
          </div>
        );

        return (
          <div
            key={gem.id}
            className={`polaroid bg-white dark:bg-ink-800 p-5 ${index % 2 === 0 ? 'rotate-1' : '-rotate-1'}`}
          >
            {/* Only approved gems have a live public page — pending/rejected
                ones 404 (getStaticProps filters them out), so don't link
                those to the detail page; editing is still always available. */}
            {gem.status === 'approved' ? (
              <Link href={`/g/${gem.id}`}>
                <a className="block hover:opacity-90 transition-opacity">{info}</a>
              </Link>
            ) : (
              info
            )}
            <div className="mt-3 pt-3 border-t border-sand-200 dark:border-ink-700">
              <Link href={`/g/${gem.id}/edit`}>
                <a className="text-xs font-bold text-primary dark:text-primary-300 hover:underline">
                  {t('gem_detail.edit')}
                </a>
              </Link>
            </div>
          </div>
        );
      })}
    </div>
  );
}
