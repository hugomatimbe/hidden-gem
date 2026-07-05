import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import ProfileDetails from '../../components/profile/ProfileDetails';
import ProfilePassword from '../../components/profile/ProfilePassword';
import ProfileMyGems from '../../components/profile/ProfileMyGems';
import ProfileSaved from '../../components/profile/ProfileSaved';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';

type Tab = 'details' | 'password' | 'mygems' | 'saved';

export default function ProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('details');

  const tabs: { key: Tab; label: string }[] = [
    { key: 'details', label: t('profile.tab_details') },
    { key: 'password', label: t('profile.tab_password') },
    { key: 'mygems', label: t('profile.tab_mygems') },
    { key: 'saved', label: t('profile.tab_saved') },
  ];

  return (
    <Layout title={`${t('profile.title')} - Hidden Gem`}>
      <div className="container mx-auto px-4 py-10 md:py-14">
        {authLoading ? (
          <div className="text-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto"></div>
          </div>
        ) : !user ? (
          <div className="max-w-md mx-auto polaroid bg-white dark:bg-ink-800 p-8 text-center -rotate-1">
            <h1 className="font-display font-semibold text-xl text-ink dark:text-sand-50 mb-2">
              {t('profile.login_required_title')}
            </h1>
            <p className="text-sm text-ink/60 dark:text-sand-300 mb-6">{t('profile.login_required_desc')}</p>
            <Link href={`/login?redirect=${encodeURIComponent(router.asPath)}`}>
              <a className="bg-primary text-white px-5 py-2.5 inline-block font-bold rotate-1 hover:rotate-0 transition-transform shadow-[3px_3px_0_rgba(59,42,30,0.18)]">
                {t('nav.login')}
              </a>
            </Link>
          </div>
        ) : (
          <>
            <h1 className="font-display font-bold text-3xl text-ink dark:text-sand-50 mb-8 -rotate-1">
              {t('profile.title')}
            </h1>

            <div className="flex flex-wrap gap-2 mb-8 border-b border-sand-200 dark:border-ink-700 pb-4">
              {tabs.map((tabItem) => (
                <button
                  key={tabItem.key}
                  onClick={() => setTab(tabItem.key)}
                  className={`px-4 py-2 text-sm font-bold transition-transform ${
                    tab === tabItem.key
                      ? 'bg-primary text-white shadow-[3px_3px_0_rgba(59,42,30,0.18)] -rotate-1'
                      : 'bg-white dark:bg-ink-800 text-ink/70 dark:text-sand-200 border-2 border-ink/15 dark:border-sand-100/20 hover:-rotate-1'
                  }`}
                >
                  {tabItem.label}
                </button>
              ))}
            </div>

            {tab === 'details' && <ProfileDetails />}
            {tab === 'password' && <ProfilePassword />}
            {tab === 'mygems' && <ProfileMyGems />}
            {tab === 'saved' && <ProfileSaved />}
          </>
        )}
      </div>
    </Layout>
  );
}
