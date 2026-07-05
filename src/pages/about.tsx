import Link from 'next/link';
import Layout from '../components/Layout';
import { useLanguage } from '../contexts/LanguageContext';

export default function AboutPage() {
  const { t } = useLanguage();
  return (
    <Layout title="Hidden Gem - Sobre">
      <div className="relative overflow-hidden bg-white dark:bg-ink-800 py-12">
        <div className="hidden xl:block pointer-events-none absolute inset-0" aria-hidden="true">
          {/* Compass rose, left */}
          <svg className="absolute top-20 left-14 w-20 h-20 text-primary/25 -rotate-6" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <circle cx="50" cy="50" r="38" strokeDasharray="4 5" />
            <path d="M50 6v18M50 76v18M6 50h18M76 50h18" />
            <path d="M50 20L58 50L50 80L42 50Z" strokeWidth={1} />
          </svg>
          {/* Heart, left lower — community/authenticity theme */}
          <svg className="absolute bottom-28 left-20 w-14 h-14 text-secondary/25 rotate-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.3}>
            <path d="M12 21s-6.5-4.35-9.5-8.5C.5 9 2 5 6 5c2 0 3.5 1.2 4 2.5C10.5 6.2 12 5 14 5c4 0 5.5 4 3.5 7.5C18.5 16.65 12 21 12 21z" />
          </svg>
          {/* Postage stamp, right */}
          <svg className="absolute top-24 right-16 w-24 h-24 text-primary/25 rotate-6" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <rect x="8" y="8" width="84" height="84" strokeDasharray="3 5" />
            <path d="M50 30a14 14 0 100 28 14 14 0 000-28z" />
          </svg>
          {/* Star, right lower */}
          <svg className="absolute bottom-24 right-24 w-10 h-10 text-secondary/25 -rotate-12" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 1l2.6 7.9H23l-6.7 4.9L18.9 22 12 16.9 5.1 22l2.6-8.2L1 8.9h8.4z" />
          </svg>
          <span className="absolute top-1/2 left-10 w-1.5 h-1.5 rounded-full bg-secondary/30" />
          <span className="absolute top-1/3 right-10 w-2 h-2 rounded-full bg-primary/25" />
        </div>

        <div className="container mx-auto px-4 max-w-4xl relative">
          <div className="text-center mb-12">
            <h1 className="text-3xl font-display font-semibold mb-4 text-ink dark:text-sand-50">{t('about.title')}</h1>
            <p className="text-ink/70 dark:text-sand-300 max-w-2xl mx-auto">
              {t('about.subtitle')}
            </p>
          </div>

          <div className="space-y-12">
            <section>
              <h2 className="text-2xl font-display font-semibold mb-4 text-ink dark:text-sand-50">{t('about.mission_title')}</h2>
              <p className="text-ink/80 dark:text-sand-200 mb-4">
                {t('about.mission_p1')}
              </p>
              <p className="text-ink/80 dark:text-sand-200">
                {t('about.mission_p2')}
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-display font-semibold mb-4 text-ink dark:text-sand-50">{t('about.how_it_works_title')}</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="polaroid bg-white dark:bg-ink-800 p-6 rotate-1 hover:rotate-0 transition-transform">
                  <div className="w-12 h-12 bg-primary flex items-center justify-center text-white font-display font-bold text-xl mb-4 -rotate-3">1</div>
                  <h3 className="font-display font-semibold text-lg mb-2 text-ink dark:text-sand-50">{t('about.discover_title')}</h3>
                  <p className="text-ink/70 dark:text-sand-300">{t('about.discover_desc')}</p>
                </div>
                <div className="polaroid bg-white dark:bg-ink-800 p-6 -rotate-1 hover:rotate-0 transition-transform">
                  <div className="w-12 h-12 bg-primary flex items-center justify-center text-white font-display font-bold text-xl mb-4 rotate-2">2</div>
                  <h3 className="font-display font-semibold text-lg mb-2 text-ink dark:text-sand-50">{t('about.share_title')}</h3>
                  <p className="text-ink/70 dark:text-sand-300">{t('about.share_desc')}</p>
                </div>
                <div className="polaroid bg-white dark:bg-ink-800 p-6 rotate-2 hover:rotate-0 transition-transform">
                  <div className="w-12 h-12 bg-primary flex items-center justify-center text-white font-display font-bold text-xl mb-4 -rotate-2">3</div>
                  <h3 className="font-display font-semibold text-lg mb-2 text-ink dark:text-sand-50">{t('about.vote_title')}</h3>
                  <p className="text-ink/70 dark:text-sand-300">{t('about.vote_desc')}</p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-display font-semibold mb-4 text-ink dark:text-sand-50">{t('about.values_title')}</h2>
              <div className="space-y-6">
                <div className="flex items-start">
                  <div className="bg-primary/10 p-2 rounded-full mr-4">
                    <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-1 text-ink dark:text-sand-50">{t('about.value_authenticity_title')}</h3>
                    <p className="text-ink/70 dark:text-sand-300">{t('about.value_authenticity_desc')}</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="bg-primary/10 p-2 rounded-full mr-4">
                    <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-1 text-ink dark:text-sand-50">{t('about.value_community_title')}</h3>
                    <p className="text-ink/70 dark:text-sand-300">{t('about.value_community_desc')}</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="bg-primary/10 p-2 rounded-full mr-4">
                    <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-1 text-ink dark:text-sand-50">{t('about.value_sustainability_title')}</h3>
                    <p className="text-ink/70 dark:text-sand-300">{t('about.value_sustainability_desc')}</p>
                  </div>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-display font-semibold mb-4 text-ink dark:text-sand-50">{t('about.contact_title')}</h2>
              <p className="text-ink/80 dark:text-sand-200 mb-6">
                {t('about.contact_desc')}
              </p>
              <Link href="/contact">
                <a className="inline-block bg-primary text-white px-6 py-3 font-bold rotate-1 hover:rotate-0 transition-transform shadow-[4px_4px_0_rgba(59,42,30,0.18)]">
                  {t('common.send_message')}
                </a>
              </Link>
            </section>
          </div>
        </div>
      </div>
    </Layout>
  );
}