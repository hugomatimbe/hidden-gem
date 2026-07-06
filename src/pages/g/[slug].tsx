import { GetStaticProps, GetStaticPaths } from 'next';
import { getDb } from '../../lib/db';
import { parseGemRow } from '../../lib/gems';
import Layout from '../../components/Layout';
import { Gem } from '../../lib/types';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import dynamic from 'next/dynamic';
import Voting from '../../components/Voting';
import Comments from '../../components/Comments';
import VisitorPhotos from '../../components/VisitorPhotos';
import SaveButton from '../../components/SaveButton';
import ReportButton from '../../components/ReportButton';
import Lightbox from '../../components/Lightbox';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { truncateForPreview } from '../../lib/seo';

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

interface CommentRow {
  id: string;
  gemId: string;
  author: string;
  content: string;
  createdAt: string;
}

interface GemDetailProps {
  gem: Gem | null;
  relatedGems: Gem[];
  initialUpvotes: number;
  initialDownvotes: number;
  initialComments: CommentRow[];
}

// Same rotate-per-tile pattern used by VisitorPhotos.tsx and the /photos
// feed, so every "wall of polaroids" grid in the app looks consistent.
const TILTS = ['rotate-2', '-rotate-2', 'rotate-1', '-rotate-1', 'rotate-3'];
const tiltFor = (index: number) => TILTS[index % TILTS.length];

export default function GemDetail({ gem, relatedGems, initialUpvotes, initialDownvotes, initialComments }: GemDetailProps) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [lightbox, setLightbox] = useState<{ images: string[]; index: number } | null>(null);

  if (!gem) {
    return (
      <Layout title="Hidden Gem">
        <div className="container mx-auto px-4 py-6">
          <p className="text-center text-ink/50 dark:text-sand-300/70">{t('gem_detail.not_available')}</p>
        </div>
      </Layout>
    );
  }

  const categoryKeyMap: { [key: string]: string } = {
    comida: 'category.restaurant',
    restaurant: 'category.restaurant',
    drink: 'category.bar',
    bar: 'category.bar',
    natureza: 'category.nature',
    arte: 'category.art',
    vista: 'category.view',
    peculiar: 'category.peculiar',
  };

  const getCategoryLabel = (category: string) => {
    const key = categoryKeyMap[category.toLowerCase()];
    return key ? t(key) : category;
  };

  return (
    <Layout
      title={`Hidden Gem - ${gem.title}`}
      description={truncateForPreview(gem.description)}
      image={gem.images?.[0]}
      url={`/g/${gem.id}`}
      type="article"
    >
      <div className="bg-white dark:bg-ink-800">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center text-sm text-ink/50 dark:text-sand-300/70 mb-6">
            <Link href="/c/maputo">
              <a className="hover:text-primary">{t('maputo.title')}</a>
            </Link>
            <span className="mx-2">/</span>
            <span>{gem.title}</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2">
              {/* Image Gallery — every photo gets its own polaroid tile
                  (matching the visitor-photos wall elsewhere on the site)
                  instead of one big hero frame. Tiles crop to a neat square
                  like any thumbnail wall; clicking one opens the full,
                  uncropped photo in the lightbox. Menu photos get their own
                  section below so visitors can find the menu directly. */}
              {gem.images && gem.images.length > 0 ? (
                <div className="mb-8">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
                    {gem.images.map((image, index) => (
                      <div
                        key={index}
                        className={`polaroid bg-white dark:bg-ink-800 p-2 pb-5 ${tiltFor(index)} hover:rotate-0 transition-transform`}
                      >
                        <button
                          type="button"
                          onClick={() => setLightbox({ images: gem.images as string[], index })}
                          className="relative w-full h-40 block cursor-zoom-in"
                          aria-label={t('gem_detail.view_larger')}
                        >
                          <Image src={image} alt={`${gem.title} ${index + 1}`} layout="fill" objectFit="cover" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="polaroid bg-white dark:bg-ink-800 p-3 pb-6 -rotate-1 mb-8 inline-block w-full">
                  <div className="h-64 flex items-center justify-center bg-sand-100 dark:bg-ink-700">
                    <span className="text-ink/40 dark:text-sand-300/60">{t('common.no_image')}</span>
                  </div>
                </div>
              )}

              {/* Title and Meta */}
              <div className="mb-6">
                <div className="flex flex-wrap items-center gap-3 mb-3">
                  <span className="font-display italic text-sm text-primary dark:text-primary-300">
                    {getCategoryLabel(gem.category)}
                  </span>
                  <span className="text-ink/50 dark:text-sand-300/70 text-sm">
                    {t('gem_detail.added_on')} {new Date(gem.createdAt).toLocaleDateString('pt-MZ')}
                  </span>
                  {gem.isAnonymous && (
                    <span className="text-ink/50 dark:text-sand-300/70 text-sm">
                      {t('gem_detail.submitted_anonymously')}
                    </span>
                  )}
                </div>

                <h1 className="text-3xl font-display font-semibold mb-4 text-ink dark:text-sand-50">{gem.title}</h1>

                <div className="prose max-w-none">
                  <p>{gem.description}</p>
                </div>
              </div>

              {/* Tags */}
              <div className="mb-8">
                <h3 className="text-lg font-display font-semibold mb-3 text-ink dark:text-sand-50">{t('form.tags')}</h3>
                <div className="flex flex-wrap gap-3">
                  {gem.tags.map((tag, index) => (
                    <Link key={index} href={`/tags/${tag}`}>
                      <a className="italic text-ink/60 dark:text-sand-300/80 hover:text-primary dark:hover:text-primary-300 text-sm">
                        #{tag}
                      </a>
                    </Link>
                  ))}
                </div>
              </div>

              {/* Menu photos — kept separate from the main gallery so
                  visitors looking specifically for the menu don't have to
                  hunt for it mixed in with the place's regular photos. */}
              {gem.menuImages && gem.menuImages.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-lg font-display font-semibold mb-3 text-ink dark:text-sand-50">{t('gem_detail.menu')}</h3>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                    {gem.menuImages.map((image, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => setLightbox({ images: gem.menuImages as string[], index })}
                        className="relative aspect-square overflow-hidden border-2 border-white dark:border-ink-700 shadow-sm hover:opacity-90 transition-opacity cursor-zoom-in"
                        aria-label={t('gem_detail.view_larger')}
                      >
                        <Image
                          src={image}
                          alt={`${t('gem_detail.menu')} ${index + 1}`}
                          layout="fill"
                          objectFit="cover"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Map */}
              <div className="mb-8">
                <h3 className="text-lg font-display font-semibold mb-3 text-ink dark:text-sand-50">{t('form.location')}</h3>
                <div className="polaroid h-64 overflow-hidden rotate-1">
                  <Map
                    gems={[gem]}
                    center={gem.location}
                    zoom={15}
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-3 mb-8">
                <SaveButton gemId={gem.id} className="flex items-center gap-2 bg-white dark:bg-ink-800 border-2 border-ink/15 dark:border-sand-100/20 text-ink/80 dark:text-sand-200 px-4 py-2 font-medium rotate-1 hover:rotate-0 transition-transform" />

                <button
                  onClick={() => {
                    if (navigator.share) {
                      navigator.share({
                        title: gem.title,
                        text: gem.description,
                        url: window.location.href,
                      }).catch(console.error);
                    } else {
                      navigator.clipboard.writeText(window.location.href);
                      alert(t('common.url_copied'));
                    }
                  }}
                  className="flex items-center gap-2 bg-white dark:bg-ink-800 border-2 border-ink/15 dark:border-sand-100/20 text-ink/80 dark:text-sand-200 px-4 py-2 font-medium -rotate-1 hover:rotate-0 transition-transform"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  {t('common.share')}
                </button>

                <ReportButton
                  gemId={gem.id}
                  className="flex items-center gap-2 bg-white dark:bg-ink-800 border-2 border-ink/15 dark:border-sand-100/20 text-ink/80 dark:text-sand-200 px-4 py-2 font-medium rotate-1 hover:rotate-0 transition-transform"
                />

                {/* Only the original submitter or an admin can edit — same
                    authorization the PATCH endpoint enforces server-side. */}
                {user && (user.id === gem.submittedBy || user.isAdmin) && (
                  <Link href={`/g/${gem.id}/edit`}>
                    <a className="flex items-center gap-2 bg-white dark:bg-ink-800 border-2 border-ink/15 dark:border-sand-100/20 text-ink/80 dark:text-sand-200 px-4 py-2 font-medium -rotate-1 hover:rotate-0 transition-transform">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      {t('gem_detail.edit')}
                    </a>
                  </Link>
                )}
              </div>

              {/* Voting */}
              <Voting gemId={gem.id} submittedBy={gem.submittedBy} initialUpvotes={initialUpvotes} initialDownvotes={initialDownvotes} />

              {/* Visitor Photos */}
              <div className="mb-8">
                <VisitorPhotos gemId={gem.id} />
              </div>

              {/* Comments */}
              <div className="mb-8">
                <Comments gemId={gem.id} initialComments={initialComments} />
              </div>
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1">
              {/* Practical Info */}
              <div className="polaroid bg-white dark:bg-ink-800 p-6 mb-6 rotate-1">
                <h3 className="text-lg font-display font-semibold mb-4 text-ink dark:text-sand-50">{t('gem_detail.practical_info')}</h3>
                <div className="space-y-3">
                  <div className="flex items-start">
                    <svg className="w-5 h-5 text-ink/50 dark:text-sand-300/70 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <div>
                      <p className="font-medium text-ink dark:text-sand-50">{t('gem_detail.address')}</p>
                      <p className="text-ink/70 dark:text-sand-300 text-sm">{gem.location.address || 'Endereço não disponível'}</p>
                    </div>
                  </div>

                  {gem.openingHours && (
                    <div className="flex items-start">
                      <svg className="w-5 h-5 text-ink/50 dark:text-sand-300/70 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div>
                        <p className="font-medium text-ink dark:text-sand-50">{t('form.opening_hours')}</p>
                        <p className="text-ink/70 dark:text-sand-300 text-sm">{gem.openingHours}</p>
                      </div>
                    </div>
                  )}

                  {gem.priceRange && (
                    <div className="flex items-start">
                      <svg className="w-5 h-5 text-ink/50 dark:text-sand-300/70 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div>
                        <p className="font-medium text-ink dark:text-sand-50">{t('form.price_range')}</p>
                        <p className="text-ink/70 dark:text-sand-300 text-sm">
                          {gem.priceRange === 'free' && t('form.price_free')}
                          {gem.priceRange === 'cheap' && t('form.price_cheap')}
                          {gem.priceRange === 'moderate' && t('form.price_moderate')}
                          {gem.priceRange === 'expensive' && t('form.price_expensive')}
                        </p>
                      </div>
                    </div>
                  )}

                  {gem.bestTimeToVisit && (
                    <div className="flex items-start">
                      <svg className="w-5 h-5 text-ink/50 dark:text-sand-300/70 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                      <div>
                        <p className="font-medium text-ink dark:text-sand-50">{t('form.best_time_to_visit')}</p>
                        <p className="text-ink/70 dark:text-sand-300 text-sm">{gem.bestTimeToVisit}</p>
                      </div>
                    </div>
                  )}

                  {gem.accessibility && (
                    <div className="flex items-start">
                      <svg className="w-5 h-5 text-ink/50 dark:text-sand-300/70 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                      <div>
                        <p className="font-medium text-ink dark:text-sand-50">{t('form.accessibility')}</p>
                        <p className="text-ink/70 dark:text-sand-300 text-sm">
                          {gem.accessibility.wheelchairAccessible && t('form.wheelchair_accessible') + ' '}
                          {gem.accessibility.familyFriendly && t('form.family_friendly') + ' '}
                          {gem.accessibility.petFriendly && t('form.pet_friendly') + ' '}
                        </p>
                      </div>
                    </div>
                  )}

                  {gem.safetyNotes && (
                    <div className="flex items-start">
                      <svg className="w-5 h-5 text-ink/50 dark:text-sand-300/70 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.618 5.984A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016zM12 9v2m0 4h.01" />
                      </svg>
                      <div>
                        <p className="font-medium text-ink dark:text-sand-50">{t('form.safety_notes')}</p>
                        <p className="text-ink/70 dark:text-sand-300 text-sm">{gem.safetyNotes}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Related Gems */}
              <div>
                <h3 className="text-lg font-display font-semibold mb-4 text-ink dark:text-sand-50">{t('gem_detail.related_gems')}</h3>
                <div className="space-y-4">
                  {relatedGems.map((relatedGem) => (
                    <Link key={relatedGem.id} href={`/g/${relatedGem.id}`}>
                      <a className="polaroid flex items-start p-3 bg-white dark:bg-ink-800 rotate-1 hover:rotate-0 transition-transform">
                        <div className="w-16 h-16 overflow-hidden bg-sand-100 dark:bg-ink-700 mr-3 flex-shrink-0">
                          {relatedGem.images && relatedGem.images.length > 0 ? (
                            <Image
                              src={relatedGem.images[0]}
                              alt={relatedGem.title}
                              width={64}
                              height={64}
                              objectFit="cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <span className="text-ink/40 dark:text-sand-300/60 text-xs">{t('common.no_image')}</span>
                            </div>
                          )}
                        </div>
                        <div>
                          <h4 className="font-medium text-ink dark:text-sand-50">{relatedGem.title}</h4>
                          <p className="text-ink/70 dark:text-sand-300 text-sm line-clamp-2">{relatedGem.description}</p>
                        </div>
                      </a>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {lightbox && (
        <Lightbox
          images={lightbox.images}
          index={lightbox.index}
          alt={gem.title}
          onClose={() => setLightbox(null)}
          onNavigate={(index) => setLightbox((prev) => (prev ? { ...prev, index } : prev))}
        />
      )}
    </Layout>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  try {
    const db = getDb();
    const rows = db.prepare('SELECT id FROM gems').all() as { id: string }[];

    return {
      paths: rows.map((row) => ({ params: { slug: row.id } })),
      fallback: 'blocking',
    };
  } catch (error) {
    console.error('Error building gem paths:', error);
    return { paths: [], fallback: 'blocking' };
  }
};

export const getStaticProps: GetStaticProps<GemDetailProps> = async ({ params }) => {
  const slug = params?.slug as string;

  try {
    const db = getDb();

    const row = db.prepare('SELECT * FROM gems WHERE id = ?').get(slug) as any;

    // Pending/rejected gems aren't public yet — they 404 like any gem that
    // doesn't exist. Admins review them from the moderation queue instead,
    // which doesn't need this page (getStaticProps has no session access).
    if (!row || row.status !== 'approved') {
      return { notFound: true, revalidate: 60 };
    }

    const gem = parseGemRow(row);

    const relatedRows = db
      .prepare('SELECT * FROM gems WHERE category = ? AND id != ? ORDER BY createdAt DESC LIMIT 3')
      .all(row.category, slug) as any[];
    const relatedGems = relatedRows.map(parseGemRow);

    const upvotesRow = db
      .prepare("SELECT COUNT(*) as c FROM votes WHERE gemId = ? AND type = 'up'")
      .get(slug) as { c: number };
    const downvotesRow = db
      .prepare("SELECT COUNT(*) as c FROM votes WHERE gemId = ? AND type = 'down'")
      .get(slug) as { c: number };

    const comments = db
      .prepare('SELECT * FROM comments WHERE gemId = ? ORDER BY createdAt DESC')
      .all(slug) as CommentRow[];

    return {
      props: {
        gem,
        relatedGems,
        initialUpvotes: upvotesRow.c,
        initialDownvotes: downvotesRow.c,
        initialComments: comments,
      },
      revalidate: 60, // Revalidate every minute
    };
  } catch (error) {
    console.error('Error fetching gem:', error);
    return { notFound: true, revalidate: 60 };
  }
};
