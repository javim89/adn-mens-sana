export default function DeportistasLoading() {
  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="h-9 w-48 animate-pulse rounded bg-gray-200" />
        <div className="h-9 w-40 animate-pulse rounded bg-gray-200" />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <div className="h-9 w-full animate-pulse rounded-full bg-gray-100 sm:w-72" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-9 w-24 animate-pulse rounded-full bg-gray-100" />
        ))}
      </div>

      <div className="mt-6 grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-6">
        <div className="overflow-hidden rounded-xl border border-border bg-background shadow-sm">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-0">
              <div className="size-8 shrink-0 animate-pulse rounded-full bg-gray-200" />
              <div className="h-4 w-40 animate-pulse rounded bg-gray-100" />
              <div className="ml-auto h-5 w-16 animate-pulse rounded-full bg-gray-100" />
            </div>
          ))}
        </div>
        <div className="h-64 animate-pulse rounded-xl border border-border bg-gray-50" />
      </div>
    </div>
  );
}
