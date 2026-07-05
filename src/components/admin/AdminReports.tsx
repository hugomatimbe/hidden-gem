import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useLanguage } from '../../contexts/LanguageContext';
import AdminPager from './AdminPager';

const PAGE_SIZE = 20;

interface AdminReport {
  id: string;
  targetType: string;
  targetId: string;
  reporterId: string | null;
  reason: string;
  details: string | null;
  status: string;
  createdAt: string;
  gemTitle: string | null;
  reporterName: string | null;
}

type Filter = 'open' | 'resolved' | 'dismissed' | 'all';

export default function AdminReports() {
  const { t } = useLanguage();
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('open');

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/reports?status=${filter}&page=${page}&pageSize=${PAGE_SIZE}`)
      .then((res) => (res.ok ? res.json() : { items: [], total: 0 }))
      .then((data) => {
        setReports(data.items);
        setTotal(data.total);
      })
      .catch((err) => console.error('Error loading reports:', err))
      .finally(() => setLoading(false));
  }, [filter, page]);

  const updateStatus = async (id: string, status: 'resolved' | 'dismissed') => {
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/reports/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setReports((prev) => prev.filter((r) => r.id !== id));
        setTotal((prev) => prev - 1);
      }
    } catch (err) {
      console.error('Error updating report:', err);
    } finally {
      setBusyId(null);
    }
  };

  const filters: Filter[] = ['open', 'resolved', 'dismissed', 'all'];

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-6">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => {
              setFilter(f);
              setPage(1);
            }}
            className={`px-3 py-1.5 text-xs font-bold rounded transition-colors ${
              filter === f
                ? 'bg-primary text-white'
                : 'bg-sand-100 dark:bg-ink-700 text-ink/60 dark:text-sand-300 hover:bg-sand-200 dark:hover:bg-ink-700/70'
            }`}
          >
            {t(`admin.report_filter_${f}`)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        </div>
      ) : reports.length === 0 ? (
        <p className="text-center py-12 text-ink/50 dark:text-sand-300/70">{t('admin.no_reports_found')}</p>
      ) : (
        <div className="space-y-4">
          {reports.map((report, index) => (
            <div
              key={report.id}
              className={`polaroid bg-white dark:bg-ink-800 p-5 ${
                index % 2 === 0 ? '-rotate-1' : 'rotate-1'
              } hover:rotate-0 transition-transform`}
            >
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <p className="text-xs font-bold text-primary dark:text-primary-300 uppercase mb-1">
                    {t(`report.reason_${report.reason}`)}
                  </p>
                  <Link href={`/g/${report.targetId}`}>
                    <a className="font-medium text-ink dark:text-sand-50 hover:underline">
                      {report.gemTitle || report.targetId}
                    </a>
                  </Link>
                  {report.details && (
                    <p className="text-sm text-ink/70 dark:text-sand-300 mt-2">{report.details}</p>
                  )}
                  <p className="text-xs text-ink/40 dark:text-sand-300/50 mt-2">
                    {report.reporterName || t('admin.unknown_user')} · {new Date(report.createdAt).toLocaleDateString('pt-MZ')}
                  </p>
                </div>

                {report.status === 'open' && (
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => updateStatus(report.id, 'resolved')}
                      disabled={busyId === report.id}
                      className="text-green-700 dark:text-green-400 text-sm font-bold disabled:opacity-50"
                    >
                      {t('admin.resolve')}
                    </button>
                    <button
                      onClick={() => updateStatus(report.id, 'dismissed')}
                      disabled={busyId === report.id}
                      className="text-ink/50 dark:text-sand-300/70 text-sm font-bold disabled:opacity-50"
                    >
                      {t('admin.dismiss')}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <AdminPager page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
    </div>
  );
}
