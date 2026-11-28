import type { Metadata } from 'next';
import { Suspense } from 'react';
import { getUsuarios } from '@/lib/actions/usuarios';
import { requireContexto } from '@/lib/tenant/contexto';
import UsuariosPageClient from './UsuariosPageClient';

export const metadata: Metadata = { title: 'Usuarios' };

async function UsuariosContent() {
  const { rol, userId } = await requireContexto(['admin']);
  const usuarios = await getUsuarios();
  return <UsuariosPageClient usuarios={usuarios} rol={rol} currentUserId={userId} />;
}

function UsuariosSkeleton() {
  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
        <div className="h-9 w-40 bg-gray-200 rounded animate-pulse" />
        <div className="h-9 w-36 bg-gray-200 rounded-lg animate-pulse" />
      </div>
      <div className="h-4 w-56 bg-gray-100 rounded mb-6 animate-pulse" />
      <div className="bg-white rounded-xl shadow-sm border border-border overflow-hidden">
        <div className="h-10 bg-muted border-b border-border" />
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-border">
            <div className="size-9 shrink-0 bg-gray-100 rounded-full animate-pulse" />
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <div className="h-4 w-36 max-w-full bg-gray-100 rounded animate-pulse" />
              <div className="h-3 w-48 max-w-full bg-gray-100 rounded animate-pulse" />
            </div>
            <div className="hidden sm:block h-6 w-24 bg-gray-100 rounded-lg animate-pulse" />
            <div className="h-6 w-16 bg-gray-100 rounded-full animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function UsuariosPage() {
  return (
    <Suspense fallback={<UsuariosSkeleton />}>
      <UsuariosContent />
    </Suspense>
  );
}
