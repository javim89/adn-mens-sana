'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import UsuariosTable from './UsuariosTable';
import InvitarUsuarioModal from './InvitarUsuarioModal';
import type { Usuario } from '@/lib/types/usuarios';

interface UsuariosPageClientProps {
  usuarios: Usuario[];
  /** Rol del usuario logueado en el club activo. */
  rol: string;
  currentUserId: string;
}

export default function UsuariosPageClient({ usuarios, rol, currentUserId }: UsuariosPageClientProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const router = useRouter();
  const isAdmin = rol === 'admin';

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
        <h1
          className="text-3xl font-bold text-primario font-['Oswald',sans-serif]"
        >
          Usuarios
        </h1>
        {isAdmin && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-primario text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-primario-hover transition-colors shrink-0"
          >
            <Plus size={16} />
            Nuevo usuario
          </button>
        )}
      </div>
      <p className="text-muted-foreground mb-6">Gestión de accesos al sistema</p>

      <UsuariosTable usuarios={usuarios} rol={rol} currentUserId={currentUserId} />

      <InvitarUsuarioModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          setIsModalOpen(false);
          router.refresh();
        }}
      />
    </div>
  );
}
