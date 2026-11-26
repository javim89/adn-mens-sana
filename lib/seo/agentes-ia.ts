/**
 * Crawlers de buscadores y asistentes con IA a los que `robots.txt` les da un grupo
 * propio. Con el `*` ya podrían entrar, pero un grupo explícito deja la decisión a la
 * vista y algunos operadores lo leen así. Mismas reglas que el `*`.
 */
export const AGENTES_IA = [
  'OAI-SearchBot',
  'ChatGPT-User',
  'GPTBot',
  'PerplexityBot',
  'Perplexity-User',
  'ClaudeBot',
  'Claude-SearchBot',
  'Claude-User',
  'Google-Extended',
  'Applebot-Extended',
] as const;
