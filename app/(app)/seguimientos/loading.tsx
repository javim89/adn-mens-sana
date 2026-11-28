export default function SeguimientosLoading() {
  return (
    <div className="p-4 md:p-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="h-9 w-56 animate-pulse rounded bg-gray-200" />
        <div className="h-9 w-44 animate-pulse rounded-lg bg-gray-200" />
      </div>
      <div className="mb-6 flex flex-wrap gap-2">
        <div className="h-9 w-64 animate-pulse rounded-full bg-gray-100" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-9 w-28 animate-pulse rounded-full bg-gray-100" />
        ))}
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-6">
        <div className="flex min-w-0 flex-col gap-4">
          <div className="h-24 animate-pulse rounded-2xl bg-gray-200" />
          <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
            <div className="h-10 border-b border-gray-100 bg-muted" />
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 border-b border-gray-50 px-4 py-3">
                <div className="size-8 shrink-0 animate-pulse rounded-full bg-gray-100" />
                <div className="h-4 w-36 animate-pulse rounded bg-gray-100" />
                <div className="hidden h-4 flex-1 animate-pulse rounded bg-gray-100 lg:block" />
                <div className="h-5 w-16 animate-pulse rounded-full bg-gray-100" />
              </div>
            ))}
          </div>
        </div>
        <div className="flex min-w-0 flex-col gap-4">
          <div className="h-64 animate-pulse rounded-xl bg-gray-100" />
          <div className="h-48 animate-pulse rounded-xl bg-gray-100" />
        </div>
      </div>
    </div>
  );
}
