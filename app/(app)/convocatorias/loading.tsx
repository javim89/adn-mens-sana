export default function ConvocatoriasLoading() {
  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
        <div className="h-9 w-48 bg-gray-200 rounded animate-pulse" />
        <div className="h-9 w-48 bg-gray-200 rounded animate-pulse" />
      </div>
      <div className="h-4 w-72 bg-gray-100 rounded animate-pulse mb-4" />

      <div className="flex flex-wrap gap-2 mb-4">
        <div className="h-9 w-32 bg-gray-100 rounded-full animate-pulse" />
        <div className="h-9 w-32 bg-gray-100 rounded-full animate-pulse" />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <ul className="divide-y divide-gray-100">
          {Array.from({ length: 8 }).map((_, i) => (
            <li key={i} className="flex items-center gap-3 px-4 py-3">
              <div className="h-14 w-20 shrink-0 bg-gray-100 rounded-xl animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-40 bg-gray-100 rounded animate-pulse" />
                <div className="h-3 w-28 bg-gray-100 rounded animate-pulse" />
              </div>
              <div className="h-4 w-8 bg-gray-100 rounded animate-pulse" />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
