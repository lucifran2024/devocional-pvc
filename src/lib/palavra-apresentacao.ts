// Apresentação da Palavra da Manhã (12/11/2026). O gerador grava a categoria
// em maiúsculas e sem acento ("MEDITACAO"); a tela mostra o nome legível.
// Só apresentação: o registro no banco e o texto copiado não mudam.

import { caixaDeFrase, ehTituloEmMaiusculas } from './notificacoes';

// Saudação do início pela hora do aparelho (12/11/2026, 2º ajuste: o título
// "Um momento para a Palavra" não ficou legal).
export function saudacao(hora: number): string {
    if (hora >= 5 && hora < 12) return 'Bom dia';
    if (hora >= 12 && hora < 18) return 'Boa tarde';
    return 'Boa noite';
}

// A mensagem começa com um título em MAIÚSCULAS ("O PASTOR QUE NÃO SE
// ATRASA"). No cartão ele vira a manchete, em frase normal, com a mesma regra
// das notificações (Deus, Jesus, Senhor, Espírito Santo com maiúscula).
// Sem título reconhecido, nada muda.
export function separarTitulo(mensagem: string): { titulo: string | null; corpo: string } {
    const texto = String(mensagem ?? '').replace(/\r\n?/g, '\n').trim();
    const quebra = texto.indexOf('\n');
    if (quebra === -1) return { titulo: null, corpo: texto };
    const primeira = texto.slice(0, quebra).trim()
        .replace(/^#{1,6}\s+/, '')
        .replace(/^\*\*(.+)\*\*$/, '$1')
        .replace(/^__(.+)__$/, '$1')
        .trim();
    const corpo = texto.slice(quebra + 1).trim();
    if (!corpo || !ehTituloEmMaiusculas(primeira)) return { titulo: null, corpo: texto };
    return { titulo: caixaDeFrase(primeira), corpo };
}

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
