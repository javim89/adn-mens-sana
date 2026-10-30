/**
 * Puerta de entrada de quien tiene sesión pero ningún club accesible.
 *
 * `requireContexto` manda acá cuando el usuario no tiene membresías activas. Se
 * aceptan las invitaciones pendientes a sus mails verificados (típicamente: acaba
 * de crear la cuenta desde la invitación) y, si con eso ya tiene club, sigue a
 * `/dashboard`. Si no, se le avisa que no tiene acceso.
 *
 * Vive FUERA del grupo `(app)` a propósito: el layout de `(app)` exige contexto y
 * redirige acá, así que adentro sería un loop de redirects. `proxy.ts` ya exige
 * sesión (no está en `isPublicRoute`).
 */

import { auth, currentUser } from '@clerk/nextjs/server';
import { SignOutButton } from '@clerk/nextjs';
import { redirect } from 'next/navigation';
import { ShieldAlert } from 'lucide-react';
import LogoBioTeam from '@/app/components/LogoBioTeam';
import { aceptarInvitacionesPendientes } from '@/lib/tenant/invitaciones';
import { getContextoClub } from '@/lib/tenant/contexto';

export const dynamic = 'force-dynamic';

export default async function BienvenidaPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  try {
    await aceptarInvitacionesPendientes(userId);
  } catch (error) {
    // Si Clerk o la base fallan, se sigue: puede que ya tenga club igual, y si no,
    // la pantalla de "sin acceso" es mejor que un error.
    console.error('bienvenida: no se pudieron aceptar las invitaciones:', error);
  }

  // `redirect` tira: va fuera del try para no tragárselo.
  const contexto = await getContextoClub();
  if (contexto) redirect('/dashboard');

  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress ?? user?.emailAddresses[0]?.emailAddress;

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-linear-to-br from-primario-hover to-primario">
      <div className="flex w-full flex-col items-center gap-6 px-4 py-12">
        <div className="flex items-center gap-3 text-center">
          <LogoBioTeam variante="inverso" className="h-12" eager />
          <span className="font-[family-name:var(--font-oswald)] text-4xl font-bold tracking-widest text-white uppercase">
            BioTeam
          </span>
        </div>

        <main className="w-full max-w-md rounded-2xl bg-white px-6 py-8 text-center shadow-sm">
          <ShieldAlert size={28} className="mx-auto mb-3 text-primario" aria-hidden="true" />
          <h1 className="mb-2 font-[family-name:var(--font-oswald)] text-2xl font-bold text-primario">
            No tenés acceso a ningún club
          </h1>
          <p className="mb-1 text-sm text-muted-foreground">
            Tu cuenta todavía no forma parte de ningún club en BioTeam. Pedile al
            administrador de tu club que te invite.
          </p>
          {email && (
            <p className="mb-6 text-sm text-muted-foreground">
              Ingresaste como <span className="font-medium text-foreground">{email}</span>.
            </p>
          )}
          <SignOutButton redirectUrl="/sign-in">
            <button
              type="button"
              className="w-full rounded-lg bg-primario px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primario-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secundario/40"
            >
              Cerrar sesión
            </button>
          </SignOutButton>
        </main>
      </div>
    </div>
  );
}
