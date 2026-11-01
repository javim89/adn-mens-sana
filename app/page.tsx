import type { Metadata } from 'next';
import { auth } from '@clerk/nextjs/server';
import Landing from './_landing/Landing';
import { ICONOS_BIOTEAM } from '@/lib/branding/iconos-bioteam';

export const metadata: Metadata = {
  title: 'BioTeam — Todo tu club, en una sola pantalla',
  description:
    'El seguimiento integral de los deportistas de tu club: ficha, seguimientos médicos, psicológicos y sociales, turnos, presentismo, viandas y triage.',
  icons: ICONOS_BIOTEAM,
};

/**
 * Landing pública de `/`. Vive fuera del grupo `(app)` para no heredar el `AppShell`
 * ni el guard de sesión; `proxy.ts` la exime con el `"/"` exacto. La sesión solo
 * decide el CTA: "Ingresar" o "Ir al panel".
 */
export default async function Home() {
  const { userId } = await auth();
  return <Landing conSesion={Boolean(userId)} />;
}
