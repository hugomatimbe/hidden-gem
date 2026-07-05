import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useLanguage } from '../../contexts/LanguageContext';
import AdminPager from './AdminPager';

interface ActionRow {
  id: string;
  adminId: string;
  adminName: string | null;
  action: string;
  targetType: string;
  targetId: string;
  details: string | null;
  createdAt: string;
}

const PAGE_SIZE = 25;

export default function AdminActivity() {
  const { t } = useLanguage();
  const [rows, setRows] = useState<ActionRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/actions?page=${page}&pageSize=${PAGE_SIZE}`)
      .then((res) => (res.ok ? res.json() : { items: [], total: 0 }))
      .then((data) => {
        setRows(data.items);
        setTotal(data.total);
      })
      .catch((err) => console.error('Error loading admin activity:', err))
      .finally(() => setLoading(false));
  }, [page]);

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
      </div>
    );
  }

  return (
    <div>
      {rows.length === 0 ? (
        <p className="text-center py-12 text-ink/50 dark:text-sand-300/70">{t('admin.no_activity_found')}</p>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <div key={row.id} className="polaroid bg-white dark:bg-ink-800 p-4 rotate-0">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <p className="text-sm text-ink dark:text-sand-50">
                    <span className="font-bold">{row.adminName || t('admin.unknown_user')}</span>{' '}
                    {t(`admin.action_${row.action}`)}{' '}
                    {row.targetType === 'gem' ? (
                      <Link href={`/g/${row.targetId}`}>
                        <a className="text-primary hover:underline">{t('admin.activity_view_gem')}</a>
                      </Link>
                    ) : (
                      <span className="text-ink/50 dark:text-sand-300/70">({row.targetType})</span>
                    )}
                  </p>
                  {row.details && (
                    <p className="text-xs text-ink/50 dark:text-sand-300/70 mt-1">{row.details}</p>
                  )}
                  <p className="text-xs text-ink/40 dark:text-sand-300/50 mt-1">
                    {new Date(row.createdAt).toLocaleString('pt-MZ')}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <AdminPager page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
    </div>
  );
}
