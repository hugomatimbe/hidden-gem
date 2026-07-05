import { GetStaticProps } from 'next';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { getDb } from '../../lib/db';
import Layout from '../../components/Layout';
import GemCard from '../../components/GemCard';
import { Gem } from '../../lib/types';
import { useLanguage } from '../../contexts/LanguageContext';

function MapLoading() {
  const { t } = useLanguage();
  return (
    <div className="w-full h-full bg-sand-100 dark:bg-ink-700 flex items-center justify-center">
      <p className="text-ink/50 dark:text-sand-300/70">{t('common.loading_map')}</p>
    </div>
  );
}

// maplibre-gl touches `window` at module-load time, which crashes Next.js's
// server-side render — load it client-only.
const Map = dynamic(() => import('../../components/Map'), { ssr: false, loading: MapLoading });

interface MaputoProps {
  gems: Gem[];
}

export default function MaputoPage({ gems: initialGems }: MaputoProps) {
  const router = useRouter();
  const { t } = useLanguage();
  const [selectedGem, setSelectedGem] = useState<Gem | null>(null);
  const [gems, setGems] = useState<Gem[]>(initialGems);
  const [isLoading, setIsLoading] = useState(!initialGems.length);
  const [view, setView] = useState<'grid' | 'map'>('grid');
  const [filters, setFilters] = useState({
    category: 'all',
    sort: 'trending'
  });

  // Fetch gems data on client side if not provided
  useEffect(() => {
    if (!initialGems.length) {
      const fetchGems = async () => {
        try {
          setIsLoading(true);
          const response = await fetch('/api/gems');
          if (response.ok) {
            const gemsData = await response.json();
            setGems(gemsData);
          }
        } catch (error) {
          console.error('Error fetching gems:', error);
        } finally {
          setIsLoading(false);
        }
      };
      fetchGems();
    }
  }, [initialGems.length]);

  // When a map marker is clicked, jump to the grid view and scroll to that gem's card
  useEffect(() => {
    if (view === 'grid' && selectedGem) {
      const el = document.getElementById(`gem-${selectedGem.id}`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [view, selectedGem]);

  // Parse query parameters on initial load and when they change
  useEffect(() => {
    const { category, tag } = router.query;
    if (category && typeof category === 'string') {
      setFilters(prev => ({ ...prev, category }));
    } else if (!category) {
      setFilters(prev => ({ ...prev, category: 'all' }));
    }

    // Handle tag filtering
    if (tag && typeof tag === 'string') {
      setFilters(prev => ({ ...prev, category: 'all' })); // Show all categories when filtering by tag
    }
  }, [router.query]);

  const categories = [
    { id: 'all', name: t('maputo.all') },
    { id: 'restaurant', name: t('category.restaurant') },
    { id: 'bar', name: t('category.bar') },
    { id: 'natureza', name: t('category.nature') },
    { id: 'arte', name: t('category.art') },
    { id: 'vista', name: t('category.view') },
    { id: 'peculiar', name: t('category.peculiar') },
  ];

  const sortOptions = [
    { id: 'trending', name: t('maputo.popular') },
    { id: 'newest', name: t('maputo.newest') },
    { id: 'topRated', name: t('maputo.top_rated') },
    { id: 'closest', name: t('maputo.closest') },
  ];

  // Filter gems based on category and tag
  const filteredGems = gems.filter(gem => {
    const categoryMatch = filters.category === 'all' || gem.category === filters.category;
    const tagMatch = !router.query.tag || gem.tags.includes(router.query.tag as string);
    return categoryMatch && tagMatch;
  });

  // Sort gems based on filters.sort
  const displayGems = [...filteredGems].sort((a, b) => {
    switch (filters.sort) {
      case 'newest':
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case 'topRated':
        // For now, sort by number of tags as a proxy for popularity
        return b.tags.length - a.tags.length;
      case 'closest':
        // Sort by distance from center of Maputo (approximate)
        const center = { lat: -25.9655, lng: 32.6086 };
        const distanceA = Math.sqrt(
          Math.pow(a.location.lat - center.lat, 2) + Math.pow(a.location.lng - center.lng, 2)
        );
        const distanceB = Math.sqrt(
          Math.pow(b.location.lat - center.lat, 2) + Math.pow(b.location.lng - center.lng, 2)
        );
        return distanceA - distanceB;
      case 'trending':
      default:
        // Sort by most recently updated first
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    }
  });

  return (
    <Layout title="Hidden Gem - Lugares de Maputo">
      <div className="bg-white dark:bg-ink-800 py-4 border-b border-sand-200 dark:border-ink-700">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-display font-semibold text-ink dark:text-sand-50">{t('maputo.title')}</h1>
              <p className="text-ink/70 dark:text-sand-300">{gems.length} {t('maputo.secret_places')}</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={filters.category}
                onChange={(e) => {
                  const newCategory = e.target.value;
                  setFilters({...filters, category: newCategory});
                  // Update URL
                  const query = newCategory !== 'all' ? { category: newCategory } : {};
                  router.push({
                    pathname: '/c/maputo',
                    query
                  }, undefined, { shallow: true });
                }}
                className="px-3 py-2 border border-sand-300 dark:border-ink-700 dark:bg-ink-800 dark:text-sand-100 rounded-lg text-sm"
              >
                {categories.map(category => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>

              <select
                value={filters.sort}
                onChange={(e) => setFilters({...filters, sort: e.target.value})}
                className="px-3 py-2 border border-sand-300 dark:border-ink-700 dark:bg-ink-800 dark:text-sand-100 rounded-lg text-sm"
              >
                {sortOptions.map(option => (
                  <option key={option.id} value={option.id}>{option.name}</option>
                ))}
              </select>

              {/* Grid / Map toggle */}
              <div className="flex gap-1.5 ml-1">
                <button
                  onClick={() => setView('grid')}
                  className={`px-4 py-2 text-sm font-bold transition-transform ${
                    view === 'grid'
                      ? 'bg-primary text-white rotate-1 shadow-[3px_3px_0_rgba(59,42,30,0.18)]'
                      : 'bg-white dark:bg-ink-800 border-2 border-ink/15 dark:border-sand-100/20 text-ink/70 dark:text-sand-300 -rotate-1 hover:rotate-0'
                  }`}
                >
                  {t('maputo.view_grid')}
                </button>
                <button
                  onClick={() => setView('map')}
                  className={`px-4 py-2 text-sm font-bold transition-transform ${
                    view === 'map'
                      ? 'bg-primary text-white -rotate-1 shadow-[3px_3px_0_rgba(59,42,30,0.18)]'
                      : 'bg-white dark:bg-ink-800 border-2 border-ink/15 dark:border-sand-100/20 text-ink/70 dark:text-sand-300 rotate-1 hover:rotate-0'
                  }`}
                >
                  {t('maputo.view_map')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-sand-50 dark:bg-ink-900">
        <div className="container mx-auto px-4 py-8">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-ink/70 dark:text-sand-300">{t('maputo.loading_places')}</p>
            </div>
          ) : displayGems.length === 0 ? (
            <div className="text-center py-12">
              <h3 className="text-xl font-display font-medium mb-2 text-ink dark:text-sand-50">{t('message.no_places')}</h3>
              <p className="text-ink/70 dark:text-sand-300 mb-4">{t('message.no_places_suggestion')}</p>
              <Link href="/submit">
                <a className="inline-block bg-primary text-white px-4 py-2 font-bold rotate-1 hover:rotate-0 transition-transform shadow-[3px_3px_0_rgba(59,42,30,0.18)]">
                  {t('message.add_first_place')}
                </a>
              </Link>
            </div>
          ) : view === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {displayGems.map(gem => (
                <div key={gem.id} id={`gem-${gem.id}`}>
                  <GemCard gem={gem} showDistance={true} />
                </div>
              ))}
            </div>
          ) : (
            <div className="polaroid h-[calc(100vh-220px)] overflow-hidden rotate-0">
              <Map
                gems={displayGems}
                onGemClick={(gem) => {
                  setSelectedGem(gem);
                  setView('grid');
                }}
              />
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

export async function getStaticProps() {
  try {
    // Read gems directly from database — only approved ones are public.
    const db = getDb();

    const rows = db.prepare("SELECT * FROM gems WHERE status = 'approved'").all();

    // Parse JSON fields and booleans
    const gems = rows.map((row: any) => {
      const { lat, lng, address, ...rest } = row;
      return {
        ...rest,
        location: {
          lat: Number(lat),
          lng: Number(lng),
          address: address || null,
        },
        tags: JSON.parse(row.tags),
        images: row.images ? JSON.parse(row.images) : [],
        isAnonymous: !!row.isAnonymous,
        wheelchairAccessible: !!row.wheelchairAccessible,
        familyFriendly: !!row.familyFriendly,
        petFriendly: !!row.petFriendly,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      };
    });

    return {
      props: {
        gems
      },
      revalidate: 60 // Revalidate every minute
    };
  } catch (error) {
    console.error('Error fetching gems:', error);
    return {
      props: {
        gems: []
      }
    };
  }
}
