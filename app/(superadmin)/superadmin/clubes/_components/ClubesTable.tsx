'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { LogIn, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { entrarAClub, setClubActivo, type ClubListado } from '@/lib/actions/superadmin';
import ConfirmarAccionModal from '@/app/(app)/usuarios/ConfirmarAccionModal';

const BOTON =
  'inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white text-[#1C1C1C] hover:bg-[#F3F4F6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3346CC]/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed';

function EstadoBadge({ activo }: { activo: boolean }) {
  return activo ? (
    <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-green-100 text-green-700">Activo</span>
  ) : (
    <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-red-100 text-red-700">Inactivo</span>
  );
}

export default function ClubesTable({ clubes }: { clubes: ClubListado[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pendienteId, setPendienteId] = useState<string | null>(null);
  const [aDesactivar, setADesactivar] = useState<ClubListado | null>(null);

  function entrar(club: ClubListado) {
    setPendienteId(club.id);
    startTransition(async () => {
      // Con éxito la action redirige a /dashboard y no vuelve.
      const resultado = await entrarAClub(club.id);
      if (resultado && !resultado.ok) toast.error(resultado.error);
      setPendienteId(null);
    });
  }

  function cambiarEstado(club: ClubListado, activo: boolean) {
    setPendienteId(club.id);
    startTransition(async () => {
      const resultado = await setClubActivo(club.id, activo);
      if (resultado.ok) {
        toast.success(activo ? 'Club activado' : 'Club desactivado');
        setADesactivar(null);
        router.refresh();
      } else {
        toast.error(resultado.error);
      }
      setPendienteId(null);
    });
  }

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-xs uppercase text-[#6B7280] bg-[#F3F4F6] border-b border-gray-100">
                <th className="px-4 py-3 text-left">Club</th>
                <th className="px-4 py-3 text-left">Estado</th>
                <th className="px-4 py-3 text-right">Miembros</th>
                <th className="px-4 py-3 text-right">Deportistas</th>
                <th className="px-4 py-3 text-left">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {clubes.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-sm text-[#6B7280]">
                    Todavía no hay clubes
                  </td>
                </tr>
              ) : (
                clubes.map((club) => {
                  const ocupado = isPending && pendienteId === club.id;
                  return (
                    <tr key={club.id} className="border-b border-gray-50 hover:bg-[#F3F4F6] transition-colors">
                      <td className="px-4 py-3.5">
                        <p className="text-sm font-medium text-[#1C1C1C]">{club.nombre}</p>
                        <p className="text-xs text-[#6B7280]">{club.slug}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <EstadoBadge activo={club.activo} />
                      </td>
                      <td className="px-4 py-3.5 text-right text-sm tabular-nums">{club.miembros}</td>
                      <td className="px-4 py-3.5 text-right text-sm tabular-nums">{club.deportistas}</td>
                      <td className="px-4 py-3.5">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => entrar(club)}
                            disabled={!club.activo || isPending}
                            aria-label={`Entrar a ${club.nombre}`}
                            className={BOTON}
                          >
                            {ocupado ? <Loader2 size={14} className="animate-spin" /> : <LogIn size={14} />}
                            Entrar
                          </button>
                          {club.activo ? (
                            <button
                              type="button"
                              onClick={() => setADesactivar(club)}
                              disabled={isPending}
                              aria-label={`Desactivar ${club.nombre}`}
                              className={`${BOTON} text-red-600 hover:bg-red-50`}
                            >
                              Desactivar
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => cambiarEstado(club, true)}
                              disabled={isPending}
                              aria-label={`Activar ${club.nombre}`}
                              className={BOTON}
                            >
                              Activar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmarAccionModal
        open={aDesactivar !== null}
        title="Desactivar club"
        description={`¿Seguro que querés desactivar ${aDesactivar?.nombre ?? ''}? Sus miembros no van a poder entrar hasta que lo actives de nuevo. Los datos no se borran.`}
        confirmLabel="Desactivar"
        isPending={isPending}
        danger
        onConfirm={() => aDesactivar && cambiarEstado(aDesactivar, false)}
        onCancel={() => setADesactivar(null)}
      />
    </>
  );
}
