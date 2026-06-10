export default function DeportistasLoading() {
  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-1">
        <div className="h-9 w-48 bg-gray-200 rounded animate-pulse" />
        <div className="h-9 w-40 bg-gray-200 rounded animate-pulse" />
      </div>
      <div className="h-4 w-64 bg-gray-100 rounded animate-pulse mb-6" />

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <div className="h-9 w-full bg-gray-100 rounded animate-pulse" />
        </div>

        <table className="w-full">
          <thead>
            <tr className="bg-[#F3F4F6] border-b border-gray-100">
              {['Nombre', 'DNI', 'Disciplina', 'Categoría', 'Estado', 'Ingreso', ''].map((h) => (
                <th key={h} className="px-5 py-3 text-left">
                  <div className="h-3 w-16 bg-gray-200 rounded animate-pulse" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 8 }).map((_, i) => (
              <tr key={i} className="border-b border-gray-50">
                <td className="px-5 py-3.5">
                  <div className="h-4 w-36 bg-gray-100 rounded animate-pulse" />
                </td>
                <td className="px-5 py-3.5">
                  <div className="h-4 w-20 bg-gray-100 rounded animate-pulse" />
                </td>
                <td className="px-5 py-3.5">
                  <div className="h-4 w-24 bg-gray-100 rounded animate-pulse" />
                </td>
                <td className="px-5 py-3.5">
                  <div className="h-4 w-20 bg-gray-100 rounded animate-pulse" />
                </td>
                <td className="px-5 py-3.5">
                  <div className="h-5 w-16 bg-gray-100 rounded-full animate-pulse" />
                </td>
                <td className="px-5 py-3.5">
                  <div className="h-4 w-24 bg-gray-100 rounded animate-pulse" />
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
  );
}
