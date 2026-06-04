import { Plus, Clock, CheckCircle, XCircle } from 'lucide-react';

const turnos = [
  { id: 1, deportista: 'Carlos Pérez', disciplina: 'Básquet', fecha: '2026-06-04', hora: '09:00', estado: 'Confirmado', profesional: 'Dr. Álvarez' },
  { id: 2, deportista: 'Ana Torres', disciplina: 'Natación', fecha: '2026-06-04', hora: '10:30', estado: 'Pendiente', profesional: 'Lic. García' },
  { id: 3, deportista: 'Lucía Fernández', disciplina: 'Atletismo', fecha: '2026-06-04', hora: '12:00', estado: 'Confirmado', profesional: 'Dr. Álvarez' },
  { id: 4, deportista: 'Rodrigo Sosa', disciplina: 'Fútbol', fecha: '2026-06-05', hora: '09:00', estado: 'Pendiente', profesional: 'Lic. Romero' },
  { id: 5, deportista: 'Valentina López', disciplina: 'Tenis', fecha: '2026-06-05', hora: '11:00', estado: 'Cancelado', profesional: 'Dr. Álvarez' },
  { id: 6, deportista: 'Federico Ruiz', disciplina: 'Vóley', fecha: '2026-06-06', hora: '14:00', estado: 'Confirmado', profesional: 'Lic. García' },
];

const estadoConfig: Record<string, { label: string; icon: React.ElementType; cls: string }> = {
  Confirmado: { label: 'Confirmado', icon: CheckCircle, cls: 'bg-green-100 text-green-700' },
  Pendiente:  { label: 'Pendiente',  icon: Clock,        cls: 'bg-yellow-100 text-yellow-700' },
  Cancelado:  { label: 'Cancelado',  icon: XCircle,      cls: 'bg-red-100 text-red-600' },
};

export default function TurnosPage() {
  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-3xl font-bold text-[#121A61]" style={{ fontFamily: 'Oswald, sans-serif' }}>
          Turnos
        </h1>
        <button className="flex items-center gap-2 bg-[#121A61] text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-[#1E2A8A] transition-colors">
          <Plus size={16} />
          Nuevo turno
        </button>
      </div>
      <p className="text-[#6B7280] mb-6">Agenda de evaluaciones y seguimiento</p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Confirmados', count: 3, color: 'border-l-green-500' },
          { label: 'Pendientes', count: 2, color: 'border-l-yellow-400' },
          { label: 'Cancelados', count: 1, color: 'border-l-red-400' },
        ].map((s) => (
          <div key={s.label} className={`bg-white rounded-xl shadow-sm border border-gray-100 border-l-4 ${s.color} px-5 py-4`}>
            <p className="text-2xl font-bold text-[#1C1C1C]">{s.count}</p>
            <p className="text-sm text-[#6B7280]">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="text-xs uppercase text-[#6B7280] bg-[#F3F4F6] border-b border-gray-100">
              <th className="px-5 py-3 text-left">Deportista</th>
              <th className="px-5 py-3 text-left">Disciplina</th>
              <th className="px-5 py-3 text-left">Fecha</th>
              <th className="px-5 py-3 text-left">Hora</th>
              <th className="px-5 py-3 text-left">Profesional</th>
              <th className="px-5 py-3 text-left">Estado</th>
            </tr>
          </thead>
          <tbody>
            {turnos.map((t) => {
              const cfg = estadoConfig[t.estado];
              const Icon = cfg.icon;
              return (
                <tr key={t.id} className="border-b border-gray-50 hover:bg-[#F3F4F6] transition-colors">
                  <td className="px-5 py-3.5 text-sm font-medium text-[#1C1C1C]">{t.deportista}</td>
                  <td className="px-5 py-3.5 text-sm text-[#6B7280]">{t.disciplina}</td>
                  <td className="px-5 py-3.5 text-sm text-[#6B7280]">{t.fecha}</td>
                  <td className="px-5 py-3.5 text-sm text-[#6B7280]">{t.hora}hs</td>
                  <td className="px-5 py-3.5 text-sm text-[#6B7280]">{t.profesional}</td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${cfg.cls}`}>
                      <Icon size={12} />
                      {cfg.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
