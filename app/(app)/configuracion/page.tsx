import type { Metadata } from 'next';
import { requireContexto } from '@/lib/tenant/contexto';
import { urlLoginDelClub, urlLogoDelClub } from '@/lib/branding/marca';
import { versionTema } from '@/lib/branding/tema';
import ConfiguracionClubForm from './_components/ConfiguracionClubForm';

export const metadata: Metadata = { title: 'Configuración' };

/** Identidad del club (nombre, logo y colores). Solo admin. */
export default async function ConfiguracionPage() {
  const { club } = await requireContexto(['admin']);

  return (
    <div className="p-4 md:p-8">
      <h1 className="mb-1 font-[family-name:var(--font-oswald)] text-3xl font-bold text-primario">Configuración</h1>
      <p className="mb-6 text-muted-foreground">Identidad y colores de {club.nombre}</p>
      {/* La key cambia al guardar: el form se remonta con los valores nuevos y suelta la vista previa. */}
      <ConfiguracionClubForm
        key={`${versionTema(club)}:${club.nombre}`}
        club={{
          nombre: club.nombre,
          logoSrc: urlLogoDelClub(club),
          colorPrimario: club.colorPrimario,
          colorSecundario: club.colorSecundario,
          colorAcento: club.colorAcento,
        }}
        urlLogin={urlLoginDelClub(club.slug)}
      />
    </div>
  );
}
