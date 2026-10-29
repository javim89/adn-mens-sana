import { Avatar } from 'bioteam-ui';

// Inline SVG stands in for a profile photo (previews render offline).
const FOTO =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><rect width="80" height="80" fill="#c7cbe6"/><circle cx="40" cy="31" r="15" fill="#6f78b8"/><path d="M12 80c3-18 15-27 28-27s25 9 28 27z" fill="#6f78b8"/></svg>',
  );

export const Initials = () => (
  <div className="flex items-center gap-3">
    <Avatar alt="García, Juan" iniciales="JG" />
    <Avatar alt="Pérez, Matías" iniciales="MP" />
    <Avatar alt="López, Tomás" iniciales="TL" />
  </div>
);

export const Sizes = () => (
  <div className="flex items-end gap-3">
    <Avatar alt="García, Juan" iniciales="JG" className="size-8 text-xs" />
    <Avatar alt="García, Juan" iniciales="JG" />
    <Avatar alt="García, Juan" iniciales="JG" className="size-16 text-xl" />
    <Avatar alt="García, Juan" iniciales="JG" className="size-20 text-2xl" />
  </div>
);

export const WithPhoto = () => (
  <div className="flex items-center gap-3">
    <Avatar src={FOTO} alt="García, Juan" iniciales="JG" className="size-16 text-xl" />
    <div>
      <p className="font-semibold text-[#1C1C1C]">García, Juan</p>
      <p className="text-sm text-muted-foreground">Reserva · Mediocampista</p>
    </div>
  </div>
);
