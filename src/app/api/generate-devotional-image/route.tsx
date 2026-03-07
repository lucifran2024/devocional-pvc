import { ImageResponse } from '@vercel/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

// ============================================
// 15 TEMAS VISUAIS (rotaciona por dia do ano)
// ============================================
const THEMES = [
    {
        name: 'sunset_warm',
        bg: 'linear-gradient(145deg, #1a0a2e 0%, #3d1a4a 30%, #8b3a3a 70%, #c2703b 100%)',
        accent: '#ffb347',
        textColor: '#fff5e6',
        overlayOpacity: 0.08,
    },
    {
        name: 'ocean_deep',
        bg: 'linear-gradient(145deg, #0a1628 0%, #0d2847 30%, #134e6f 70%, #1b7fa0 100%)',
        accent: '#64d2ff',
        textColor: '#e6f4ff',
        overlayOpacity: 0.06,
    },
    {
        name: 'forest_green',
        bg: 'linear-gradient(145deg, #0a1a0d 0%, #1a3a1e 30%, #2d5a32 70%, #3d7a42 100%)',
        accent: '#7dde8a',
        textColor: '#e6ffe8',
        overlayOpacity: 0.07,
    },
    {
        name: 'golden_hour',
        bg: 'linear-gradient(145deg, #1a1005 0%, #3d2a0a 30%, #6b4a12 70%, #8b6a1a 100%)',
        accent: '#ffd700',
        textColor: '#fff8e1',
        overlayOpacity: 0.08,
    },
    {
        name: 'midnight_blue',
        bg: 'linear-gradient(145deg, #05051a 0%, #0d0d3d 30%, #1a1a5e 70%, #24247a 100%)',
        accent: '#a8a8ff',
        textColor: '#eeeeff',
        overlayOpacity: 0.05,
    },
    {
        name: 'rose_dawn',
        bg: 'linear-gradient(145deg, #1a0a14 0%, #3d1a2e 30%, #6b2d4a 70%, #8b3d5a 100%)',
        accent: '#ff8fab',
        textColor: '#ffe6ee',
        overlayOpacity: 0.07,
    },
    {
        name: 'storm_gray',
        bg: 'linear-gradient(145deg, #111118 0%, #1e1e2e 30%, #2d2d44 70%, #3d3d5a 100%)',
        accent: '#b8c4d4',
        textColor: '#e8ecf0',
        overlayOpacity: 0.06,
    },
    {
        name: 'autumn_ember',
        bg: 'linear-gradient(145deg, #1a0d05 0%, #3d1f0a 30%, #6b3412 70%, #8b4a1a 100%)',
        accent: '#ff8c42',
        textColor: '#fff0e0',
        overlayOpacity: 0.08,
    },
    {
        name: 'lavender_mist',
        bg: 'linear-gradient(145deg, #12081e 0%, #261446 30%, #3a2068 70%, #4e2c8a 100%)',
        accent: '#c9a8ff',
        textColor: '#f0e6ff',
        overlayOpacity: 0.06,
    },
    {
        name: 'arctic_ice',
        bg: 'linear-gradient(145deg, #08141e 0%, #102a3e 30%, #184060 70%, #205680 100%)',
        accent: '#a0e4ff',
        textColor: '#e0f4ff',
        overlayOpacity: 0.05,
    },
    {
        name: 'wine_velvet',
        bg: 'linear-gradient(145deg, #1a050a 0%, #3d0a16 30%, #5e1424 70%, #7a1e32 100%)',
        accent: '#ff6b8a',
        textColor: '#ffe0e6',
        overlayOpacity: 0.07,
    },
    {
        name: 'sage_earth',
        bg: 'linear-gradient(145deg, #0e1410 0%, #1e2e20 30%, #304830 70%, #426240 100%)',
        accent: '#a5d6a7',
        textColor: '#e8f5e9',
        overlayOpacity: 0.06,
    },
    {
        name: 'copper_warmth',
        bg: 'linear-gradient(145deg, #14100a 0%, #2e2014 30%, #4a3420 70%, #66482c 100%)',
        accent: '#e8a87c',
        textColor: '#fef0e4',
        overlayOpacity: 0.08,
    },
    {
        name: 'twilight_purple',
        bg: 'linear-gradient(145deg, #0e0520 0%, #1e0e40 30%, #2e1660 70%, #3e1e80 100%)',
        accent: '#d4a5ff',
        textColor: '#f4e8ff',
        overlayOpacity: 0.06,
    },
    {
        name: 'emerald_night',
        bg: 'linear-gradient(145deg, #041410 0%, #082820 30%, #0e4030 70%, #145840 100%)',
        accent: '#66ffaa',
        textColor: '#e0fff0',
        overlayOpacity: 0.05,
    },
];

// Dia do ano → seleciona tema
function getThemeForDate(dateStr?: string): typeof THEMES[0] {
    const date = dateStr ? new Date(dateStr) : new Date();
    const startOfYear = new Date(date.getFullYear(), 0, 0);
    const diff = date.getTime() - startOfYear.getTime();
    const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
    return THEMES[dayOfYear % THEMES.length];
}

// Calcular tamanho da fonte baseado no comprimento do texto
function getFontSize(textLength: number): number {
    if (textLength < 100) return 44;
    if (textLength < 200) return 38;
    if (textLength < 400) return 32;
    if (textLength < 600) return 26;
    if (textLength < 900) return 22;
    return 18;
}

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const texto = searchParams.get('texto') || 'Mensagem devocional';
    const data = searchParams.get('data') || new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });

    const theme = getThemeForDate();
    const fontSize = getFontSize(texto.length);

    return new ImageResponse(
        (
            <div
                style={{
                    width: '1080px',
                    height: '1080px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: theme.bg,
                    position: 'relative',
                    overflow: 'hidden',
                }}
            >
                {/* Overlay decorativo sutil */}
                <div
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: `radial-gradient(circle at 20% 20%, rgba(255,255,255,${theme.overlayOpacity}) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(255,255,255,${theme.overlayOpacity * 0.5}) 0%, transparent 50%)`,
                        display: 'flex',
                    }}
                />

                {/* Linha decorativa topo */}
                <div
                    style={{
                        position: 'absolute',
                        top: '60px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: '120px',
                        height: '2px',
                        background: theme.accent,
                        opacity: 0.6,
                        display: 'flex',
                    }}
                />

                {/* Conteúdo principal */}
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '100px 80px',
                        maxWidth: '100%',
                        textAlign: 'center',
                        zIndex: 1,
                        flex: 1,
                    }}
                >
                    <div
                        style={{
                            fontSize: `${fontSize}px`,
                            color: theme.textColor,
                            lineHeight: 1.6,
                            fontFamily: 'serif',
                            fontWeight: 400,
                            textAlign: 'center',
                            maxWidth: '920px',
                            display: 'flex',
                            flexWrap: 'wrap',
                            justifyContent: 'center',
                            wordBreak: 'break-word',
                        }}
                    >
                        {texto}
                    </div>
                </div>

                {/* Linha decorativa baixo */}
                <div
                    style={{
                        position: 'absolute',
                        bottom: '80px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: '80px',
                        height: '2px',
                        background: theme.accent,
                        opacity: 0.4,
                        display: 'flex',
                    }}
                />

                {/* Data no rodapé */}
                <div
                    style={{
                        position: 'absolute',
                        bottom: '40px',
                        display: 'flex',
                        fontSize: '18px',
                        color: theme.accent,
                        opacity: 0.7,
                        letterSpacing: '3px',
                        textTransform: 'uppercase',
                        fontFamily: 'sans-serif',
                    }}
                >
                    {data}
                </div>
            </div>
        ),
        {
            width: 1080,
            height: 1080,
        }
    );
}
