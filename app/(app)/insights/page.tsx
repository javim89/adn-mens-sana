import { Suspense } from 'react';
import Link from 'next/link';
import { ChartColumn } from 'lucide-react';
import { getDashboards } from '@/lib/actions/insights';
import NuevoDashboardButton from './_components/NuevoDashboardButton';

export const dynamic = 'force-dynamic';

function formatFecha(value: Date): string {
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(value);
}

async function DashboardsContent() {
  const result = await getDashboards();

  if (!result.success) {
    return (
      <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
        {result.error}
      </div>
    );
  }

  const { dashboards } = result;

  if (dashboards.length === 0) {
    return (
      <div className="rounded-xl border border-gray-100 bg-white px-6 py-12 text-center">
        <ChartColumn size={28} className="mx-auto text-[#6B7280] mb-3" />
        <p className="text-[#1C1C1C] font-medium mb-1">Todavía no hay dashboards</p>
        <p className="text-sm text-[#6B7280] mb-5">
          Creá el primero para empezar a armar gráficos sobre los datos del club.
        </p>
        <NuevoDashboardButton />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
      {dashboards.map((d) => (
        <Link
          key={d.id}
          href={`/insights/${d.id}`}
          className="group bg-white rounded-xl shadow-sm border border-gray-100 p-5 transition-all hover:shadow-md hover:-translate-y-0.5"
        >
          <div className="flex items-start justify-between gap-2 mb-2">
            <h2
              className="text-lg font-semibold text-[#121A61] group-hover:text-[#1E2A8A]"
              style={{ fontFamily: 'Oswald, sans-serif' }}
            >
              {d.nombre}
            </h2>
            {d.esSistema && (
              <span className="shrink-0 px-2 py-0.5 rounded-full bg-[#C9A84C]/15 text-[#8C6D1F] text-xs font-medium">
                Sistema
              </span>
            )}
          </div>
          {d.descripcion && (
            <p className="text-sm text-[#6B7280] mb-3 line-clamp-2">{d.descripcion}</p>
          )}
          <p className="text-xs text-[#6B7280]">
            {d.widgetCount} {d.widgetCount === 1 ? 'widget' : 'widgets'}
            <span className="mx-1.5 text-gray-300">·</span>
            {formatFecha(d.updatedAt)}
          </p>
        </Link>
      ))}
    </div>
  );
}

function DashboardsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="h-6 w-40 bg-gray-200 rounded animate-pulse mb-3" />
          <div className="h-4 w-full bg-gray-100 rounded animate-pulse mb-2" />
          <div className="h-3 w-24 bg-gray-100 rounded animate-pulse" />
        </div>
      ))}
    </div>
  );
}

export default function InsightsPage() {
  return (
    <div className="p-8">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-1">
        <h1
          className="text-3xl font-bold text-[#121A61]"
          style={{ fontFamily: 'Oswald, sans-serif' }}
        >
          Insights
        </h1>
        <NuevoDashboardButton />
      </div>
      <p className="text-[#6B7280] mb-6">
        Dashboards y gráficos personalizados sobre los datos del club.
      </p>

      <Suspense fallback={<DashboardsSkeleton />}>
        <DashboardsContent />
      </Suspense>
    </div>
  );
}
