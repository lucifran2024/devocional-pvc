// Apresentação da Palavra da Manhã (12/11/2026). O gerador grava a categoria
// em maiúsculas e sem acento ("MEDITACAO"); a tela mostra o nome legível.
// Só apresentação: o registro no banco e o texto copiado não mudam.

const NOMES_CATEGORIA: Record<string, string> = {
    DEVOCIONAL: 'Devocional',
    EXORTACAO: 'Exortação',
    LOUVOR: 'Louvor',
    MEDITACAO: 'Meditação',
    ORACAO: 'Oração',
    REFLEXAO: 'Reflexão',
    VERSICULO: 'Versículo',
};

export function nomeCategoria(categoria?: string | null): string {
    const chave = (categoria ?? '').trim().toUpperCase();
    if (!chave) return '';
    if (NOMES_CATEGORIA[chave]) return NOMES_CATEGORIA[chave];
    const legivel = chave.replace(/_+/g, ' ').toLowerCase();
    return legivel.charAt(0).toUpperCase() + legivel.slice(1);
}
