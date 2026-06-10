import { getDeportistas } from '@/lib/queries/deportistas';
import type { Disciplina, Categoria, EstadoDeportista } from '@/lib/generated/prisma/enums';
import DeportistasTable from './_components/DeportistasTable';

type SearchParams = {
  search?: string;
  disciplina?: string;
  categoria?: string;
  estado?: string;
  page?: string;
};

export default async function DeportistasPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;

  const { deportistas, total, page, pageSize } = await getDeportistas({
    search: params.search,
    disciplina: params.disciplina as Disciplina | undefined,
    categoria: params.categoria as Categoria | undefined,
    estado: params.estado as EstadoDeportista | undefined,
    page: params.page ? Number(params.page) : 1,
  });

  return (
    <div className="p-8">
      <DeportistasTable
        deportistas={deportistas}
        total={total}
        page={page}
        pageSize={pageSize}
        filters={{
          search: params.search,
          disciplina: params.disciplina,
          categoria: params.categoria,
          estado: params.estado,
        }}
      />
    </div>
  );
}
