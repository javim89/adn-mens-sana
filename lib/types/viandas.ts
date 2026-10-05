import type { EstadoDeportista, LugarRetiro, TipoComida } from '@/lib/generated/prisma/enums';

/**
 * Una entrega ya registrada, plana para cruzar del RSC al cliente: `createdAt` va
 * como ISO string porque un `Date` no sobrevive la serialización de props.
 */
export type EntregaView = {
  lugar: LugarRetiro;
  /** Clerk userId. El nombre lo resuelve la página vía `clerkClient()`. */
  entregadoPor: string;
  createdAt: string;
};

export type DeportistaVianda = {
  id: string;
  apellido: string;
  nombre: string;
  estado: EstadoDeportista;
  recibeAlmuerzo: boolean;
  recibeCena: boolean;
  /** Derivado de la categoría (ver `recibeMerienda` en `lib/utils/viandas`). */
  recibeMerienda: boolean;
  /** Solo las comidas ya retiradas hoy; la ausencia de la clave es "no retirada". */
  entregas: Partial<Record<TipoComida, EntregaView>>;
};
