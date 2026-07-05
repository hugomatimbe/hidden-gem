import { useEffect, useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import AdminPager from './AdminPager';

interface AdminComment {
  id: string;
  gemId: string;
  author: string;
  content: string;
  createdAt: string;
  gemTitle: string | null;
}

const PAGE_SIZE = 20;

export default function AdminComments() {
  const { t } = useLanguage();
  const [comments, setComments] = useState<AdminComment[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/comments?page=${page}&pageSize=${PAGE_SIZE}`)
      .then((res) => (res.ok ? res.json() : { items: [], total: 0 }))
      .then((data) => {
        setComments(data.items);
        setTotal(data.total);
      })
      .catch((err) => console.error('Error loading comments:', err))
      .finally(() => setLoading(false));
  }, [page]);

  const remove = async (id: string) => {
    if (!confirm(t('admin.confirm_delete_comment'))) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/comments/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setComments((prev) => prev.filter((c) => c.id !== id));
        setTotal((prev) => prev - 1);
      }
    } catch (err) {
      console.error('Error deleting comment:', err);
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
      </div>
    );
  }

  if (comments.length === 0) {
    return <p className="text-center py-12 text-ink/50 dark:text-sand-300/70">{t('admin.no_comments_found')}</p>;
  }

  return (
    <div>
      <div className="space-y-4">
        {comments.map((comment, index) => (
          <div
            key={comment.id}
            className={`polaroid bg-white dark:bg-ink-800 p-5 ${
              index % 2 === 0 ? '-rotate-1' : 'rotate-1'
            } hover:rotate-0 transition-transform`}
          >
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <p className="text-sm text-ink dark:text-sand-50">{comment.content}</p>
                <p className="text-xs text-ink/40 dark:text-sand-300/50 mt-2">
                  {comment.author} · {t('admin.comment_on')} {comment.gemTitle || t('admin.unknown_user')}
                </p>
              </div>
              <button
                onClick={() => remove(comment.id)}
                disabled={busyId === comment.id}
                className="text-red-600 dark:text-red-400 text-sm font-bold disabled:opacity-50 flex-shrink-0"
              >
                {t('admin.delete')}
              </button>
            </div>
          </div>
        ))}
      </div>

      <AdminPager page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
    </div>
  );
}
