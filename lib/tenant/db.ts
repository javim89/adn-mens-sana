/**
 * Cliente Prisma acotado a un club.
 *
 * `dbDelClub(clubId)` envuelve el cliente base con una query extension que, en
 * cada operación de modelo:
 *
 * - agrega el filtro del club al `where` de lecturas, updates, deletes, count,
 *   aggregate y groupBy (raíces por `clubId`, hijos por la relación con el padre,
 *   ver `scope.ts`);
 * - inyecta `clubId` en create, createMany y upsert, y rechaza un `clubId` ajeno
 *   o un `club` explícito;
 * - valida que las FK que se escriben (escalares y `connect`, también en nested
 *   writes) apunten a filas del mismo club. Si no, tira `CrossTenantError`;
 * - falla cerrado con `TenantScopeError` ante un modelo global o sin clasificar,
 *   o una operación que no sabe acotar.
 *
 * El SQL crudo (`$queryRaw`) NO pasa por acá: tiene que llevar `club_id`
 * explícito (`db.$clubId()`).
 *
 * La validación de FK consulta el cliente base, fuera de la transacción en
 * curso, así que no ve filas creadas dentro de ella. Para eso está `propios`: los
 * ids que este cliente creó se dan por buenos sin consultar. Si aun así un id no
 * aparece en ningún club, se deja pasar y la FK de la base decide como siempre
 * (P2003): una fila invisible para nosotros solo puede haberla creado esta misma
 * transacción, que es del club.
 */

import { cache } from 'react';
import type { PrismaClient } from '@/lib/generated/prisma/client';
import { prisma } from '@/lib/db';
import { alcanceDe, filtroDelClub, type Alcance, type ModelName } from './scope';
import { CrossTenantError, SinContextoError, TenantScopeError } from './errores';
import { getContextoClub } from './contexto';

type Data = Record<string, unknown>;

export type OperacionPrisma = {
  model?: string;
  operation: string;
  args: Data | undefined;
  query: (args: Data) => Promise<unknown>;
};

type Delegado = {
  count(args: { where: Data }): Promise<number>;
  findUnique(args: { where: Data }): Promise<unknown>;
};

/** Operaciones que solo necesitan el filtro en el `where`. */
const SOLO_WHERE = new Set([
  'findUnique',
  'findUniqueOrThrow',
  'findFirst',
  'findFirstOrThrow',
  'findMany',
  'count',
  'aggregate',
  'groupBy',
  'delete',
  'deleteMany',
]);
const UPDATES = new Set(['update', 'updateMany', 'updateManyAndReturn']);
const CREATE_MANY = new Set(['createMany', 'createManyAndReturn']);

function esObjeto(valor: unknown): valor is Data {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor) && !(valor instanceof Date);
}

function mapear<T>(valor: unknown, fn: (item: unknown) => T): T | T[] {
  return Array.isArray(valor) ? valor.map(fn) : fn(valor);
}

function comoLista(valor: unknown): unknown[] {
  if (valor === undefined) return [];
  return Array.isArray(valor) ? valor : [valor];
}

/** El valor de un escalar en data: `x` o `{ set: x }` (update). */
function valorEscalar(valor: unknown): unknown {
  return esObjeto(valor) && 'set' in valor ? valor.set : valor;
}

/** Suma `filtro` al where sin pisar un `AND` que ya tuviera. */
export function conFiltro(where: unknown, filtro: Data): Data {
  const base = esObjeto(where) ? where : {};
  return { ...base, AND: [filtro, ...comoLista(base.AND)] };
}

function alcanceEscribible(modelo: string): Exclude<Alcance, { tipo: 'global' }> {
  const alcance = alcanceDe(modelo);
  if (!alcance || alcance.tipo === 'global') {
    throw new TenantScopeError(`El modelo ${modelo} no se puede escribir con el cliente del club`);
  }
  return alcance;
}

function delegadoDe(base: PrismaClient, modelo: string): Delegado {
  const nombre = modelo.charAt(0).toLowerCase() + modelo.slice(1);
  return (base as unknown as Record<string, Delegado>)[nombre];
}

/**
 * Recorre la data de una escritura: inyecta el club, rechaza cambios de club y
 * junta las FK a validar. `validar()` las chequea todas juntas antes de ejecutar.
 */
class Escritura {
  private readonly ids = new Map<string, Set<string>>();
  private readonly uniques: { modelo: string; where: Data }[] = [];

  constructor(
    private readonly clubId: string,
    private readonly base: PrismaClient,
    private readonly propios: Set<string>,
  ) {}

  create(modelo: string, data: unknown): unknown {
    if (!esObjeto(data)) return data;
    const alcance = alcanceEscribible(modelo);
    const out = { ...data };
    this.rechazarCambioDeClub(modelo, out);

    if (alcance.tipo === 'raiz') {
      // Prisma no deja mezclar FK escalares con relaciones: si la data viene en
      // forma "checked" (relaciones con connect) el club va como connect.
      const checked = alcance.refs.some((r) => r.relacion in out);
      if (checked) {
        delete out.clubId;
        out.club = { connect: { id: this.clubId } };
      } else {
        out.clubId = this.clubId;
      }
    }

    this.relaciones(alcance, out);
    return out;
  }

  update(modelo: string, data: unknown): unknown {
    if (!esObjeto(data)) return data;
    const alcance = alcanceEscribible(modelo);
    const out = { ...data };
    this.rechazarCambioDeClub(modelo, out);
    this.relaciones(alcance, out);
    return out;
  }

  async validar(): Promise<void> {
    await Promise.all([
      ...[...this.ids].map(([modelo, ids]) => this.validarIds(modelo, [...ids])),
      ...this.uniques.map(({ modelo, where }) => this.validarUnique(modelo, where)),
    ]);
  }

  private rechazarCambioDeClub(modelo: string, data: Data) {
    if ('club' in data) {
      throw new CrossTenantError(`${modelo}: el club no se elige en la escritura, lo pone el contexto`);
    }
    if ('clubId' in data && valorEscalar(data.clubId) !== this.clubId) {
      throw new CrossTenantError(`${modelo}: no se puede escribir en otro club`);
    }
  }

  private relaciones(alcance: Exclude<Alcance, { tipo: 'global' }>, data: Data) {
    for (const ref of alcance.refs) {
      if (ref.campo in data) {
        const id = valorEscalar(data[ref.campo]);
        if (typeof id === 'string') this.registrarId(ref.modelo, id);
      }
      if (ref.relacion in data) data[ref.relacion] = this.anidado(ref.modelo, data[ref.relacion]);
    }
    for (const [campo, modelo] of Object.entries(alcance.anidados)) {
      if (campo in data) data[campo] = this.anidado(modelo, data[campo]);
    }
  }

  /** Un nested write (`{ create, connect, ... }`) sobre `modelo`. */
  private anidado(modelo: ModelName, ops: unknown): unknown {
    if (!esObjeto(ops)) return ops;
    const out: Data = { ...ops };

    for (const [op, valor] of Object.entries(ops)) {
      switch (op) {
        case 'create':
          out.create = mapear(valor, (d) => this.create(modelo, d));
          break;
        case 'createMany':
          out.createMany = esObjeto(valor)
            ? { ...valor, data: mapear(valor.data, (d) => this.create(modelo, d)) }
            : valor;
          break;
        case 'connect':
        case 'set':
          for (const where of comoLista(valor)) this.registrarWhere(modelo, where);
          break;
        case 'connectOrCreate':
          out.connectOrCreate = mapear(valor, (c) => {
            if (!esObjeto(c)) return c;
            this.registrarWhere(modelo, c.where);
            return { ...c, create: this.create(modelo, c.create) };
          });
          break;
        case 'upsert':
          out.upsert = mapear(valor, (u) =>
            esObjeto(u)
              ? { ...u, create: this.create(modelo, u.create), update: this.update(modelo, u.update) }
              : u,
          );
          break;
        case 'update':
        case 'updateMany':
          // `{ where, data }` en to-many; la data directa en un to-one.
          out[op] = mapear(valor, (u) =>
            esObjeto(u) && 'data' in u ? { ...u, data: this.update(modelo, u.data) } : this.update(modelo, u),
          );
          break;
        case 'disconnect':
        case 'delete':
        case 'deleteMany':
          // Se aplican sobre los hijos del padre, que ya está acotado.
          break;
        default:
          throw new TenantScopeError(`Nested write "${op}" sobre ${modelo} no soportado por el cliente del club`);
      }
    }
    return out;
  }

  private registrarId(modelo: string, id: string) {
    if (this.propios.has(`${modelo}:${id}`)) return;
    let ids = this.ids.get(modelo);
    if (!ids) this.ids.set(modelo, (ids = new Set()));
    ids.add(id);
  }

  private registrarWhere(modelo: string, where: unknown) {
    if (!esObjeto(where)) return;
    const claves = Object.keys(where);
    if (claves.length === 1 && typeof where.id === 'string') this.registrarId(modelo, where.id);
    else this.uniques.push({ modelo, where });
  }

  private async validarIds(modelo: string, ids: string[]) {
    const delegado = delegadoDe(this.base, modelo);
    const filtro = filtroDelClub(modelo, this.clubId);
    const delClub = await delegado.count({ where: { id: { in: ids }, AND: [filtro] } });
    if (delClub === ids.length) return;
    // Las que no existen en ningún lado las rechaza la FK de la base.
    const existentes = await delegado.count({ where: { id: { in: ids } } });
    if (existentes > delClub) {
      throw new CrossTenantError(`${modelo}: la escritura referencia una fila de otro club`);
    }
  }

  private async validarUnique(modelo: string, where: Data) {
    const delegado = delegadoDe(this.base, modelo);
    const filtro = filtroDelClub(modelo, this.clubId);
    if (await delegado.findUnique({ where: conFiltro(where, filtro) })) return;
    if (await delegado.findUnique({ where })) {
      throw new CrossTenantError(`${modelo}: la escritura referencia una fila de otro club`);
    }
  }
}

function idsCreados(resultado: unknown, operation: string, args: Data): string[] {
  if (operation === 'createMany') {
    return comoLista(args.data).flatMap((d) => (esObjeto(d) && typeof d.id === 'string' ? [d.id] : []));
  }
  return comoLista(resultado).flatMap((r) => (esObjeto(r) && typeof r.id === 'string' ? [r.id] : []));
}

/**
 * El `$allOperations` de la extension, separado para poder testearlo sin una
 * base. `propios` vive lo que vive el cliente: una request, vía `getDb()`.
 */
export function crearInterceptor(clubId: string, base: PrismaClient) {
  const propios = new Set<string>();

  return async function interceptar({ model, operation, args, query }: OperacionPrisma): Promise<unknown> {
    if (!model) throw new TenantScopeError(`La operación ${operation} no tiene modelo`);
    const filtro = filtroDelClub(model, clubId); // falla cerrado para global/sin clasificar

    const escritura = new Escritura(clubId, base, propios);
    const nuevos: Data = { ...(args ?? {}) };

    if (SOLO_WHERE.has(operation)) {
      nuevos.where = conFiltro(nuevos.where, filtro);
    } else if (UPDATES.has(operation)) {
      nuevos.where = conFiltro(nuevos.where, filtro);
      nuevos.data = escritura.update(model, nuevos.data);
    } else if (operation === 'upsert') {
      nuevos.where = conFiltro(nuevos.where, filtro);
      nuevos.create = escritura.create(model, nuevos.create);
      nuevos.update = escritura.update(model, nuevos.update);
    } else if (operation === 'create') {
      nuevos.data = escritura.create(model, nuevos.data);
    } else if (CREATE_MANY.has(operation)) {
      nuevos.data = mapear(nuevos.data, (d) => escritura.create(model, d));
    } else {
      throw new TenantScopeError(`La operación ${operation} no está soportada por el cliente del club`);
    }

    await escritura.validar();
    const resultado = await query(nuevos);

    if (operation === 'create' || operation === 'upsert' || CREATE_MANY.has(operation)) {
      for (const id of idsCreados(resultado, operation, nuevos)) propios.add(`${model}:${id}`);
    }
    return resultado;
  };
}

/** Cliente Prisma que solo ve y escribe filas de `clubId`. */
export function dbDelClub(clubId: string, base: PrismaClient = prisma) {
  if (!clubId) throw new SinContextoError('dbDelClub necesita un clubId');
  const interceptar = crearInterceptor(clubId, base);
  return base.$extends({
    name: 'tenant',
    client: {
      /**
       * El club de este cliente. Es para el SQL crudo (`$queryRaw`), que no pasa
       * por la extension y tiene que filtrar `club_id` a mano: sacarlo del mismo
       * cliente evita que la query y el filtro hablen de clubes distintos.
       */
      $clubId: () => clubId,
    },
    query: {
      $allModels: {
        $allOperations: (operacion) => interceptar(operacion as OperacionPrisma),
      },
    },
  });
}

export type DbClub = ReturnType<typeof dbDelClub>;

/**
 * El cliente del club activo de la sesión. Cacheado por request: todas las
 * queries de un render comparten el mismo cliente (y su `propios`).
 */
export const getDb = cache(async (): Promise<DbClub> => {
  const contexto = await getContextoClub();
  if (!contexto) throw new SinContextoError();
  return dbDelClub(contexto.clubId);
});
