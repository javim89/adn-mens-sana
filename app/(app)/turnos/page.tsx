import { auth, currentUser, clerkClient } from '@clerk/nextjs/server';
import { getTurnos } from '@/lib/queries/turnos';
import TurnosTable from './_components/TurnosTable';
import type { TurnoListItem } from '@/lib/types/turnos';

export default async function TurnosPage() {
  const { userId } = await auth();
  const user = await currentUser();
  const role = String(user?.publicMetadata?.role ?? '');
  const isAdmin = role === 'admin';

  const turnos = await getTurnos(isAdmin ? {} : { profesionalId: userId! });

  const profesionalesMap: Record<string, string> = {};
  if (isAdmin && turnos.length > 0) {
    const uniqueIds = [...new Set(turnos.map((t) => t.profesionalId))];
    const client = await clerkClient();
    const users = await Promise.all(
      uniqueIds.map((id) => client.users.getUser(id).catch(() => null)),
    );
    for (const u of users) {
      if (!u) continue;
      const meta = (u.publicMetadata ?? {}) as Record<string, unknown>;
      const nombre = u.firstName || String(meta.firstName ?? '');
      const apellido = u.lastName || String(meta.lastName ?? '');
      profesionalesMap[u.id] =
        `${nombre} ${apellido}`.trim() ||
        u.emailAddresses?.[0]?.emailAddress ||
        u.id;
    }
  }

  const serialized: TurnoListItem[] = turnos.map((t) => ({
    id: t.id,
    titulo: t.titulo,
    fecha: t.fecha.toISOString().split('T')[0],
    hora: t.hora,
    lugar: t.lugar,
    descripcion: t.descripcion,
    profesionalId: t.profesionalId,
    profesionalNombre: profesionalesMap[t.profesionalId] ?? t.profesionalId,
    deportistas: t.deportistas.map((td) => ({
      id: td.deportista.id,
      nombre: td.deportista.nombre,
      apellido: td.deportista.apellido,
    })),
  }));

  return (
    <div className="p-4 md:p-8">
      <TurnosTable initialTurnos={serialized} isAdmin={isAdmin} />
    </div>
  );
}
