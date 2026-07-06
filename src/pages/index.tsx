import { GetStaticProps } from 'next';
import Layout from '../components/Layout';
import GemCard from '../components/GemCard';
import RecentPhotosTeaser from '../components/RecentPhotosTeaser';
import Link from 'next/link';
import { getDb } from '../lib/db';
import { Gem } from '../lib/types';
import { useLanguage } from '../contexts/LanguageContext';

const FEATURED_LIMIT = 6;

interface HomeProps {
  featuredGems: Gem[];
}

export default function Home({ featuredGems }: HomeProps) {
  const { t } = useLanguage();
  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-sand-50 dark:bg-ink-900 py-16 md:py-24">
        {/* Decorative scrapbook doodles filling the empty margins — purely
            ambient, hidden on small screens where there's no spare room. */}
        <div className="hidden lg:block pointer-events-none absolute inset-0" aria-hidden="true">
          {/* Compass rose, top-left */}
          <svg className="absolute top-16 left-10 w-24 h-24 text-primary/25 rotate-6" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <circle cx="50" cy="50" r="38" strokeDasharray="4 5" />
            <path d="M50 6v18M50 76v18M6 50h18M76 50h18" />
            <path d="M50 20L58 50L50 80L42 50Z" strokeWidth={1} />
            <circle cx="50" cy="50" r="3" fill="currentColor" stroke="none" />
          </svg>

          {/* Dashed travel route ending in a pin, bottom-left */}
          <svg className="absolute bottom-12 left-16 w-40 h-28 text-secondary/30" viewBox="0 0 160 110" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M4 100C40 100 30 40 70 40S110 10 150 14" strokeDasharray="1 10" strokeLinecap="round" />
            <circle cx="150" cy="14" r="5" fill="currentColor" stroke="none" />
          </svg>

          {/* Postage-stamp square, top-right */}
          <svg className="absolute top-12 right-14 w-28 h-28 text-primary/25 -rotate-6" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <rect x="8" y="8" width="84" height="84" strokeDasharray="3 5" />
            <path d="M50 30a14 14 0 100 28 14 14 0 000-28z" />
            <path d="M50 30v-6M50 64v6" />
          </svg>

          {/* Small star, right side */}
          <svg className="absolute top-1/2 right-24 w-10 h-10 text-secondary/30 rotate-12" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 1l2.6 7.9H23l-6.7 4.9L18.9 22 12 16.9 5.1 22l2.6-8.2L1 8.9h8.4z" />
          </svg>

          {/* Second star, mid-left */}
          <svg className="absolute top-[38%] left-[15%] w-7 h-7 text-primary/25 -rotate-12" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 1l2.6 7.9H23l-6.7 4.9L18.9 22 12 16.9 5.1 22l2.6-8.2L1 8.9h8.4z" />
          </svg>

          {/* X marks the spot, bottom-center-left */}
          <svg className="absolute bottom-16 left-[30%] w-10 h-10 text-primary/30 -rotate-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
            <path d="M4 4l16 16M20 4L4 20" strokeDasharray="1 6" />
          </svg>

          {/* Paper airplane, bottom-right */}
          <svg className="absolute bottom-20 right-[12%] w-12 h-12 text-secondary/30 rotate-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4}>
            <path d="M21 3L3 10.5l7 2.5m11-10L13 21l-3-8m11-10L10 13" strokeLinejoin="round" />
          </svg>

          {/* Thin dashed flight path arcing across the top */}
          <svg className="absolute top-24 left-1/4 w-1/2 h-16 text-primary/15" viewBox="0 0 400 60" fill="none" stroke="currentColor" strokeWidth={1.5} preserveAspectRatio="none">
            <path d="M0 50C120 10 280 10 400 50" strokeDasharray="1 9" strokeLinecap="round" />
          </svg>

          {/* Folded postcard corner, bottom-left */}
          <svg className="absolute bottom-8 left-8 w-14 h-14 text-secondary/20" viewBox="0 0 60 60" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <path d="M4 4h52v52" strokeDasharray="2 6" />
            <path d="M4 4L34 34" />
          </svg>

          {/* Scattered paper-grain flecks */}
          <span className="absolute top-24 right-40 w-1.5 h-1.5 rounded-full bg-primary/30" />
          <span className="absolute bottom-24 right-1/3 w-2 h-2 rounded-full bg-secondary/25" />
          <span className="absolute top-1/3 left-24 w-1.5 h-1.5 rounded-full bg-primary/25" />
          <span className="absolute bottom-32 right-16 w-1 h-1 rounded-full bg-sand-300/60 dark:bg-sand-200/40" />
          <span className="absolute top-[14%] left-[38%] w-1 h-1 rounded-full bg-primary/25" />
          <span className="absolute top-[62%] left-[8%] w-1.5 h-1.5 rounded-full bg-secondary/30" />
          <span className="absolute top-[20%] right-[28%] w-1 h-1 rounded-full bg-secondary/25" />
          <span className="absolute bottom-[8%] right-[38%] w-2 h-2 rounded-full bg-primary/20" />
          <span className="absolute top-[55%] right-[8%] w-1.5 h-1.5 rounded-full bg-primary/25" />
          <span className="absolute bottom-[30%] left-[42%] w-1 h-1 rounded-full bg-secondary/25" />
        </div>

        <div className="container mx-auto px-4 text-center relative">
          <div className="inline-block polaroid bg-white dark:bg-ink-800 p-3 pb-6 -rotate-2 mb-10">
            {/* Fixed width (w-64) made the card feel small and adrift on
                narrow phones, with a lot of unused space around it that
                doesn't show up on wider screens. Scaling with the viewport
                (capped at the old desktop size) fixes that, and aspect-[8/5]
                keeps the same crop at every width so the pin stays over
                open water instead of drifting onto the boat. */}
            <div className="relative w-[min(80vw,20rem)] sm:w-80 aspect-[8/5] bg-primary-100 dark:bg-ink-700 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://images.unsplash.com/photo-1650876095496-e01d50a6c874?w=800&q=80&fm=jpg&fit=crop&auto=format"
                alt={t('hero.subtitle')}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
              <svg className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-9 h-9 text-primary drop-shadow-[0_1px_4px_rgba(0,0,0,0.6)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <p className="font-display italic text-ink/70 dark:text-sand-300 text-sm mt-4 max-w-xs">
              &ldquo;{t('hero.subtitle')}&rdquo;
            </p>
          </div>

          <h1 className="text-4xl md:text-5xl font-display font-semibold mb-10 text-ink dark:text-sand-50 max-w-2xl mx-auto">
            {t('hero.title')}
          </h1>

          <div className="flex flex-col sm:flex-row justify-center gap-5">
            <Link href="/c/maputo">
              <a className="bg-primary text-white px-8 py-3 font-bold rotate-1 hover:rotate-0 transition-transform shadow-[4px_4px_0_rgba(59,42,30,0.18)]">
                {t('hero.explore_button')}
              </a>
            </Link>
            <Link href="/submit">
              <a className="bg-white dark:bg-ink-800 border-2 border-ink dark:border-sand-100 text-ink dark:text-sand-50 px-8 py-3 font-bold -rotate-1 hover:rotate-0 transition-transform shadow-[4px_4px_0_rgba(59,42,30,0.18)]">
                {t('hero.share_button')}
              </a>
            </Link>
            <Link href="/wander">
              <a className="bg-secondary text-white px-8 py-3 font-bold rotate-1 hover:rotate-0 transition-transform shadow-[4px_4px_0_rgba(59,42,30,0.18)] flex items-center justify-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {t('hero.wander_button')}
            </a>
            </Link>
          </div>
        </div>
      </section>

      {/* Featured Gems */}
      <section className="py-16 bg-sand-50 dark:bg-ink-900">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-display font-semibold mb-4 text-ink dark:text-sand-50">{t('index.featured_title')}</h2>
            <p className="text-ink/60 dark:text-sand-300 max-w-2xl mx-auto">
              {t('index.featured_subtitle')}
            </p>
          </div>

          {featuredGems.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-ink/50 dark:text-sand-300/70 mb-4">{t('index.featured_empty')}</p>
              <Link href="/submit">
                <a className="bg-primary text-white px-6 py-2.5 inline-block font-bold rotate-1 hover:rotate-0 transition-transform shadow-[3px_3px_0_rgba(59,42,30,0.18)]">
                  {t('hero.share_button')}
                </a>
              </Link>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {featuredGems.map(gem => (
                  <GemCard key={gem.id} gem={gem} />
                ))}
              </div>

              <div className="text-center mt-12">
                <Link href="/c/maputo">
                  <a className="inline-flex items-center text-primary font-medium hover:underline">
                    {t('index.view_all_maputo')}
                    <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </a>
                </Link>
              </div>
            </>
          )}
        </div>
      </section>

      {/* Categories */}
      <section className="py-16 bg-white dark:bg-ink-800">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-display font-semibold mb-4 text-ink dark:text-sand-50">{t('index.categories_title')}</h2>
            <p className="text-ink/60 dark:text-sand-300 max-w-2xl mx-auto">
              {t('index.categories_subtitle')}
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-5">
            <Link href="/c/maputo?category=comida">
              <a className="polaroid block bg-white dark:bg-ink-800 p-4 text-center rotate-1 hover:rotate-0 transition-transform">
                <div className="text-3xl mb-2">🍽️</div>
                <h3 className="font-display font-semibold text-ink dark:text-sand-50">{t('category.restaurant')}</h3>
              </a>
            </Link>
            <Link href="/c/maputo?category=natureza">
              <a className="polaroid block bg-white dark:bg-ink-800 p-4 text-center -rotate-2 hover:rotate-0 transition-transform">
                <div className="text-3xl mb-2">🌿</div>
                <h3 className="font-display font-semibold text-ink dark:text-sand-50">{t('category.nature')}</h3>
              </a>
            </Link>
            <Link href="/c/maputo?category=arte">
              <a className="polaroid block bg-white dark:bg-ink-800 p-4 text-center rotate-2 hover:rotate-0 transition-transform">
                <div className="text-3xl mb-2">🎨</div>
                <h3 className="font-display font-semibold text-ink dark:text-sand-50">{t('category.art')}</h3>
              </a>
            </Link>
            <Link href="/c/maputo?category=vista">
              <a className="polaroid block bg-white dark:bg-ink-800 p-4 text-center -rotate-1 hover:rotate-0 transition-transform">
                <div className="text-3xl mb-2">🌅</div>
                <h3 className="font-display font-semibold text-ink dark:text-sand-50">{t('category.view')}</h3>
              </a>
            </Link>
            <Link href="/c/maputo?category=peculiar">
              <a className="polaroid block bg-white dark:bg-ink-800 p-4 text-center rotate-1 hover:rotate-0 transition-transform">
                <div className="text-3xl mb-2">🤔</div>
                <h3 className="font-display font-semibold text-ink dark:text-sand-50">{t('category.peculiar')}</h3>
              </a>
            </Link>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-16 bg-sand-50 dark:bg-ink-900">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-display font-semibold mb-4 text-ink dark:text-sand-50">{t('index.how_it_works_title')}</h2>
            <p className="text-ink/60 dark:text-sand-300 max-w-2xl mx-auto">
              {t('index.how_it_works_subtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="polaroid text-center p-6 bg-white dark:bg-ink-800 rotate-1 hover:rotate-0 transition-transform">
              <div className="w-14 h-14 border-2 border-dashed border-primary rounded-full flex items-center justify-center mx-auto mb-4 rotate-[-6deg]">
                <span className="text-2xl font-display font-bold text-primary">1</span>
              </div>
              <h3 className="text-xl font-display font-semibold mb-2 text-ink dark:text-sand-50">{t('index.discover_title')}</h3>
              <p className="text-ink/60 dark:text-sand-300">
                {t('index.discover_desc')}
              </p>
            </div>

            <div className="polaroid text-center p-6 bg-white dark:bg-ink-800 -rotate-1 hover:rotate-0 transition-transform">
              <div className="w-14 h-14 border-2 border-dashed border-primary rounded-full flex items-center justify-center mx-auto mb-4 rotate-[4deg]">
                <span className="text-2xl font-display font-bold text-primary">2</span>
              </div>
              <h3 className="text-xl font-display font-semibold mb-2 text-ink dark:text-sand-50">{t('index.share_title')}</h3>
              <p className="text-ink/60 dark:text-sand-300">
                {t('index.share_desc')}
              </p>
            </div>

            <div className="polaroid text-center p-6 bg-white dark:bg-ink-800 rotate-2 hover:rotate-0 transition-transform">
              <div className="w-14 h-14 border-2 border-dashed border-primary rounded-full flex items-center justify-center mx-auto mb-4 rotate-[-3deg]">
                <span className="text-2xl font-display font-bold text-primary">3</span>
              </div>
              <h3 className="text-xl font-display font-semibold mb-2 text-ink dark:text-sand-50">{t('index.vote_title')}</h3>
              <p className="text-ink/60 dark:text-sand-300">
                {t('index.vote_desc')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Lists */}
      <section className="py-16 bg-white dark:bg-ink-800">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-display font-semibold mb-4 text-ink dark:text-sand-50">{t('index.lists_title')}</h2>
            <p className="text-ink/60 dark:text-sand-300 max-w-2xl mx-auto">
              {t('index.lists_subtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Link href="/lists">
              <a className="polaroid block bg-white dark:bg-ink-800 p-2.5 pb-4 rotate-1 hover:rotate-0 hover:-translate-y-1 transition-transform">
                <div className="h-40 bg-primary-400 flex items-center justify-center">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9h13v5a4 4 0 01-4 4H7a4 4 0 01-4-4V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 10h1.5a2.5 2.5 0 010 5H16" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 4v2M10 4v2M13 4v2" />
                  </svg>
                </div>
                <div className="pt-3 px-1">
                  <h3 className="text-xl font-display font-semibold mb-2 text-ink dark:text-sand-50">{t('index.cafes_list_title')}</h3>
                  <p className="text-ink/60 dark:text-sand-300">{t('index.cafes_list_desc')}</p>
                </div>
              </a>
            </Link>
            <Link href="/lists">
              <a className="polaroid block bg-white dark:bg-ink-800 p-2.5 pb-4 -rotate-1 hover:rotate-0 hover:-translate-y-1 transition-transform">
                <div className="h-40 bg-secondary-500 flex items-center justify-center">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 15h18M5.5 15a6.5 6.5 0 0113 0M8 11l-1.5-1.5M16 11l1.5-1.5M12 6V4M3 19h18" />
                  </svg>
                </div>
                <div className="pt-3 px-1">
                  <h3 className="text-xl font-display font-semibold mb-2 text-ink dark:text-sand-50">{t('index.views_list_title')}</h3>
                  <p className="text-ink/60 dark:text-sand-300">{t('index.views_list_desc')}</p>
                </div>
              </a>
            </Link>
          </div>

          <div className="text-center mt-8">
            <Link href="/lists">
              <a className="inline-flex items-center text-primary font-medium hover:underline">
                {t('index.view_all_lists')}
                <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </a>
            </Link>
          </div>
        </div>
      </section>

      {/* Recent Photos */}
      <RecentPhotosTeaser />

      {/* Newsletter */}
      <section className="relative overflow-hidden py-16 bg-sand-50 dark:bg-ink-900">
        <div className="hidden lg:block pointer-events-none absolute inset-0" aria-hidden="true">
          {/* Envelope, left */}
          <svg className="absolute top-10 left-16 w-20 h-16 text-secondary/25 -rotate-6" viewBox="0 0 100 70" fill="none" stroke="currentColor" strokeWidth={2}>
            <rect x="6" y="10" width="88" height="56" rx="2" strokeDasharray="3 5" />
            <path d="M10 14L50 46L90 14" />
          </svg>
          {/* Pin drop, right */}
          <svg className="absolute bottom-10 right-20 w-14 h-14 text-primary/25 rotate-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.2}>
            <path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="absolute top-1/2 left-1/4 w-1.5 h-1.5 rounded-full bg-secondary/25" />
          <span className="absolute bottom-16 left-40 w-1 h-1 rounded-full bg-primary/30" />
          <span className="absolute top-16 right-40 w-2 h-2 rounded-full bg-secondary/20" />
        </div>

        <div className="container mx-auto px-4 relative">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-3xl font-display font-semibold mb-4 text-ink dark:text-sand-50">{t('index.newsletter_title')}</h2>
            <p className="text-ink/60 dark:text-sand-300 mb-8">
              {t('index.newsletter_subtitle')}
            </p>

            <form className="flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                placeholder={t('common.email_placeholder')}
                className="flex-grow px-4 py-3 border-2 border-ink/20 dark:border-sand-100/30 bg-white dark:bg-ink-800 text-ink dark:text-sand-100 focus:ring-primary focus:border-primary"
                required
              />
              <button
                type="submit"
                className="bg-primary text-white px-6 py-3 font-bold rotate-1 hover:rotate-0 transition-transform shadow-[4px_4px_0_rgba(59,42,30,0.18)]"
              >
                {t('index.subscribe_button')}
              </button>
            </form>
          </div>
        </div>
      </section>
    </Layout>
  );
}

export const getStaticProps: GetStaticProps<HomeProps> = async () => {
  try {
    const db = getDb();

    // Ranked by net votes (upvotes minus downvotes), with recency as a
    // tiebreaker — this also means a brand-new site with no votes yet just
    // falls back to showing the newest approved gems, rather than an empty
    // or arbitrarily-ordered section.
    const rows = db
      .prepare(
        `SELECT gems.*,
          COALESCE(SUM(CASE WHEN votes.type = 'up' THEN 1 WHEN votes.type = 'down' THEN -1 ELSE 0 END), 0) as netVotes
        FROM gems
        LEFT JOIN votes ON votes.gemId = gems.id
        WHERE gems.status = 'approved'
        GROUP BY gems.id
        ORDER BY netVotes DESC, gems.createdAt DESC
        LIMIT ?`
      )
      .all(FEATURED_LIMIT) as any[];

    const featuredGems: Gem[] = rows.map((row) => {
      const { lat, lng, address, netVotes, ...rest } = row;
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
      };
    });

    return {
      props: {
        featuredGems,
      },
      revalidate: 60 * 60, // 1 hour
    };
  } catch (error) {
    console.error('Error fetching featured gems:', error);
    return {
      props: {
        featuredGems: [],
      },
      revalidate: 60,
    };
  }
};
