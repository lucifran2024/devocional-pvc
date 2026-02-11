import { describe, it, expect } from 'vitest';

// ============================================
// COPIAS DAS FUNÇÕES DE PARSING (sem dependência do Supabase)
// ============================================

function extrairTema(texto: string): string | null {
    const SAUDACOES = /^(bom dia|boa tarde|boa noite|boa madrugada|paz nesta|paz na)/i;
    const linhas = texto.split('\n')
        .map(l => l.replace(/\*+/g, '').replace(/[📖🌟✨💫🙏❤️💪🔥⭐️🌅🌙🚨⚡]/g, '').trim())
        .filter(l => l.length > 3);

    let linhasTema = linhas;
    if (linhasTema.length > 1 && SAUDACOES.test(linhasTema[0])) {
        linhasTema = linhasTema.slice(1);
    }
    const linhaTema = linhasTema.find(l => {
        const limpa = l.replace(/MENSAGEM\s*\d+\s*[-—]/gi, '').replace(/[-—=]+/g, '').trim();
        return limpa.length > 5 && !/^---+$/.test(limpa);
    });
    if (!linhaTema) return null;
    const limpo = linhaTema.replace(/MENSAGEM\s*\d+\s*[-—]/gi, '').trim();
    return limpo.length > 3 ? limpo.substring(0, 100) : null;
}

function detectarAbertura(texto: string): string {
    const SAUDACOES = /^(bom dia|boa tarde|boa noite|boa madrugada|paz nesta|paz na)/i;
    const linhas = texto.split('\n').filter(l => l.trim());
    let corpoLinhas = linhas.slice(1).map(l => l.replace(/\*+/g, '').trim()).filter(l => l.length > 10);
    if (corpoLinhas.length > 1 && SAUDACOES.test(corpoLinhas[0])) {
        corpoLinhas = corpoLinhas.slice(1);
    }
    const corpoLimpo = corpoLinhas[0] || '';

    if (!corpoLimpo) return 'outro';

    if (corpoLimpo.includes('?')) return 'pergunta';
    if (/^(Pare|Olhe|Pense|Imagine|Lembre|Abra|Feche|Levante|Creia|Confie|Descanse|Entregue|Solte|Vá|Ouça|Decida|Ande|Declare|Profetize|Receba|Desperte|Celebre|Guarde|Cuide|Treine|Desvie)/i.test(corpoLimpo)) return 'imperativo';
    if (/^(Quando|Era |Naquele|Havia|No meio|Na hora|Às vezes|Tem dias|Sabe aquele|Naquele momento|O dia|A noite|Nesta|Neste|Ontem|Hoje )/i.test(corpoLimpo)) return 'cena';
    if (/^["\"\u201c\u201d>]|^(?:\d\s)?[A-ZÀ-Ú][a-zà-ú]+\s+\d+|^(A Bíblia|A Palavra|Está escrito|Diz o Senhor|Jesus disse|Paulo disse)/i.test(corpoLimpo)) return 'biblica';
    if (/^(Ele |Ela |Eles |Um homem|Uma mulher|Certo |Aquele |Pedro |Moisés |Davi |José |Abraão )/i.test(corpoLimpo)) return 'narrativa';
    if (/^(A |O |Deus |Jesus |Fé |Graça |Amor |Sua |Seu |Não |Nenhum|Todo |Cada |Quem |Somente |Ninguém)/i.test(corpoLimpo)) return 'afirmacao';

    return 'afirmacao';
}

function detectarFechamento(texto: string): string {
    const linhas = texto.split('\n').filter(l => l.trim());
    const ultimaLinha = linhas[linhas.length - 1]?.replace(/\*+/g, '').trim() || '';

    if (!ultimaLinha) return 'outro';

    if (/^(Senhor|Pai|Deus,|Em nome|Amém)/i.test(ultimaLinha) || ultimaLinha.toLowerCase().includes('amém')) return 'oracao';
    if (/^(Creia|Confie|Descanse|Levante|Ande|Siga|Pare|Avance|Entregue|Abrace)/i.test(ultimaLinha)) return 'imperativo';
    if (/^(Eu creio|Eu declaro|Eu confio|Nós cremos|Nós declaramos)/i.test(ultimaLinha)) return 'declaracao';
    if (/^(Deus |Ele |O Senhor |Jesus |Cristo )\w+/i.test(ultimaLinha)) return 'presenca';
    if (/^(Porque |Pois |A promessa|Está escrito)/i.test(ultimaLinha)) return 'promessa';

    return 'punchline';
}

function extrairPunchline(texto: string): string | null {
    const linhas = texto.split('\n').filter(l => {
        const limpa = l.replace(/\*+/g, '').replace(/[-—]+/g, '').trim();
        return limpa.length > 5;
    });
    if (linhas.length === 0) return null;
    const ultima = linhas[linhas.length - 1].replace(/\*+/g, '').trim();
    const frases = ultima.split(/(?<=[.!?])\s+/).filter(f => f.trim().length > 3);
    const ultimaFrase = frases.length > 0 ? frases[frases.length - 1].trim() : ultima;
    return ultimaFrase.substring(0, 100);
}

// ============================================
// TESTES
// ============================================

describe('extrairTema', () => {
    it('deve pular saudação "Bom dia!" e extrair o tema real', () => {
        const texto = `Bom dia!\n**A Força da Gratidão**\nDeus nos chama a ser gratos...`;
        const tema = extrairTema(texto);
        expect(tema).not.toMatch(/^Bom dia/i);
        expect(tema).toContain('Força da Gratidão');
    });

    it('deve pular saudação "Boa noite!" e extrair o tema real', () => {
        const texto = `*Boa noite!*\n*Entrega e Confiança*\nQuando o coração está pesado...`;
        const tema = extrairTema(texto);
        expect(tema).not.toMatch(/^Boa noite/i);
        expect(tema).toContain('Entrega e Confiança');
    });

    it('deve funcionar quando não há saudação', () => {
        const texto = `**Graça Suficiente**\nPaulo aprendeu uma lição...`;
        const tema = extrairTema(texto);
        expect(tema).toContain('Graça Suficiente');
    });

    it('deve remover marcadores MENSAGEM XX', () => {
        const texto = `MENSAGEM 3 - O Poder da Oração\nDeus ouve cada clamor...`;
        const tema = extrairTema(texto);
        expect(tema).not.toContain('MENSAGEM');
        expect(tema).toContain('Poder da Oração');
    });

    it('deve retornar null para texto vazio', () => {
        expect(extrairTema('')).toBeNull();
    });
});

describe('detectarAbertura', () => {
    it('deve detectar pergunta', () => {
        const texto = `**Título**\nVocê já se perguntou por que Deus permite certas coisas?`;
        expect(detectarAbertura(texto)).toBe('pergunta');
    });

    it('deve detectar imperativo', () => {
        const texto = `**Título**\nPare e pense no que Deus fez por você hoje.`;
        expect(detectarAbertura(texto)).toBe('imperativo');
    });

    it('deve detectar cena', () => {
        const texto = `**Título**\nQuando Pedro viu Jesus andando sobre as águas, algo mudou nele.`;
        expect(detectarAbertura(texto)).toBe('cena');
    });

    it('deve detectar bíblica', () => {
        const texto = `**Título**\nJoão 3:16 nos mostra o mais profundo amor.`;
        expect(detectarAbertura(texto)).toBe('biblica');
    });

    it('deve detectar narrativa real (personagem bíblico)', () => {
        const texto = `**Título**\nDavi enfrentou o gigante com apenas uma funda e cinco pedras.`;
        expect(detectarAbertura(texto)).toBe('narrativa');
    });

    it('deve detectar afirmação', () => {
        const texto = `**Título**\nDeus nunca abandona quem confia n\'Ele.`;
        expect(detectarAbertura(texto)).toBe('afirmacao');
    });

    it('deve detectar afirmação como default (não narrativa)', () => {
        const texto = `**Título**\nContar com a graça é uma decisão diária que transforma.`;
        expect(detectarAbertura(texto)).toBe('afirmacao');
    });

    it('deve pular saudação e analisar a abertura real', () => {
        const texto = `**Título**\nBom dia! Deus é bom.\nA verdade é que nada pode nos separar do amor de Deus.`;
        const resultado = detectarAbertura(texto);
        expect(resultado).toBe('afirmacao');
    });
});

describe('detectarFechamento', () => {
    it('deve detectar oração', () => {
        const texto = `Título\nCorpo da mensagem\nSenhor, guia meus passos. Amém.`;
        expect(detectarFechamento(texto)).toBe('oracao');
    });

    it('deve detectar imperativo', () => {
        const texto = `Título\nCorpo da mensagem\nConfie no Senhor de todo coração.`;
        expect(detectarFechamento(texto)).toBe('imperativo');
    });

    it('deve detectar declaração', () => {
        const texto = `Título\nCorpo da mensagem\nEu declaro que o Senhor é meu pastor.`;
        expect(detectarFechamento(texto)).toBe('declaracao');
    });

    it('deve detectar presença', () => {
        const texto = `Título\nCorpo da mensagem\nDeus está contigo nesta luta.`;
        expect(detectarFechamento(texto)).toBe('presenca');
    });

    it('deve detectar punchline como fallback', () => {
        const texto = `Título\nCorpo da mensagem\nNada é impossível para quem crê.`;
        expect(detectarFechamento(texto)).toBe('punchline');
    });
});

describe('extrairPunchline', () => {
    it('deve retornar apenas a última frase, não a linha inteira', () => {
        const texto = `Título\nCorpo\nA graça é suficiente. O amor é real. Creia na herança que te espera.`;
        const punchline = extrairPunchline(texto);
        expect(punchline).toBe('Creia na herança que te espera.');
        expect(punchline!.length).toBeLessThanOrEqual(100);
    });

    it('deve ter no máximo 100 caracteres', () => {
        const linhaLonga = 'A'.repeat(150) + '! ' + 'B'.repeat(50) + '.';
        const texto = `Título\n${linhaLonga}`;
        const punchline = extrairPunchline(texto);
        expect(punchline!.length).toBeLessThanOrEqual(100);
    });

    it('deve retornar a última frase quando há múltiplas sentenças', () => {
        const texto = `Título\nPrimeira frase do corpo. Segunda frase importante. O que importa é a fé.`;
        const punchline = extrairPunchline(texto);
        expect(punchline).toBe('O que importa é a fé.');
    });

    it('deve retornar null para texto vazio', () => {
        expect(extrairPunchline('')).toBeNull();
    });
});
