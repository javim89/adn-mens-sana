import { auth, currentUser, clerkClient } from '@clerk/nextjs/server';
import { getSeguimientos } from '@/lib/queries/seguimientos';
import SeguimientosTable from './_components/SeguimientosTable';

export default async function SeguimientosPage() {
  const { userId } = await auth();
  const user = await currentUser();
  const role = String(user?.publicMetadata?.role ?? '');
  const isAdmin = role === 'admin';
  const HEALTH_ROLES = ['medico', 'kinesiologo', 'nutricionista', 'psicologo', 'cardiologo'];
  const canWrite = isAdmin || HEALTH_ROLES.includes(role);

  // Todos los roles ven todos los seguimientos (la regla de edición/eliminación
  // es por propiedad del registro, aplicada en el componente y en las Server Actions)
  const seguimientos = await getSeguimientos({});

  // Resolver nombres de todos los profesionales involucrados
  const profesionalesMap: Record<string, string> = {};
  if (seguimientos.length > 0) {
    const uniqueIds = [...new Set(seguimientos.map((s) => s.profesionalId))];
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

  const serialized = seguimientos.map((s) => ({
    id: s.id,
    fecha: s.fecha.toISOString().split('T')[0],
    titulo: s.titulo,
    descripcion: s.descripcion,
    recomendaciones: s.recomendaciones,
    resultadosEvaluacion: s.resultadosEvaluacion,
    prioridad: s.prioridad,
    proximaCita: s.proximaCita?.toISOString() ?? null,
    alertaSeguimiento: s.alertaSeguimiento,
    profesionalId: s.profesionalId,
    profesionalNombre: profesionalesMap[s.profesionalId] ?? s.profesionalId,
    deportistaId: s.deportista.id,
    deportistaNombre: `${s.deportista.apellido}, ${s.deportista.nombre}`,
  }));

  return (
    <div className="p-4 md:p-8">
      {/* currentUserId se pasa para aplicar la regla de propiedad en botones Editar/Eliminar */}
      <SeguimientosTable
        initialSeguimientos={serialized}
        isAdmin={isAdmin}
        canWrite={canWrite}
        currentUserId={userId!}
      />
    </div>
  );
}
