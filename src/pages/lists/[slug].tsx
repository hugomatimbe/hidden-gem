import { GetStaticPaths, GetStaticProps } from 'next';
import Link from 'next/link';
import { getDb } from '../../lib/db';
import { parseGemRow } from '../../lib/gems';
import Layout from '../../components/Layout';
import GemCard from '../../components/GemCard';
import { Gem } from '../../lib/types';
import { useLanguage } from '../../contexts/LanguageContext';

interface ListInfo {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  coverImage: string | null;
}

interface ListDetailProps {
  list: ListInfo | null;
  gems: Gem[];
}

export default function ListDetailPage({ list, gems }: ListDetailProps) {
  const { t } = useLanguage();

  if (!list) {
    return (
      <Layout title="Hidden Gem">
        <div className="container mx-auto px-4 py-16 text-center">
          <p className="text-ink/50 dark:text-sand-300/70">{t('lists.not_available')}</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout
      title={`${list.title} - Hidden Gem`}
      description={list.description || undefined}
      image={list.coverImage || undefined}
      url={`/lists/${list.slug}`}
    >
      <div className="bg-white dark:bg-ink-800 py-12">
        <div className="container mx-auto px-4">
          <Link href="/lists">
            <a className="text-sm text-ink/50 dark:text-sand-300/70 hover:text-primary mb-6 inline-block">
              ← {t('lists.back_to_lists')}
            </a>
          </Link>

          <div className="text-center mb-12">
            <h1 className="text-3xl font-display font-semibold mb-4 text-ink dark:text-sand-50">{list.title}</h1>
            {list.description && (
              <p className="text-ink/60 dark:text-sand-300 max-w-2xl mx-auto">{list.description}</p>
            )}
          </div>

          {gems.length === 0 ? (
            <p className="text-center text-ink/50 dark:text-sand-300/70 py-12">{t('lists.list_empty')}</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {gems.map((gem) => (
                <GemCard key={gem.id} gem={gem} />
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  try {
    const db = getDb();
    const rows = db.prepare('SELECT slug FROM lists WHERE isPublished = 1').all() as { slug: string }[];
    return { paths: rows.map((r) => ({ params: { slug: r.slug } })), fallback: 'blocking' };
  } catch (error) {
    console.error('Error building list paths:', error);
    return { paths: [], fallback: 'blocking' };
  }
};

export const getStaticProps: GetStaticProps<ListDetailProps> = async ({ params }) => {
  const slug = params?.slug as string;

  try {
    const db = getDb();
    const listRow = db.prepare('SELECT * FROM lists WHERE slug = ?').get(slug) as any;

    if (!listRow || !listRow.isPublished) {
      return { notFound: true, revalidate: 60 };
    }

    const itemRows = db
      .prepare(
        `SELECT gems.* FROM list_items
         JOIN gems ON gems.id = list_items.gemId
         WHERE list_items.listId = ? AND gems.status = 'approved'
         ORDER BY list_items.position ASC`
      )
      .all(listRow.id) as any[];

    return {
      props: {
        list: {
          id: listRow.id,
          title: listRow.title,
          slug: listRow.slug,
          description: listRow.description,
          coverImage: listRow.coverImage,
        },
        gems: itemRows.map(parseGemRow),
      },
      revalidate: 300,
    };
  } catch (error) {
    console.error('Error fetching list:', error);
    return { notFound: true, revalidate: 60 };
  }
};
