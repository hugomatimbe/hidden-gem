import { useState } from 'react';
import Layout from '../../components/Layout';
import AdminDashboard from '../../components/admin/AdminDashboard';
import AdminGems from '../../components/admin/AdminGems';
import AdminComments from '../../components/admin/AdminComments';
import AdminUsers from '../../components/admin/AdminUsers';
import AdminReports from '../../components/admin/AdminReports';
import AdminLists from '../../components/admin/AdminLists';
import AdminActivity from '../../components/admin/AdminActivity';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';

type Tab = 'dashboard' | 'gems' | 'comments' | 'reports' | 'lists' | 'users' | 'activity';

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const [tab, setTab] = useState<Tab>('dashboard');

  const tabs: { key: Tab; label: string }[] = [
    { key: 'dashboard', label: t('admin.tab_dashboard') },
    { key: 'gems', label: t('admin.tab_gems') },
    { key: 'comments', label: t('admin.tab_comments') },
    { key: 'reports', label: t('admin.tab_reports') },
    { key: 'lists', label: t('admin.tab_lists') },
    { key: 'users', label: t('admin.tab_users') },
    { key: 'activity', label: t('admin.tab_activity') },
  ];

  return (
    <Layout title={`${t('admin.title')} - Hidden Gem`}>
      <div className="container mx-auto px-4 py-10 md:py-14">
        {authLoading ? (
          <div className="text-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto"></div>
          </div>
        ) : !user?.isAdmin ? (
          <div className="max-w-md mx-auto polaroid bg-white dark:bg-ink-800 p-8 text-center -rotate-1">
            <div className="w-14 h-14 mx-auto mb-4 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
              <svg className="w-7 h-7 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="font-display font-semibold text-xl text-ink dark:text-sand-50 mb-2">
              {t('admin.access_denied_title')}
            </h1>
            <p className="text-sm text-ink/60 dark:text-sand-300">{t('admin.access_denied_desc')}</p>
          </div>
        ) : (
          <>
            <h1 className="font-display font-bold text-3xl text-ink dark:text-sand-50 mb-8 -rotate-1">
              {t('admin.title')}
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

            {tab === 'dashboard' && (
              <AdminDashboard onViewPending={() => setTab('gems')} onViewReports={() => setTab('reports')} />
            )}
            {tab === 'gems' && <AdminGems initialStatus="pending" />}
            {tab === 'comments' && <AdminComments />}
            {tab === 'reports' && <AdminReports />}
            {tab === 'lists' && <AdminLists />}
            {tab === 'users' && <AdminUsers />}
            {tab === 'activity' && <AdminActivity />}
          </>
        )}
      </div>
    </Layout>
  );
}
