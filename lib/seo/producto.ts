/**
 * Qué es BioTeam, en texto plano y autocontenido: lo citan los buscadores con IA, lo
 * usan `llms.txt` y el JSON-LD, y la home lo muestra en "¿Qué es BioTeam?". Nunca
 * nombra clubes cliente.
 */
export const PREGUNTA_QUE_ES_BIOTEAM = '¿Qué es BioTeam?';

export const QUE_ES_BIOTEAM =
  'BioTeam es un software web de gestión integral del deportista para clubes deportivos. Reúne en un solo lugar la ficha de cada deportista, los seguimientos médicos, psicológicos y sociales, los turnos, el presentismo, las convocatorias, las viandas y un triage que indica a quién priorizar, para que todo el club trabaje sobre la misma información. Es multi-club: cada club tiene sus datos separados y usa BioTeam con su propio nombre, logo y colores.';

/** Para quién es BioTeam: los roles del club que lo usan todos los días. */
export const AUDIENCIA_BIOTEAM = [
  'Coordinadores deportivos',
  'Cuerpo médico',
  'Psicólogos',
  'Nutricionistas',
  'Área social',
  'Entrenadores',
  'Dirigentes',
] as const;
