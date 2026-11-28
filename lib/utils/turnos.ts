export const SIN_CATEGORIA = 'Sin categoría';

export interface ResumenCategoria {
  categoria: string;
  cantidad: number;
}

/**
 * Deportistas de un turno resumidos por categoría ("6ta división (12)"). Los que
 * no tienen categoría van a "Sin categoría", al final; el resto por cantidad desc
 * y luego alfabéticamente.
 */
export function resumirPorCategoria(
  deportistas: readonly { categoria?: { nombre: string } | null }[],
): ResumenCategoria[] {
  const conteo = new Map<string, number>();
  let sinCategoria = 0;
  for (const d of deportistas) {
    const nombre = d.categoria?.nombre?.trim();
    if (!nombre) {
      sinCategoria += 1;
      continue;
    }
    conteo.set(nombre, (conteo.get(nombre) ?? 0) + 1);
  }
  const resultado = [...conteo.entries()]
    .map(([categoria, cantidad]) => ({ categoria, cantidad }))
    .sort((a, b) => b.cantidad - a.cantidad || a.categoria.localeCompare(b.categoria, 'es'));
  if (sinCategoria > 0) resultado.push({ categoria: SIN_CATEGORIA, cantidad: sinCategoria });
  return resultado;
}
