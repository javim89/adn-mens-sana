import { Select, SelectTrigger, SelectValue, SelectContent, SelectGroup, SelectLabel, SelectItem, SelectSeparator } from 'bioteam-ui';

export const Closed = () => (
  <div className="w-64">
    <Select defaultValue="reserva">
      <SelectTrigger>
        <SelectValue placeholder="Elegí una categoría" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="primera">Primera</SelectItem>
        <SelectItem value="reserva">Reserva</SelectItem>
        <SelectItem value="cuarta">4ta división</SelectItem>
      </SelectContent>
    </Select>
  </div>
);

export const Placeholder = () => (
  <div className="w-64">
    <Select>
      <SelectTrigger>
        <SelectValue placeholder="Elegí una categoría" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="primera">Primera</SelectItem>
      </SelectContent>
    </Select>
  </div>
);

export const Open = () => (
  <div className="w-64 h-72">
    <Select defaultValue="reserva" defaultOpen>
      <SelectTrigger>
        <SelectValue placeholder="Elegí una categoría" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Fútbol profesional</SelectLabel>
          <SelectItem value="primera">Primera</SelectItem>
          <SelectItem value="reserva">Reserva</SelectItem>
        </SelectGroup>
        <SelectSeparator />
        <SelectGroup>
          <SelectLabel>Formativas</SelectLabel>
          <SelectItem value="cuarta">4ta división</SelectItem>
          <SelectItem value="quinta">5ta división</SelectItem>
          <SelectItem value="sexta" disabled>6ta división</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  </div>
);

export const Disabled = () => (
  <div className="w-64">
    <Select disabled defaultValue="primera">
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="primera">Primera</SelectItem>
      </SelectContent>
    </Select>
  </div>
);
