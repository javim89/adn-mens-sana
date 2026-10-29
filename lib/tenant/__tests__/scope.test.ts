import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';
import { Prisma } from '@/lib/generated/prisma/client';
import { TENANT_SCOPE, alcanceDe, filtroDelClub, type Alcance } from '../scope';
import { TenantScopeError } from '../errores';

// El mapa de alcance se mantiene a mano. Estos tests lo contrastan contra el
// schema real: un modelo, una FK o una relación nueva que no se clasifique
// rompe acá, antes de que el cliente del club la deje pasar sin filtrar.

const schema = readFileSync(path.resolve(__dirname, '../../../prisma/schema.prisma'), 'utf8');

type Campo = { nombre: string; tipo: string; fk?: string };

function camposDeRelacion(): Map<string, Campo[]> {
  const modelos = [...schema.matchAll(/\nmodel (\w+) \{\n([\s\S]*?)\n\}/g)];
  const nombres = new Set(modelos.map((m) => m[1]));
  const out = new Map<string, Campo[]>();
  for (const [, modelo, cuerpo] of modelos) {
    const campos: Campo[] = [];
    for (const linea of cuerpo.split('\n')) {
      const [nombre, tipoCrudo] = linea.trim().split(/\s+/);
      if (!nombre || !tipoCrudo || nombre.startsWith('/') || nombre.startsWith('@')) continue;
      const tipo = tipoCrudo.replace(/[?[\]]/g, '');
      if (!nombres.has(tipo)) continue;
      const fk = linea.match(/fields: \[(\w+)\]/)?.[1];
      campos.push({ nombre, tipo, fk });
    }
    out.set(modelo, campos);
  }
  return out;
}

const RELACIONES = camposDeRelacion();
const MODELOS = Object.values(Prisma.ModelName);

describe('TENANT_SCOPE', () => {
  it('clasifica todos los modelos de Prisma, sin sobrantes', () => {
    expect(Object.keys(TENANT_SCOPE).sort()).toEqual([...MODELOS].sort());
  });

  it('los modelos globales son exactamente los previstos', () => {
    const globales = MODELOS.filter((m) => alcanceDe(m)?.tipo === 'global').sort();
    expect(globales).toEqual(['Club', 'InsightsSesion', 'Superadmin']);
  });

  it('es raíz todo modelo con clubId (salvo los globales que lo manejan aparte)', () => {
    for (const modelo of MODELOS) {
      const alcance = alcanceDe(modelo)!;
      const tieneClubId = (RELACIONES.get(modelo) ?? []).some((c) => c.fk === 'clubId');
      if (alcance.tipo === 'global') continue;
      expect({ modelo, raiz: alcance.tipo === 'raiz' }).toEqual({ modelo, raiz: tieneClubId });
    }
  });

  describe.each(MODELOS.filter((m) => alcanceDe(m)?.tipo !== 'global'))('%s', (modelo) => {
    const alcance = alcanceDe(modelo) as Exclude<Alcance, { tipo: 'global' }>;
    const campos = RELACIONES.get(modelo) ?? [];

    it('declara en refs cada FK (salvo la del club)', () => {
      const esperadas = campos
        .filter((c) => c.fk && c.fk !== 'clubId')
        .map((c) => ({ campo: c.fk, relacion: c.nombre, modelo: c.tipo }))
        .sort((a, b) => a.campo!.localeCompare(b.campo!));
      const declaradas = [...alcance.refs].sort((a, b) => a.campo.localeCompare(b.campo));
      expect(declaradas).toEqual(esperadas);
    });

    it('declara en anidados cada relación inversa con su modelo', () => {
      const esperados = Object.fromEntries(campos.filter((c) => !c.fk).map((c) => [c.nombre, c.tipo]));
      expect({ ...alcance.anidados }).toEqual(esperados);
    });
  });
});

describe('filtroDelClub', () => {
  it('una raíz se filtra por clubId', () => {
    expect(filtroDelClub('Deportista', 'club_a')).toEqual({ clubId: 'club_a' });
    expect(filtroDelClub('EntregaComida', 'club_a')).toEqual({ clubId: 'club_a' });
  });

  it('un hijo se filtra por la relación con su padre', () => {
    expect(filtroDelClub('DatosSalud', 'club_a')).toEqual({ deportista: { clubId: 'club_a' } });
    expect(filtroDelClub('Asistencia', 'club_a')).toEqual({ entrenamiento: { clubId: 'club_a' } });
  });

  it('un nieto se filtra por la cadena hasta la raíz', () => {
    expect(filtroDelClub('EnfermedadPreexistenteItem', 'club_a')).toEqual({
      datosSalud: { deportista: { clubId: 'club_a' } },
    });
    expect(filtroDelClub('InsightsFilterTarget', 'club_a')).toEqual({
      filter: { dashboard: { clubId: 'club_a' } },
    });
  });

  it('falla cerrado con un modelo global', () => {
    expect(() => filtroDelClub('Club', 'club_a')).toThrow(TenantScopeError);
    expect(() => filtroDelClub('Superadmin', 'club_a')).toThrow(/es global/);
  });

  it('falla cerrado con un modelo sin clasificar', () => {
    expect(() => filtroDelClub('ModeloNuevo', 'club_a')).toThrow(/no está clasificado/);
  });
});
