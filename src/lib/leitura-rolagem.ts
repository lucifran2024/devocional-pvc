// Regras de rolagem da leitura (25/09/2026): a barra de navegação some
// enquanto a pessoa desce lendo e volta assim que ela rola para cima.

interface EstadoRolagem {
    anterior: number;
    atual: number;
    visivel: boolean;
    /** Até esta altura a barra fica sempre visível. */
    topo?: number;
    /** Movimento mínimo para trocar o estado (evita piscar em tremidas). */
    limiar?: number;
}

export function barraDeveAparecer({ anterior, atual, visivel, topo = 80, limiar = 8 }: EstadoRolagem): boolean {
    if (atual <= topo) return true;
    const delta = atual - anterior;
    if (delta > limiar) return false;
    if (delta < -limiar) return true;
    return visivel;
}

/** Fração lida entre o início e o fim do texto (0 a 1). */
export function progressoLeitura(rolagem: number, inicio: number, fim: number): number {
    if (!(fim > inicio)) return 0;
    const fracao = (rolagem - inicio) / (fim - inicio);
    return Math.min(1, Math.max(0, fracao));
}
