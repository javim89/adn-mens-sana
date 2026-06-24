'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { useUser } from '@clerk/nextjs';
import UsuariosTable from './UsuariosTable';
import InvitarUsuarioModal from './InvitarUsuarioModal';
import type { Usuario } from '@/lib/types/usuarios';

interface UsuariosPageClientProps {
  usuarios: Usuario[];
}

export default function UsuariosPageClient({ usuarios }: UsuariosPageClientProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const isAdmin = isLoaded && user?.publicMetadata?.role === 'admin';

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
        <h1
          className="text-3xl font-bold text-[#121A61] font-['Oswald',sans-serif]"
        >
          Usuarios
        </h1>
        {isAdmin && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-[#121A61] text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-[#1E2A8A] transition-colors shrink-0"
          >
            <Plus size={16} />
            Nuevo usuario
          </button>
        )}
      </div>
      <p className="text-[#6B7280] mb-6">Gestión de accesos al sistema</p>

      <UsuariosTable usuarios={usuarios} />

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
