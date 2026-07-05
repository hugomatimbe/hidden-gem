import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="pt-MZ">
      <Head>
        {/* Per-page description, Open Graph, Twitter card and canonical tags
            now live in Layout.tsx instead of here. _document.tsx's <Head>
            (from next/document) is a different mechanism from next/head's
            <Head> used in pages/components — it isn't replaced on
            navigation and isn't deduped against page-level tags, so
            anything page-specific placed here would either duplicate or
            permanently shadow each gem/page's own title/description/image
            when shared. Only truly site-wide, non-varying tags belong here. */}
        <meta name="keywords" content="Maputo, lugares secretos, hidden gems, cafés, restaurantes, vistas, arte, natureza, Moçambique" />
        <meta name="author" content="Hidden Gems Maputo" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Fraunces:opsz,wght@9..144,500;9..144,600&display=swap" rel="stylesheet" />

        {/* Removed Google Maps Script to avoid multiple loading */}
        {/* Google Maps API will be loaded dynamically in Map component */}

        {/* Aplica o tema salvo antes da hidratação, para evitar flash de tema errado */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var saved = localStorage.getItem('theme');
                  var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  var theme = saved || (prefersDark ? 'dark' : 'light');
                  if (theme === 'dark') {
                    document.documentElement.classList.add('dark');
                  }
                } catch (e) {}
              })();
            `
          }}
        />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
