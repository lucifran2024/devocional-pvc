import type { NextConfig } from "next";
import path from "node:path";

// 15/11/2026: identifica cada publicação para o service worker. Sem isso o
// sw.js era o mesmo arquivo a cada deploy, o celular nunca o reinstalava e as
// telas guardadas para abrir sem internet ficavam presas na versão antiga.
const versaoDoApp = (process.env.VERCEL_GIT_COMMIT_SHA || process.env.VERSAO_DO_APP || String(Date.now())).slice(0, 12);

const nextConfig: NextConfig = {
  env: { NEXT_PUBLIC_VERSAO_DO_APP: versaoDoApp },
  // Fixa a raiz do projeto: um package.json perdido em C:\ (de outro app)
  // fazia o Next inferir a raiz errada e quebrar o resolve do tailwindcss.
  outputFileTracingRoot: path.join(__dirname),
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
