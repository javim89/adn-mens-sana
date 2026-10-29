export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-linear-to-br from-[#1E2A8A] to-[#121A61]">
      <div className="flex w-full flex-col items-center gap-6 px-4 py-12">
        {/* Marca */}
        <div className="flex flex-col items-center gap-2 text-center">
          <span className="font-[family-name:var(--font-oswald)] text-4xl font-bold tracking-widest text-white uppercase">
            BioTeam
          </span>
        </div>

        {children}
      </div>
    </div>
  );
}
