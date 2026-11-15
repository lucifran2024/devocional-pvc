// Calendário da leitura do dia guardado no aparelho (15/11/2026).
//
// O app perguntava à internet, a cada abertura, QUAL era a leitura do dia
// (arquivo SECAO6.TXT). Sem rede a resposta não vinha e a "Leitura de hoje"
// ficava vazia, mesmo com a Bíblia inteira baixada. Agora, toda vez que o
// arquivo chega, as linhas "data | referência" ficam guardadas aqui, e a
// leitura de qualquer dia do calendário funciona sem internet.

export const CALENDARIO_LOCAL_KEY = 'calendario-leitura-local';

const LINHA = /^(\d{4}-\d{2}-\d{2})\s*\|\s*(.+)$/;

/** Guarda as linhas válidas do arquivo. Devolve quantas guardou. */
export function guardarCalendario(texto: string): number {
    const dias: Record<string, string> = {};
    for (const linha of texto.split(/\r?\n/)) {
        const m = linha.trim().match(LINHA);
        if (m) dias[m[1]] = m[2].trim();
    }
    const total = Object.keys(dias).length;
    // Arquivo sem linha válida (erro, página de aviso): não apaga o que já havia
    if (total === 0) return 0;
    try {
        localStorage.setItem(CALENDARIO_LOCAL_KEY, JSON.stringify(dias));
    } catch { /* aparelho sem espaço ou modo privado: segue sem guardar */ }
    return total;
}

/** A referência guardada para o dia (AAAA-MM-DD), ou null. */
export function referenciaGuardada(data: string): string | null {
    try {
        const bruto = localStorage.getItem(CALENDARIO_LOCAL_KEY);
        if (!bruto) return null;
        const dias = JSON.parse(bruto) as Record<string, unknown>;
        const ref = dias?.[data];
        return typeof ref === 'string' && ref.trim() ? ref : null;
    } catch {
        return null;
    }
}

/** Guarda um dia só (quando a leitura veio do banco, não do arquivo inteiro). */
export function guardarDia(data: string, referencia: string): void {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data) || !referencia.trim()) return;
    try {
        let dias: Record<string, string> = {};
        try { dias = JSON.parse(localStorage.getItem(CALENDARIO_LOCAL_KEY) || '{}') || {}; } catch { dias = {}; }
        dias[data] = referencia.trim();
        localStorage.setItem(CALENDARIO_LOCAL_KEY, JSON.stringify(dias));
    } catch { /* sem espaço ou modo privado */ }
}
