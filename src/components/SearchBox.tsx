import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useLanguage } from '../contexts/LanguageContext';
import { Gem } from '../lib/types';

interface SearchBoxProps {
  className?: string;
  initialQuery?: string;
}

const SUGGESTION_LIMIT = 6;
const DEBOUNCE_MS = 200;

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

// Compact search input used in the header nav, and reused (with a bigger
// initial value) at the top of the /search results page itself. Shows a
// live-suggestions dropdown as you type — matching gem titles/tags — so
// people don't have to type a place's full name and hit enter just to find
// out whether it's on the site.
export default function SearchBox({ className = '', initialQuery = '' }: SearchBoxProps) {
  const { t } = useLanguage();
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [suggestions, setSuggestions] = useState<Gem[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const requestIdRef = useRef(0);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (trimmed.length < 2) {
      setSuggestions([]);
      setLoading(false);
      setActiveIndex(-1);
      return;
    }

    setLoading(true);
    const requestId = ++requestIdRef.current;
    debounceRef.current = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(trimmed)}&limit=${SUGGESTION_LIMIT}`)
        .then((res) => (res.ok ? res.json() : []))
        .then((data) => {
          // Ignore stale responses that resolve out of order.
          if (requestId !== requestIdRef.current) return;
          setSuggestions(data);
          setActiveIndex(-1);
        })
        .catch((err) => console.error('Error fetching suggestions:', err))
        .finally(() => {
          if (requestId === requestIdRef.current) setLoading(false);
        });
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const goToResults = (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    setOpen(false);
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  };

  const goToGem = (gem: Gem) => {
    setOpen(false);
    setQuery('');
    router.push(`/g/${gem.id}`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeIndex >= 0 && suggestions[activeIndex]) {
      goToGem(suggestions[activeIndex]);
    } else {
      goToResults(query);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev <= 0 ? suggestions.length - 1 : prev - 1));
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const showDropdown = open && query.trim().length >= 2;

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <form onSubmit={handleSubmit} className="relative">
        <input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={t('search.placeholder')}
          aria-label={t('search.placeholder')}
          autoComplete="off"
          className="w-full pl-9 pr-3 py-1.5 text-sm border border-sand-300 dark:border-ink-700 rounded bg-white dark:bg-ink-700 text-ink dark:text-sand-50 focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
        <button
          type="submit"
          aria-label={t('search.submit')}
          className="absolute left-2 top-1/2 -translate-y-1/2 text-ink/40 dark:text-sand-300/60"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 10a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </button>
      </form>

      {showDropdown && (
        <div className="absolute left-0 right-0 mt-1 bg-white dark:bg-ink-800 border-2 border-ink/15 dark:border-sand-100/20 shadow-lg z-30 max-h-96 overflow-y-auto">
          {loading ? (
            <div className="px-4 py-3 text-sm text-ink/50 dark:text-sand-300/70">{t('search.searching')}</div>
          ) : suggestions.length === 0 ? (
            <div className="px-4 py-3 text-sm text-ink/50 dark:text-sand-300/70">{t('search.no_suggestions')}</div>
          ) : (
            <ul>
              {suggestions.map((gem, index) => (
                <li key={gem.id}>
                  <Link href={`/g/${gem.id}`}>
                    <a
                      onClick={() => {
                        setOpen(false);
                        setQuery('');
                      }}
                      onMouseEnter={() => setActiveIndex(index)}
                      className={`flex items-center gap-3 px-3 py-2 ${
                        activeIndex === index ? 'bg-sand-100 dark:bg-ink-700' : ''
                      }`}
                    >
                      <div className="w-9 h-9 flex-shrink-0 rounded bg-sand-200 dark:bg-ink-700 overflow-hidden">
                        {gem.images && gem.images.length > 0 && (
                          <img src={gem.images[0]} alt="" className="w-full h-full object-cover" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-ink dark:text-sand-50 truncate">{gem.title}</p>
                        <p className="text-xs text-ink/50 dark:text-sand-300/70 truncate">
                          {t(categoryKeyMap[gem.category?.toLowerCase()] || '') || gem.category}
                        </p>
                      </div>
                    </a>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          {query.trim().length >= 2 && (
            <button
              type="button"
              onClick={() => goToResults(query)}
              className="w-full text-left px-4 py-2.5 text-sm font-bold text-primary border-t border-sand-200 dark:border-ink-700 hover:bg-sand-50 dark:hover:bg-ink-700"
            >
              {t('search.see_all').replace('{query}', query.trim())}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
