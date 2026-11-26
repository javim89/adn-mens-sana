import type { Metadata, Viewport } from 'next';
import { auth } from '@clerk/nextjs/server';
import Landing from './_landing/Landing';
import {
  DESCRIPCION_BIOTEAM,
  METADATA_LANDING,
  TITULO_BIOTEAM,
  VIEWPORT_LANDING,
} from '@/lib/branding/metadata-bioteam';
import { JsonLd, organizacion, softwareApplication, webPage, webSite } from '@/lib/seo/json-ld';

export const metadata: Metadata = METADATA_LANDING;
export const viewport: Viewport = VIEWPORT_LANDING;

/**
 * Landing pública de `/`. Vive fuera del grupo `(app)` para no heredar el `AppShell`
 * ni el guard de sesión; `proxy.ts` la exime con el `"/"` exacto. La sesión solo
 * decide el CTA: "Ingresar" o "Ir al panel".
 */
export default async function Home() {
  const { userId } = await auth();
  return (
    <>
      <JsonLd
        data={[
          webSite(),
          organizacion(),
          softwareApplication(),
          webPage({ ruta: '/', nombre: TITULO_BIOTEAM, descripcion: DESCRIPCION_BIOTEAM }),
        ]}
      />
      <Landing conSesion={Boolean(userId)} />
    </>
  );
}
