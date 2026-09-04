export const BIBLIA_READING_ALIGN_KEY = 'biblia-reading-align';
export type BibliaReadingAlign = 'left' | 'center' | 'right';
export const DEFAULT_BIBLIA_READING_ALIGN: BibliaReadingAlign = 'left';

export function parseBibliaReadingAlign(raw: unknown): BibliaReadingAlign | null {
    if (raw === 'left' || raw === 'center' || raw === 'right') return raw;
    return null;
}

export function loadBibliaReadingAlign(): BibliaReadingAlign {
    if (typeof window === 'undefined') return DEFAULT_BIBLIA_READING_ALIGN;
    try {
        return parseBibliaReadingAlign(localStorage.getItem(BIBLIA_READING_ALIGN_KEY)) ?? DEFAULT_BIBLIA_READING_ALIGN;
    } catch {
        return DEFAULT_BIBLIA_READING_ALIGN;
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

export function bibliaReadingBodyStyle(align: BibliaReadingAlign): { textAlign: BibliaReadingAlign } {
    return { textAlign: parseBibliaReadingAlign(align) ?? DEFAULT_BIBLIA_READING_ALIGN };
}
