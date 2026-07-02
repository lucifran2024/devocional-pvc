import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Fixa a raiz do projeto: um package.json perdido em C:\ (de outro app)
  // fazia o Next inferir a raiz errada e quebrar o resolve do tailwindcss.
  outputFileTracingRoot: path.join(__dirname),
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
