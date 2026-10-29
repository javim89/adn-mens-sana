import LogoBioTeam from '@/app/components/LogoBioTeam';

/**
 * La marca del producto: el ícono de BioTeam + el wordmark en Oswald. No usa `/logo.png`,
 * que es el escudo de un club cliente, no el producto.
 */
export default function Wordmark({ sobreOscuro = false }: { sobreOscuro?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <LogoBioTeam variante={sobreOscuro ? 'inverso' : 'normal'} className="h-7" eager={!sobreOscuro} />
      <span
        className={`whitespace-nowrap font-[family-name:var(--font-oswald)] text-xl font-bold uppercase tracking-wide ${sobreOscuro ? 'text-white' : 'text-[#121A61]'}`}
      >
        BioTeam
      </span>
    </span>
  );
}
