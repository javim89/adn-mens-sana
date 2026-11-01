/**
 * Invitaciones a un club.
 *
 * La invitación de Clerk solo sirve para crear la cuenta. El acceso al club lo
 * da la fila de `invitaciones`, que se convierte en `Membresia` al aceptarse:
 * cuando el usuario entra y alguno de sus mails VERIFICADOS coincide. Un mail sin
 * verificar no alcanza: si no, cualquiera que registre el mail ajeno en Clerk
 * heredaría la invitación.
 *
 * En la DB se guarda solo el hash del token: quien lea la tabla no puede usar
 * los links.
 */

import { createHash, randomBytes } from 'crypto';
import { clerkClient } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** Token nuevo para el link de invitación y su hash para la DB. */
export function nuevoTokenInvitacion(): { token: string; tokenHash: string } {
  const token = randomBytes(32).toString('base64url');
  return { token, tokenHash: hashToken(token) };
}

export type InvitacionesAceptadas = { clubIds: string[] };

/**
 * Convierte en membresías las invitaciones vigentes (no aceptadas, no revocadas,
 * no vencidas, de un club activo) a los mails verificados del usuario.
 *
 * Si ya era miembro del club, la membresía queda como estaba: el rol lo cambia un
 * admin, no una invitación vieja. Con varias invitaciones al mismo club gana la
 * más nueva y se marcan todas como aceptadas.
 */
export async function aceptarInvitacionesPendientes(userId: string): Promise<InvitacionesAceptadas> {
  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const emails = user.emailAddresses
    .filter((e) => e.verification?.status === 'verified')
    .map((e) => e.emailAddress.toLowerCase());
  if (emails.length === 0) return { clubIds: [] };

  const pendientes = await prisma.invitacion.findMany({
    where: {
      email: { in: emails, mode: 'insensitive' },
      aceptadaAt: null,
      revocadaAt: null,
      expira: { gt: new Date() },
      club: { activo: true },
    },
    orderBy: { createdAt: 'desc' },
  });
  if (pendientes.length === 0) return { clubIds: [] };

  const clubIds: string[] = [];
  await prisma.$transaction(async (tx) => {
    const ahora = new Date();
    for (const inv of pendientes) {
      if (!clubIds.includes(inv.clubId)) {
        clubIds.push(inv.clubId);
        await tx.membresia.upsert({
          where: { userId_clubId: { userId, clubId: inv.clubId } },
          create: { userId, clubId: inv.clubId, rol: inv.rol, lugarRetiro: inv.lugarRetiro },
          update: {},
        });
      }
      await tx.invitacion.update({
        where: { id: inv.id },
        data: { aceptadaAt: ahora, aceptadaPor: userId },
      });
    }
  });

  return { clubIds };
}
