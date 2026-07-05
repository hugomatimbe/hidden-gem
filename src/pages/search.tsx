import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import GemCard from '../components/GemCard';
import SearchBox from '../components/SearchBox';
import { Gem } from '../lib/types';
import { useLanguage } from '../contexts/LanguageContext';

export default function SearchPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const q = typeof router.query.q === 'string' ? router.query.q : '';

  const [results, setResults] = useState<Gem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    if (!router.isReady) return;
    if (!q.trim()) {
      setResults([]);
      setSearched(false);
      return;
    }
    setLoading(true);
    fetch(`/api/search?q=${encodeURIComponent(q)}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setResults(data))
      .catch((err) => console.error('Error searching:', err))
      .finally(() => {
        setLoading(false);
        setSearched(true);
      });
  }, [q, router.isReady]);

  return (
    <Layout title={q ? `"${q}" - ${t('search.title')}` : t('search.title')}>
      <div className="container mx-auto px-4 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-display font-semibold mb-4 text-ink dark:text-sand-50">
            {q ? `${t('search.results_for')} "${q}"` : t('search.title')}
          </h1>
          <SearchBox initialQuery={q} className="max-w-md" />
        </div>

        {loading ? (
          <div className="text-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          </div>
        ) : searched && results.length === 0 ? (
          <p className="text-ink/50 dark:text-sand-300/70 text-center py-16">{t('search.no_results')}</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {results.map((gem) => (
              <GemCard key={gem.id} gem={gem} />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
