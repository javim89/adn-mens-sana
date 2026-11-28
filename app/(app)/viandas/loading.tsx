export default function Loading() {
  return (
    <div className="flex flex-col gap-5 p-4 md:p-8 animate-pulse">
      <div className="flex flex-col gap-4">
        <div>
          <div className="h-8 w-40 bg-gray-200 rounded" />
          <div className="h-4 w-72 bg-gray-100 rounded mt-2" />
        </div>
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-9 w-32 bg-gray-100 rounded-full" />
          ))}
        </div>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-6">
        <div className="flex min-w-0 flex-col gap-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 bg-gray-100 rounded-lg" />
            ))}
          </div>
          <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-14 px-4 flex items-center gap-4">
                <div className="size-8 bg-gray-100 rounded-full shrink-0" />
                <div className="h-4 w-40 bg-gray-100 rounded" />
                <div className="ml-auto hidden sm:flex gap-2">
                  {Array.from({ length: 3 }).map((_, j) => (
                    <div key={j} className="h-8 w-24 bg-gray-100 rounded-lg" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="h-64 bg-gray-100 rounded-xl" />
      </div>
    </div>
  );
}
