import { GetStaticProps } from 'next';
import Link from 'next/link';
import { getDb } from '../lib/db';
import Layout from '../components/Layout';
import { useLanguage } from '../contexts/LanguageContext';

interface ListSummary {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  coverImage: string | null;
  itemCount: number;
}

interface ListsPageProps {
  lists: ListSummary[];
}

export default function ListsPage({ lists }: ListsPageProps) {
  const { t } = useLanguage();

  return (
    <Layout title={t('lists.page_title')} description={t('lists.subtitle')} url="/lists">
      <div className="bg-white dark:bg-ink-800 py-12">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h1 className="text-3xl font-display font-semibold mb-4 text-ink dark:text-sand-50">{t('lists.title')}</h1>
            <p className="text-ink/60 dark:text-sand-300 max-w-2xl mx-auto">{t('lists.subtitle')}</p>
          </div>

          {lists.length === 0 ? (
            <p className="text-center text-ink/50 dark:text-sand-300/70 py-12">{t('lists.empty')}</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {lists.map((list, index) => (
                <Link key={list.id} href={`/lists/${list.slug}`}>
                  <a
                    className={`polaroid block bg-white dark:bg-ink-800 p-2.5 pb-4 ${
                      index % 2 === 0 ? 'rotate-1' : '-rotate-1'
                    } hover:rotate-0 hover:-translate-y-1 transition-transform duration-200`}
                  >
                    <div className="relative h-40 bg-sand-200 dark:bg-ink-700 overflow-hidden">
                      {list.coverImage ? (
                        <img src={list.coverImage} alt={list.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-ink/40 dark:text-sand-300/60">{t('common.no_image')}</span>
                        </div>
                      )}
                    </div>
                    <div className="pt-3 px-1">
                      <h3 className="font-display font-semibold text-lg mb-1 text-ink dark:text-sand-50 leading-snug">
                        {list.title}
                      </h3>
                      {list.description && (
                        <p className="text-ink/70 dark:text-sand-300 text-sm mb-2 line-clamp-2">{list.description}</p>
                      )}
                      <p className="text-xs text-ink/50 dark:text-sand-300/70">
                        {t('lists.gem_count').replace('{count}', String(list.itemCount))}
                      </p>
                    </div>
                  </a>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

export const getStaticProps: GetStaticProps<ListsPageProps> = async () => {
  try {
    const db = getDb();
    const rows = db
      .prepare(
        `SELECT lists.*, COUNT(list_items.gemId) as itemCount
         FROM lists
         LEFT JOIN list_items ON list_items.listId = lists.id
         WHERE lists.isPublished = 1
         GROUP BY lists.id
         ORDER BY lists.createdAt DESC`
      )
      .all() as any[];

    return {
      props: {
        lists: rows.map((r) => ({
          id: r.id,
          title: r.title,
          slug: r.slug,
          description: r.description,
          coverImage: r.coverImage,
          itemCount: r.itemCount,
        })),
      },
      revalidate: 300,
    };
  } catch (error) {
    console.error('Error loading lists:', error);
    return { props: { lists: [] }, revalidate: 60 };
  }
};
