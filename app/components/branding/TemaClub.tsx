import { cssDelTema } from '@/lib/branding/tema';
import type { Tema } from '@/lib/branding/tokens';

/**
 * Inyecta el tema (las `--club-*`) en `:root`, no en un wrapper: así también les
 * llega a los portales (Radix, sonner, el UserButton de Clerk).
 *
 * Es un `<style>` normal, SIN `precedence`/`href`: React hoistea esos al `<head>`
 * y no los retira al navegar, así que al cambiar de club quedaría el tema del
 * anterior. Así se monta y desmonta con el layout que lo renderiza.
 *
 * `cssDelTema` solo emite `#rrggbb` validados: no hay inyección de CSS posible.
 */
export default function TemaClub({ tema }: { tema: Tema }) {
  return <style data-tema-club="">{cssDelTema(tema)}</style>;
}
