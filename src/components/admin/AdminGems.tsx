import { useEffect, useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import AdminPager from './AdminPager';

interface AdminGem {
  id: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  images: string[];
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason: string | null;
  createdAt: string;
  submitterName: string | null;
  submitterEmail: string | null;
  isAnonymous: boolean;
}

type StatusFilter = 'pending' | 'approved' | 'rejected' | 'all';

interface AdminGemsProps {
  initialStatus?: StatusFilter;
}

const PAGE_SIZE = 20;

export default function AdminGems({ initialStatus = 'pending' }: AdminGemsProps) {
  const { t } = useLanguage();
  const [status, setStatus] = useState<StatusFilter>(initialStatus);
  const [query, setQuery] = useState('');
  const [gems, setGems] = useState<AdminGem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams({ status, page: String(page), pageSize: String(PAGE_SIZE) });
    if (query.trim()) params.set('q', query.trim());
    fetch(`/api/admin/gems?${params.toString()}`)
      .then((res) => (res.ok ? res.json() : { items: [], total: 0 }))
      .then((data) => {
        setGems(data.items);
        setTotal(data.total);
      })
      .catch((err) => console.error('Error loading gems:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    setSelected(new Set());
    // Debounced so typing in the search box doesn't fire a request per
    // keystroke.
    const timeout = setTimeout(load, query ? 250 : 0);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, page, query]);

  const moderate = async (id: string, newStatus: 'approved' | 'rejected', reason?: string) => {
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/gems/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, reason }),
      });
      if (res.ok) {
        setRejectingId(null);
        setRejectReason('');
        load();
      }
    } catch (err) {
      console.error('Error moderating gem:', err);
    } finally {
      setBusyId(null);
    }
  };

  const deleteGem = async (id: string) => {
    if (!confirm(t('admin.confirm_delete_gem'))) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/gems/${id}`, { method: 'DELETE' });
      if (res.ok) load();
    } catch (err) {
      console.error('Error deleting gem:', err);
    } finally {
      setBusyId(null);
    }
  };

  const toggleSelected = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelected((prev) => (prev.size === gems.length ? new Set() : new Set(gems.map((g) => g.id))));
  };

  const bulkModerate = async (newStatus: 'approved' | 'rejected') => {
    if (selected.size === 0) return;
    setBulkBusy(true);
    try {
      await Promise.all(
        Array.from(selected).map((id) =>
          fetch(`/api/admin/gems/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus }),
          })
        )
      );
      setSelected(new Set());
      load();
    } catch (err) {
      console.error('Error bulk moderating gems:', err);
    } finally {
      setBulkBusy(false);
    }
  };

  const bulkDelete = async () => {
    if (selected.size === 0) return;
    if (!confirm(t('admin.bulk_confirm_delete').replace('{count}', String(selected.size)))) return;
    setBulkBusy(true);
    try {
      await Promise.all(Array.from(selected).map((id) => fetch(`/api/admin/gems/${id}`, { method: 'DELETE' })));
      setSelected(new Set());
      load();
    } catch (err) {
      console.error('Error bulk deleting gems:', err);
    } finally {
      setBulkBusy(false);
    }
  };

  const filters: StatusFilter[] = ['pending', 'approved', 'rejected', 'all'];
  const filterLabels: Record<StatusFilter, string> = {
    pending: t('admin.gems_filter_pending'),
    approved: t('admin.gems_filter_approved'),
    rejected: t('admin.gems_filter_rejected'),
    all: t('admin.gems_filter_all'),
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => {
              setStatus(f);
              setPage(1);
            }}
            className={`px-4 py-1.5 text-sm font-bold border-2 transition-transform ${
              status === f
                ? 'bg-primary text-white border-primary rotate-0'
                : 'bg-white dark:bg-ink-800 text-ink/70 dark:text-sand-200 border-ink/15 dark:border-sand-100/20 rotate-0 hover:-rotate-1'
            }`}
          >
            {filterLabels[f]}
          </button>
        ))}
      </div>

      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setPage(1);
        }}
        placeholder={t('admin.gems_search_placeholder')}
        className="w-full max-w-sm mb-4 px-3 py-2 border-2 border-ink/15 dark:border-sand-100/20 bg-white dark:bg-ink-800 text-ink dark:text-sand-100 text-sm"
      />

      {gems.length > 0 && (
        <div className="flex items-center gap-3 mb-4 text-sm">
          <label className="flex items-center gap-2 text-ink/70 dark:text-sand-200">
            <input type="checkbox" checked={selected.size === gems.length} onChange={toggleSelectAll} />
            {t('admin.select_all')}
          </label>

          {selected.size > 0 && (
            <div className="flex flex-wrap items-center gap-2 ml-2">
              <span className="text-ink/50 dark:text-sand-300/70">
                {t('admin.selected_count').replace('{count}', String(selected.size))}
              </span>
              <button
                onClick={() => bulkModerate('approved')}
                disabled={bulkBusy}
                className="bg-primary text-white px-3 py-1.5 text-xs font-bold disabled:opacity-50"
              >
                {t('admin.bulk_approve')}
              </button>
              <button
                onClick={() => bulkModerate('rejected')}
                disabled={bulkBusy}
                className="bg-white dark:bg-ink-700 text-ink dark:text-sand-50 border-2 border-ink/15 dark:border-sand-100/20 px-3 py-1.5 text-xs font-bold disabled:opacity-50"
              >
                {t('admin.bulk_reject')}
              </button>
              <button
                onClick={bulkDelete}
                disabled={bulkBusy}
                className="text-red-600 dark:text-red-400 px-3 py-1.5 text-xs font-bold disabled:opacity-50"
              >
                {t('admin.bulk_delete')}
              </button>
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        </div>
      ) : gems.length === 0 ? (
        <p className="text-center py-12 text-ink/50 dark:text-sand-300/70">{t('admin.no_gems_found')}</p>
      ) : (
        <div className="space-y-5">
          {gems.map((gem, index) => (
            <div
              key={gem.id}
              className={`polaroid bg-white dark:bg-ink-800 p-5 flex flex-col sm:flex-row gap-4 ${
                index % 2 === 0 ? 'rotate-1' : '-rotate-1'
              } hover:rotate-0 transition-transform`}
            >
              <div className="flex-shrink-0 flex sm:flex-col items-start gap-3">
                <input
                  type="checkbox"
                  checked={selected.has(gem.id)}
                  onChange={() => toggleSelected(gem.id)}
                  className="mt-1"
                />
                {gem.images?.[0] && (
                  <img
                    src={gem.images[0]}
                    alt={gem.title}
                    className="w-full sm:w-32 h-32 object-cover flex-shrink-0"
                  />
                )}
              </div>
              <div className="flex-grow min-w-0">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <h3 className="font-display font-semibold text-ink dark:text-sand-50">{gem.title}</h3>
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      gem.status === 'approved'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'
                        : gem.status === 'rejected'
                        ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                    }`}
                  >
                    {gem.status}
                  </span>
                </div>
                <p className="text-sm text-ink/60 dark:text-sand-300 mt-1 line-clamp-2">{gem.description}</p>
                <p className="text-xs text-ink/40 dark:text-sand-300/50 mt-2">
                  {t('admin.submitted_by')}{' '}
                  {gem.isAnonymous || !gem.submitterName ? t('admin.unknown_user') : `${gem.submitterName} (${gem.submitterEmail})`}
                </p>
                {gem.rejectionReason && (
                  <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                    {gem.rejectionReason}
                  </p>
                )}

                {rejectingId === gem.id ? (
                  <div className="mt-3 flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder={t('admin.reject_reason_placeholder')}
                      className="flex-grow border border-sand-300 dark:border-ink-700 dark:bg-ink-700 dark:text-sand-50 rounded px-3 py-1.5 text-sm"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => moderate(gem.id, 'rejected', rejectReason)}
                        disabled={busyId === gem.id}
                        className="bg-red-600 text-white px-3 py-1.5 text-sm font-bold disabled:opacity-50"
                      >
                        {t('admin.reject')}
                      </button>
                      <button
                        onClick={() => setRejectingId(null)}
                        className="px-3 py-1.5 text-sm text-ink/60 dark:text-sand-300"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {gem.status !== 'approved' && (
                      <button
                        onClick={() => moderate(gem.id, 'approved')}
                        disabled={busyId === gem.id}
                        className="bg-primary text-white px-3 py-1.5 text-sm font-bold shadow-[3px_3px_0_rgba(59,42,30,0.18)] hover:-translate-y-0.5 transition-transform disabled:opacity-50"
                      >
                        {t('admin.approve')}
                      </button>
                    )}
                    {gem.status !== 'rejected' && (
                      <button
                        onClick={() => setRejectingId(gem.id)}
                        disabled={busyId === gem.id}
                        className="bg-white dark:bg-ink-700 text-ink dark:text-sand-50 border-2 border-ink/15 dark:border-sand-100/20 px-3 py-1.5 text-sm font-bold disabled:opacity-50"
                      >
                        {t('admin.reject')}
                      </button>
                    )}
                    <button
                      onClick={() => deleteGem(gem.id)}
                      disabled={busyId === gem.id}
                      className="text-red-600 dark:text-red-400 px-3 py-1.5 text-sm font-bold disabled:opacity-50"
                    >
                      {t('admin.delete')}
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
