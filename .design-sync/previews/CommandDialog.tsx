import { CommandDialog, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem, CommandShortcut, Icons } from 'bioteam-ui';

export const Open = () => (
  <CommandDialog open>
    <CommandInput placeholder="Ir a…" />
    <CommandList>
      <CommandEmpty>Sin resultados.</CommandEmpty>
      <CommandGroup heading="Secciones">
        <CommandItem>
          <Icons.LayoutDashboard /> Dashboard <CommandShortcut>⌘D</CommandShortcut>
        </CommandItem>
        <CommandItem>
          <Icons.Users /> Deportistas
        </CommandItem>
        <CommandItem>
          <Icons.CalendarDays /> Calendario
        </CommandItem>
        <CommandItem>
          <Icons.Utensils /> Viandas
        </CommandItem>
      </CommandGroup>
    </CommandList>
  </CommandDialog>
);
