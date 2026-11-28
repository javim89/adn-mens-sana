export default function TurnosLoading() {
  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
        <div className="h-9 w-40 bg-gray-200 rounded animate-pulse" />
        <div className="h-9 w-36 bg-gray-200 rounded animate-pulse" />
      </div>
      <div className="h-4 w-56 bg-gray-100 rounded animate-pulse mb-4" />

      <div className="flex flex-wrap gap-2 mb-4">
        <div className="h-9 w-44 bg-gray-100 rounded-full animate-pulse" />
        <div className="h-9 w-20 bg-gray-100 rounded-full animate-pulse" />
        <div className="h-9 flex-1 min-w-[180px] bg-gray-100 rounded animate-pulse" />
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <ul className="divide-y divide-gray-100">
            {Array.from({ length: 6 }).map((_, i) => (
              <li key={i} className="flex items-center gap-3 px-4 py-3">
                <div className="h-14 w-20 shrink-0 bg-gray-100 rounded-xl animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-40 bg-gray-100 rounded animate-pulse" />
                  <div className="h-3 w-28 bg-gray-100 rounded animate-pulse" />
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-3">
          <div className="h-3 w-28 bg-gray-200 rounded animate-pulse" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}
