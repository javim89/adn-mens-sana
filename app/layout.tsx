import { ClerkProvider } from '@clerk/nextjs';
import type { Metadata } from 'next';
import { Oswald, Inter } from 'next/font/google';
import { Toaster } from 'sonner';
import { METADATA_RAIZ } from '@/lib/seo/metadata';
import './globals.css';

const oswald = Oswald({
  variable: '--font-oswald',
  subsets: ['latin'],
  weight: ['400', '600', '700'],
});

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
});

/**
 * Metadata neutra (`noindex`, sin Open Graph): la heredan las pantallas sin marca
 * (login genérico, /bienvenida) y la app. La landing y el superadmin declaran los
 * íconos y la OG de BioTeam, y la app los íconos del club. Por eso en `app/` no
 * puede haber `icon.*`, `apple-icon.*`, `favicon.ico`, `opengraph-image.*` ni
 * `twitter-image.*`: le ganarían a la metadata de cada segmento.
 */
export const metadata: Metadata = METADATA_RAIZ;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={`${oswald.variable} ${inter.variable}`}>
      <body suppressHydrationWarning className="flex min-h-screen bg-muted text-foreground font-[family-name:var(--font-inter)]">
        <ClerkProvider>
          {children}
          <Toaster richColors position="top-right" />
        </ClerkProvider>
      </body>
    </html>
  );
}