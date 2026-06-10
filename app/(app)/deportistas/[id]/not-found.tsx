import Link from 'next/link';

export default function DeportistaNotFound() {
  return (
    <div className="p-8 flex flex-col items-center justify-center min-h-64 text-center">
      <h1
        className="text-3xl font-bold text-[#121A61] mb-2"
        style={{ fontFamily: 'Oswald, sans-serif' }}
      >
        Deportista no encontrado
      </h1>
      <p className="text-[#6B7280] mb-6">
        El deportista que buscás no existe o fue eliminado.
      </p>
      <Link
        href="/deportistas"
        className="text-sm bg-[#121A61] text-white px-4 py-2 rounded-lg hover:bg-[#1E2A8A] transition-colors"
      >
        Volver a la lista
      </Link>
    </div>
  );
}
