import Link from 'next/link';

export default function DeportistaNotFound() {
  return (
    <div className="p-8 flex flex-col items-center justify-center min-h-64 text-center">
      <h1
        className="text-3xl font-bold text-primario mb-2"
        style={{ fontFamily: 'Oswald, sans-serif' }}
      >
        Deportista no encontrado
      </h1>
      <p className="text-muted-foreground mb-6">
        El deportista que buscás no existe o fue eliminado.
      </p>
      <Link
        href="/deportistas"
        className="text-sm bg-primario text-white px-4 py-2 rounded-lg hover:bg-primario-hover transition-colors"
      >
        Volver a la lista
      </Link>
    </div>
  );
}
