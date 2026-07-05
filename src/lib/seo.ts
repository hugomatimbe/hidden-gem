// Small SEO/sharing helpers shared between pages that need absolute URLs
// (Open Graph / Twitter tags, canonical links). Pulled out of individual
// pages so there's one place to point at once a real domain is picked.
//
// NEXT_PUBLIC_SITE_URL isn't set yet anywhere in this project — until it is,
// this falls back to the placeholder domain that was already hardcoded in
// _document.tsx. Set NEXT_PUBLIC_SITE_URL in .env.local once a real domain
// is live and every absolute URL generated here (and in lib/email.ts) picks
// it up automatically.
const DEFAULT_SITE_URL = 'https://hiddengemsmaputo.com';

export function getSiteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || DEFAULT_SITE_URL).replace(/\/$/, '');
}

// Turns a stored path like "/uploads/xyz.jpg" into an absolute URL. Already-
// absolute URLs (e.g. a gem photo hosted elsewhere) are returned untouched.
export function absoluteUrl(pathOrUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  const path = pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`;
  return `${getSiteUrl()}${path}`;
}

// Social previews get noisy/truncated oddly past ~200 chars — trim long
// gem descriptions down for og:description/twitter:description specifically
// (the on-page <p> still shows the full text).
export function truncateForPreview(text: string, maxLength = 200): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1).trimEnd()}…`;
}
