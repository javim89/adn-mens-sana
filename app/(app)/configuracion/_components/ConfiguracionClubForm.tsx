'use client';

import { useEffect, useId, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Copy, Loader2, RotateCcw } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/app/components/ui/dialog';
import { normalizarHex } from '@/lib/branding/colores';
import { derivarTema } from '@/lib/branding/tema';
import { VARS_TEMA, type Tema } from '@/lib/branding/tokens';
import { procesarLogo } from '@/lib/branding/imagen-logo';
import type { PaletaDetectada } from '@/lib/branding/paleta';
import { subirLogoClub } from '@/lib/api/club';
import { guardarConfiguracionClub } from '@/lib/actions/configuracion';
import { NOMBRE_CLUB_MAX, NOMBRE_CLUB_MIN } from '@/lib/types/configuracion';
import SelectorColor, { contrasteBajo, hexInvalido } from './SelectorColor';
import LogoInput, { type EstadoLogo } from './LogoInput';
import BannerSugerencia from './BannerSugerencia';
import VistaPreviaTema from './VistaPreviaTema';

type Rol = 'primario' | 'secundario' | 'acento';
/** Lo que hay en cada campo hex: `''` = predeterminado. */
type Textos = Record<Rol, string>;

export interface ClubConfigurable {
  nombre: string;
  logoSrc: string | null;
  colorPrimario: string | null;
  colorSecundario: string | null;
  colorAcento: string | null;
}

interface ConfiguracionClubFormProps {
  club: ClubConfigurable;
  /** URL de login con la marca del club, para compartir. */
  urlLogin: string;
}

const COLORES: { rol: Rol; etiqueta: string; uso: string; exigeContraste: boolean }[] = [
  {
    rol: 'primario',
    etiqueta: 'Primario',
    uso: 'Barra lateral, títulos y botones principales. Lleva texto blanco encima.',
    exigeContraste: true,
  },
  {
    rol: 'secundario',
    etiqueta: 'Secundario',
    uso: 'Links, foco de los campos y detalles interactivos. Vacío: se deriva del primario.',
    exigeContraste: true,
  },
  {
    rol: 'acento',
    etiqueta: 'Acento',
    uso: 'Toques puntuales: ítem activo del menú y destacados. Usalo con moderación.',
    exigeContraste: false,
  },
];

const ROLES = Object.keys(VARS_TEMA) as (keyof Tema)[];

function colores(textos: Textos) {
  return {
    primario: normalizarHex(textos.primario),
    secundario: normalizarHex(textos.secundario),
    acento: normalizarHex(textos.acento),
  };
}

export default function ConfiguracionClubForm({ club, urlLogin }: ConfiguracionClubFormProps) {
  const router = useRouter();
  const nombreId = useId();
  const nombreErrorId = useId();
  const urlId = useId();

  const inicial: Textos = useMemo(
    () => ({
      primario: club.colorPrimario ?? '',
      secundario: club.colorSecundario ?? '',
      acento: club.colorAcento ?? '',
    }),
    [club.colorPrimario, club.colorSecundario, club.colorAcento],
  );

  const [nombre, setNombre] = useState(club.nombre);
  const [textos, setTextos] = useState<Textos>(inicial);
  const [logo, setLogo] = useState<EstadoLogo>({ tipo: 'actual' });
  const [logoNuevoUrl, setLogoNuevoUrl] = useState<string | null>(null);
  const [procesandoLogo, setProcesandoLogo] = useState(false);
  const [errorLogo, setErrorLogo] = useState<string | null>(null);
  const [sugerencia, setSugerencia] = useState<{ paleta: PaletaDetectada | null; anteriores: Textos } | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tema = useMemo(() => derivarTema(colores(textos)), [textos]);

  const coloresCambiaron = (Object.keys(textos) as Rol[]).some(
    (r) => (normalizarHex(textos[r]) ?? textos[r].trim()) !== (normalizarHex(inicial[r]) ?? inicial[r]),
  );
  const dirty = nombre.trim() !== club.nombre || logo.tipo !== 'actual' || coloresCambiaron;

  const nombreTrim = nombre.trim();
  const errorNombre =
    nombreTrim.length < NOMBRE_CLUB_MIN
      ? `El nombre tiene que tener al menos ${NOMBRE_CLUB_MIN} caracteres.`
      : nombreTrim.length > NOMBRE_CLUB_MAX
        ? `El nombre no puede superar los ${NOMBRE_CLUB_MAX} caracteres.`
        : null;
  const hayInvalidos = (Object.keys(textos) as Rol[]).some((r) => hexInvalido(textos[r]));
  const hayContrasteBajo = contrasteBajo(textos.primario) || contrasteBajo(textos.secundario);
  const puedeGuardar = dirty && !errorNombre && !hayInvalidos && !hayContrasteBajo && !procesandoLogo && !guardando;

  // Vista previa en vivo: mientras hay cambios, las `--club-*` de <html> pisan las del
  // <style data-tema-club> del layout. Al descartar, guardar (el form se remonta) o
  // salir de la página se sacan y vuelve el tema guardado.
  useEffect(() => {
    if (!dirty) return;
    const style = document.documentElement.style;
    for (const k of ROLES) style.setProperty(VARS_TEMA[k], tema[k]);
    return () => {
      for (const k of ROLES) style.removeProperty(VARS_TEMA[k]);
    };
  }, [dirty, tema]);

  useEffect(() => {
    if (!dirty) return;
    const avisar = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', avisar);
    return () => window.removeEventListener('beforeunload', avisar);
  }, [dirty]);

  useEffect(() => {
    if (logo.tipo !== 'nuevo') {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- el object URL es un recurso externo que hay que crear y revocar acá
      setLogoNuevoUrl(null);
      return;
    }
    const url = URL.createObjectURL(logo.archivo);
    setLogoNuevoUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [logo]);

  const logoSrc = logo.tipo === 'nuevo' ? logoNuevoUrl : logo.tipo === 'quitar' ? null : club.logoSrc;

  function setColor(rol: Rol, texto: string) {
    setTextos((t) => ({ ...t, [rol]: texto }));
  }

  async function handleElegirLogo(file: File) {
    setErrorLogo(null);
    setProcesandoLogo(true);
    try {
      const { archivo, paleta } = await procesarLogo(file);
      setLogo({ tipo: 'nuevo', archivo });
      setSugerencia({ paleta, anteriores: textos });
      if (paleta) {
        setTextos((t) => ({
          primario: paleta.primario,
          secundario: paleta.secundario ?? '',
          acento: paleta.acento ?? t.acento,
        }));
      }
    } catch (e) {
      setErrorLogo(e instanceof Error ? e.message : 'No se pudo procesar el logo.');
    } finally {
      setProcesandoLogo(false);
    }
  }

  function deshacerSugerencia() {
    if (sugerencia) setTextos(sugerencia.anteriores);
    setSugerencia(null);
  }

  function descartar() {
    setNombre(club.nombre);
    setTextos(inicial);
    setLogo({ tipo: 'actual' });
    setSugerencia(null);
    setErrorLogo(null);
    setError(null);
  }

  function restablecerColores() {
    setTextos({ primario: '', secundario: '', acento: '' });
    setSugerencia(null);
  }

  async function copiarUrl() {
    try {
      await navigator.clipboard.writeText(urlLogin);
      toast.success('Link copiado');
    } catch {
      toast.error('No se pudo copiar el link');
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!puedeGuardar) return;
    setGuardando(true);
    setError(null);
    try {
      const logoKey = logo.tipo === 'nuevo' ? await subirLogoClub(logo.archivo) : logo.tipo === 'quitar' ? null : undefined;
      const c = colores(textos);
      const r = await guardarConfiguracionClub({
        nombre: nombreTrim,
        ...(logoKey !== undefined ? { logoKey } : {}),
        colorPrimario: c.primario,
        colorSecundario: c.secundario,
        colorAcento: c.acento,
      });
      if (!r.ok) {
        setError(r.error);
        return;
      }
      toast.success('Configuración guardada');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar la configuración');
    } finally {
      setGuardando(false);
    }
  }

  const sugeridos = sugerencia?.paleta?.candidatos ?? [];

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="flex min-w-0 flex-col gap-6">
        <section aria-labelledby="config-identidad" className="rounded-xl border border-border bg-white p-5 shadow-sm md:p-6">
          <h2 id="config-identidad" className="mb-4 font-[family-name:var(--font-oswald)] text-xl font-semibold text-primario">
            Identidad
          </h2>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor={nombreId} className="text-sm font-semibold text-foreground">
                Nombre del club
              </label>
              <Input
                id={nombreId}
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                maxLength={NOMBRE_CLUB_MAX}
                required
                aria-invalid={errorNombre !== null}
                aria-describedby={errorNombre ? nombreErrorId : undefined}
                className="max-w-md"
              />
              {errorNombre && (
                <p id={nombreErrorId} className="text-xs text-destructive">
                  {errorNombre}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor={urlId} className="text-sm font-semibold text-foreground">
                Link de ingreso del club
              </label>
              <div className="flex max-w-md items-center gap-2">
                <Input id={urlId} value={urlLogin} readOnly className="bg-subtle font-mono text-xs" onFocus={(e) => e.target.select()} />
                <Button type="button" variant="outline" size="icon" onClick={copiarUrl} aria-label="Copiar link de ingreso">
                  <Copy aria-hidden />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Compartilo con tu equipo: el login sale con el logo y los colores del club.</p>
            </div>
          </div>
        </section>

        <section aria-labelledby="config-logo" className="rounded-xl border border-border bg-white p-5 shadow-sm md:p-6">
          <h2 id="config-logo" className="mb-4 font-[family-name:var(--font-oswald)] text-xl font-semibold text-primario">
            Logo
          </h2>
          <LogoInput
            nombreClub={nombre}
            estado={logo}
            src={logoSrc}
            tieneLogoGuardado={club.logoSrc !== null}
            procesando={procesandoLogo}
            error={errorLogo}
            disabled={guardando}
            onElegir={handleElegirLogo}
            onQuitar={() => setLogo({ tipo: 'quitar' })}
            onRestaurar={() => {
              setLogo({ tipo: 'actual' });
              setErrorLogo(null);
            }}
          />
        </section>

        <section aria-labelledby="config-colores" className="rounded-xl border border-border bg-white p-5 shadow-sm md:p-6">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h2 id="config-colores" className="font-[family-name:var(--font-oswald)] text-xl font-semibold text-primario">
              Colores
            </h2>
            <Dialog>
              <DialogTrigger asChild>
                <Button type="button" variant="ghost" size="sm" disabled={guardando}>
                  <RotateCcw aria-hidden />
                  Restablecer colores predeterminados
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="font-[family-name:var(--font-oswald)] text-primario">
                    ¿Restablecer los colores?
                  </DialogTitle>
                  <DialogDescription>
                    Primario, secundario y acento vuelven a los predeterminados. El cambio se aplica cuando guardes.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter className="gap-2">
                  <DialogClose asChild>
                    <Button type="button" variant="outline">
                      Cancelar
                    </Button>
                  </DialogClose>
                  <DialogClose asChild>
                    <Button type="button" onClick={restablecerColores}>
                      Restablecer
                    </Button>
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {sugerencia && (
            <div className="mb-2">
              <BannerSugerencia paleta={sugerencia.paleta} onDeshacer={deshacerSugerencia} onCerrar={() => setSugerencia(null)} />
            </div>
          )}

          {COLORES.map(({ rol, etiqueta, uso, exigeContraste }) => (
            <SelectorColor
              key={rol}
              etiqueta={etiqueta}
              uso={uso}
              texto={textos[rol]}
              efectivo={tema[rol]}
              onTexto={(t) => setColor(rol, t)}
              exigeContraste={exigeContraste}
              sugeridos={sugeridos}
            />
          ))}
        </section>
      </div>

      <aside className="flex min-w-0 flex-col gap-4 lg:sticky lg:top-6 lg:self-start">
        <section aria-labelledby="config-preview" className="rounded-xl border border-border bg-white p-5 shadow-sm">
          <h2 id="config-preview" className="mb-1 font-[family-name:var(--font-oswald)] text-xl font-semibold text-primario">
            Vista previa
          </h2>
          <p className="mb-4 text-xs text-muted-foreground">
            Mientras no guardes, toda la app muestra los colores nuevos solo para vos.
          </p>
          <VistaPreviaTema nombre={nombreTrim} logoSrc={logoSrc} />
        </section>

        <div className="flex flex-col gap-3 rounded-xl border border-border bg-white p-5 shadow-sm">
          <p role="status" className="text-xs text-muted-foreground">
            {dirty ? 'Tenés cambios sin guardar.' : 'No hay cambios.'}
          </p>
          {error && (
            <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
              {error}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={!puedeGuardar} className="flex-1">
              {guardando && <Loader2 aria-hidden className="animate-spin" />}
              {guardando ? 'Guardando…' : 'Guardar'}
            </Button>
            <Button type="button" variant="outline" onClick={descartar} disabled={!dirty || guardando}>
              Descartar
            </Button>
          </div>
        </div>
      </aside>
    </form>
  );
}
