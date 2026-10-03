// ===========================================
// EXPLICAR O TESTAMENTO INTEIRO (03/10/2026) — monta o pedido do Antigo ou do
// Novo Testamento da leitura de hoje a partir dos capítulos já carregados,
// para quem não tem tempo de ler tudo ler a explicação no lugar.
// A IA recebe o texto de cada capítulo e o contexto que o app já tem.
// ===========================================

import type { Versiculo } from '@/lib/bible-api';
import { getIntroducaoLivro } from '@/lib/bible-introducoes';
import { getPericopes } from '@/lib/bible-pericopes';

export type Testamento = 'AT' | 'NT';

export const NOME_TESTAMENTO: Record<Testamento, string> = {
    AT: 'Antigo Testamento',
    NT: 'Novo Testamento',
};

export interface PedidoTestamento {
    testamento: Testamento;
    referencia: string;
    versiculos: string;
    quantidadeVersiculos: number;
    capitulos: number;
}

const capitalizar = (nome: string) =>
    nome.split(' ').map(p => (p ? p.charAt(0).toUpperCase() + p.slice(1) : p)).join(' ');

const limparTexto = (texto: string) => String(texto || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

/** Mateus (livro 40) abre o Novo Testamento; capítulo sem livro fica no Antigo, como na navegação. */
export function testamentoDoCapitulo(capitulo: Versiculo[]): Testamento {
    return capitulo.some(v => v.livroId && v.livroId >= 40) ? 'NT' : 'AT';
}

function dadosDoCapitulo(capitulo: Versiculo[], livroPadrao: string) {
    const primeiro = capitulo[0];
    const ultimo = capitulo[capitulo.length - 1];
    return {
        livro: capitalizar(primeiro?.livro || livroPadrao),
        livroId: primeiro?.livroId,
        numero: primeiro?.chapter ?? 0,
        inicio: primeiro?.verse ?? 1,
        fim: ultimo?.verse ?? 1,
    };
}

/** "Salmos 92-95", "Levítico 26-27, Números 1-3"; capítulo que começa no meio vira "João 14:5-14". */
export function referenciaDosCapitulos(capitulos: Versiculo[][], livroPadrao = ''): string {
    const dados = capitulos.filter(c => c.length).map(c => dadosDoCapitulo(c, livroPadrao));
    const partes: string[] = [];
    for (let i = 0; i < dados.length; i++) {
        const atual = dados[i];
        if (atual.inicio > 1) {
            partes.push(`${atual.livro} ${atual.numero}:${atual.inicio}-${atual.fim}`);
            continue;
        }
        let j = i;
        while (j + 1 < dados.length
            && dados[j + 1].livro === atual.livro
            && dados[j + 1].inicio === 1
            && dados[j + 1].numero === dados[j].numero + 1) j++;
        partes.push(j === i ? `${atual.livro} ${atual.numero}` : `${atual.livro} ${atual.numero}-${dados[j].numero}`);
        i = j;
    }
    return partes.join(', ');
}

/** Texto para a IA: "### Salmos 92" e um versículo por linha ("1 texto"). */
export function textoDosCapitulos(capitulos: Versiculo[][], livroPadrao = ''): string {
    return capitulos
        .filter(c => c.length)
        .map(c => {
            const d = dadosDoCapitulo(c, livroPadrao);
            return `### ${d.livro} ${d.numero}\n${c.map(v => `${v.verse} ${limparTexto(v.text)}`).join('\n')}`;
        })
        .join('\n\n');
}

/** Pedido do testamento pedido; null quando a leitura de hoje não tem esse testamento. */
export function montarPedidoTestamento(capitulos: Versiculo[][], testamento: Testamento, livroPadrao = ''): PedidoTestamento | null {
    const doTestamento = capitulos.filter(c => c.length && testamentoDoCapitulo(c) === testamento);
    if (!doTestamento.length) return null;
    return {
        testamento,
        referencia: referenciaDosCapitulos(doTestamento, livroPadrao),
        versiculos: textoDosCapitulos(doTestamento, livroPadrao),
        quantidadeVersiculos: doTestamento.reduce((total, c) => total + c.length, 0),
        capitulos: doTestamento.length,
    };
}

/** Botões da leitura de hoje: um por testamento presente, na ordem Antigo → Novo. */
export function opcoesDeTestamento(capitulos: Versiculo[][], livroPadrao = ''): { testamento: Testamento; referencia: string }[] {
    return (['AT', 'NT'] as Testamento[]).flatMap(testamento => {
        const doTestamento = capitulos.filter(c => c.length && testamentoDoCapitulo(c) === testamento);
        return doTestamento.length ? [{ testamento, referencia: referenciaDosCapitulos(doTestamento, livroPadrao) }] : [];
    });
}

/** Contexto que o app já tem, sem IA: introdução de cada livro e seções de cada capítulo. */
export function contextoDoTestamento(capitulos: Versiculo[][], testamento: Testamento, leituraDoDia: string, livroPadrao = '') {
    const doTestamento = capitulos.filter(c => c.length && testamentoDoCapitulo(c) === testamento);
    const livros = new Map<string, Record<string, string>>();
    const comSecoes: { referencia: string; secoes: string[] }[] = [];
    for (const c of doTestamento) {
        const d = dadosDoCapitulo(c, livroPadrao);
        if (!livros.has(d.livro)) {
            const intro = d.livroId ? getIntroducaoLivro(d.livroId) : null;
            livros.set(d.livro, {
                livro: d.livro,
                ...(intro ? { categoria: intro.categoria, autor: intro.autor, epoca: intro.epoca, tema: intro.tema, resumo: intro.resumo } : {}),
            });
        }
        const secoes = d.livroId && d.numero ? getPericopes(d.livroId, d.numero).map(p => p.title) : [];
        if (secoes.length) comSecoes.push({ referencia: `${d.livro} ${d.numero}`, secoes });
    }
    return {
        testamento: NOME_TESTAMENTO[testamento],
        leituraDoDia,
        livros: [...livros.values()],
        capitulos: comSecoes,
    };
}
