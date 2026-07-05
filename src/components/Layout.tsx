import { ReactNode, useState, useRef, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import VerifyEmailBanner from './VerifyEmailBanner';
import SearchBox from './SearchBox';
import { getSiteUrl, absoluteUrl } from '../lib/seo';

const DEFAULT_DESCRIPTION =
  'Descubra os lugares secretos de Maputo compartilhados por locais. Encontre cafés escondidos, vistas incríveis, trilhas não sinalizadas e muito mais.';

interface LayoutProps {
  children: ReactNode;
  title?: string;
  // The following let individual pages (mainly gem detail pages) override
  // what shows up when the page is shared on WhatsApp/Facebook/Twitter/etc.
  // Pages that don't pass these just get the site-wide defaults below.
  description?: string;
  image?: string; // absolute or site-relative (e.g. a gem photo path)
  url?: string; // defaults to the current path if omitted
  type?: 'website' | 'article';
}

export default function Layout({
  children,
  title = 'Hidden Gem - Maputo',
  description = DEFAULT_DESCRIPTION,
  image,
  url,
  type = 'website',
}: LayoutProps) {
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const { user, logout } = useAuth();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const resolvedUrl = url ? absoluteUrl(url) : `${getSiteUrl()}${router.asPath.split('?')[0].split('#')[0]}`;
  const resolvedImage = image ? absoluteUrl(image) : undefined;

  // Close the mobile menu automatically on navigation — otherwise it stays
  // open over the new page after tapping a link.
  useEffect(() => {
    const handleRouteChange = () => setMobileMenuOpen(false);
    router.events.on('routeChangeComplete', handleRouteChange);
    return () => router.events.off('routeChangeComplete', handleRouteChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setMenuOpen(false);
    await logout();
    router.push('/');
  };

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
        <link rel="icon" href="/favicon.ico" />
        <link rel="canonical" href={resolvedUrl} />

        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:type" content={type} />
        <meta property="og:url" content={resolvedUrl} />
        <meta property="og:site_name" content="Hidden Gem Maputo" />
        {resolvedImage && <meta property="og:image" content={resolvedImage} />}

        <meta name="twitter:card" content={resolvedImage ? 'summary_large_image' : 'summary'} />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
        {resolvedImage && <meta name="twitter:image" content={resolvedImage} />}
      </Head>

      <div className="min-h-screen flex flex-col bg-sand-50 dark:bg-ink-900 text-ink dark:text-sand-100">
        {/* Header */}
        <header className="bg-white dark:bg-ink-800 shadow-sm sticky top-0 z-10 border-b border-sand-200 dark:border-ink-700">
          <div className="container mx-auto px-4 py-3 flex justify-between items-center">
            <Link href="/">
              <a className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-primary flex items-center justify-center -rotate-6 shadow-[2px_2px_0_rgba(59,42,30,0.25)]">
                  <span className="text-white font-display font-bold text-lg">H</span>
                </div>
                <span className="font-display font-semibold text-xl text-ink dark:text-sand-50">Hidden Gem</span>
              </a>
            </Link>

            <nav className="hidden md:flex space-x-6">
              <Link href="/c/maputo">
                <a className="text-ink/70 dark:text-sand-200 hover:text-primary dark:hover:text-primary-300 font-medium">{t('nav.explore')}</a>
              </Link>
              <Link href="/photos">
                <a className="text-ink/70 dark:text-sand-200 hover:text-primary dark:hover:text-primary-300 font-medium">{t('nav.photos')}</a>
              </Link>
              <Link href="/submit">
                <a className="text-ink/70 dark:text-sand-200 hover:text-primary dark:hover:text-primary-300 font-medium">{t('nav.add')}</a>
              </Link>
              <Link href="/about">
                <a className="text-ink/70 dark:text-sand-200 hover:text-primary dark:hover:text-primary-300 font-medium">{t('nav.about')}</a>
              </Link>
              {user?.isAdmin && (
                <Link href="/admin">
                  <a className="text-primary hover:text-primary-600 font-medium">{t('nav.admin')}</a>
                </Link>
              )}
            </nav>

            <div className="flex items-center space-x-4">
              <SearchBox className="hidden sm:block w-40 lg:w-56" />

              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as 'pt' | 'en')}
                className="bg-transparent border border-sand-300 dark:border-ink-700 rounded px-2 py-1 text-sm dark:bg-ink-700 dark:text-sand-50"
              >
                <option value="pt">PT</option>
                <option value="en">EN</option>
              </select>

              {/* Theme Toggle Button */}
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg bg-sand-100 dark:bg-ink-700 hover:bg-sand-200 dark:hover:bg-ink-700/70 transition-colors"
                aria-label="Toggle theme"
              >
                {theme === 'light' ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                )}
              </button>

              {user ? (
                <div className="relative" ref={menuRef}>
                  <button
                    onClick={() => setMenuOpen((open) => !open)}
                    className="flex items-center gap-2 bg-white dark:bg-ink-800 border-2 border-ink/15 dark:border-sand-100/20 px-3 py-1.5 text-sm font-bold rotate-1 hover:rotate-0 transition-transform"
                  >
                    {user.avatarUrl ? (
                      <img src={user.avatarUrl} alt={user.displayName} className="w-6 h-6 rounded-full object-cover -rotate-3" />
                    ) : (
                      <span className="w-6 h-6 bg-primary/15 text-primary flex items-center justify-center rounded-full font-display -rotate-3">
                        {user.displayName.charAt(0).toUpperCase()}
                      </span>
                    )}
                    <span className="text-ink dark:text-sand-50 max-w-[8rem] truncate">{user.displayName}</span>
                  </button>

                  {menuOpen && (
                    <div className="absolute right-0 mt-2 polaroid bg-white dark:bg-ink-800 rotate-0 py-2 w-40 z-20">
                      <Link href="/profile">
                        <a
                          onClick={() => setMenuOpen(false)}
                          className="block px-4 py-2 text-sm text-ink/80 dark:text-sand-200 hover:text-primary dark:hover:text-primary-300"
                        >
                          {t('nav.profile')}
                        </a>
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2 text-sm text-ink/80 dark:text-sand-200 hover:text-primary dark:hover:text-primary-300"
                      >
                        {t('nav.logout')}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <Link href={`/login?redirect=${encodeURIComponent(router.asPath)}`}>
                  <a className="bg-primary text-white px-4 py-2 text-sm font-bold rotate-1 hover:rotate-0 transition-transform shadow-[3px_3px_0_rgba(59,42,30,0.18)]">
                    {t('nav.login')}
                  </a>
                </Link>
              )}

              {/* Below md, the nav links and search box above are hidden —
                  this button + panel is the only way to reach them. */}
              <button
                onClick={() => setMobileMenuOpen((open) => !open)}
                className="md:hidden p-2 rounded-lg bg-sand-100 dark:bg-ink-700 hover:bg-sand-200 dark:hover:bg-ink-700/70 transition-colors"
                aria-label={t('nav.menu')}
                aria-expanded={mobileMenuOpen}
              >
                {mobileMenuOpen ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {mobileMenuOpen && (
            <div className="md:hidden border-t border-sand-200 dark:border-ink-700 px-4 py-4 space-y-4">
              <SearchBox className="block sm:hidden" />

              <nav className="flex flex-col space-y-3">
                <Link href="/c/maputo">
                  <a className="text-ink/70 dark:text-sand-200 hover:text-primary dark:hover:text-primary-300 font-medium">{t('nav.explore')}</a>
                </Link>
                <Link href="/photos">
                  <a className="text-ink/70 dark:text-sand-200 hover:text-primary dark:hover:text-primary-300 font-medium">{t('nav.photos')}</a>
                </Link>
                <Link href="/submit">
                  <a className="text-ink/70 dark:text-sand-200 hover:text-primary dark:hover:text-primary-300 font-medium">{t('nav.add')}</a>
                </Link>
                <Link href="/about">
                  <a className="text-ink/70 dark:text-sand-200 hover:text-primary dark:hover:text-primary-300 font-medium">{t('nav.about')}</a>
                </Link>
                {user?.isAdmin && (
                  <Link href="/admin">
                    <a className="text-primary hover:text-primary-600 font-medium">{t('nav.admin')}</a>
                  </Link>
                )}
              </nav>
            </div>
          )}
        </header>

        <VerifyEmailBanner />

        {/* Main Content */}
        <main className="flex-grow">
          {children}
        </main>

        {/* Footer */}
        <footer className="bg-ink-900 text-sand-100 py-8">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div>
                <h3 className="text-lg font-display font-semibold mb-4 text-sand-50">Hidden Gem</h3>
                <p className="text-sand-200/70 text-sm">
                  {t('footer.description')}
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-3 text-sand-50">{t('footer.explore')}</h4>
                <ul className="space-y-2 text-sm text-sand-200/70">
                  <li><Link href="/c/maputo"><a className="hover:text-white">{t('maputo.title')}</a></Link></li>
                  <li><Link href="/lists"><a className="hover:text-white">{t('footer.lists')}</a></Link></li>
                  <li><Link href="/categories"><a className="hover:text-white">{t('footer.categories')}</a></Link></li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-3 text-sand-50">{t('footer.community')}</h4>
                <ul className="space-y-2 text-sm text-sand-200/70">
                  <li><Link href="/submit"><a className="hover:text-white">{t('nav.add')}</a></Link></li>
                  <li><Link href="/guidelines"><a className="hover:text-white">{t('footer.guidelines')}</a></Link></li>
                  <li><Link href="/contact"><a className="hover:text-white">{t('footer.contact')}</a></Link></li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-3 text-sand-50">{t('footer.legal')}</h4>
                <ul className="space-y-2 text-sm text-sand-200/70">
                  <li><Link href="/privacy"><a className="hover:text-white">{t('footer.privacy')}</a></Link></li>
                  <li><Link href="/terms"><a className="hover:text-white">{t('footer.terms')}</a></Link></li>
                  <li><Link href="/contact"><a className="hover:text-white">{t('footer.contact')}</a></Link></li>
                </ul>
              </div>
            </div>

            <div className="border-t border-ink-700 mt-8 pt-6 text-center text-sm text-sand-300/60">
              <p>{t('footer.copyright').replace('{year}', new Date().getFullYear().toString())}</p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
