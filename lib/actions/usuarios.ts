'use server';

/**
 * Usuarios del club activo.
 *
 * El acceso a un club es una `Membresia` (rol, lugar de retiro, activo); la cuenta
 * de Clerk solo autentica y puede tener membresías en varios clubes. Por eso acá
 * nada toca la cuenta: deshabilitar apaga la membresía (no `banUser`) y eliminar
 * la borra (no `deleteUser`). Banear o borrar la cuenta la sacaría de TODOS los
 * clubes.
 */

import { clerkClient } from '@clerk/nextjs/server';
import type { Usuario, UsuarioActivo, UsuarioPendiente, EstadoUsuario } from '@/lib/types/usuarios';
import { ROLES_PERMITIDOS, type AppRole } from '@/lib/roles';
import { LUGARES_RETIRO, esLugarRetiro } from '@/lib/utils/viandas';
import { contextoAccion, type ContextoClub } from '@/lib/tenant/contexto';
import { getDb } from '@/lib/tenant/db';
import { getMiembrosDelClub } from '@/lib/tenant/miembros';
import { nuevoTokenInvitacion } from '@/lib/tenant/invitaciones';

const LUGARES_VALIDOS = LUGARES_RETIRO.join(', ');

/** Vigencia de una invitación al club (y de la invitación de Clerk que la acompaña). */
const DIAS_INVITACION = 30;

type Resultado = { ok: boolean; error?: string };

async function assertAdmin(): Promise<{ ok: false; error: string } | { ok: true; contexto: ContextoClub }> {
  const acceso = await contextoAccion(['admin']);
  if (!acceso.ok) {
    return {
      ok: false,
      error: acceso.error === 'No autorizado' ? acceso.error : 'Acceso denegado: se requiere rol admin',
    };
  }
  return { ok: true, contexto: acceso.contexto };
}

function esRolPermitido(rol: string): rol is AppRole {
  return ROLES_PERMITIDOS.includes(rol as AppRole);
}

function redirectUrlSignUp(): string {
  return `${process.env.NEXT_PUBLIC_APP_URL}/sign-up`;
}

function venceEn(dias: number): Date {
  return new Date(Date.now() + dias * 24 * 60 * 60 * 1000);
}

/** Invitaciones del club que todavía se pueden aceptar. */
function wherePendiente(ahora = new Date()) {
  return { aceptadaAt: null, revocadaAt: null, expira: { gt: ahora } };
}

/**
 * La cuenta de Clerk cuyo mail VERIFICADO es `email`, si existe. Un mail sin
 * verificar no cuenta: cualquiera puede cargar un mail ajeno en su cuenta.
 */
async function buscarCuentaVerificada(email: string): Promise<string | null> {
  const client = await clerkClient();
  const { data } = await client.users.getUserList({ emailAddress: [email], limit: 10 });
  const cuenta = data.find((u) =>
    u.emailAddresses.some(
      (e) => e.emailAddress.toLowerCase() === email && e.verification?.status === 'verified',
    ),
  );
  return cuenta?.id ?? null;
}

/**
 * La invitación de Clerk pendiente para `email`, o una nueva. Solo sirve para que
 * la persona cree su cuenta, así que es una por mail aunque la inviten varios
 * clubes: si otro club ya la invitó, se reutiliza en vez de fallar con "already".
 */
async function invitacionClerkPara(email: string, opciones: { renovar?: boolean } = {}): Promise<string> {
  const client = await clerkClient();
  const { data } = await client.invitations.getInvitationList({ status: 'pending', query: email, limit: 10 });
  const existente = data.find((inv) => inv.emailAddress.toLowerCase() === email);

  if (existente && !opciones.renovar) return existente.id;
  // Renovar = mandar el mail de nuevo. Clerk no reenvía: se revoca y se crea otra.
  if (existente) await client.invitations.revokeInvitation(existente.id);

  const creada = await client.invitations.createInvitation({
    emailAddress: email,
    redirectUrl: redirectUrlSignUp(),
    expiresInDays: DIAS_INVITACION,
  });
  return creada.id;
}

/**
 * Bloquea dejar al club sin administradores: no se puede degradar, desactivar ni
 * quitar al último admin activo. Con el guard de "no a uno mismo" un admin
 * miembro nunca llega acá sobre sí mismo, pero un superadmin que entró al club sí
 * podría vaciarlo.
 */
async function esUltimoAdminActivo(userId: string): Promise<boolean> {
  const db = await getDb();
  const objetivo = await db.membresia.findFirst({
    where: { userId, rol: 'admin', activo: true },
    select: { id: true },
  });
  if (!objetivo) return false;
  const admins = await db.membresia.count({ where: { rol: 'admin', activo: true } });
  return admins <= 1;
}

const ULTIMO_ADMIN = 'El club tiene que tener al menos un administrador activo';

export async function getUsuarios(): Promise<Usuario[]> {
  const check = await assertAdmin();
  if (!check.ok) throw new Error(check.error);

  const db = await getDb();
  const [miembros, invitaciones] = await Promise.all([
    getMiembrosDelClub({ incluirInactivos: true, clubId: check.contexto.clubId }),
    db.invitacion.findMany({
      where: wherePendiente(),
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  const activos: UsuarioActivo[] = miembros.map((m) => ({
    id: m.userId,
    firstName: m.nombre,
    lastName: m.apellido,
    email: m.email,
    rol: m.rol,
    lugarRetiro: m.lugarRetiro,
    lastSignInAt: m.lastSignInAt,
    createdAt: m.createdAt,
    status: m.activo ? ('activo' as const) : ('inactivo' as const),
  }));

  activos.sort((a, b) =>
    `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`),
  );

  // Una invitación a alguien que ya es miembro (aceptó por otro camino) no se lista.
  const miembrosPorMail = new Set(activos.map((a) => a.email.toLowerCase()));
  const pendientes: UsuarioPendiente[] = invitaciones
    .filter((inv) => !miembrosPorMail.has(inv.email.toLowerCase()))
    .map((inv) => ({
      id: inv.id,
      firstName: inv.nombre,
      lastName: inv.apellido,
      email: inv.email,
      rol: inv.rol,
      lugarRetiro: inv.lugarRetiro,
      createdAt: inv.createdAt,
      status: 'pendiente' as const,
    }));

  return [...activos, ...pendientes];
}

/**
 * Suma a alguien al club.
 *
 * - Si el mail ya tiene cuenta de Clerk (verificado), se crea la `Membresia` y
 *   listo: entra al club la próxima vez que abra la app.
 * - Si no, queda una `Invitacion` del club más la invitación de Clerk para crear
 *   la cuenta. Al entrar, `/bienvenida` convierte la invitación en membresía.
 */
export async function invitarUsuario(data: {
  firstName: string;
  lastName: string;
  email: string;
  rol: string;
  lugarRetiro?: string;
}): Promise<Resultado> {
  const check = await assertAdmin();
  if (!check.ok) return { ok: false, error: check.error };

  if (!esRolPermitido(data.rol)) {
    return { ok: false, error: 'Rol no permitido' };
  }
  const rol = data.rol;

  // Se valida ANTES de tocar Clerk: una invitación a medio configurar ya salió por
  // mail y solo se arregla revocando y reenviando.
  const esResponsable = rol === 'responsable_viandas';
  let lugarRetiro: (typeof LUGARES_RETIRO)[number] | null = null;
  if (esResponsable) {
    if (!data.lugarRetiro) {
      return { ok: false, error: 'Elegí un lugar de retiro para el responsable de viandas' };
    }
    if (!esLugarRetiro(data.lugarRetiro)) {
      return { ok: false, error: `Lugar de retiro inválido. Valores válidos: ${LUGARES_VALIDOS}` };
    }
    lugarRetiro = data.lugarRetiro;
  }

  const email = data.email.toLowerCase().trim();
  if (!email) return { ok: false, error: 'El email es requerido' };

  try {
    const db = await getDb();
    const userId = await buscarCuentaVerificada(email);

    if (userId) {
      const existente = await db.membresia.findFirst({ where: { userId }, select: { id: true } });
      if (existente) return { ok: false, error: 'Esa persona ya es miembro del club' };
      await db.membresia.create({ data: { userId, clubId: check.contexto.clubId, rol, lugarRetiro } });
      return { ok: true };
    }

    const pendiente = await db.invitacion.findFirst({
      where: { email: { equals: email, mode: 'insensitive' }, ...wherePendiente() },
      select: { id: true },
    });
    if (pendiente) return { ok: false, error: 'Ya existe una invitación pendiente para ese email' };

    const clerkInvitationId = await invitacionClerkPara(email);
    const { tokenHash } = nuevoTokenInvitacion();
    await db.invitacion.create({
      data: {
        clubId: check.contexto.clubId,
        email,
        nombre: data.firstName.trim(),
        apellido: data.lastName.trim(),
        rol,
        lugarRetiro,
        tokenHash,
        clerkInvitationId,
        invitadoPor: check.contexto.userId,
        expira: venceEn(DIAS_INVITACION),
      },
    });

    return { ok: true };
  } catch (error) {
    if (error instanceof Error) return { ok: false, error: error.message };
    return { ok: false, error: 'Error al enviar la invitación' };
  }
}

/** Renueva la vigencia de la invitación del club y vuelve a mandar el mail de Clerk. */
export async function reenviarInvitacion(invitacionId: string): Promise<Resultado> {
  const check = await assertAdmin();
  if (!check.ok) return { ok: false, error: check.error };

  try {
    const db = await getDb();
    const invitacion = await db.invitacion.findFirst({
      where: { id: invitacionId, aceptadaAt: null, revocadaAt: null },
    });
    if (!invitacion) return { ok: false, error: 'Invitación no encontrada' };

    const email = invitacion.email.toLowerCase();

    // Si mientras tanto creó la cuenta, se la suma al club en vez de reenviar.
    const userId = await buscarCuentaVerificada(email);
    if (userId) {
      const existente = await db.membresia.findFirst({ where: { userId }, select: { id: true } });
      if (!existente) {
        await db.membresia.create({
          data: { userId, clubId: invitacion.clubId, rol: invitacion.rol, lugarRetiro: invitacion.lugarRetiro },
        });
      }
      await db.invitacion.update({
        where: { id: invitacion.id },
        data: { aceptadaAt: new Date(), aceptadaPor: userId },
      });
      return { ok: true };
    }

    const clerkInvitationId = await invitacionClerkPara(email, { renovar: true });
    const { tokenHash } = nuevoTokenInvitacion();
    await db.invitacion.update({
      where: { id: invitacion.id },
      data: { clerkInvitationId, tokenHash, expira: venceEn(DIAS_INVITACION) },
    });

    return { ok: true };
  } catch (error) {
    if (error instanceof Error) return { ok: false, error: error.message };
    return { ok: false, error: 'Error al reenviar la invitación' };
  }
}

/** Cambia `Membresia.activo` de un miembro del club. */
async function setActivo(userId: string, activo: boolean, propia: string, fallback: string): Promise<Resultado> {
  const check = await assertAdmin();
  if (!check.ok) return { ok: false, error: check.error };

  if (check.contexto.userId === userId) return { ok: false, error: propia };

  try {
    if (!activo && (await esUltimoAdminActivo(userId))) return { ok: false, error: ULTIMO_ADMIN };

    const db = await getDb();
    const { count } = await db.membresia.updateMany({ where: { userId }, data: { activo } });
    if (count === 0) return { ok: false, error: 'Usuario no encontrado' };
    return { ok: true };
  } catch (error) {
    if (error instanceof Error) return { ok: false, error: error.message };
    return { ok: false, error: fallback };
  }
}

export async function deshabilitarUsuario(userId: string): Promise<Resultado> {
  return setActivo(userId, false, 'No podés deshabilitar tu propia cuenta', 'Error al deshabilitar el usuario');
}

export async function reactivarUsuario(userId: string): Promise<Resultado> {
  return setActivo(userId, true, 'No podés reactivar tu propia cuenta', 'Error al reactivar el usuario');
}

/**
 * Saca a alguien del club: borra su membresía (la cuenta de Clerk queda) o, si
 * todavía no había aceptado, revoca la invitación del club. La de Clerk no se
 * revoca: puede estar compartida con la invitación de otro club.
 */
export async function eliminarUsuario(id: string, status: EstadoUsuario): Promise<Resultado> {
  const check = await assertAdmin();
  if (!check.ok) return { ok: false, error: check.error };

  const esMiembro = status !== 'pendiente';
  if (esMiembro && check.contexto.userId === id) {
    return { ok: false, error: 'No podés eliminar tu propia cuenta' };
  }

  try {
    const db = await getDb();

    if (esMiembro) {
      if (await esUltimoAdminActivo(id)) return { ok: false, error: ULTIMO_ADMIN };
      const { count } = await db.membresia.deleteMany({ where: { userId: id } });
      if (count === 0) return { ok: false, error: 'Usuario no encontrado' };
    } else {
      const { count } = await db.invitacion.updateMany({
        where: { id, aceptadaAt: null, revocadaAt: null },
        data: { revocadaAt: new Date() },
      });
      if (count === 0) return { ok: false, error: 'Invitación no encontrada' };
    }

    return { ok: true };
  } catch (error) {
    if (error instanceof Error) return { ok: false, error: error.message };
    return { ok: false, error: 'Error al eliminar el usuario' };
  }
}

export async function cambiarRol(userId: string, nuevoRol: string): Promise<Resultado> {
  const check = await assertAdmin();
  if (!check.ok) return { ok: false, error: check.error };

  if (check.contexto.userId === userId) {
    return { ok: false, error: 'No podés cambiar tu propio rol' };
  }

  if (!esRolPermitido(nuevoRol)) {
    return { ok: false, error: 'Rol no permitido' };
  }

  try {
    if (nuevoRol !== 'admin' && (await esUltimoAdminActivo(userId))) {
      return { ok: false, error: ULTIMO_ADMIN };
    }

    const db = await getDb();
    const { count } = await db.membresia.updateMany({
      where: { userId },
      data: {
        rol: nuevoRol,
        // Un ex-responsable de viandas no se queda con el lugar huérfano.
        ...(nuevoRol === 'responsable_viandas' ? {} : { lugarRetiro: null }),
      },
    });
    if (count === 0) return { ok: false, error: 'Usuario no encontrado' };

    return { ok: true };
  } catch (error) {
    if (error instanceof Error) return { ok: false, error: error.message };
    return { ok: false, error: 'Error al actualizar el rol' };
  }
}

/**
 * Corrige el lugar de un responsable sin tocarle el rol. `null` lo limpia — es el
 * camino para dejar a un responsable "sin lugar asignado" a propósito.
 */
export async function asignarLugarRetiro(userId: string, lugar: string | null): Promise<Resultado> {
  const check = await assertAdmin();
  if (!check.ok) return { ok: false, error: check.error };

  if (lugar !== null && !esLugarRetiro(lugar)) {
    return { ok: false, error: `Lugar de retiro inválido. Valores válidos: ${LUGARES_VALIDOS}` };
  }

  try {
    const db = await getDb();
    const { count } = await db.membresia.updateMany({
      where: { userId },
      data: { lugarRetiro: lugar },
    });
    if (count === 0) return { ok: false, error: 'Usuario no encontrado' };
    return { ok: true };
  } catch (error) {
    if (error instanceof Error) return { ok: false, error: error.message };
    return { ok: false, error: 'Error al asignar el lugar de retiro' };
  }
}
