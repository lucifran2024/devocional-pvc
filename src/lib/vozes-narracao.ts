// ============================================
// VOZES DA NARRAÇÃO BÍBLICA — as que funcionam no recurso do Azure do app
// (região brazilsouth). A rota só aceita estas; a escolha fica no aparelho.
// ============================================

export interface VozNarracao {
    id: string;
    nome: string;
    descricao: string;
    estilo: string;
}

export const VOZES_NARRACAO: VozNarracao[] = [
    { id: 'pt-BR-ThalitaMultilingualNeural', nome: 'Thalita', descricao: 'Feminina, natural', estilo: '' },
    { id: 'pt-BR-MacerioMultilingualNeural', nome: 'Macerio', descricao: 'Masculina, natural', estilo: '' },
    { id: 'pt-BR-FranciscaNeural', nome: 'Francisca', descricao: 'Feminina, calma', estilo: 'calm' },
    { id: 'pt-BR-AntonioNeural', nome: 'Antonio', descricao: 'Masculina, firme', estilo: '' },
];

export const VOZ_PADRAO = VOZES_NARRACAO[0].id;
export const CHAVE_VOZ_NARRACAO = 'biblia-narracao-voz';

export function escolherVozNarracao(pedida?: string | null): string {
    return VOZES_NARRACAO.some(v => v.id === pedida) ? String(pedida) : VOZ_PADRAO;
}

export function nomeDaVoz(id: string): string {
    return VOZES_NARRACAO.find(v => v.id === id)?.nome ?? 'Narração';
}

export function estiloDaVoz(id: string): string {
    return VOZES_NARRACAO.find(v => v.id === id)?.estilo ?? '';
}

export function lerVozSalva(): string {
    try {
        return escolherVozNarracao(window.localStorage.getItem(CHAVE_VOZ_NARRACAO));
    } catch {
        return VOZ_PADRAO;
    }
}

export function salvarVozNarracao(id: string): void {
    try {
        window.localStorage.setItem(CHAVE_VOZ_NARRACAO, escolherVozNarracao(id));
    } catch {
        // sem armazenamento: vale só nesta visita
    }
}
