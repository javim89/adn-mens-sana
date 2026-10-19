import { Label, Input } from 'adn-mens-sana-ui';

export const WithInput = () => (
  <div className="grid w-72 gap-2">
    <Label htmlFor="lb-email">Email del tutor</Label>
    <Input id="lb-email" type="email" placeholder="tutor@ejemplo.com" />
  </div>
);

export const Required = () => (
  <div className="grid w-72 gap-2">
    <Label htmlFor="lb-nac">
      Fecha de nacimiento <span className="text-red-600">*</span>
    </Label>
    <Input id="lb-nac" type="date" />
  </div>
);

export const DisabledPeer = () => (
  <div className="flex items-center gap-2">
    <input id="lb-check" type="checkbox" disabled className="peer size-4" />
    <Label htmlFor="lb-check">Apto médico vigente</Label>
  </div>
);
