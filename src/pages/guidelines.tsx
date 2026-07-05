import Link from 'next/link';
import Layout from '../components/Layout';
import { useLanguage } from '../contexts/LanguageContext';

export default function GuidelinesPage() {
  const { t } = useLanguage();

  const guidelines = [
    t('submit.guideline_1'),
    t('submit.guideline_2'),
    t('submit.guideline_3'),
    t('submit.guideline_4'),
  ];

  return (
    <Layout title="Hidden Gem - Diretrizes">
      <div className="bg-white dark:bg-ink-800 py-12">
        <div className="container mx-auto px-4 max-w-3xl">
          <h1 className="text-3xl font-display font-semibold mb-8 text-ink dark:text-sand-50">{t('submit.guidelines_title')}</h1>
          <ul className="space-y-4">
            {guidelines.map((guideline, index) => (
              <li key={index} className="flex items-start gap-3">
                <div className="w-6 h-6 border-2 border-dashed border-primary text-primary flex items-center justify-center text-sm font-display font-medium flex-shrink-0 mt-0.5 rounded-full">
                  {index + 1}
                </div>
                <p className="text-ink/80 dark:text-sand-200">{guideline}</p>
              </li>
            ))}
          </ul>

          <div className="mt-10">
            <Link href="/submit">
              <a className="inline-block bg-primary text-white px-6 py-3 font-bold rotate-1 hover:rotate-0 transition-transform shadow-[4px_4px_0_rgba(59,42,30,0.18)]">
                {t('nav.add')}
              </a>
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  );
}
