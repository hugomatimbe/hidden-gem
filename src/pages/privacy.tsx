import Layout from '../components/Layout';
import { useLanguage } from '../contexts/LanguageContext';

export default function PrivacyPage() {
  const { t } = useLanguage();

  return (
    <Layout title="Hidden Gem - Privacidade">
      <div className="bg-white dark:bg-ink-800 py-12">
        <div className="container mx-auto px-4 max-w-3xl">
          <h1 className="text-3xl font-display font-semibold mb-8 text-ink dark:text-sand-50">{t('privacy.title')}</h1>
          <div className="space-y-5 text-ink/80 dark:text-sand-200">
            <p>{t('privacy.p1')}</p>
            <p>{t('privacy.p2')}</p>
            <p>{t('privacy.p3')}</p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
