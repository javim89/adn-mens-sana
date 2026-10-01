import Link from 'next/link';

/** "Texto →" al pie de una card. `claro` para el hero navy. */
export default function LinkPie({
  href,
  children,
  ariaLabel,
  claro = false,
}: {
  href: string;
  children: React.ReactNode;
  ariaLabel?: string;
  claro?: boolean;
}) {
  return (
    <Link
      href={href}
      aria-label={ariaLabel}
      className={`inline-block rounded text-sm font-semibold hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 ${claro ? 'text-white hover:text-white/80 focus-visible:outline-white' : 'text-[#3346CC] hover:text-[#121A61] focus-visible:outline-[#3346CC]'}`}
    >
      {children} →
    </Link>
  );
}
