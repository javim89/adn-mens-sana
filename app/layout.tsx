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

export const metadata: Metadata = {
  title: 'BioTeam',
  description: 'BioTeam — gestión integral del deportista para clubes',
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