'use client';

import { useEffect, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import multiMonthPlugin from '@fullcalendar/multimonth';
import type { DayCellContentArg, EventInput } from '@fullcalendar/core';

export type VistaCalendario = 'dayGridMonth' | 'multiMonthYear';

export interface FullCalendarControladoProps {
  vista: VistaCalendario;
  /** `'YYYY-MM-DD'` del período que se muestra (el día 1 del mes o del año). */
  fecha: string;
  events: EventInput[];
  dayCellClassNames: (arg: DayCellContentArg) => string[];
}

/**
 * FullCalendar sin su toolbar: la navegación y el cambio de vista los maneja la
 * toolbar propia de `CalendarioView`. FullCalendar no reacciona a cambios de
 * `initialDate`/`initialView`, así que se los empuja por su API.
 */
export default function FullCalendarControlado({
  vista,
  fecha,
  events,
  dayCellClassNames,
}: FullCalendarControladoProps) {
  const ref = useRef<FullCalendar>(null);

  useEffect(() => {
    const api = ref.current?.getApi();
    if (!api) return;
    if (api.view.type !== vista) api.changeView(vista, fecha);
    else api.gotoDate(fecha);
  }, [vista, fecha]);

  return (
    <FullCalendar
      ref={ref}
      plugins={[dayGridPlugin, multiMonthPlugin]}
      initialView={vista}
      initialDate={fecha}
      locale="es"
      firstDay={1}
      height="auto"
      headerToolbar={false}
      views={{
        multiMonthYear: { type: 'multiMonth', duration: { years: 1 } },
      }}
      events={events}
      dayCellClassNames={dayCellClassNames}
      displayEventTime={false}
      dayMaxEvents={3}
      fixedWeekCount={false}
    />
  );
}
