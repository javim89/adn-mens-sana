import { redirect } from 'next/navigation';
import { currentUser } from '@clerk/nextjs/server';

/**
 * Guard de acceso del módulo Insights — exclusivo de admin.
 *
 * `proxy.ts` solo valida que haya sesión, no el rol, así que la autorización
 * vive acá. A diferencia de `presentismo`/`convocatorias`, que repiten el guard
 * en cada page, este módulo lo centraliza en el layout porque tiene varias
 * rutas anidadas (`/insights`, `/insights/[id]`, `/insights/[id]/editar`).
 *
 * OJO: el layout protege la NAVEGACIÓN, no la ejecución de queries. Las server
 * actions de `lib/actions/insights.ts` y el route handler
 * `POST /api/insights/query` revalidan el rol por su cuenta — un layout no se
 * ejecuta en el camino de una server action ni de una API route.
 */
export default async function InsightsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await currentUser();
  const role = String(user?.publicMetadata?.role ?? '');

  if (role !== 'admin') {
    redirect('/dashboard');
  }

  return <>{children}</>;
}
