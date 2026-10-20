import { Button, Icons } from 'adn-mens-sana-ui';

export const Variants = () => (
  <div className="flex flex-wrap items-center gap-3">
    <Button>Guardar cambios</Button>
    <Button variant="secondary">Borrador</Button>
    <Button variant="outline">Cancelar</Button>
    <Button variant="destructive">Eliminar</Button>
    <Button variant="ghost">Ver más</Button>
    <Button variant="link">Ir al legajo</Button>
  </div>
);

export const Sizes = () => (
  <div className="flex flex-wrap items-center gap-3">
    <Button size="sm">Chico</Button>
    <Button>Mediano</Button>
    <Button size="lg">Grande</Button>
    <Button size="icon" aria-label="Agregar">
      <Icons.Plus />
    </Button>
  </div>
);

export const WithIcon = () => (
  <div className="flex flex-wrap items-center gap-3">
    <Button>
      <Icons.UserPlus /> Nuevo deportista
    </Button>
    <Button variant="outline">
      <Icons.Download /> Exportar
    </Button>
    <Button
      variant="ghost"
      size="icon"
      className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
      aria-label="Eliminar"
    >
      <Icons.Trash2 />
    </Button>
  </div>
);

export const Disabled = () => (
  <div className="flex flex-wrap items-center gap-3">
    <Button disabled>Guardando…</Button>
    <Button variant="outline" disabled>
      Cancelar
    </Button>
  </div>
);
