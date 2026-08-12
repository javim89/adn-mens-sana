export default function ConvocatoriasLoading() {
  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
        <div className="h-9 w-48 bg-gray-200 rounded animate-pulse" />
        <div className="h-9 w-48 bg-gray-200 rounded animate-pulse" />
      </div>
      <div className="h-4 w-72 bg-gray-100 rounded animate-pulse mb-6" />

      <div className="flex flex-wrap gap-3 mb-4">
        <div className="h-9 w-44 bg-gray-100 rounded animate-pulse" />
        <div className="h-9 w-40 bg-gray-100 rounded animate-pulse" />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[#F3F4F6] border-b border-gray-100">
                {['Fecha', 'Disciplina', 'Categoría', 'Convocados', ''].map((h, i) => (
                  <th key={i} className="px-5 py-3 text-left">
                    <div className="h-3 w-16 bg-gray-200 rounded animate-pulse" />
                  </th>
                ))}
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
