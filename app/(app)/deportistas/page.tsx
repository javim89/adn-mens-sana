import { Search, Plus, ChevronRight } from 'lucide-react';

const deportistas = [
  { id: 1, nombre: 'Matías González', disciplina: 'Fútbol', categoria: 'Juvenil', estado: 'Activo' },
  { id: 2, nombre: 'Lucía Fernández', disciplina: 'Atletismo', categoria: 'Mayor', estado: 'Activo' },
  { id: 3, nombre: 'Carlos Pérez', disciplina: 'Básquet', categoria: 'Cadetes', estado: 'Activo' },
  { id: 4, nombre: 'Ana Torres', disciplina: 'Natación', categoria: 'Mayor', estado: 'Inactivo' },
  { id: 5, nombre: 'Federico Ruiz', disciplina: 'Vóley', categoria: 'Juvenil', estado: 'Activo' },
  { id: 6, nombre: 'Valentina López', disciplina: 'Tenis', categoria: 'Cadetes', estado: 'Activo' },
  { id: 7, nombre: 'Rodrigo Sosa', disciplina: 'Fútbol', categoria: 'Mayor', estado: 'Activo' },
  { id: 8, nombre: 'Martina Díaz', disciplina: 'Natación', categoria: 'Infantil', estado: 'Inactivo' },
];

export default function DeportistasPage() {
  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-3xl font-bold text-[#121A61]" style={{ fontFamily: 'Oswald, sans-serif' }}>
          Deportistas
        </h1>
        <button className="flex items-center gap-2 bg-[#121A61] text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-[#1E2A8A] transition-colors">
          <Plus size={16} />
          Nuevo deportista
        </button>
      </div>
      <p className="text-[#6B7280] mb-6">Gestión del plantel deportivo</p>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280]" />
            <input
              type="text"
              placeholder="Buscar deportista..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3346CC]/30"
            />
          </div>
        </div>

        <table className="w-full">
          <thead>
            <tr className="text-xs uppercase text-[#6B7280] bg-[#F3F4F6] border-b border-gray-100">
              <th className="px-5 py-3 text-left">Nombre</th>
              <th className="px-5 py-3 text-left">Disciplina</th>
              <th className="px-5 py-3 text-left">Categoría</th>
              <th className="px-5 py-3 text-left">Estado</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody>
            {deportistas.map((d) => (
              <tr key={d.id} className="border-b border-gray-50 hover:bg-[#F3F4F6] transition-colors">
                <td className="px-5 py-3.5 text-sm font-medium text-[#1C1C1C]">{d.nombre}</td>
                <td className="px-5 py-3.5 text-sm text-[#6B7280]">{d.disciplina}</td>
                <td className="px-5 py-3.5 text-sm text-[#6B7280]">{d.categoria}</td>
                <td className="px-5 py-3.5">
                  <span className={[
                    'text-xs font-medium px-2.5 py-1 rounded-full',
                    d.estado === 'Activo'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-[#6B7280]',
                  ].join(' ')}>
                    {d.estado}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-right">
                  <ChevronRight size={16} className="text-[#6B7280] ml-auto" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
