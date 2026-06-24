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
  title: 'ADN Mens Sana',
  description: 'Historia Deportiva — Club de Gimnasia y Esgrima La Plata',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={`${oswald.variable} ${inter.variable}`}>
      <body className="flex min-h-screen bg-[#F3F4F6] text-[#1C1C1C] font-[family-name:var(--font-inter)]">
        <ClerkProvider>
          {children}
          <Toaster richColors position="top-right" />
        </ClerkProvider>
      </body>
    </html>
  );
}