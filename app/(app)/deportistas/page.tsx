import { currentUser } from '@clerk/nextjs/server';
import DeportistasTable from './_components/DeportistasTable';

export default async function DeportistasPage() {
  const user = await currentUser();
  const role = String(user?.publicMetadata?.role ?? '');

  return (
    <div className="p-4 md:p-8">
      <DeportistasTable canCreate={role !== 'social'} />
    </div>
  );
}
