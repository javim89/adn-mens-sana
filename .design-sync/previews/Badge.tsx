import { Badge } from 'bioteam-ui';

export const Variants = () => (
  <div className="flex flex-wrap items-center gap-2">
    <Badge>Titular</Badge>
    <Badge variant="secondary">Suplente</Badge>
    <Badge variant="destructive">Lesionado</Badge>
    <Badge variant="outline">Reserva</Badge>
  </div>
);

export const Triage = () => (
  <div className="flex flex-wrap items-center gap-2">
    <Badge className="border-transparent bg-green-100 text-green-800">Verde</Badge>
    <Badge className="border-transparent bg-yellow-100 text-yellow-800">Amarillo</Badge>
    <Badge className="border-transparent bg-orange-100 text-orange-800">Naranja</Badge>
    <Badge className="border-transparent bg-red-100 text-red-800">Rojo</Badge>
  </div>
);

export const Club = () => (
  <div className="flex flex-wrap items-center gap-2">
    <Badge className="border-transparent bg-[#C9A84C] text-[#121A61]">Histórico</Badge>
    <Badge className="border-transparent bg-[#EEF0FB] text-[#121A61]">+4 pts</Badge>
  </div>
);
