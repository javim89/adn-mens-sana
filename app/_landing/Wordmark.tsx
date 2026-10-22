/**
 * La marca del producto: solo texto, en Oswald. No usa `/logo.png`, que es el escudo de
 * Gimnasia (un club cliente, no el producto).
 */
export default function Wordmark({ sobreOscuro = false }: { sobreOscuro?: boolean }) {
  return (
    <span
      className={`whitespace-nowrap font-[family-name:var(--font-oswald)] text-xl font-bold uppercase tracking-wide ${sobreOscuro ? 'text-white' : 'text-[#121A61]'}`}
    >
      ADN Mens Sana
    </span>
  );
}
