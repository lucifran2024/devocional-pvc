// Gera os ícones do PWA (192, 512 e apple-touch 180) a partir de um SVG.
// Design: gradiente âmbar da identidade do app + livro aberto (traço Lucide)
// com a cruz nascendo da lombada.
// Uso: node scripts/gerar-icones.cjs

const path = require('node:path');
const sharp = require(path.join(__dirname, '..', 'node_modules', 'sharp'));

const SVG = `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#fcd34d"/>
      <stop offset="0.5" stop-color="#f59e0b"/>
      <stop offset="1" stop-color="#c2620a"/>
    </linearGradient>
    <radialGradient id="vinheta" cx="0.5" cy="1.15" r="1">
      <stop offset="0" stop-color="#7c2d12" stop-opacity="0.38"/>
      <stop offset="1" stop-color="#7c2d12" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="brilho" cx="0.3" cy="0.22" r="0.95">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.30"/>
      <stop offset="0.45" stop-color="#ffffff" stop-opacity="0.07"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <rect width="512" height="512" fill="url(#bg)"/>
  <rect width="512" height="512" fill="url(#vinheta)"/>
  <rect width="512" height="512" fill="url(#brilho)"/>

  <!-- Sombra deslocada (profundidade sutil, sem blur) -->
  <g transform="translate(0 10)" fill="#92400e" fill-opacity="0.28">
    <path d="M256 306 C216 288 152 278 106 288 L106 382 C152 372 216 380 256 400
             C296 380 360 372 406 382 L406 288 C360 278 296 288 256 306 Z"/>
    <rect x="239" y="118" width="34" height="196" rx="17"/>
    <rect x="196" y="158" width="120" height="34" rx="17"/>
  </g>

  <!-- Cruz (nasce da lombada do livro) -->
  <rect x="239" y="118" width="34" height="196" rx="17" fill="#fffdf7"/>
  <rect x="196" y="158" width="120" height="34" rx="17" fill="#fffdf7"/>

  <!-- Livro aberto (silhueta preenchida, páginas curvas) -->
  <path d="M256 306 C216 288 152 278 106 288 L106 382 C152 372 216 380 256 400
           C296 380 360 372 406 382 L406 288 C360 278 296 288 256 306 Z"
        fill="#fffdf7"/>

  <!-- Vinco central das páginas -->
  <path d="M256 312 L256 394" stroke="#e8890c" stroke-width="7" stroke-linecap="round" fill="none"/>

  <!-- Linhas de texto sugeridas nas páginas -->
  <g stroke="#f0b25e" stroke-width="8" stroke-linecap="round" fill="none">
    <path d="M140 316 C176 310 212 312 232 320"/>
    <path d="M140 344 C176 338 212 340 232 348"/>
    <path d="M280 320 C300 312 336 310 372 316"/>
    <path d="M280 348 C300 340 336 338 372 344"/>
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
