// Gera os ícones do PWA (192, 512 e apple-touch 180) a partir de um SVG.
// Design (escolhido pelo dono em 16/07/2026, opção "C — Bíblia fechada"):
// fundo creme, Bíblia fechada de capa marrom com cruz creme e fita marcadora
// vermelha. Flat, geometria limpa. A arte é encolhida 10% pro centro por
// causa do purpose "any maskable" do manifest (zona segura do círculo do
// Android — sem isso os cantos do livro seriam cortados em alguns launchers).
// Uso: node scripts/gerar-icones.cjs

const path = require('node:path');
const sharp = require(path.join(__dirname, '..', 'node_modules', 'sharp'));

const SVG = `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" fill="#f7f1e3"/>
  <g transform="translate(25.6 25.6) scale(0.9)">
    <!-- bloco de páginas aparecendo embaixo/direita -->
    <rect x="118" y="106" width="288" height="316" rx="20" fill="#e5d9bd"/>
    <!-- capa -->
    <rect x="106" y="92" width="288" height="316" rx="20" fill="#9a5b13"/>
    <rect x="106" y="92" width="288" height="316" rx="20" fill="none" stroke="#7c4a0f" stroke-width="4"/>
    <!-- lombada sugerida -->
    <rect x="106" y="92" width="26" height="316" rx="13" fill="#7c4a0f"/>
    <!-- cruz creme na capa, centrada na área útil -->
    <g fill="#f7ecd8">
      <rect x="252" y="180" width="30" height="150" rx="6"/>
      <rect x="207" y="225" width="120" height="30" rx="6"/>
    </g>
    <!-- fita marcadora vermelha -->
    <path d="M330 92 L366 92 L366 208 L348 188 L330 208 Z" fill="#c02626"/>
  </g>
</svg>`;

async function main() {
    const publicDir = path.join(__dirname, '..', 'public');
    const buf = Buffer.from(SVG);

    await sharp(buf, { density: 300 }).resize(512, 512).png().toFile(path.join(publicDir, 'icon-512.png'));
    await sharp(buf, { density: 300 }).resize(192, 192).png().toFile(path.join(publicDir, 'icon-192.png'));
    // Apple: sem transparência (fundo já é sólido) e 180x180
    await sharp(buf, { density: 300 }).resize(180, 180).png().toFile(path.join(publicDir, 'apple-touch-icon.png'));

    console.log('OK: icon-512.png, icon-192.png e apple-touch-icon.png gerados em /public');
}

main().catch((e) => { console.error(e); process.exit(1); });
