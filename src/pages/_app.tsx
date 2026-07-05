import '../styles/globals.css';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { AppProps } from 'next/app';
import { SavedGemsProvider } from '../contexts/SavedGemsContext';
import { ThemeProvider } from '../contexts/ThemeContext';
import { LanguageProvider } from '../contexts/LanguageContext';
import { AuthProvider } from '../contexts/AuthContext';

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <SavedGemsProvider>
            <Component {...pageProps} />
          </SavedGemsProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

export default MyApp;
