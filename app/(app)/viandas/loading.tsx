export default function Loading() {
  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto animate-pulse">
      <div className="h-8 w-40 bg-gray-200 rounded mb-2" />
      <div className="h-4 w-72 bg-gray-100 rounded mb-6" />

      <div className="bg-white rounded-xl border border-gray-100 p-4 mb-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="h-10 bg-gray-100 rounded-lg" />
          <div className="h-10 bg-gray-100 rounded-lg" />
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-9 w-44 bg-gray-100 rounded-lg" />
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-14 px-4 flex items-center gap-4">
            <div className="h-4 w-48 bg-gray-100 rounded" />
            <div className="ml-auto flex gap-2">
              {Array.from({ length: 4 }).map((_, j) => (
                <div key={j} className="h-8 w-24 bg-gray-100 rounded-lg" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
