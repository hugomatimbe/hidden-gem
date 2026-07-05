import { useEffect, useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import ImageUpload from '../ImageUpload';

interface ListRow {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  coverImage: string | null;
  isPublished: number;
  itemCount: number;
  createdAt: string;
}

interface ListItem {
  gemId: string;
  position: number;
  note: string | null;
  title: string;
  image: string | null;
}

interface ListDetail extends ListRow {
  items: ListItem[];
}

interface GemOption {
  id: string;
  title: string;
}

export default function AdminLists() {
  const { t } = useLanguage();
  const [lists, setLists] = useState<ListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newCover, setNewCover] = useState<string[]>([]);
  const [savingNew, setSavingNew] = useState(false);

  const [managingId, setManagingId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ListDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [allGems, setAllGems] = useState<GemOption[]>([]);
  const [gemQuery, setGemQuery] = useState('');
  const [busy, setBusy] = useState(false);

  const loadLists = () => {
    setLoading(true);
    fetch('/api/admin/lists')
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setLists(data))
      .catch((err) => console.error('Error loading lists:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadLists();
  }, []);

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    setSavingNew(true);
    try {
      const res = await fetch('/api/admin/lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle.trim(),
          description: newDescription.trim() || undefined,
          coverImage: newCover[0] || undefined,
        }),
      });
      if (res.ok) {
        setNewTitle('');
        setNewDescription('');
        setNewCover([]);
        setCreating(false);
        loadLists();
      }
    } catch (err) {
      console.error('Error creating list:', err);
    } finally {
      setSavingNew(false);
    }
  };

  const togglePublish = async (list: ListRow) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/lists/${list.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublished: !list.isPublished }),
      });
      if (res.ok) loadLists();
    } catch (err) {
      console.error('Error updating list:', err);
    } finally {
      setBusy(false);
    }
  };

  const deleteList = async (id: string) => {
    if (!confirm(t('admin.lists_confirm_delete'))) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/lists/${id}`, { method: 'DELETE' });
      if (res.ok) {
        if (managingId === id) setManagingId(null);
        loadLists();
      }
    } catch (err) {
      console.error('Error deleting list:', err);
    } finally {
      setBusy(false);
    }
  };

  const openManage = async (id: string) => {
    if (managingId === id) {
      setManagingId(null);
      setDetail(null);
      return;
    }
    setManagingId(id);
    setDetailLoading(true);
    try {
      const [detailRes, gemsRes] = await Promise.all([
        fetch(`/api/admin/lists/${id}`),
        allGems.length ? Promise.resolve(null) : fetch('/api/admin/gems?status=all'),
      ]);
      if (detailRes.ok) setDetail(await detailRes.json());
      if (gemsRes && gemsRes.ok) {
        const gemsData = await gemsRes.json();
        setAllGems(gemsData.map((g: any) => ({ id: g.id, title: g.title })));
      }
    } catch (err) {
      console.error('Error loading list detail:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  const refreshDetail = async (id: string) => {
    const res = await fetch(`/api/admin/lists/${id}`);
    if (res.ok) setDetail(await res.json());
    loadLists();
  };

  const addGem = async (gemId: string) => {
    if (!detail) return;
    setBusy(true);
    try {
      await fetch(`/api/admin/lists/${detail.id}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gemId }),
      });
      setGemQuery('');
      await refreshDetail(detail.id);
    } catch (err) {
      console.error('Error adding gem to list:', err);
    } finally {
      setBusy(false);
    }
  };

  const removeGem = async (gemId: string) => {
    if (!detail) return;
    setBusy(true);
    try {
      await fetch(`/api/admin/lists/${detail.id}/items?gemId=${encodeURIComponent(gemId)}`, { method: 'DELETE' });
      await refreshDetail(detail.id);
    } catch (err) {
      console.error('Error removing gem from list:', err);
    } finally {
      setBusy(false);
    }
  };

  const moveItem = async (index: number, direction: -1 | 1) => {
    if (!detail) return;
    const items = [...detail.items];
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    [items[index], items[target]] = [items[target], items[index]];
    setDetail({ ...detail, items });
    try {
      await fetch(`/api/admin/lists/${detail.id}/items`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gemIds: items.map((i) => i.gemId) }),
      });
    } catch (err) {
      console.error('Error reordering list items:', err);
    }
  };

  const gemMatches =
    gemQuery.trim().length > 0
      ? allGems
          .filter((g) => g.title.toLowerCase().includes(gemQuery.trim().toLowerCase()))
          .filter((g) => !detail?.items.some((i) => i.gemId === g.id))
          .slice(0, 8)
      : [];

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        {!creating ? (
          <button
            onClick={() => setCreating(true)}
            className="bg-primary text-white px-4 py-2 text-sm font-bold shadow-[3px_3px_0_rgba(59,42,30,0.18)]"
          >
            + {t('admin.lists_new')}
          </button>
        ) : (
          <div className="polaroid bg-white dark:bg-ink-800 p-5 rotate-0">
            <label className="block text-sm font-medium text-ink/80 dark:text-sand-200 mb-1">
              {t('admin.lists_title_label')}
            </label>
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="w-full mb-3 px-3 py-2 border-2 border-ink/15 dark:border-sand-100/20 bg-white dark:bg-ink-900 text-ink dark:text-sand-100 text-sm"
            />
            <label className="block text-sm font-medium text-ink/80 dark:text-sand-200 mb-1">
              {t('admin.lists_description_label')}
            </label>
            <textarea
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              rows={2}
              className="w-full mb-3 px-3 py-2 border-2 border-ink/15 dark:border-sand-100/20 bg-white dark:bg-ink-900 text-ink dark:text-sand-100 text-sm"
            />
            <label className="block text-sm font-medium text-ink/80 dark:text-sand-200 mb-1">
              {t('admin.lists_cover_label')}
            </label>
            <ImageUpload onImagesChange={setNewCover} initialImages={newCover} maxImages={1} />
            <div className="flex gap-2 mt-2">
              <button
                onClick={handleCreate}
                disabled={savingNew || !newTitle.trim()}
                className="bg-primary text-white px-4 py-2 text-sm font-bold shadow-[3px_3px_0_rgba(59,42,30,0.18)] disabled:opacity-50"
              >
                {t('admin.lists_save')}
              </button>
              <button
                onClick={() => {
                  setCreating(false);
                  setNewTitle('');
                  setNewDescription('');
                  setNewCover([]);
                }}
                className="text-ink/60 dark:text-sand-300 px-2 text-sm"
              >
                {t('admin.lists_cancel')}
              </button>
            </div>
          </div>
        )}
      </div>

      {lists.length === 0 ? (
        <p className="text-center py-12 text-ink/50 dark:text-sand-300/70">{t('admin.lists_none')}</p>
      ) : (
        <div className="space-y-4">
          {lists.map((list, index) => (
            <div
              key={list.id}
              className={`polaroid bg-white dark:bg-ink-800 p-5 ${
                index % 2 === 0 ? '-rotate-1' : 'rotate-1'
              } hover:rotate-0 transition-transform`}
            >
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-display font-semibold text-ink dark:text-sand-50">{list.title}</h4>
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                        list.isPublished
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                          : 'bg-sand-100 dark:bg-ink-700 text-ink/50 dark:text-sand-300/60'
                      }`}
                    >
                      {list.isPublished ? t('admin.lists_published') : t('admin.lists_unpublished')}
                    </span>
                  </div>
                  {list.description && (
                    <p className="text-sm text-ink/70 dark:text-sand-300 mt-1">{list.description}</p>
                  )}
                  <p className="text-xs text-ink/40 dark:text-sand-300/50 mt-2">
                    {t('lists.gem_count').replace('{count}', String(list.itemCount))}
                  </p>
                </div>

                <div className="flex gap-3 flex-shrink-0 text-sm font-bold">
                  <button onClick={() => openManage(list.id)} className="text-ink/70 dark:text-sand-200 hover:text-primary">
                    {t('admin.lists_manage_gems')}
                  </button>
                  <button onClick={() => togglePublish(list)} disabled={busy} className="text-ink/70 dark:text-sand-200 hover:text-primary disabled:opacity-50">
                    {list.isPublished ? t('admin.lists_unpublish') : t('admin.lists_publish')}
                  </button>
                  <button onClick={() => deleteList(list.id)} disabled={busy} className="text-red-600 dark:text-red-400 disabled:opacity-50">
                    {t('admin.lists_delete')}
                  </button>
                </div>
              </div>

              {managingId === list.id && (
                <div className="mt-4 pt-4 border-t border-sand-200 dark:border-ink-700">
                  {detailLoading || !detail ? (
                    <div className="text-center py-6">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                    </div>
                  ) : (
                    <>
                      {detail.items.length === 0 ? (
                        <p className="text-sm text-ink/50 dark:text-sand-300/70 mb-3">{t('admin.lists_no_items')}</p>
                      ) : (
                        <div className="space-y-2 mb-4">
                          {detail.items.map((item, itemIndex) => (
                            <div
                              key={item.gemId}
                              className="flex items-center gap-3 bg-sand-50 dark:bg-ink-900 px-3 py-2"
                            >
                              <div className="w-10 h-10 flex-shrink-0 bg-sand-200 dark:bg-ink-700 overflow-hidden">
                                {item.image && <img src={item.image} alt={item.title} className="w-full h-full object-cover" />}
                              </div>
                              <span className="flex-grow text-sm text-ink dark:text-sand-50 truncate">{item.title}</span>
                              <button
                                onClick={() => moveItem(itemIndex, -1)}
                                disabled={itemIndex === 0}
                                className="text-ink/50 dark:text-sand-300/70 disabled:opacity-20"
                                aria-label="Up"
                              >
                                ↑
                              </button>
                              <button
                                onClick={() => moveItem(itemIndex, 1)}
                                disabled={itemIndex === detail.items.length - 1}
                                className="text-ink/50 dark:text-sand-300/70 disabled:opacity-20"
                                aria-label="Down"
                              >
                                ↓
                              </button>
                              <button
                                onClick={() => removeGem(item.gemId)}
                                className="text-red-600 dark:text-red-400 text-xs font-bold"
                              >
                                {t('admin.lists_remove_item')}
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="relative">
                        <input
                          type="text"
                          value={gemQuery}
                          onChange={(e) => setGemQuery(e.target.value)}
                          placeholder={t('admin.lists_search_gems_placeholder')}
                          className="w-full px-3 py-2 border-2 border-ink/15 dark:border-sand-100/20 bg-white dark:bg-ink-900 text-ink dark:text-sand-100 text-sm"
                        />
                        {gemMatches.length > 0 && (
                          <div className="absolute z-10 mt-1 w-full bg-white dark:bg-ink-800 border-2 border-ink/15 dark:border-sand-100/20 max-h-48 overflow-y-auto">
                            {gemMatches.map((gem) => (
                              <button
                                key={gem.id}
                                onClick={() => addGem(gem.id)}
                                className="block w-full text-left px-3 py-2 text-sm hover:bg-sand-100 dark:hover:bg-ink-700 text-ink dark:text-sand-50"
                              >
                                + {gem.title}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
