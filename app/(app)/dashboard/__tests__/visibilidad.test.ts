import { describe, test, expect } from 'vitest';
import { getNavItemsForRole, ROLES_PERMITIDOS, type AppRole } from '@/lib/roles';
import { cardsVisibles, CARD_HREF, type CardId } from '../_lib/visibilidad';

/**
 * LA MATRIZ ESPERADA, HARDCODEADA A PROPÓSITO.
 *
 * `cardsVisibles` deriva la visibilidad de `lib/roles.ts` para no mantener una
 * segunda fuente de verdad en producción. Pero el nav **no es autorización**: los
 * gates reales son los `redirect('/dashboard')` de cada page, que son constantes
 * separadas (`ROLES_VIANDAS` en `viandas/page.tsx`, `ROLES_PERMITIDOS` en
 * `presentismo/page.tsx`) y podrían driftear.
 *
 * Escribir la matriz a mano acá es la mitigación: si alguien cambia el guard de un
 * módulo sin tocar `lib/roles.ts` —o al revés— rompe un test en vez de filtrar un
 * conteo a un rol que no debería verlo. La duplicación es deliberada y vive SOLO en
 * el test.
 */
const MATRIZ_ESPERADA: Record<AppRole, CardId[]> = {
  admin: ['triage', 'plantel', 'viandas', 'turnos', 'presentismo', 'seguimientos', 'eventos'],
  // Entrenador: sí presentismo, NO turnos (no los atiende) y NO viandas.
  entrenador: ['triage', 'plantel', 'presentismo', 'seguimientos', 'eventos'],
  // Los 5 roles de salud: turnos sí, presentismo no.
  medico: ['triage', 'plantel', 'turnos', 'seguimientos', 'eventos'],
  kinesiologo: ['triage', 'plantel', 'turnos', 'seguimientos', 'eventos'],
  nutricionista: ['triage', 'plantel', 'turnos', 'seguimientos', 'eventos'],
  psicologo: ['triage', 'plantel', 'turnos', 'seguimientos', 'eventos'],
  cardiologo: ['triage', 'plantel', 'turnos', 'seguimientos', 'eventos'],
  // Social va por inclusión: deportistas, seguimientos y calendario.
  social: ['triage', 'plantel', 'seguimientos', 'eventos'],
  // El único rol que NO ve nada de deportistas: solo opera viandas.
  responsable_viandas: ['viandas'],
};

function ordenado(cards: Iterable<CardId>): CardId[] {
  return [...cards].sort();
}

describe('cardsVisibles — la matriz de los 9 roles', () => {
  test.each(ROLES_PERMITIDOS)('%s ve exactamente las cards esperadas', (rol) => {
    expect(ordenado(cardsVisibles(rol))).toEqual(ordenado(MATRIZ_ESPERADA[rol]));
  });

  test('el test cubre los 9 roles del sistema, sin olvidarse ninguno', () => {
    expect(Object.keys(MATRIZ_ESPERADA).sort()).toEqual([...ROLES_PERMITIDOS].sort());
  });
});

describe('cardsVisibles — los casos que el usuario pidió verificar a mano', () => {
  /**
   * `responsable_viandas` es el rol más restringido y el que más importa que esté
   * bien: si se le filtrara la card de triage vería datos de salud de los
   * deportistas, que es exactamente lo que el nav le niega.
   */
  test('responsable_viandas NO ve triage, plantel, turnos, seguimientos ni eventos', () => {
    const cards = cardsVisibles('responsable_viandas');
    expect(cards.has('viandas')).toBe(true);
    for (const prohibida of [
      'triage',
      'plantel',
      'turnos',
      'seguimientos',
      'eventos',
    ] as CardId[]) {
      expect(cards.has(prohibida)).toBe(false);
    }
  });

  test('entrenador ve presentismo pero NO viandas ni turnos', () => {
    const cards = cardsVisibles('entrenador');
    expect(cards.has('presentismo')).toBe(true);
    expect(cards.has('viandas')).toBe(false);
    expect(cards.has('turnos')).toBe(false);
  });

  test('viandas es exclusiva de admin y responsable_viandas', () => {
    const conViandas = ROLES_PERMITIDOS.filter((r) => cardsVisibles(r).has('viandas'));
    expect(conViandas.sort()).toEqual(['admin', 'responsable_viandas']);
  });

  test('presentismo es exclusiva de admin y entrenador', () => {
    const conPresentismo = ROLES_PERMITIDOS.filter((r) =>
      cardsVisibles(r).has('presentismo'),
    );
    expect(conPresentismo.sort()).toEqual(['admin', 'entrenador']);
  });

  test('turnos es de admin y los 5 roles de salud', () => {
    const conTurnos = ROLES_PERMITIDOS.filter((r) => cardsVisibles(r).has('turnos'));
    expect(conTurnos.sort()).toEqual([
      'admin',
      'cardiologo',
      'kinesiologo',
      'medico',
      'nutricionista',
      'psicologo',
    ]);
  });

  test('solo el admin ve las 7 cards', () => {
    expect(cardsVisibles('admin').size).toBe(Object.keys(CARD_HREF).length);
  });
});

/**
 * Los dos invariantes que fallarían EN SILENCIO, y por eso tienen test propio.
 */
describe('cardsVisibles — invariantes del catálogo', () => {
  /**
   * `/dashboard` está en el nav de TODOS los roles (es el fallback y el destino de
   * todos los `redirect`). Si alguna card lo tomara como href, se mostraría para
   * todos los roles sin que nada falle, incluido `responsable_viandas`.
   */
  test('ninguna card linkea a /dashboard', () => {
    expect(Object.values(CARD_HREF)).not.toContain('/dashboard');
  });

  /**
   * Un typo en un href (`'/deportista'`) esconde la card para TODOS los roles y el
   * dashboard queda silenciosamente incompleto. `ALL_NAV_ITEMS` no se exporta y
   * `lib/roles.ts` no se toca en esta feature, así que el nav de `admin` es el
   * proxy: hoy devuelve exactamente todos los items.
   */
  test('todo href de CARD_HREF existe en el nav del admin', () => {
    const navAdmin = new Set(getNavItemsForRole('admin').map((i) => i.href));
    for (const [card, href] of Object.entries(CARD_HREF)) {
      expect(navAdmin.has(href), `${card} → ${href} no existe en el nav`).toBe(true);
    }
  });

  /**
   * Un rol desconocido cae en el fallback de `getNavItemsForRole` (solo
   * `/dashboard`) → cero cards. La page NO puede dejar eso como una página en
   * blanco: muestra el estado vacío de "todavía no tenés rol asignado".
   */
  test.each([undefined, null, '', 'cualquier-cosa', 'ADMIN'])(
    'el rol %o no ve ninguna card',
    (rol) => {
      expect(cardsVisibles(rol as string).size).toBe(0);
    },
  );
});
