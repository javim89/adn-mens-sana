// Shared compositions for sub-part previews: a sub-part (DialogTitle,
// SelectItem, CardHeader...) only renders truthfully inside its parent, so
// each sub-part card reuses the same verified parent composition.
import {
  Badge, Button, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle,
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator, CommandShortcut,
  Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
  DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
  Icons, Input, Label,
  Popover, PopoverContent, PopoverTrigger,
  Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectSeparator, SelectTrigger, SelectValue,
  Tabs, TabsContent, TabsList, TabsTrigger,
} from 'adn-mens-sana-ui';

export const ConfirmDialog = () => (
  <Dialog open>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>¿Eliminar seguimiento?</DialogTitle>
        <DialogDescription>
          Se va a borrar el seguimiento psicológico de García, Juan. Esta acción no se puede deshacer.
        </DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button variant="outline">Cancelar</Button>
        <Button variant="destructive">Eliminar</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

export const FormDialog = () => (
  <Dialog open>
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle className="font-[family-name:var(--font-oswald)] text-[#121A61] text-xl">Nuevo turno</DialogTitle>
        <DialogDescription>Agendá una consulta con el cuerpo médico.</DialogDescription>
      </DialogHeader>
      <div className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="dlg-deportista">Deportista</Label>
          <Input id="dlg-deportista" defaultValue="Pérez, Matías" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="dlg-fecha">Fecha</Label>
          <Input id="dlg-fecha" type="date" defaultValue="2026-10-24" />
        </div>
      </div>
      <DialogFooter>
        <DialogClose asChild>
          <Button variant="outline">Cancelar</Button>
        </DialogClose>
        <Button>Guardar turno</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

export const DialogWithTrigger = () => (
  <Dialog>
    <DialogTrigger asChild>
      <Button>
        <Icons.CalendarPlus /> Nuevo turno
      </Button>
    </DialogTrigger>
    <DialogContent>
      <DialogTitle>Nuevo turno</DialogTitle>
    </DialogContent>
  </Dialog>
);

export const OpenMenu = () => (
  <div className="flex h-64 justify-end pr-24">
    <DropdownMenu defaultOpen modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" aria-label="Acciones">
          <Icons.MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Tablero</DropdownMenuLabel>
        <DropdownMenuGroup>
          <DropdownMenuItem>
            <Icons.Pencil className="size-4" /> Renombrar
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Icons.Copy className="size-4" /> Duplicar
          </DropdownMenuItem>
          <DropdownMenuItem disabled>
            <Icons.Share2 className="size-4" /> Compartir
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-red-600 focus:bg-red-50">
          <Icons.Trash2 className="size-4" /> Eliminar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
);

export const MenuTrigger = () => (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button variant="outline">
        Opciones <Icons.ChevronDown />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent>
      <DropdownMenuItem>Editar</DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
);

export const OpenPopover = () => (
  <div className="h-60">
    <Popover defaultOpen modal={false}>
      <PopoverTrigger asChild>
        <Button variant="outline">
          <Icons.Filter /> Filtros
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start">
        <div className="grid gap-3">
          <div>
            <h4 className="font-semibold leading-none text-[#121A61]">Filtrar plantel</h4>
            <p className="mt-1 text-sm text-muted-foreground">Mostrá solo los deportistas que coinciden.</p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="pop-nombre">Nombre</Label>
            <Input id="pop-nombre" placeholder="Buscar por apellido" />
          </div>
          <Button size="sm">Aplicar</Button>
        </div>
      </PopoverContent>
    </Popover>
  </div>
);

export const PopoverClosed = () => (
  <Popover>
    <PopoverTrigger asChild>
      <Button variant="outline">
        <Icons.Info /> Ver detalle
      </Button>
    </PopoverTrigger>
    <PopoverContent>Detalle</PopoverContent>
  </Popover>
);

export const PlayerSearch = () => (
  <Command className="max-w-sm rounded-lg border shadow-md">
    <CommandInput placeholder="Buscar deportista o sección…" />
    <CommandList>
      <CommandEmpty>Sin resultados.</CommandEmpty>
      <CommandGroup heading="Deportistas">
        <CommandItem>
          <Icons.User /> García, Juan <CommandShortcut>Reserva</CommandShortcut>
        </CommandItem>
        <CommandItem>
          <Icons.User /> Pérez, Matías <CommandShortcut>4ta</CommandShortcut>
        </CommandItem>
        <CommandItem disabled>
          <Icons.User /> López, Tomás <CommandShortcut>Baja</CommandShortcut>
        </CommandItem>
      </CommandGroup>
      <CommandSeparator />
      <CommandGroup heading="Secciones">
        <CommandItem>
          <Icons.CalendarDays /> Calendario <CommandShortcut>⌘K</CommandShortcut>
        </CommandItem>
        <CommandItem>
          <Icons.ClipboardList /> Seguimientos
        </CommandItem>
      </CommandGroup>
    </CommandList>
  </Command>
);

export const SearchNoResults = () => (
  <Command className="max-w-sm rounded-lg border shadow-md">
    <CommandInput value="Riquelme" onValueChange={() => {}} />
    <CommandList>
      <CommandEmpty>No encontramos deportistas con ese nombre.</CommandEmpty>
      <CommandGroup heading="Deportistas">
        <CommandItem>García, Juan</CommandItem>
        <CommandItem>Pérez, Matías</CommandItem>
      </CommandGroup>
    </CommandList>
  </Command>
);

export const OpenSelect = () => (
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

const DIVISIONES = ['Primera', 'Reserva', '4ta', '5ta', '6ta', '7ma', '8va', '9na', 'Pre-novena', 'Infantiles', 'Femenino', 'Futsal'];
export const LongSelect = () => (
  <div className="w-64 h-80">
    <Select defaultValue="infantiles" defaultOpen>
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="max-h-56">
        {DIVISIONES.map((d) => (
          <SelectItem key={d} value={d.toLowerCase()}>{d}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
);

export const ClosedSelect = () => (
  <div className="grid w-64 gap-3">
    <Select defaultValue="reserva">
      <SelectTrigger>
        <SelectValue placeholder="Elegí una categoría" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="reserva">Reserva</SelectItem>
      </SelectContent>
    </Select>
    <Select>
      <SelectTrigger>
        <SelectValue placeholder="Elegí una categoría" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="reserva">Reserva</SelectItem>
      </SelectContent>
    </Select>
  </div>
);

export const SquadCard = () => (
  <Card className="max-w-sm">
    <CardHeader>
      <CardTitle className="text-[#121A61]">Plantel Reserva</CardTitle>
      <CardDescription>32 deportistas activos · Temporada 2026</CardDescription>
    </CardHeader>
    <CardContent>
      <p className="text-sm text-[#1C1C1C]">
        Próximo partido: sábado 24 de octubre vs. Estudiantes, 15:30 hs en el Bosque.
      </p>
    </CardContent>
    <CardFooter className="gap-2">
      <Button size="sm">Ver plantel</Button>
      <Button size="sm" variant="outline">Convocatoria</Button>
    </CardFooter>
  </Card>
);

export const CompactCardHeader = () => (
  <Card className="max-w-sm">
    <CardHeader className="flex-row items-center justify-between space-y-0 p-4 pb-2">
      <CardTitle className="text-base text-[#121A61]">Nutrición</CardTitle>
      <Badge variant="outline">3 alertas</Badge>
    </CardHeader>
    <CardContent className="p-4 pt-2 text-sm text-muted-foreground">
      Último control antropométrico: 12/10/2026.
    </CardContent>
  </Card>
);

export const ProfileTabs = () => (
  <Tabs defaultValue="resumen" className="w-[420px]">
    <TabsList>
      <TabsTrigger value="resumen">Resumen</TabsTrigger>
      <TabsTrigger value="seguimientos">Seguimientos</TabsTrigger>
      <TabsTrigger value="turnos">Turnos</TabsTrigger>
      <TabsTrigger value="historial" disabled>Historial</TabsTrigger>
    </TabsList>
    <TabsContent value="resumen">
      <Card>
        <CardHeader className="p-4">
          <CardTitle className="text-base text-[#121A61]">García, Juan</CardTitle>
          <CardDescription>Reserva · Mediocampista · 21 años</CardDescription>
        </CardHeader>
      </Card>
    </TabsContent>
    <TabsContent value="seguimientos">Seguimientos</TabsContent>
  </Tabs>
);

export const FullWidthTabs = () => (
  <Tabs defaultValue="mes" className="w-[420px]">
    <TabsList className="grid w-full grid-cols-3">
      <TabsTrigger value="semana">Semana</TabsTrigger>
      <TabsTrigger value="mes">Mes</TabsTrigger>
      <TabsTrigger value="anio">Año</TabsTrigger>
    </TabsList>
    <TabsContent value="mes" className="text-sm text-muted-foreground">
      Vista mensual del calendario de partidos.
    </TabsContent>
  </Tabs>
);
