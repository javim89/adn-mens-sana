import { Suspense } from 'react';
import { getUsuarios } from '@/lib/actions/usuarios';
import UsuariosPageClient from './UsuariosPageClient';

async function UsuariosContent() {
  const usuarios = await getUsuarios();
  return <UsuariosPageClient usuarios={usuarios} />;
}

function UsuariosSkeleton() {
  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-1">
        <div className="h-9 w-40 bg-gray-200 rounded animate-pulse" />
        <div className="h-9 w-36 bg-gray-200 rounded-lg animate-pulse" />
      </div>
      <div className="h-4 w-56 bg-gray-100 rounded mb-6 animate-pulse" />
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="h-10 bg-[#F3F4F6] border-b border-gray-100" />
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex gap-4 px-5 py-3.5 border-b border-gray-50">
            <div className="h-4 w-36 bg-gray-100 rounded animate-pulse" />
            <div className="h-4 w-48 bg-gray-100 rounded animate-pulse" />
            <div className="h-4 w-20 bg-gray-100 rounded-full animate-pulse" />
            <div className="h-4 w-24 bg-gray-100 rounded animate-pulse" />
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
