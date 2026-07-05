import Layout from '../components/Layout';
import Link from 'next/link';
import { useLanguage } from '../contexts/LanguageContext';

export default function CategoriesPage() {
  const { t } = useLanguage();
  const categories = [
    { id: 'comida', name: t('category.restaurant'), description: t('category.restaurant_desc'), icon: '🍽️' },
    { id: 'natureza', name: t('category.nature'), description: t('category.nature_desc'), icon: '🌿' },
    { id: 'arte', name: t('category.art'), description: t('category.art_desc'), icon: '🎨' },
    { id: 'vista', name: t('category.view'), description: t('category.view_desc'), icon: '🌅' },
    { id: 'peculiar', name: t('category.peculiar'), description: t('category.peculiar_desc'), icon: '🤔' },
  ];

  const TILTS = ['rotate-1', '-rotate-2', 'rotate-2', '-rotate-1', 'rotate-[0.5deg]'];

  return (
    <Layout title="Hidden Gem - Categorias">
      <div className="bg-white dark:bg-ink-800 py-12">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h1 className="text-3xl font-display font-semibold mb-4 text-ink dark:text-sand-50">{t('categories.title')}</h1>
            <p className="text-ink/70 dark:text-sand-300 max-w-2xl mx-auto">
              {t('categories.subtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((category, index) => (
              <Link key={category.id} href={`/c/maputo?category=${category.id}`}>
                <a className={`polaroid block bg-white dark:bg-ink-800 p-6 ${TILTS[index % TILTS.length]} hover:rotate-0 transition-transform group`}>
                  <div className="text-4xl mb-4">{category.icon}</div>
                  <h2 className="text-xl font-display font-semibold mb-2 text-ink dark:text-sand-50 group-hover:text-primary transition">{category.name}</h2>
                  <p className="text-ink/70 dark:text-sand-300">{category.description}</p>
                </a>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}