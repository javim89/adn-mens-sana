import { describe, it, expect } from 'vitest';
import { esViolacionDeUnique, mensajeDuplicadoDeportista } from '../prisma-errores';
import { CrossTenantError, mensajeDeError, NO_ENCONTRADO } from '@/lib/tenant/errores';

const p2002 = (meta: unknown) => Object.assign(new Error('Unique constraint failed'), { code: 'P2002', meta });

describe('esViolacionDeUnique', () => {
  it('reconoce el target compuesto por club', () => {
    expect(esViolacionDeUnique(p2002({ target: ['club_id', 'dni'] }), 'dni')).toBe(true);
  });

  it('reconoce el detalle que viene por driverAdapterError', () => {
    const error = p2002({
      driverAdapterError: { cause: { constraint: { fields: ['club_id', 'email'] } } },
    });
    expect(esViolacionDeUnique(error, 'email')).toBe(true);
    expect(esViolacionDeUnique(error, 'dni')).toBe(false);
  });

  it('sin columnas acepta cualquier P2002', () => {
    expect(esViolacionDeUnique(p2002({}))).toBe(true);
  });

  it('otro código o algo que no es un error no cuenta', () => {
    expect(esViolacionDeUnique({ code: 'P2025' }, 'dni')).toBe(false);
    expect(esViolacionDeUnique(null, 'dni')).toBe(false);
    expect(esViolacionDeUnique('P2002', 'dni')).toBe(false);
  });
});

describe('mensajeDuplicadoDeportista', () => {
  it('DNI y email repetidos tienen su mensaje; foto_key no es de acá', () => {
    expect(mensajeDuplicadoDeportista(p2002({ target: ['club_id', 'dni'] }))).toMatch(/DNI/);
    expect(mensajeDuplicadoDeportista(p2002({ target: ['club_id', 'email'] }))).toMatch(/email/);
    expect(mensajeDuplicadoDeportista(p2002({ target: ['foto_key'] }))).toBeNull();
  });
});

describe('mensajeDeError', () => {
  it('un cruce de club se informa como "no encontrado", sin el detalle', () => {
    expect(mensajeDeError(new CrossTenantError('Turno: la escritura referencia una fila de otro club'), 'x')).toBe(
      NO_ENCONTRADO,
    );
  });

  it('otros errores pasan su mensaje; lo que no es Error usa el fallback', () => {
    expect(mensajeDeError(new Error('El título es requerido'), 'x')).toBe('El título es requerido');
    expect(mensajeDeError('raro', 'Error al guardar')).toBe('Error al guardar');
  });
});
