import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import GemCard from '../components/GemCard';
import { Gem } from '../lib/types';
import { GetStaticProps } from 'next';
import { useLanguage } from '../contexts/LanguageContext';

interface WanderProps {
  gems: Gem[];
}

export default function WanderPage({ gems }: WanderProps) {
  const { t } = useLanguage();
  const [currentGemIndex, setCurrentGemIndex] = useState(0);
  const [seenGems, setSeenGems] = useState<number[]>([]);

  const handleNextGem = () => {
    setSeenGems(prev => [...prev, currentGemIndex]);
    
    // Find next unseen gem
    let nextIndex;
    const unseenIndices = gems.map((_, index) => index).filter(i => !seenGems.includes(i));
    
    if (unseenIndices.length === 0) {
      // All gems have been seen, reset
      setSeenGems([]);
      nextIndex = 0;
    } else {
      nextIndex = unseenIndices[Math.floor(Math.random() * unseenIndices.length)];
    }
    
    setCurrentGemIndex(nextIndex);
  };

  const handleSaveGem = () => {
    // In a real app, this would save to user's favorites
    alert(t('wander.save_alert'));
  };

  useEffect(() => {
    // Start with a random gem
    const randomIndex = Math.floor(Math.random() * gems.length);
    setCurrentGemIndex(randomIndex);
  }, [gems.length]);

  if (gems.length === 0) {
    return (
      <Layout title="Hidden Gem - Wander">
        <div className="bg-white dark:bg-ink-800 py-12">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-3xl font-display font-semibold mb-4 text-ink dark:text-sand-50">{t('wander.title')}</h1>
            <p className="text-ink/70 dark:text-sand-300">{t('wander.none_found')}</p>
          </div>
        </div>
      </Layout>
    );
  }

  const currentGem = gems[currentGemIndex];

  return (
    <Layout title="Hidden Gem - Wander">
      <div className="relative overflow-hidden bg-white dark:bg-ink-800 py-12">
        <div className="hidden xl:block pointer-events-none absolute inset-0" aria-hidden="true">
          {/* Winding dashed route, left */}
          <svg className="absolute top-1/3 left-10 w-32 h-40 text-secondary/25" viewBox="0 0 120 160" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M10 10C60 10 10 60 60 80S110 140 60 150" strokeDasharray="1 10" strokeLinecap="round" />
            <circle cx="60" cy="150" r="5" fill="currentColor" stroke="none" />
          </svg>
          {/* Compass rose, right */}
          <svg className="absolute top-24 right-16 w-24 h-24 text-primary/25 rotate-12" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <circle cx="50" cy="50" r="38" strokeDasharray="4 5" />
            <path d="M50 6v18M50 76v18M6 50h18M76 50h18" />
            <path d="M50 20L58 50L50 80L42 50Z" strokeWidth={1} />
          </svg>
          {/* Star, right lower */}
          <svg className="absolute bottom-20 right-24 w-10 h-10 text-secondary/25 -rotate-12" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 1l2.6 7.9H23l-6.7 4.9L18.9 22 12 16.9 5.1 22l2.6-8.2L1 8.9h8.4z" />
          </svg>
          <span className="absolute top-16 left-24 w-1.5 h-1.5 rounded-full bg-primary/30" />
          <span className="absolute bottom-24 left-16 w-2 h-2 rounded-full bg-secondary/25" />
        </div>

        <div className="container mx-auto px-4 relative">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-display font-semibold mb-2 text-ink dark:text-sand-50">{t('hero.wander_button')}</h1>
            <p className="text-ink/70 dark:text-sand-300">{t('wander.discover_random')}</p>
            <div className="text-sm text-ink/50 dark:text-sand-300/70 mt-2">
              {seenGems.length + 1} {t('wander.progress').replace('{total}', gems.length.toString())}
            </div>
          </div>

          <div className="max-w-2xl mx-auto">
            <div className="mb-8">
              <GemCard gem={currentGem} />
            </div>

            <div className="flex justify-center space-x-4">
              <button
                onClick={handleSaveGem}
                className="flex items-center gap-2 bg-white dark:bg-ink-800 border-2 border-ink/15 dark:border-sand-100/20 text-ink/80 dark:text-sand-200 px-6 py-3 font-bold -rotate-1 hover:rotate-0 transition-transform"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                {t('wander.save')}
              </button>

              <button
                onClick={handleNextGem}
                className="flex items-center gap-2 bg-primary text-white px-6 py-3 font-bold rotate-1 hover:rotate-0 transition-transform shadow-[4px_4px_0_rgba(59,42,30,0.18)]"
              >
                {t('wander.next_place')}
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

export const getStaticProps: GetStaticProps<WanderProps> = async () => {
  // Em um app real, isso viria de uma API
  const gems: Gem[] = [
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
      description: 'Trilha não sinalizada que leva a uma praia deserta com águas cristalinas. Requer caminhada de 30 minutos pela vegetação nativa.',
      category: 'natureza',
      tags: ['praia', 'trilha', 'caminhada'],
      location: {
        lat: -26.8425,
        lng: 32.8902
      },
      images: ['/images/trilha.jpg'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: '5',
      title: 'Restaurante da Mãe Zezé',
      description: 'Restaurante familiar no bairro da Polana com pratos tradicionais moçambicanos. O matapa é incomparável!',
      category: 'comida',
      tags: ['restaurante', 'tradicional', 'matapa'],
      location: {
        lat: -25.9805,
        lng: 32.5981
      },
      images: ['/images/restaurante.jpg'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: '6',
      title: 'Mural da Rua da Liga',
      description: 'Impressionante mural de arte urbana que retrata a história de Maputo. Obra coletiva de artistas locais.',
      category: 'arte',
      tags: ['mural', 'arte urbana', 'história'],
      location: {
        lat: -25.9702,
        lng: 32.5834
      },
      images: ['/images/mural.jpg'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  ];

  return {
    props: {
      gems
    },
    revalidate: 60 * 30, // 30 minutes
  };
};