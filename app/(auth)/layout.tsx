export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="relative flex min-h-screen w-full items-center justify-center"
      style={{ backgroundImage: "url('/banderas-gimansia.jpg')", backgroundSize: 'cover', backgroundPosition: 'center' }}
    >
      {/* Dark azul marino overlay ~50% opacity */}
      <div className="absolute inset-0 bg-[#121A61]/50" />

      {/* Content above the overlay */}
      <div className="relative z-10 flex w-full flex-col items-center gap-6 px-4 py-12">
        {/* Brand header */}
        <div className="flex flex-col items-center gap-2 text-center">
          <span className="font-[family-name:var(--font-oswald)] text-4xl font-bold tracking-widest text-white uppercase">
            ADN-MENS-SANA
          </span>
          <span className="font-[family-name:var(--font-oswald)] text-base font-normal tracking-widest text-white/80 uppercase">
            Gimnasia y Esgrima de La Plata
          </span>
        </div>

        {children}
      </div>
    </div>
  );
}
