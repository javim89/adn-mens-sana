import { LayoutDashboard, Users, CalendarDays, UserCog, ClipboardList, Calendar, ClipboardCheck, Megaphone, ChartColumn, UtensilsCrossed } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { IconKey } from './roles';

/**
 * El ícono de cada item de navegación. Fuera de `Sidebar.tsx` porque ese archivo es
 * `'use client'`: importado desde un Server Component (la landing) llegaría como
 * referencia de cliente y no como el objeto.
 */
export const ICON_MAP: Record<IconKey, LucideIcon> = {
  LayoutDashboard,
  Users,
  CalendarDays,
  UserCog,
  ClipboardList,
  Calendar,
  ClipboardCheck,
  Megaphone,
  ChartColumn,
  UtensilsCrossed,
};
