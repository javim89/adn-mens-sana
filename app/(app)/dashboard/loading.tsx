import {
  EncabezadoBloqueSkeleton,
  FilaSkeleton,
  MitadesSkeleton,
  PanelSkeleton,
  SeguimientosSkeleton,
} from './_components/Skeletons';

/**
 * Skeleton de la navegación hacia `/dashboard`, como los otros 6 módulos.
 *
 * Es el de la estructura de la página (título + bloques), no el de los datos: esos
 * tienen su propio `<Suspense>` por sección, así que el shell aparece entero y cada
 * card se completa cuando resuelve su query.
 *
 * **Reproduce la separación de bloques** (`gap-10` afuera, `gap-5` adentro), la barra
 * lavanda del encabezado de cada módulo y las grillas reales (2/5 + 3/5, mitades,
 * fila completa). Si acá quedara otra estructura, la página se reacomodaría entera al
 * montar la real.
 */

function BloqueSkeleton({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <EncabezadoBloqueSkeleton />
      {children}
    </div>
  );
}

export default function DashboardLoading() {
  return (
    <div className="p-4 md:p-8" aria-hidden>
      <div className="h-9 w-48 bg-gray-200 rounded animate-pulse mb-2" />
      <div className="h-4 w-72 max-w-full bg-gray-100 rounded animate-pulse mb-6" />

      <div className="flex flex-col gap-10">
        <BloqueSkeleton>
          <FilaSkeleton />
        </BloqueSkeleton>
        <BloqueSkeleton>
          <MitadesSkeleton />
        </BloqueSkeleton>
        <BloqueSkeleton>
          <FilaSkeleton />
        </BloqueSkeleton>
        <BloqueSkeleton>
          <SeguimientosSkeleton />
        </BloqueSkeleton>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-x-5 gap-y-10">
          <BloqueSkeleton>
            <PanelSkeleton filas={5} conTitulo={false} />
          </BloqueSkeleton>
          <BloqueSkeleton>
            <PanelSkeleton filas={6} conTitulo={false} />
          </BloqueSkeleton>
        </div>
      </div>
    </div>
  );
}
