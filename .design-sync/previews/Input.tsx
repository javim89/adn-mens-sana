import { Input, Label, Icons } from 'adn-mens-sana-ui';

export const Default = () => (
  <div className="grid w-72 gap-3">
    <Input placeholder="Apellido y nombre" />
    <Input defaultValue="García, Juan" />
  </div>
);

export const WithLabel = () => (
  <div className="grid w-72 gap-2">
    <Label htmlFor="in-dni">DNI</Label>
    <Input id="in-dni" inputMode="numeric" defaultValue="45.123.678" />
    <p className="text-xs text-muted-foreground">Sin puntos ni espacios.</p>
  </div>
);

export const WithIcon = () => (
  <div className="relative w-72">
    <Icons.Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-[#6B7280]" />
    <Input className="pl-8" placeholder="Buscar deportista…" />
  </div>
);

export const Types = () => (
  <div className="grid w-72 gap-3">
    <Input type="date" defaultValue="2026-10-24" />
    <Input type="number" defaultValue={72} />
    <Input type="file" />
  </div>
);

export const Disabled = () => (
  <div className="w-72">
    <Input disabled defaultValue="Categoría bloqueada" />
  </div>
);
