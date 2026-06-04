import { LayoutDashboard, Users, CalendarDays, TrendingUp } from 'lucide-react';

const stats = [
  { label: 'Deportistas activos', value: '248', icon: Users, color: 'bg-[#121A61]' },
  { label: 'Turnos este mes', value: '134', icon: CalendarDays, color: 'bg-[#1E2A8A]' },
  { label: 'Nuevos registros', value: '17', icon: TrendingUp, color: 'bg-[#3346CC]' },
  { label: 'Usuarios del sistema', value: '12', icon: LayoutDashboard, color: 'bg-[#C9A84C]' },
];

export default function DashboardPage() {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-[#121A61] mb-1" style={{ fontFamily: 'Oswald, sans-serif' }}>
        Dashboard
      </h1>
      <p className="text-[#6B7280] mb-8">Resumen general del sistema</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className={`${color} px-5 py-4 flex items-center justify-between`}>
              <Icon size={22} className="text-white/80" />
              <span className="text-2xl font-bold text-white">{value}</span>
            </div>
            <div className="px-5 py-3">
              <p className="text-sm text-[#6B7280]">{label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-[#121A61] mb-4" style={{ fontFamily: 'Oswald, sans-serif' }}>
            Actividad reciente
          </h2>
          <ul className="space-y-3">
            {['Matías González inscripto en Fútbol', 'Turno cancelado — Natación 10:00hs', 'Nuevo usuario: Laura Méndez', 'Actualización de datos — Federico Ruiz'].map((item) => (
              <li key={item} className="flex items-center gap-3 text-sm text-[#1C1C1C]">
                <span className="w-2 h-2 rounded-full bg-[#3346CC] shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-[#121A61] mb-4" style={{ fontFamily: 'Oswald, sans-serif' }}>
            Próximos turnos
          </h2>
          <ul className="space-y-3">
            {[
              { nombre: 'Carlos Pérez', disciplina: 'Básquet', hora: '09:00hs' },
              { nombre: 'Ana Torres', disciplina: 'Natación', hora: '10:30hs' },
              { nombre: 'Lucía Fernández', disciplina: 'Atletismo', hora: '12:00hs' },
              { nombre: 'Rodrigo Sosa', disciplina: 'Fútbol', hora: '14:00hs' },
            ].map((t) => (
              <li key={t.nombre} className="flex items-center justify-between text-sm">
                <span className="text-[#1C1C1C] font-medium">{t.nombre}</span>
                <span className="text-[#6B7280]">{t.disciplina} · {t.hora}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
