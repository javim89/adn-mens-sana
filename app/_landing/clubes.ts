/**
 * Los clubes que usan ADN Mens Sana, para la franja "Clubes que confían en nosotros".
 *
 * Solo clubes reales que usan el producto: no se agregan escudos de ejemplo. Con uno
 * la franja se centra; si la lista crece, puede pasar a un marquee.
 */
export interface Club {
  nombre: string;
  /** Escudo en `/public`. */
  escudo: string;
  /** El `alt` del escudo: "Escudo de <nombre>". */
  alt: string;
}

export const CLUBES: Club[] = [
  {
    nombre: 'Club de Gimnasia y Esgrima La Plata',
    escudo: '/logo.png',
    alt: 'Escudo de Club de Gimnasia y Esgrima La Plata',
  },
];
