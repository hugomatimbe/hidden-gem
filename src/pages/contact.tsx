import Layout from '../components/Layout';
import { useLanguage } from '../contexts/LanguageContext';

export default function ContactPage() {
  const { t } = useLanguage();

  return (
    <Layout title="Hidden Gem - Contacto">
      <div className="bg-white dark:bg-ink-800 py-12">
        <div className="container mx-auto px-4 max-w-3xl">
          <h1 className="text-3xl font-display font-semibold mb-4 text-ink dark:text-sand-50">{t('contact.title')}</h1>
          <p className="text-ink/80 dark:text-sand-200 mb-8">{t('contact.intro')}</p>

          <div className="polaroid bg-white dark:bg-ink-800 p-6 inline-flex items-center gap-3 -rotate-1">
            <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <div>
              <p className="text-sm text-ink/60 dark:text-sand-300">{t('contact.email_label')}</p>
              <a href="mailto:ola@hiddengemsmaputo.com" className="text-primary font-medium hover:underline">ola@hiddengemsmaputo.com</a>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
