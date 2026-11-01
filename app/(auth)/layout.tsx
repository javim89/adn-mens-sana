import TemaClub from '@/app/components/branding/TemaClub';
import { TEMA_NEUTRO } from '@/lib/branding/tokens';

/**
 * Login genérico (`/sign-in`, `/sign-up`): neutro, sin la marca de un club ni la de
 * BioTeam. Quien ya entró a un club cae en el login con su marca (ver
 * `destinoLoginDelClub`); acá llega quien no tiene club conocido.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-linear-to-br from-primario-hover to-primario">
      <TemaClub tema={TEMA_NEUTRO} />
      <main className="flex w-full flex-col items-center gap-6 px-4 py-12">
        <h1 className="font-[family-name:var(--font-oswald)] text-2xl font-bold text-white">
          Ingresá a tu club
        </h1>
        {children}
      </main>
    </div>
  );
}
