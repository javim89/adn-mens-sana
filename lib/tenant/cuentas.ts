/**
 * Lo que tiene que ver con la cuenta de Clerk al sumar a alguien a un club.
 *
 * Lo comparten invitar desde /usuarios (`lib/actions/usuarios.ts`) y el alta del
 * primer admin de un club nuevo (`lib/actions/superadmin.ts`). Ninguna de estas
 * funciones toca la DB: el acceso al club lo da la `Membresia` o la `Invitacion`
 * que cada caller escribe con su propio cliente (acotado o en la transacción).
 */

import { clerkClient } from '@clerk/nextjs/server';

/** Vigencia de una invitación al club (y de la invitación de Clerk que la acompaña). */
export const DIAS_INVITACION = 30;

export function venceEn(dias: number): Date {
  return new Date(Date.now() + dias * 24 * 60 * 60 * 1000);
}

function redirectUrlSignUp(): string {
  return `${process.env.NEXT_PUBLIC_APP_URL}/sign-up`;
}

/**
 * La cuenta de Clerk cuyo mail VERIFICADO es `email`, si existe. Un mail sin
 * verificar no cuenta: cualquiera puede cargar un mail ajeno en su cuenta.
 */
export async function buscarCuentaVerificada(email: string): Promise<string | null> {
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
export async function invitacionClerkPara(email: string, opciones: { renovar?: boolean } = {}): Promise<string> {
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
