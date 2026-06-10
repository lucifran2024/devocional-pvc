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
    // Código Deno (Edge Functions) — outro runtime, não faz sentido lintar
    // com o ESLint do Next; era a causa do CI falhar em todos os pushes
    "supabase/functions/**",
    // Scripts utilitários de debug locais
    "scripts/**",
    "debug_db.js",
    "start-dev.js",
  ]),
]);

export default eslintConfig;
