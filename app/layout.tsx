import { ClerkProvider } from '@clerk/nextjs';
import type { Metadata } from 'next';
import { Oswald, Inter } from 'next/font/google';
import { Toaster } from 'sonner';
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
 * Metadata neutra: la heredan las pantallas sin marca (login genérico, /bienvenida).
 * La landing y el superadmin declaran los íconos de BioTeam, y la app los del club.
 * Por eso en `app/` no puede haber `icon.*`, `apple-icon.*` ni `favicon.ico`: le
 * ganarían a la metadata de cada segmento.
 */
export const metadata: Metadata = {
  title: 'Gestión integral del deportista',
  description: 'Gestión integral del deportista para clubes',
  icons: { icon: [{ url: '/brand/icono-neutro.svg', type: 'image/svg+xml' }] },
};

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