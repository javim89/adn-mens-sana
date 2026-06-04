import { Plus, Shield, User } from 'lucide-react';

const usuarios = [
  { id: 1, nombre: 'Laura Méndez', email: 'l.mendez@gimnasia.org.ar', rol: 'Administrador', ultimoAcceso: '2026-06-04' },
  { id: 2, nombre: 'Sergio Blanco', email: 's.blanco@gimnasia.org.ar', rol: 'Médico', ultimoAcceso: '2026-06-03' },
  { id: 3, nombre: 'Patricia Ríos', email: 'p.rios@gimnasia.org.ar', rol: 'Kinesiólogo', ultimoAcceso: '2026-06-04' },
  { id: 4, nombre: 'Gustavo Herrera', email: 'g.herrera@gimnasia.org.ar', rol: 'Entrenador', ultimoAcceso: '2026-06-02' },
  { id: 5, nombre: 'Marcela Vega', email: 'm.vega@gimnasia.org.ar', rol: 'Entrenador', ultimoAcceso: '2026-06-01' },
];

const rolColor: Record<string, string> = {
  Administrador: 'bg-[#121A61] text-white',
  Médico: 'bg-[#3346CC] text-white',
  Kinesiólogo: 'bg-[#1E2A8A] text-white',
  Entrenador: 'bg-[#C9A84C] text-[#1C1C1C]',
};

export default function UsuariosPage() {
  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-3xl font-bold text-[#121A61]" style={{ fontFamily: 'Oswald, sans-serif' }}>
          Usuarios
        </h1>
        <button className="flex items-center gap-2 bg-[#121A61] text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-[#1E2A8A] transition-colors">
          <Plus size={16} />
          Nuevo usuario
        </button>
      </div>
      <p className="text-[#6B7280] mb-6">Gestión de accesos al sistema</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { rol: 'Administrador', count: 1 },
          { rol: 'Médico', count: 1 },
          { rol: 'Kinesiólogo', count: 1 },
          { rol: 'Entrenador', count: 2 },
        ].map(({ rol, count }) => (
          <div key={rol} className="bg-white rounded-xl shadow-sm border border-gray-100 px-5 py-4 flex items-center gap-4">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${rolColor[rol]}`}>
              {rol === 'Administrador' ? <Shield size={18} /> : <User size={18} />}
            </div>
            <div>
              <p className="text-xl font-bold text-[#1C1C1C]">{count}</p>
              <p className="text-xs text-[#6B7280]">{rol}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="text-xs uppercase text-[#6B7280] bg-[#F3F4F6] border-b border-gray-100">
              <th className="px-5 py-3 text-left">Nombre</th>
              <th className="px-5 py-3 text-left">Email</th>
              <th className="px-5 py-3 text-left">Rol</th>
              <th className="px-5 py-3 text-left">Último acceso</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map((u) => (
              <tr key={u.id} className="border-b border-gray-50 hover:bg-[#F3F4F6] transition-colors">
                <td className="px-5 py-3.5 text-sm font-medium text-[#1C1C1C]">{u.nombre}</td>
                <td className="px-5 py-3.5 text-sm text-[#6B7280]">{u.email}</td>
                <td className="px-5 py-3.5">
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${rolColor[u.rol]}`}>
                    {u.rol}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-sm text-[#6B7280]">{u.ultimoAcceso}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
