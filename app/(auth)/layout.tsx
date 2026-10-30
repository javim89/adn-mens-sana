import LogoBioTeam from '@/app/components/LogoBioTeam';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-linear-to-br from-primario-hover to-primario">
      <div className="flex w-full flex-col items-center gap-6 px-4 py-12">
        {/* Marca */}
        <div className="flex items-center gap-3 text-center">
          <LogoBioTeam variante="inverso" className="h-12" eager />
          <span className="font-[family-name:var(--font-oswald)] text-4xl font-bold tracking-widest text-white uppercase">
            BioTeam
          </span>
        </div>

        {children}
      </div>
    </div>
  );
}
