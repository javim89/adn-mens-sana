/**
 * Panel del staff de BioTeam. Fuera de `(app)` porque no depende de un club
 * activo: un superadmin puede no ser miembro de ninguno. Es la marca BioTeam fija
 * (`bioteam-*`), no el tema de un club.
 *
 * Quien no es superadmin recibe un 404 y no un "acceso denegado": no hace falta
 * confirmar que la ruta existe. `proxy.ts` ya exige sesión.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { auth } from '@clerk/nextjs/server';
import { notFound } from 'next/navigation';
import { UserButton } from '@clerk/nextjs';
import LogoBioTeam from '@/app/components/LogoBioTeam';
import { esSuperadmin } from '@/lib/tenant/clubes';
import { ICONOS_BIOTEAM } from '@/lib/branding/iconos-bioteam';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: { template: '%s · BioTeam', default: 'Superadmin · BioTeam' },
  icons: ICONOS_BIOTEAM,
};

export default async function SuperadminLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();
  if (!userId || !(await esSuperadmin(userId))) notFound();

  return (
    <div className="flex min-h-screen w-full min-w-0 flex-col">
      <header className="flex h-14 shrink-0 items-center justify-between gap-3 bg-bioteam-navy px-4 text-white md:px-8">
        <Link href="/superadmin/clubes" className="flex min-w-0 items-center gap-2">
          <LogoBioTeam variante="inverso" className="h-7" eager />
          <span className="font-[family-name:var(--font-oswald)] text-sm font-semibold uppercase tracking-wide">
            BioTeam
          </span>
          <span className="rounded-full bg-bioteam-dorado px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-foreground">
            Superadmin
          </span>
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-sm text-white/70 transition-colors hover:text-white">
            Ir a la app
          </Link>
          <UserButton appearance={{ elements: { avatarBox: 'w-8 h-8' } }} />
        </div>
      </header>
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
