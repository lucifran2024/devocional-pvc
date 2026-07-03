// Gera os ícones do PWA (icon-192.png e icon-512.png) sem dependências:
// desenha pixel a pixel (cruz + livro aberto sobre gradiente dourado) e
// codifica o PNG na mão usando o zlib nativo do Node.
// Uso: node scripts/generate-icons.cjs

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// ---------- Encoder PNG mínimo ----------
const CRC_TABLE = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        t[n] = c >>> 0;
    }
    return t;
})();

function crc32(buf) {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body));
    return Buffer.concat([len, body, crc]);
}

function encodePNG(width, height, rgba) {
    const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(width, 0);
    ihdr.writeUInt32BE(height, 4);
    ihdr[8] = 8;  // bit depth
    ihdr[9] = 6;  // color type RGBA
    // linhas com filtro 0
    const raw = Buffer.alloc((width * 4 + 1) * height);
    for (let y = 0; y < height; y++) {
        raw[y * (width * 4 + 1)] = 0;
        rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
    }
    const idat = zlib.deflateSync(raw, { level: 9 });
    return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

// ---------- Desenho ----------
function hex(c) {
    return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
}

const GOLD_TOP = hex('#fbbf24');    // amber-400
const GOLD_BOTTOM = hex('#b45309'); // amber-700
const IVORY = hex('#fffbeb');       // amber-50
const COVER = hex('#7c2d12');       // marrom escuro (capa do livro)

function pointInPolygon(x, y, poly) {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        const [xi, yi] = poly[i];
        const [xj, yj] = poly[j];
        if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
}

// Retorna [r,g,b] do pixel em coordenadas normalizadas (0..1)
function shade(u, v) {
    // Fundo: gradiente vertical dourado + brilho suave no topo esquerdo
    const t = Math.min(1, Math.max(0, v * 1.15 - 0.05));
    let r = GOLD_TOP[0] + (GOLD_BOTTOM[0] - GOLD_TOP[0]) * t;
    let g = GOLD_TOP[1] + (GOLD_BOTTOM[1] - GOLD_TOP[1]) * t;
    let b = GOLD_TOP[2] + (GOLD_BOTTOM[2] - GOLD_TOP[2]) * t;
    const dHi = Math.hypot(u - 0.32, v - 0.2);
    const hi = Math.max(0, 1 - dHi / 0.55) * 0.18;
    r += (255 - r) * hi; g += (255 - g) * hi; b += (255 - b) * hi;

    // Capa do livro (hexágono que mergulha no centro)
    const cover = [
        [0.165, 0.565], [0.5, 0.628], [0.835, 0.565],
        [0.835, 0.79], [0.5, 0.845], [0.165, 0.79],
    ];
    // Páginas (esquerda e direita), deixando o vinco central da capa à mostra
    const pageL = [[0.195, 0.585], [0.478, 0.638], [0.478, 0.812], [0.195, 0.758]];
    const pageR = [[0.522, 0.638], [0.805, 0.585], [0.805, 0.758], [0.522, 0.812]];

    if (pointInPolygon(u, v, cover)) {
        [r, g, b] = COVER;
        if (pointInPolygon(u, v, pageL) || pointInPolygon(u, v, pageR)) {
            [r, g, b] = IVORY;
            // sombra suave das páginas perto do vinco
            const dSpine = Math.abs(u - 0.5);
            if (dSpine < 0.09) {
                const s = (1 - dSpine / 0.09) * 0.13;
                r *= 1 - s; g *= 1 - s; b *= 1 - s;
            }
        }
        return [r, g, b];
    }

    // Cruz latina acima do livro (haste longa, braço acima do centro)
    const inV = u > 0.5 - 0.048 && u < 0.5 + 0.048 && v > 0.155 && v < 0.505;
    const inH = u > 0.5 - 0.148 && u < 0.5 + 0.148 && v > 0.235 && v < 0.315;
    if (inV || inH) return IVORY;

    return [r, g, b];
}

function render(size) {
    const SS = 2; // supersampling 2x p/ suavizar bordas
    const big = size * SS;
    const rgba = Buffer.alloc(size * size * 4);
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            let r = 0, g = 0, b = 0;
            for (let sy = 0; sy < SS; sy++) {
                for (let sx = 0; sx < SS; sx++) {
                    const u = (x * SS + sx + 0.5) / big;
                    const v = (y * SS + sy + 0.5) / big;
                    const c = shade(u, v);
                    r += c[0]; g += c[1]; b += c[2];
                }
            }
            const i = (y * size + x) * 4;
            rgba[i] = Math.round(r / (SS * SS));
            rgba[i + 1] = Math.round(g / (SS * SS));
            rgba[i + 2] = Math.round(b / (SS * SS));
            rgba[i + 3] = 255; // opaco (maskable exige fundo até a borda)
        }
    }
    return encodePNG(size, size, rgba);
}

const outDir = path.join(__dirname, '..', 'public');
for (const size of [192, 512]) {
    const png = render(size);
    const file = path.join(outDir, `icon-${size}.png`);
    fs.writeFileSync(file, png);
    console.log(`OK ${file} (${png.length} bytes)`);
}

// iOS ignora os ícones do manifest — usa o apple-touch-icon (180x180)
const apple = render(180);
const appleFile = path.join(outDir, 'apple-touch-icon.png');
fs.writeFileSync(appleFile, apple);
console.log(`OK ${appleFile} (${apple.length} bytes)`);
