'use client';

import { useMemo } from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { validateRawSql } from '@/lib/insights/sql-guard';

interface Props {
  sql: string;
  onChange: (sql: string) => void;
}

const EJEMPLO = `SELECT
  disciplinas.nombre AS disciplina,
  COUNT(*) AS cantidad
FROM deportistas
LEFT JOIN disciplinas ON disciplinas.id = deportistas.disciplina_id
WHERE deportistas.estado = 'ACTIVO'
GROUP BY 1
ORDER BY 2 DESC`;

/**
 * Editor de SQL crudo.
 *
 * Valida contra `sql-guard` en vivo para dar feedback inmediato, pero eso es
 * solo comodidad: la validación que manda corre en el servidor, junto con la
 * transacción de solo lectura. Nada de lo que se muestre acá autoriza nada.
 */
export default function SqlEditor({ sql, onChange }: Props) {
  const validation = useMemo(() => (sql.trim() ? validateRawSql(sql) : null), [sql]);

  return (
    <div className="space-y-3">
      <div>
        <label htmlFor="insights-sql" className="block text-sm font-medium text-[#1C1C1C] mb-1.5">
          Consulta SQL
        </label>
        <textarea
          id="insights-sql"
          value={sql}
          onChange={(e) => onChange(e.target.value)}
          spellCheck={false}
          rows={12}
          placeholder={EJEMPLO}
          className="w-full rounded-md border border-gray-200 p-3 font-mono text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#3346CC]/40"
        />
      </div>

      {validation && (
        <div
          role={validation.ok ? 'status' : 'alert'}
          className={`flex items-start gap-2 rounded-md px-3 py-2 text-xs ${
            validation.ok ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-700'
          }`}
        >
          {validation.ok ? (
            <>
              <CheckCircle2 size={14} className="mt-px shrink-0" />
              <span>La consulta pasa la validación de solo lectura.</span>
            </>
          ) : (
            <>
              <AlertTriangle size={14} className="mt-px shrink-0" />
              <span>{validation.error}</span>
            </>
          )}
        </div>
      )}

      <div className="rounded-md bg-[#F3F4F6] px-3 py-2 text-xs text-[#6B7280] space-y-1">
        <p className="font-medium text-[#1C1C1C]">Solo lectura</p>
        <p>
          Se admite una única sentencia <code className="font-mono">SELECT</code> o{' '}
          <code className="font-mono">WITH</code>. La consulta corre dentro de una transacción de
          solo lectura, con un límite de 10 segundos y 1000 filas.
        </p>
      </div>
    </div>
  );
}
