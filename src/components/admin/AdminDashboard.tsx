import { useEffect, useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';

interface Stats {
  gems: { total: number; pending: number; approved: number; rejected: number };
  totalUsers: number;
  totalComments: number;
  totalVotes: number;
  openReports: number;
  recentPendingGems: { id: string; title: string; createdAt: string }[];
  recentUsers: { id: string; displayName: string; email: string; createdAt: string }[];
  recentOpenReports: { id: string; reason: string; targetId: string; gemTitle: string | null }[];
}

interface AdminDashboardProps {
  onViewPending: () => void;
  onViewReports: () => void;
}

const StatCard = ({ label, value, rotate }: { label: string; value: number; rotate: string }) => (
  <div className={`polaroid bg-white dark:bg-ink-800 p-5 text-center ${rotate} hover:rotate-0 transition-transform`}>
    <p className="text-3xl font-display font-bold text-primary">{value}</p>
    <p className="text-sm text-ink/60 dark:text-sand-300 mt-1">{label}</p>
  </div>
);

export default function AdminDashboard({ onViewPending, onViewReports }: AdminDashboardProps) {
  const { t } = useLanguage();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/stats')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setStats(data))
      .catch((err) => console.error('Error loading admin stats:', err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-5">
        <StatCard label={t('admin.stat_total_gems')} value={stats.gems.total} rotate="rotate-1" />
        <StatCard label={t('admin.stat_pending')} value={stats.gems.pending} rotate="-rotate-1" />
        <StatCard label={t('admin.stat_open_reports')} value={stats.openReports} rotate="rotate-2" />
        <StatCard label={t('admin.stat_total_users')} value={stats.totalUsers} rotate="-rotate-2" />
        <StatCard label={t('admin.stat_total_comments')} value={stats.totalComments} rotate="rotate-1" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="polaroid bg-white dark:bg-ink-800 p-6 -rotate-1">
          <h3 className="font-display font-semibold text-ink dark:text-sand-50 mb-4">{t('admin.recent_pending')}</h3>
          {stats.recentPendingGems.length === 0 ? (
            <p className="text-sm text-ink/50 dark:text-sand-300/70">{t('admin.nothing_pending')}</p>
          ) : (
            <ul className="space-y-2">
              {stats.recentPendingGems.map((gem) => (
                <li key={gem.id}>
                  <button
                    onClick={onViewPending}
                    className="text-sm text-ink/80 dark:text-sand-200 hover:text-primary text-left"
                  >
                    {gem.title}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="polaroid bg-white dark:bg-ink-800 p-6 rotate-1">
          <h3 className="font-display font-semibold text-ink dark:text-sand-50 mb-4">{t('admin.recent_open_reports')}</h3>
          {stats.recentOpenReports.length === 0 ? (
            <p className="text-sm text-ink/50 dark:text-sand-300/70">{t('admin.nothing_reported')}</p>
          ) : (
            <ul className="space-y-2">
              {stats.recentOpenReports.map((report) => (
                <li key={report.id}>
                  <button
                    onClick={onViewReports}
                    className="text-sm text-ink/80 dark:text-sand-200 hover:text-primary text-left"
                  >
                    {report.gemTitle || report.targetId}{' '}
                    <span className="text-ink/40 dark:text-sand-300/50">— {t(`report.reason_${report.reason}`)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="polaroid bg-white dark:bg-ink-800 p-6 -rotate-1">
          <h3 className="font-display font-semibold text-ink dark:text-sand-50 mb-4">{t('admin.recent_users')}</h3>
          <ul className="space-y-2">
            {stats.recentUsers.map((u) => (
              <li key={u.id} className="text-sm text-ink/80 dark:text-sand-200">
                {u.displayName} <span className="text-ink/40 dark:text-sand-300/50">— {u.email}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
