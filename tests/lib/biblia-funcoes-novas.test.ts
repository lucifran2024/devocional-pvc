import { beforeEach, describe, expect, it } from 'vitest';
import { minutosDeLeitura, resumoDoCapitulo, textoDoCapitulo } from '@/lib/biblia-texto';
import { BIBLIA_SEM_NUMEROS_KEY, guardarPreferencia, lerPreferencia } from '@/lib/biblia-preferencias';
import { encaixarTexto, limparCitacao, nomeDoArquivo, quebrarEmLinhas } from '@/lib/versiculo-imagem';

// Funções novas da Bíblia (14/11/2026, «melhorias na página da Bíblia… e
// também novas funções»): copiar o capítulo, tempo de leitura, preferências
// de leitura e o versículo em imagem.

const VERSOS = [
    { verse: 1, text: 'Havia um fariseu chamado Nicodemos, que era líder dos judeus.' },
    { verse: 2, text: ' Uma noite ele foi visitar Jesus. ' },
];

describe('texto do capítulo', () => {
    it('copia o capítulo com a referência e a versão no topo, um versículo por linha', () => {
        expect(textoDoCapitulo('João', 3, 'NTLH', VERSOS)).toBe(
            'João 3 (NTLH)\n\n1 Havia um fariseu chamado Nicodemos, que era líder dos judeus.\n2 Uma noite ele foi visitar Jesus.',
        );
    });

    it('tempo de leitura sobe com o tamanho e nunca é menor que 1 minuto', () => {
        expect(minutosDeLeitura(VERSOS)).toBe(1);
        const longo = Array.from({ length: 40 }, (_, i) => ({ verse: i + 1, text: 'palavra '.repeat(20) }));
        expect(minutosDeLeitura(longo)).toBe(5); // 800 palavras a 170 por minuto
    });

    it('resumo diz versículos e minutos; vazio enquanto o texto não chegou', () => {
        expect(resumoDoCapitulo([])).toBe('');
        expect(resumoDoCapitulo(VERSOS)).toBe('2 versículos · 1 min de leitura');
        expect(resumoDoCapitulo([VERSOS[0]])).toBe('1 versículo · 1 min de leitura');
    });
});

describe('preferências de leitura no aparelho', () => {
    beforeEach(() => localStorage.clear());

    it('desligada por padrão e com valor estranho', () => {
        expect(lerPreferencia(BIBLIA_SEM_NUMEROS_KEY)).toBe(false);
        localStorage.setItem(BIBLIA_SEM_NUMEROS_KEY, 'sim');
        expect(lerPreferencia(BIBLIA_SEM_NUMEROS_KEY)).toBe(false);
    });

    it('liga, relê e desliga sem deixar resto', () => {
        guardarPreferencia(BIBLIA_SEM_NUMEROS_KEY, true);
        expect(lerPreferencia(BIBLIA_SEM_NUMEROS_KEY)).toBe(true);
        guardarPreferencia(BIBLIA_SEM_NUMEROS_KEY, false);
        expect(localStorage.getItem(BIBLIA_SEM_NUMEROS_KEY)).toBeNull();
    });

    it('a chave da Bíblia não é a do plano de leitura', () => {
        expect(BIBLIA_SEM_NUMEROS_KEY.startsWith('biblia-')).toBe(true);
    });
});

describe('versículo em imagem', () => {
    // 10 px por letra: dá para conferir as quebras de cabeça
    const medir = (t: string) => t.length * 10;

    it('quebra em linhas que cabem, sem cortar palavra e sem perder nenhuma', () => {
        const texto = 'Porque Deus amou o mundo tanto, que deu o seu único Filho';
        const linhas = quebrarEmLinhas(medir, texto, 200);
        for (const l of linhas) expect(medir(l)).toBeLessThanOrEqual(200);
        expect(linhas.join(' ')).toBe(texto);
        expect(linhas.length).toBeGreaterThan(1);
    });

    it('palavra maior que a linha fica sozinha, inteira', () => {
        expect(quebrarEmLinhas(medir, 'a Tessalonicenses b', 80)).toEqual(['a', 'Tessalonicenses', 'b']);
    });

    it('escolhe a maior letra em que o texto cabe na caixa', () => {
        const medirCom = (tamanho: number) => (t: string) => t.length * tamanho * 0.5;
        const curto = encaixarTexto({ medirCom, texto: 'Jesus chorou.', largura: 800, altura: 600, maximo: 76, minimo: 34, entrelinha: 1.4 });
        expect(curto.tamanho).toBe(76);
        const longo = encaixarTexto({ medirCom, texto: 'palavra '.repeat(120).trim(), largura: 800, altura: 600, maximo: 76, minimo: 34, entrelinha: 1.4 });
        expect(longo.tamanho).toBeLessThan(76);
        expect(longo.tamanho).toBeGreaterThanOrEqual(34);
        expect(longo.linhas.join(' ')).toBe('palavra '.repeat(120).trim());
    });

    it('nome do arquivo sem acento nem espaço', () => {
        expect(nomeDoArquivo('João 3:16')).toBe('joao-3-16.png');
        expect(nomeDoArquivo('1 Coríntios 13:4-7')).toBe('1-corintios-13-4-7.png');
        expect(nomeDoArquivo('')).toBe('versiculo.png');
    });

    it('tira as aspas das pontas, não as do meio', () => {
        expect(limparCitacao('"Eu sou o "pão" da vida."')).toBe('Eu sou o "pão" da vida.');
    });
});
