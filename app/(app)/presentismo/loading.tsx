export default function PresentismoLoading() {
  return (
    <div className="flex flex-col gap-6 p-4 md:p-8">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 w-56 bg-gray-100 rounded animate-pulse mt-2" />
          </div>
          <div className="h-9 w-48 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="h-9 w-28 bg-gray-100 rounded-full animate-pulse" />
          <div className="h-9 w-28 bg-gray-100 rounded-full animate-pulse" />
          <div className="h-9 w-36 bg-gray-100 rounded-full animate-pulse" />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-56 bg-white rounded-2xl shadow-sm border border-gray-100 animate-pulse md:last:col-span-2 xl:last:col-span-1"
          />
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-muted border-b border-gray-100">
                {['Fecha', 'Disciplina', 'Categoría', 'Tipo de sesión', 'Asistencia', ''].map(
                  (h, i) => (
                    <th key={i} className="px-5 py-3 text-left">
                      <div className="h-3 w-16 bg-gray-200 rounded animate-pulse" />
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="border-b border-gray-50">
                  <td className="px-5 py-3.5">
                    <div className="h-4 w-24 bg-gray-100 rounded animate-pulse" />
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="h-4 w-28 bg-gray-100 rounded animate-pulse" />
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="h-4 w-24 bg-gray-100 rounded animate-pulse" />
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="h-4 w-20 bg-gray-100 rounded animate-pulse" />
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="h-4 w-28 bg-gray-100 rounded animate-pulse" />
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="h-4 w-4 bg-gray-100 rounded animate-pulse ml-auto" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
