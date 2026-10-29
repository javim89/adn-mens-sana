import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, Button, Badge } from 'bioteam-ui';

export const Default = () => (
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

export const ScoreBreakdown = () => (
  <Card className="max-w-sm">
    <CardHeader className="flex-row items-center justify-between space-y-0 p-4 pb-2">
      <CardTitle className="text-base text-[#121A61]">Psicología</CardTitle>
      <span className="text-xs font-semibold text-[#6B7280]">Subtotal +7</span>
    </CardHeader>
    <CardContent className="p-4 pt-2">
      <ul className="divide-y divide-gray-100">
        {[
          ['Seguimiento abierto hace más de 30 días', 4],
          ['Ausencias reiteradas a entrenamientos', 2],
          ['Cambio de categoría reciente', 1],
        ].map(([regla, puntos]) => (
          <li key={regla as string} className="flex items-center justify-between gap-3 py-2">
            <span className="text-sm text-[#1C1C1C]">{regla}</span>
            <span className="shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full bg-[#EEF0FB] text-[#121A61]">
              +{puntos}
            </span>
          </li>
        ))}
      </ul>
    </CardContent>
  </Card>
);

export const Stat = () => (
  <Card className="max-w-[220px]">
    <CardHeader className="p-4 pb-1">
      <CardDescription className="uppercase tracking-wide text-xs font-semibold">Presentismo semanal</CardDescription>
    </CardHeader>
    <CardContent className="p-4 pt-0 flex items-end justify-between">
      <span className="text-4xl font-bold text-[#121A61] font-[family-name:var(--font-oswald)]">87%</span>
      <Badge variant="secondary">+4 pts</Badge>
    </CardContent>
  </Card>
);
