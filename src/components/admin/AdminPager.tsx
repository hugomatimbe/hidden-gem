import { useLanguage } from '../../contexts/LanguageContext';

interface AdminPagerProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}

// Shared Prev/Next pager used across every admin tab that lists rows
// (Gems, Users, Comments, Reports, Activity) so the paging UI/behavior is
// identical everywhere instead of five slightly different implementations.
export default function AdminPager({ page, pageSize, total, onPageChange }: AdminPagerProps) {
  const { t } = useLanguage();
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between mt-6 text-sm">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className="px-3 py-1.5 font-bold text-ink/70 dark:text-sand-200 border-2 border-ink/15 dark:border-sand-100/20 disabled:opacity-30"
      >
        {t('admin.pager_prev')}
      </button>
      <span className="text-ink/50 dark:text-sand-300/70">
        {t('admin.pager_page').replace('{page}', String(page)).replace('{total}', String(totalPages))}
      </span>
      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        className="px-3 py-1.5 font-bold text-ink/70 dark:text-sand-200 border-2 border-ink/15 dark:border-sand-100/20 disabled:opacity-30"
      >
        {t('admin.pager_next')}
      </button>
    </div>
  );
}
