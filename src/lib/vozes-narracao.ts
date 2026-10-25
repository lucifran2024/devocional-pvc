// ============================================
// VOZES DA NARRAÇÃO BÍBLICA: VoiceStudio pré-gravado quando disponível;
// demais capítulos usam Macerio do Azure como reserva masculina.
// As quatro vozes antigas permanecem disponíveis.
// ============================================

export interface VozNarracao {
    id: string;
    nome: string;
    descricao: string;
    estilo: string;
}

export const VOZ_VOICESTUDIO_MASCULINA = 'voicestudio-pt-BR-masculina-v1';
export const VOZ_AZURE_RESERVA = 'pt-BR-MacerioMultilingualNeural';

export const VOZES_NARRACAO: VozNarracao[] = [
    {
        id: VOZ_VOICESTUDIO_MASCULINA,
        nome: 'VoiceStudio masculina',
        descricao: 'Nova voz · Macerio quando o capítulo ainda não foi gravado',
        estilo: '',
    },
    { id: 'pt-BR-ThalitaMultilingualNeural', nome: 'Thalita', descricao: 'Feminina, natural', estilo: '' },
    { id: 'pt-BR-MacerioMultilingualNeural', nome: 'Macerio', descricao: 'Masculina, natural', estilo: '' },
    { id: 'pt-BR-FranciscaNeural', nome: 'Francisca', descricao: 'Feminina, calma', estilo: 'calm' },
    { id: 'pt-BR-AntonioNeural', nome: 'Antonio', descricao: 'Masculina, firme', estilo: '' },
];

export const VOZ_PADRAO = VOZ_VOICESTUDIO_MASCULINA;
// Chave v2: migra a Thalita padrão antiga, permitindo selecioná-la de novo.
export const CHAVE_VOZ_NARRACAO = 'biblia-narracao-voz-v2';
const CHAVE_VOZ_ANTIGA = 'biblia-narracao-voz';

export function vozAzureDeReserva(id: string): string {
    return id === VOZ_VOICESTUDIO_MASCULINA ? VOZ_AZURE_RESERVA : id;
}

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
        const nova = window.localStorage.getItem(CHAVE_VOZ_NARRACAO);
        if (nova !== null) return escolherVozNarracao(nova);
        const anterior = window.localStorage.getItem(CHAVE_VOZ_ANTIGA);
        return anterior && anterior !== 'pt-BR-ThalitaMultilingualNeural'
            ? escolherVozNarracao(anterior)
            : VOZ_PADRAO;
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
