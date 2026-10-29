import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Bundle local del sync del design system: generado y gitignoreado.
    "ds-bundle/**",
  ]),
  // Multi-tenant: el cliente Prisma sin acotar ve todos los clubes. La app usa
  // `getDb()` de `@/lib/tenant/db`; solo este allowlist puede usar el base.
  // Arranca en "warn" mientras se migra la app y pasa a "error" al terminar.
  {
    files: ["**/*.{ts,tsx,mts}"],
    ignores: [
      "lib/db.ts",
      "lib/tenant/**",
      "lib/db-readonly.ts",
      "lib/foto-deportista.ts",
      "app/api/cron/**",
      "lib/actions/superadmin.ts",
      "lib/insights/run.ts",
      // Los tests mockean el módulo; se migran a test-utils/tenant.ts.
      "**/__tests__/**",
      "test-utils/**",
    ],
    rules: {
      "no-restricted-imports": [
        "warn",
        {
          paths: [
            {
              name: "@/lib/db",
              message:
                "El cliente base ve todos los clubes. Usá getDb() de @/lib/tenant/db (o agregá el archivo al allowlist si de verdad necesita cruzar clubes).",
            },
          ],
        },
      ],
    },
  },
]);

export default eslintConfig;
