'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { EncabezadoPagina } from '@/app/components/ui/encabezado-pagina';
import type { Usuario } from '@/lib/types/usuarios';
import UsuariosTable from './UsuariosTable';
import InvitarUsuarioModal from './InvitarUsuarioModal';

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
  const total = usuarios.length;

  return (
    <div className="p-4 md:p-8">
      <EncabezadoPagina
        titulo="Usuarios"
        contador={total}
        contadorLabel={`${total} ${total === 1 ? 'usuario' : 'usuarios'}`}
        subtitulo="Quién tiene acceso al club, con qué rol y cuándo entró por última vez."
        accion={
          isAdmin && (
            <Button onClick={() => setIsModalOpen(true)}>
              <Plus aria-hidden />
              Invitar usuario
            </Button>
          )
        }
        className="mb-6"
      />

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
