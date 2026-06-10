import Link from 'next/link';
import DeportistaForm from '../_components/DeportistaForm';

export default function NuevoDeportistaPage() {
  return (
    <div className="p-8">
      <div className="mb-2">
        <Link
          href="/deportistas"
          className="text-sm text-[#6B7280] hover:text-[#1C1C1C] transition-colors"
        >
          ← Deportistas
        </Link>
      </div>
      <h1
        className="text-3xl font-bold text-[#121A61] mb-6"
        style={{ fontFamily: 'Oswald, sans-serif' }}
      >
        Nuevo deportista
      </h1>
      <DeportistaForm mode="create" />
    </div>
  );
}
