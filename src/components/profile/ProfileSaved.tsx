import Link from 'next/link';
import { useSavedGems } from '../../contexts/SavedGemsContext';
import { useEffect, useState } from 'react';
import { Gem } from '../../lib/types';
import GemCard from '../GemCard';
import { useLanguage } from '../../contexts/LanguageContext';

export default function ProfileSaved() {
  const { t } = useLanguage();
  const { savedGems } = useSavedGems();
  const [gems, setGems] = useState<Gem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/profile/saved')
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setGems(data))
      .catch((err) => console.error('Error loading saved gems:', err))
      .finally(() => setLoading(false));
    // Re-fetch whenever the saved-gems id list changes (e.g. unsaved from
    // this same page via the SaveButton on each card).
  }, [savedGems]);

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
        <p className="text-ink/50 dark:text-sand-300/70 mb-4">{t('profile.no_saved')}</p>
        <Link href="/c/maputo">
          <a className="text-primary font-bold hover:underline">{t('nav.explore')}</a>
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
      {gems.map((gem) => (
        <GemCard key={gem.id} gem={gem} />
      ))}
    </div>
  );
}
