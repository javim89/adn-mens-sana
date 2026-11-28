/** "Fútbol · 4ta · Delantero · 17 años", omitiendo lo que no esté cargado. */
export function subtituloFicha({
  disciplina,
  categoria,
  posicion,
  edad,
}: {
  disciplina?: string | null;
  categoria?: string | null;
  posicion?: string | null;
  edad?: number | null;
}): string {
  return [disciplina, categoria, posicion?.trim(), edad != null ? `${edad} años` : null]
    .filter(Boolean)
    .join(' · ');
}
