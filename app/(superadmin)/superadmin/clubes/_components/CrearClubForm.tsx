'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { crearClub, type CrearClubInput } from '@/lib/actions/superadmin';
import { slugDesdeNombre } from '@/lib/utils/slug';

type Campos = Omit<CrearClubInput, 'copiarCatalogos'>;
type Errores = Partial<Record<keyof CrearClubInput, string>>;

const VACIO: Campos = { nombre: '', slug: '', adminEmail: '', adminNombre: '', adminApellido: '' };

const INPUT =
  'text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-secundario/30 text-foreground';
const LABEL = 'text-xs font-medium text-foreground uppercase tracking-wide';

/**
 * Alta de un club. El slug se sugiere a partir del nombre hasta que se edita a
 * mano; la validación de verdad (formato y unicidad) la hace `crearClub`.
 */
export default function CrearClubForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [campos, setCampos] = useState<Campos>(VACIO);
  const [slugEditado, setSlugEditado] = useState(false);
  const [copiarCatalogos, setCopiarCatalogos] = useState(true);
  const [errores, setErrores] = useState<Errores>({});

  function set<K extends keyof Campos>(campo: K, valor: string) {
    setCampos((prev) => {
      const siguiente = { ...prev, [campo]: valor };
      if (campo === 'nombre' && !slugEditado) siguiente.slug = slugDesdeNombre(valor);
      return siguiente;
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrores({});
    startTransition(async () => {
      const resultado = await crearClub({ ...campos, copiarCatalogos });
      if (!resultado.ok) {
        setErrores(resultado.campos ?? {});
        toast.error(resultado.error);
        return;
      }
      toast.success(
        resultado.admin === 'miembro'
          ? `Club creado. ${campos.adminEmail} ya tenía cuenta y es admin.`
          : `Club creado. Se invitó a ${campos.adminEmail} como admin.`,
      );
      setCampos(VACIO);
      setSlugEditado(false);
      setCopiarCatalogos(true);
      router.refresh();
    });
  }

  function campo(id: keyof Campos, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) {
    const error = errores[id];
    return (
      <div className="flex flex-col gap-1">
        <label htmlFor={`club-${id}`} className={LABEL}>
          {label}
        </label>
        <input
          id={`club-${id}`}
          value={campos[id]}
          onChange={(e) => {
            if (id === 'slug') setSlugEditado(true);
            set(id, e.target.value);
          }}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `club-${id}-error` : undefined}
          className={`${INPUT}${error ? ' border-red-400' : ''}`}
          {...props}
        />
        {error && (
          <p id={`club-${id}-error`} className="text-xs text-red-600">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      aria-labelledby="crear-club-titulo"
      className="bg-white rounded-xl shadow-sm border border-gray-100"
    >
      <h2
        id="crear-club-titulo"
        className="px-6 py-4 border-b border-gray-100 text-lg font-semibold text-primario font-[family-name:var(--font-oswald)]"
      >
        Nuevo club
      </h2>
      <div className="px-6 py-5 flex flex-col gap-4">
        {campo('nombre', 'Nombre del club', { type: 'text', placeholder: 'Club Atlético Ejemplo' })}
        {campo('slug', 'Slug', { type: 'text', placeholder: 'club-atletico-ejemplo', autoCapitalize: 'none' })}

        <fieldset className="flex flex-col gap-4">
          <legend className="mb-2 text-sm font-medium text-primario">Primer administrador</legend>
          <div className="grid grid-cols-2 gap-4">
            {campo('adminNombre', 'Nombre', { type: 'text' })}
            {campo('adminApellido', 'Apellido', { type: 'text' })}
          </div>
          {campo('adminEmail', 'Email', { type: 'email', placeholder: 'admin@club.com' })}
        </fieldset>

        <label className="flex items-start gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            checked={copiarCatalogos}
            onChange={(e) => setCopiarCatalogos(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-primario"
          />
          <span>
            Copiar catálogos default
            <span className="block text-xs text-muted-foreground">Disciplinas y categorías estándar</span>
          </span>
        </label>
      </div>
      <div className="px-6 py-4 border-t border-gray-100">
        <button
          type="submit"
          disabled={isPending}
          className="flex w-full items-center justify-center gap-2 bg-primario text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-primario-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secundario/40 transition-colors disabled:opacity-60"
        >
          {isPending && <Loader2 size={14} className="animate-spin" />}
          Crear club
        </button>
      </div>
    </form>
  );
}
