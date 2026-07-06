import Link from 'next/link';
import { Gem } from '../lib/types';
import { useLanguage } from '../contexts/LanguageContext';

// Function to calculate distance between two points using Haversine formula
const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): string => {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // Distance in kilometers

  if (distance < 1) {
    return `${Math.round(distance * 1000)} m`;
  } else {
    return `${distance.toFixed(1)} km`;
  }
};

// A small, stable "tilt" per card so the grid reads like scattered
// postcards rather than a rigid list. Derived from the gem id so it
// doesn't jump around on re-render.
const TILTS = ['rotate-1', '-rotate-2', 'rotate-2', '-rotate-1', 'rotate-[0.5deg]'];
const tiltFor = (id: string) => {
  const sum = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return TILTS[sum % TILTS.length];
};

interface GemCardProps {
  gem: Gem;
  showDistance?: boolean;
  userLocation?: { lat: number; lng: number };
}

export default function GemCard({ gem, showDistance = false, userLocation }: GemCardProps) {
  const { t } = useLanguage();

  const categoryKeyMap: { [key: string]: string } = {
    comida: 'category.restaurant',
    restaurant: 'category.restaurant',
    drink: 'category.bar',
    bar: 'category.bar',
    natureza: 'category.nature',
    arte: 'category.art',
    vista: 'category.view',
    peculiar: 'category.peculiar',
  };

  const getCategoryLabel = (category: string) => {
    const key = categoryKeyMap[category.toLowerCase()];
    return key ? t(key) : category;
  };

  const distance = userLocation && gem.location?.lat && gem.location?.lng
    ? calculateDistance(userLocation.lat, userLocation.lng, gem.location.lat, gem.location.lng)
    : null;

  return (
    <Link href={`/g/${gem.id}`}>
      <a
        className={`polaroid block bg-white dark:bg-ink-800 p-2.5 pb-4 ${tiltFor(gem.id)} hover:rotate-0 hover:-translate-y-1 transition-transform duration-200`}
      >
        <div className="relative h-40 bg-sand-200 dark:bg-ink-700 overflow-hidden">
          {gem.images && gem.images.length > 0 ? (
            <img
              src={gem.images[0]}
              alt={gem.title}
              className="w-full h-full object-cover"
              onError={(e) => {
                // Fallback to placeholder SVG if image fails to load
                (e.target as HTMLImageElement).src = '/images/placeholder.svg';
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-sand-100 dark:bg-ink-700">
              <span className="text-ink/40 dark:text-sand-300/60">{t('common.no_image')}</span>
            </div>
          )}
        </div>

        <div className="pt-3 px-1">
          <p className="font-display italic text-xs text-primary dark:text-primary-300 mb-1">
            {getCategoryLabel(gem.category)}
          </p>
          <h3 className="font-display font-semibold text-lg mb-1 text-ink dark:text-sand-50 leading-snug">{gem.title}</h3>
          <p className="text-ink/70 dark:text-sand-300 text-sm mb-2 line-clamp-2">{gem.description}</p>

          <div className="flex justify-between items-center">
            <div className="flex gap-2">
              {gem.tags.slice(0, 2).map((tag, index) => (
                <span key={index} className="text-xs italic text-ink/50 dark:text-sand-300/70">
                  #{tag}
                </span>
              ))}
            </div>

            <div className="flex items-center gap-2">
              {/* Only pages whose query joins the votes table populate
                  totalVotes — elsewhere it's undefined and this stays
                  hidden rather than showing a misleading "0". */}
              {typeof gem.totalVotes === 'number' && gem.totalVotes > 0 && (
                <span
                  className="flex items-center gap-0.5 text-xs font-medium text-ink/60 dark:text-sand-300/80"
                  title={t('voting.title')}
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905a3.61 3.61 0 01-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                  </svg>
                  {gem.netVotes}
                </span>
              )}
              {showDistance && distance && (
                <span className="text-xs text-ink/50 dark:text-sand-300/70">{distance}</span>
              )}
            </div>
          </div>
        </div>
      </a>
    </Link>
  );
}
