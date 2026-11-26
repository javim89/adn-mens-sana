import type { Metadata, Viewport } from 'next';
import { auth } from '@clerk/nextjs/server';
import Landing from './_landing/Landing';
import { METADATA_LANDING, VIEWPORT_LANDING } from '@/lib/branding/metadata-bioteam';

export const metadata: Metadata = METADATA_LANDING;
export const viewport: Viewport = VIEWPORT_LANDING;

/**
 * Landing pública de `/`. Vive fuera del grupo `(app)` para no heredar el `AppShell`
 * ni el guard de sesión; `proxy.ts` la exime con el `"/"` exacto. La sesión solo
 * decide el CTA: "Ingresar" o "Ir al panel".
 */
export default async function Home() {
  const { userId } = await auth();
  return <Landing conSesion={Boolean(userId)} />;
}
