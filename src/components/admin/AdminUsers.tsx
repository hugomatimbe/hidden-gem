import { useEffect, useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import AdminPager from './AdminPager';

interface AdminUser {
  id: string;
  email: string;
  displayName: string;
  createdAt: string;
  isAdmin: boolean;
  isBanned: boolean;
  gemCount: number;
}

type SortKey = 'name' | 'email' | 'createdAt' | 'gemCount';

const PAGE_SIZE = 20;

export default function AdminUsers() {
  const { t } = useLanguage();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortKey>('createdAt');
  const [dir, setDir] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(PAGE_SIZE),
      sort,
      dir,
    });
    if (query.trim()) params.set('q', query.trim());

    // Debounced so typing in the search box doesn't fire a request per
    // keystroke — same pattern as the header's search suggestions.
    const timeout = setTimeout(() => {
      fetch(`/api/admin/users?${params.toString()}`)
        .then((res) => (res.ok ? res.json() : { items: [], total: 0 }))
        .then((data) => {
          setUsers(data.items);
          setTotal(data.total);
        })
        .catch((err) => console.error('Error loading users:', err))
        .finally(() => setLoading(false));
    }, 250);

    return () => clearTimeout(timeout);
  }, [page, query, sort, dir]);

  const toggleSort = (key: SortKey) => {
    if (sort === key) {
      setDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSort(key);
      setDir('asc');
    }
    setPage(1);
  };

  const patch = async (id: string, body: { isAdmin?: boolean; isBanned?: boolean }) => {
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...body } : u)));
      } else {
        const data = await res.json().catch(() => null);
        if (data?.error) alert(data.error);
      }
    } catch (err) {
      console.error('Error updating user:', err);
    } finally {
      setBusyId(null);
    }
  };

  const SortHeader = ({ label, sortKey }: { label: string; sortKey: SortKey }) => (
    <button
      onClick={() => toggleSort(sortKey)}
      className="flex items-center gap-1 font-medium hover:text-primary"
    >
      {label}
      {sort === sortKey && <span className="text-primary">{dir === 'asc' ? '▲' : '▼'}</span>}
    </button>
  );

  return (
    <div>
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setPage(1);
        }}
        placeholder={t('admin.users_search_placeholder')}
        className="w-full max-w-sm mb-4 px-3 py-2 border-2 border-ink/15 dark:border-sand-100/20 bg-white dark:bg-ink-800 text-ink dark:text-sand-100 text-sm"
      />

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        </div>
      ) : users.length === 0 ? (
        <p className="text-center py-12 text-ink/50 dark:text-sand-300/70">{t('admin.no_users_found')}</p>
      ) : (
        <div className="polaroid bg-white dark:bg-ink-800 p-2 sm:p-4 overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="text-left text-ink/50 dark:text-sand-300/60 border-b border-sand-200 dark:border-ink-700">
                <th className="py-2 px-3"><SortHeader label={t('admin.users_name')} sortKey="name" /></th>
                <th className="py-2 px-3"><SortHeader label={t('admin.users_email')} sortKey="email" /></th>
                <th className="py-2 px-3"><SortHeader label={t('admin.users_gems')} sortKey="gemCount" /></th>
                <th className="py-2 px-3 font-medium">{t('admin.users_role')}</th>
                <th className="py-2 px-3 font-medium">{t('admin.users_status')}</th>
                <th className="py-2 px-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const isSelf = u.id === currentUser?.id;
                return (
                  <tr key={u.id} className="border-b border-sand-100 dark:border-ink-700/50 last:border-0">
                    <td className="py-3 px-3 text-ink dark:text-sand-50 font-medium">
                      {u.displayName} {isSelf && <span className="text-ink/40 dark:text-sand-300/50">({t('admin.you')})</span>}
                    </td>
                    <td className="py-3 px-3 text-ink/70 dark:text-sand-300">{u.email}</td>
                    <td className="py-3 px-3 text-ink/70 dark:text-sand-300">{u.gemCount}</td>
                    <td className="py-3 px-3">
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          u.isAdmin
                            ? 'bg-primary/15 text-primary'
                            : 'bg-sand-100 dark:bg-ink-700 text-ink/50 dark:text-sand-300/60'
                        }`}
                      >
                        {u.isAdmin ? t('nav.admin') : '—'}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          u.isBanned
                            ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'
                            : 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'
                        }`}
                      >
                        {u.isBanned ? t('admin.status_banned') : t('admin.status_active')}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      {!isSelf && (
                        <div className="flex gap-3 whitespace-nowrap">
                          <button
                            onClick={() => patch(u.id, { isAdmin: !u.isAdmin })}
                            disabled={busyId === u.id}
                            className="text-primary hover:text-primary-600 font-medium disabled:opacity-50"
                          >
                            {u.isAdmin ? t('admin.remove_admin') : t('admin.make_admin')}
                          </button>
                          <button
                            onClick={() => patch(u.id, { isBanned: !u.isBanned })}
                            disabled={busyId === u.id}
                            className="text-red-600 dark:text-red-400 font-medium disabled:opacity-50"
                          >
                            {u.isBanned ? t('admin.unban') : t('admin.ban')}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <AdminPager page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
    </div>
  );
}
