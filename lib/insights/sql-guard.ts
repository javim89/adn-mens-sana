/**
 * Validación sintáctica del modo SQL crudo.
 *
 * Es la primera de las tres capas de defensa (las otras dos son la transacción
 * read-only del runner y el rol read-only de Postgres). No pretende ser un
 * parser de SQL: quita comentarios y strings literales, y sobre el residuo
 * exige un único statement de lectura sin palabras prohibidas.
 */

export type SqlGuardResult = { ok: true } | { ok: false; error: string };

const BLACKLIST =
  /\b(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|TRUNCATE|GRANT|REVOKE|COPY|SET\s+ROLE|pg_read_file|pg_ls_dir|dblink|lo_import|lo_export)\b/i;

const STARTS_WITH_SELECT = /^(SELECT|WITH)\b/i;

/**
 * Reemplaza comentarios y strings literales por espacios, preservando las
 * posiciones. Devuelve un error si quedó un literal o un comentario abierto.
 */
function stripCommentsAndStrings(sql: string): { residue: string } | { error: string } {
  let out = '';
  let i = 0;

  while (i < sql.length) {
    const ch = sql[i];
    const next = sql[i + 1];

    // Comentario de línea
    if (ch === '-' && next === '-') {
      while (i < sql.length && sql[i] !== '\n') i += 1;
      continue;
    }

    // Comentario de bloque (anidable en Postgres)
    if (ch === '/' && next === '*') {
      let depth = 1;
      i += 2;
      while (i < sql.length && depth > 0) {
        if (sql[i] === '/' && sql[i + 1] === '*') {
          depth += 1;
          i += 2;
        } else if (sql[i] === '*' && sql[i + 1] === '/') {
          depth -= 1;
          i += 2;
        } else {
          i += 1;
        }
      }
      if (depth > 0) return { error: 'Comentario de bloque sin cerrar' };
      out += ' ';
      continue;
    }

    // String literal con escape por duplicación ('')
    if (ch === "'") {
      i += 1;
      let closed = false;
      while (i < sql.length) {
        if (sql[i] === "'") {
          if (sql[i + 1] === "'") {
            i += 2;
            continue;
          }
          i += 1;
          closed = true;
          break;
        }
        i += 1;
      }
      if (!closed) return { error: 'String literal sin cerrar' };
      out += ' ';
      continue;
    }

    // Dollar quoting: $$ … $$ o $tag$ … $tag$
    if (ch === '$') {
      const match = /^\$[A-Za-z_][A-Za-z0-9_]*\$|^\$\$/.exec(sql.slice(i));
      if (match) {
        const tag = match[0];
        const end = sql.indexOf(tag, i + tag.length);
        if (end === -1) return { error: 'Literal $$ sin cerrar' };
        i = end + tag.length;
        out += ' ';
        continue;
      }
    }

    // Identificador entre comillas dobles: se conserva tal cual, pero sin que
    // su contenido pueda disparar la blacklist.
    if (ch === '"') {
      i += 1;
      let closed = false;
      while (i < sql.length) {
        if (sql[i] === '"') {
          if (sql[i + 1] === '"') {
            i += 2;
            continue;
          }
          i += 1;
          closed = true;
          break;
        }
        i += 1;
      }
      if (!closed) return { error: 'Identificador entrecomillado sin cerrar' };
      out += ' ';
      continue;
    }

    out += ch;
    i += 1;
  }

  return { residue: out };
}

export function validateRawSql(sql: string): SqlGuardResult {
  if (typeof sql !== 'string' || sql.trim().length === 0) {
    return { ok: false, error: 'La consulta está vacía' };
  }

  const stripped = stripCommentsAndStrings(sql);
  if ('error' in stripped) {
    return { ok: false, error: stripped.error };
  }

  // Un único ';' final es lo que escribe cualquiera y es inofensivo: tras
  // quitarlo, cualquier ';' remanente implica más de una sentencia.
  // `SELECT 1;`            → residuo sin ';'  → pasa
  // `SELECT 1; DROP TABLE x` → residuo con ';' → rechazado
  const residue = stripped.residue.trim().replace(/;\s*$/, '').trim();

  if (residue.length === 0) {
    return { ok: false, error: 'La consulta no contiene ninguna sentencia' };
  }

  if (residue.includes(';')) {
    return {
      ok: false,
      error: 'Solo se permite una sentencia. Encontré más de una separada por ";".',
    };
  }

  if (!STARTS_WITH_SELECT.test(residue)) {
    return { ok: false, error: 'La consulta debe empezar con SELECT o WITH' };
  }

  const forbidden = BLACKLIST.exec(residue);
  if (forbidden) {
    return {
      ok: false,
      error: `La consulta contiene una palabra no permitida: "${forbidden[0]}"`,
    };
  }

  return { ok: true };
}
