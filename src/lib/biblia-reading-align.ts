export const BIBLIA_READING_ALIGN_KEY = 'biblia-reading-align';
export type BibliaReadingAlign = 'left' | 'center' | 'right';
export const DEFAULT_BIBLIA_READING_ALIGN: BibliaReadingAlign = 'left';

export const BIBLIA_READING_LINE_HEIGHT_KEY = 'biblia-reading-line-height';
export const DEFAULT_BIBLIA_READING_LINE_HEIGHT = 1.85;
export const MIN_BIBLIA_READING_LINE_HEIGHT = 1.4;
export const MAX_BIBLIA_READING_LINE_HEIGHT = 2.6;
export const BIBLIA_READING_LINE_HEIGHT_STEP = 0.15;

export function parseBibliaReadingAlign(raw: unknown): BibliaReadingAlign | null {
    if (raw === 'left' || raw === 'center' || raw === 'right') return raw;
    return null;
}

function arredondarLineHeight(valor: number): number {
    return Math.round(valor * 100) / 100;
}

function limitarLineHeight(valor: number): number {
    return Math.min(
        MAX_BIBLIA_READING_LINE_HEIGHT,
        Math.max(MIN_BIBLIA_READING_LINE_HEIGHT, arredondarLineHeight(valor)),
    );
}

export function parseBibliaReadingLineHeight(raw: unknown): number | null {
    if (typeof raw === 'number') {
        if (!Number.isFinite(raw) || raw <= 0) return null;
        return limitarLineHeight(raw);
    }
    if (typeof raw !== 'string') return null;
    const trimmed = raw.trim();
    if (!trimmed) return null;
    const n = Number(trimmed);
    if (!Number.isFinite(n) || n <= 0) return null;
    return limitarLineHeight(n);
}

export function loadBibliaReadingAlign(): BibliaReadingAlign {
    if (typeof window === 'undefined') return DEFAULT_BIBLIA_READING_ALIGN;
    try {
        return parseBibliaReadingAlign(localStorage.getItem(BIBLIA_READING_ALIGN_KEY)) ?? DEFAULT_BIBLIA_READING_ALIGN;
    } catch {
        return DEFAULT_BIBLIA_READING_ALIGN;
    }
}

export function loadBibliaReadingLineHeight(): number {
    if (typeof window === 'undefined') return DEFAULT_BIBLIA_READING_LINE_HEIGHT;
    try {
        return parseBibliaReadingLineHeight(localStorage.getItem(BIBLIA_READING_LINE_HEIGHT_KEY))
            ?? DEFAULT_BIBLIA_READING_LINE_HEIGHT;
    } catch {
        return DEFAULT_BIBLIA_READING_LINE_HEIGHT;
    }
}

export function persistBibliaReadingAlign(align: BibliaReadingAlign): void {
    if (typeof window === 'undefined') return;
    if (!parseBibliaReadingAlign(align)) return;
    try {
        localStorage.setItem(BIBLIA_READING_ALIGN_KEY, align);
    } catch {
        /* quota / modo privado */
    }
}

export function persistBibliaReadingLineHeight(value: number): void {
    if (typeof window === 'undefined') return;
    const parsed = parseBibliaReadingLineHeight(value);
    if (parsed == null) return;
    try {
        localStorage.setItem(BIBLIA_READING_LINE_HEIGHT_KEY, String(parsed));
    } catch {
        /* quota / modo privado */
    }
}

export function stepBibliaReadingLineHeight(current: number, delta: number): number {
    const base = parseBibliaReadingLineHeight(current) ?? DEFAULT_BIBLIA_READING_LINE_HEIGHT;
    return limitarLineHeight(base + delta);
}

export function bibliaReadingBodyStyle(
    align: BibliaReadingAlign,
    lineHeight: number = DEFAULT_BIBLIA_READING_LINE_HEIGHT,
): { textAlign: BibliaReadingAlign; lineHeight: number } {
    return {
        textAlign: parseBibliaReadingAlign(align) ?? DEFAULT_BIBLIA_READING_ALIGN,
        lineHeight: parseBibliaReadingLineHeight(lineHeight) ?? DEFAULT_BIBLIA_READING_LINE_HEIGHT,
    };
}
