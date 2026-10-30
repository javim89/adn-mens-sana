import type { Metadata } from 'next';
import { requireContexto } from '@/lib/tenant/contexto';

export const metadata: Metadata = { title: 'Configuración' };

/**
 * Configuración del club (solo admin). Por ahora es un placeholder para que el link
 * del Sidebar no dé 404; el formulario de nombre, logo y colores llega después.
 */
export default async function ConfiguracionPage() {
  const { club } = await requireContexto(['admin']);

  return (
    <div className="p-4 md:p-8">
      <h1 className="mb-1 font-[family-name:var(--font-oswald)] text-3xl font-bold text-primario">Configuración</h1>
      <p className="mb-6 text-muted-foreground">Identidad y colores de {club.nombre}</p>
      <div className="rounded-xl border border-border bg-white p-6 text-sm text-muted-foreground shadow-sm">
        Muy pronto vas a poder editar el nombre, el logo y los colores del club desde acá.
      </div>
    </div>
  );
}
