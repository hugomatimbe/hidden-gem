import { GetStaticProps, GetStaticPaths } from 'next';
import Layout from '../../components/Layout';
import GemCard from '../../components/GemCard';
import { Gem } from '../../lib/types';
import { useLanguage } from '../../contexts/LanguageContext';

interface TagPageProps {
  tag: string;
  gems: Gem[];
}

export default function TagPage({ tag, gems }: TagPageProps) {
  const { t } = useLanguage();
  return (
    <Layout title={`Hidden Gem - ${t('tags.title_prefix')} ${tag}`}>
      <div className="bg-white dark:bg-ink-800 py-12">
        <div className="container mx-auto px-4">
          <div className="mb-8">
            <h1 className="text-3xl font-display font-semibold mb-2 text-ink dark:text-sand-50">{t('tags.title_prefix')} {tag}</h1>
            <p className="text-ink/70 dark:text-sand-300">{gems.length} {t('tags.count_suffix')}</p>
          </div>

          {gems.length === 0 ? (
            <div className="text-center py-12">
              <h3 className="text-xl font-medium mb-2 text-ink dark:text-sand-50">{t('tags.empty_title')}</h3>
              <p className="text-ink/70 dark:text-sand-300 mb-4">{t('tags.empty_desc')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {gems.map(gem => (
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
  // Em um app real, isso buscaria todas as tags únicas
  const tags = ['café', 'centro', 'tradicional', 'pôr do sol', 'mar', 'fotografia', 'arte', 'cultura', 'exposição', 'praia', 'trilha', 'caminhada'];
  
  const paths = tags.map(tag => ({
    params: { tag }
  }));

  return {
    paths,
    fallback: 'blocking'
  };
};

export const getStaticProps: GetStaticProps<TagPageProps> = async ({ params }) => {
  const tag = params?.tag as string;
  
  // Em um app real, isso buscaria do banco de dados
  const allGems: Gem[] = [
    {
      id: '1',
      title: 'Café Escondido da Baixa',
      description: 'Um pequeno café no centro da cidade com o melhor café de Maputo e atmosfera acolhedora.',
      category: 'comida',
      tags: ['café', 'centro', 'tradicional'],
      location: {
        lat: -25.9692,
        lng: 32.5732
      },
      images: ['/images/cafe.jpg'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: '2',
      title: 'Miradouro da Costa do Sol',
      description: 'Uma vista espetacular do pôr do sol sobre o Índico, longe das multidões turísticas.',
      category: 'vista',
      tags: ['pôr do sol', 'mar', 'fotografia'],
      location: {
        lat: -25.9586,
        lng: 32.5901
      },
      images: ['/images/miradouro.jpg'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: '3',
      title: 'Galeria de Arte Independente',
      description: 'Espaço expositivo com obras de artistas moçambicanos emergentes em um edifício restaurado.',
      category: 'arte',
      tags: ['arte', 'cultura', 'exposição'],
      location: {
        lat: -25.9665,
        lng: 32.5804
      },
      images: ['/images/galeria.jpg'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: '4',
      title: 'Trilha da Ponta d\'Ouro',
      description: 'Trilha não sinalizada que leva a uma praia deserta com águas cristalinas.',
      category: 'natureza',
      tags: ['praia', 'trilha', 'caminhada'],
      location: {
        lat: -26.8425,
        lng: 32.8902
      },
      images: ['/images/trilha.jpg'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  ];

  const gems = allGems.filter(gem => 
    gem.tags.some(t => t.toLowerCase() === tag.toLowerCase())
  );

  return {
    props: {
      tag,
      gems
    },
    revalidate: 60 * 60 // 1 hora
  };
};