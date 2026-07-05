import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import GemCard from '../components/GemCard';
import SaveButton from '../components/SaveButton';
import { Gem } from '../lib/types';
import { GetStaticProps } from 'next';
import { getDb } from '../lib/db';
import { useLanguage } from '../contexts/LanguageContext';

interface WanderProps {
  gems: Gem[];
}

export default function WanderPage({ gems }: WanderProps) {
  const { t } = useLanguage();
  const [currentGemIndex, setCurrentGemIndex] = useState(0);
  const [seenGems, setSeenGems] = useState<number[]>([]);

  const handleNextGem = () => {
    setSeenGems(prev => [...prev, currentGemIndex]);
    
    // Find next unseen gem
    let nextIndex;
    const unseenIndices = gems.map((_, index) => index).filter(i => !seenGems.includes(i));
    
    if (unseenIndices.length === 0) {
      // All gems have been seen, reset
      setSeenGems([]);
      nextIndex = 0;
    } else {
      nextIndex = unseenIndices[Math.floor(Math.random() * unseenIndices.length)];
    }
    
    setCurrentGemIndex(nextIndex);
  };

  useEffect(() => {
    // Start with a random gem
    const randomIndex = Math.floor(Math.random() * gems.length);
    setCurrentGemIndex(randomIndex);
  }, [gems.length]);

  if (gems.length === 0) {
    return (
      <Layout title="Hidden Gem - Wander">
        <div className="bg-white dark:bg-ink-800 py-12">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-3xl font-display font-semibold mb-4 text-ink dark:text-sand-50">{t('wander.title')}</h1>
            <p className="text-ink/70 dark:text-sand-300">{t('wander.none_found')}</p>
          </div>
        </div>
      </Layout>
    );
  }

  const currentGem = gems[currentGemIndex];

  return (
    <Layout title="Hidden Gem - Wander">
      <div className="relative overflow-hidden bg-white dark:bg-ink-800 py-12">
        <div className="hidden xl:block pointer-events-none absolute inset-0" aria-hidden="true">
          {/* Winding dashed route, left */}
          <svg className="absolute top-1/3 left-10 w-32 h-40 text-secondary/25" viewBox="0 0 120 160" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M10 10C60 10 10 60 60 80S110 140 60 150" strokeDasharray="1 10" strokeLinecap="round" />
            <circle cx="60" cy="150" r="5" fill="currentColor" stroke="none" />
          </svg>
          {/* Compass rose, right */}
          <svg className="absolute top-24 right-16 w-24 h-24 text-primary/25 rotate-12" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <circle cx="50" cy="50" r="38" strokeDasharray="4 5" />
            <path d="M50 6v18M50 76v18M6 50h18M76 50h18" />
            <path d="M50 20L58 50L50 80L42 50Z" strokeWidth={1} />
          </svg>
          {/* Star, right lower */}
          <svg className="absolute bottom-20 right-24 w-10 h-10 text-secondary/25 -rotate-12" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 1l2.6 7.9H23l-6.7 4.9L18.9 22 12 16.9 5.1 22l2.6-8.2L1 8.9h8.4z" />
          </svg>
          <span className="absolute top-16 left-24 w-1.5 h-1.5 rounded-full bg-primary/30" />
          <span className="absolute bottom-24 left-16 w-2 h-2 rounded-full bg-secondary/25" />
        </div>

        <div className="container mx-auto px-4 relative">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-display font-semibold mb-2 text-ink dark:text-sand-50">{t('hero.wander_button')}</h1>
            <p className="text-ink/70 dark:text-sand-300">{t('wander.discover_random')}</p>
            <div className="text-sm text-ink/50 dark:text-sand-300/70 mt-2">
              {seenGems.length + 1} {t('wander.progress').replace('{total}', gems.length.toString())}
            </div>
          </div>

          <div className="max-w-2xl mx-auto">
            <div className="mb-8">
              <GemCard gem={currentGem} />
            </div>

            <div className="flex justify-center space-x-4">
              <SaveButton
                gemId={currentGem.id}
                className="bg-white dark:bg-ink-800 border-2 border-ink/15 dark:border-sand-100/20 px-6 py-3 font-bold -rotate-1 hover:rotate-0 transition-transform"
              />

              <button
                onClick={handleNextGem}
                className="flex items-center gap-2 bg-primary text-white px-6 py-3 font-bold rotate-1 hover:rotate-0 transition-transform shadow-[4px_4px_0_rgba(59,42,30,0.18)]"
              >
                {t('wander.next_place')}
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

export const getStaticProps: GetStaticProps<WanderProps> = async () => {
  try {
    // Wander picks a random real gem — only approved ones are public, same
    // filter as the main explore page.
    const db = getDb();
    const rows = db.prepare("SELECT * FROM gems WHERE status = 'approved'").all();

    const gems: Gem[] = rows.map((row: any) => {
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
      };
    });

    return {
      props: {
        gems,
      },
      revalidate: 60, // matches the explore page's cache window
    };
  } catch (error) {
    console.error('Error fetching gems for wander mode:', error);
    return {
      props: {
        gems: [],
      },
      revalidate: 60,
    };
  }
};