// ===========================================
// EXPLICAR O TESTAMENTO INTEIRO DA LEITURA DE HOJE (03/10/2026)
// Pedido de Lucifran: o "Explicar" só explica a parte lida; ele quer um botão
// para o Antigo e outro para o Novo Testamento, para ler a explicação no dia em
// que não der para ler tudo e "não ficar sem a leitura do dia completa".
// Mesmo método aprovado do "Explicar a parte" (explicar-parte.ts): contexto
// certo, todos os capítulos em ordem, uma gema, ligação só com referência e
// aplicação curta no fim. Sem Deno aqui: o módulo é testado no Vitest.
// ===========================================

export interface LivroDaLeitura {
    livro: string;
    categoria?: string;
    autor?: string;
    epoca?: string;
    tema?: string;
    resumo?: string;
}

export interface CapituloDaLeitura {
    referencia: string;
    secoes?: string[];
}

export interface ContextoTestamento {
    testamento?: string;
    leituraDoDia?: string;
    livros?: LivroDaLeitura[];
    capitulos?: CapituloDaLeitura[];
}

/** Tipo no estudo_cache: cada testamento da leitura é explicado uma vez e serve a todos. */
export const CACHE_EXPLICAR_TESTAMENTO = 'explicar_testamento_v1';
/** Vários capítulos levam mais que uma parte: tempo por modelo na escrita e na revisão. */
export const TEMPO_ESCRITA_TESTAMENTO_MS = 60_000;
export const TEMPO_REVISAO_TESTAMENTO_MS = 45_000;

const curto = (v: unknown, max = 400) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

export function limitesTestamento(capitulos: number): { maxPalavras: number; maxTokens: number } {
    const n = Math.max(1, Math.floor(capitulos || 1));
    const maxPalavras = Math.min(1100, Math.max(400, 200 + n * 110));
    // Folga para o modelo caprichado pensar antes de escrever sem esvaziar a resposta
    const maxTokens = Math.min(8000, Math.max(3000, maxPalavras * 5));
    return { maxPalavras, maxTokens };
}

/** Linhas do contexto que o app já tem: introdução de cada livro e seções de cada capítulo. */
export function descreverContextoTestamento(contexto?: ContextoTestamento | null): string {
    if (!contexto || typeof contexto !== 'object') return '- (sem dados extras do app)';
    const linhas: string[] = [];
    for (const l of Array.isArray(contexto.livros) ? contexto.livros.slice(0, 6) : []) {
        if (!l?.livro) continue;
        const dados = [
            l.categoria && `categoria: ${curto(l.categoria, 60)}`,
            l.autor && `autor: ${curto(l.autor, 80)}`,
            l.epoca && `época: ${curto(l.epoca, 80)}`,
            l.tema && `tema: ${curto(l.tema, 80)}`,
        ].filter(Boolean).join('; ');
        linhas.push(`- Livro: ${[curto(l.livro, 60), dados].filter(Boolean).join(' — ')}.`);
        if (l.resumo) linhas.push(`  Sobre o livro: ${curto(l.resumo, 400)}`);
    }
    for (const c of Array.isArray(contexto.capitulos) ? contexto.capitulos.slice(0, 12) : []) {
        const secoes = Array.isArray(c?.secoes) ? c.secoes.filter(Boolean).slice(0, 8).map((s) => `"${curto(s, 80)}"`) : [];
        if (c?.referencia && secoes.length) linhas.push(`- Seções de ${curto(c.referencia, 40)}: ${secoes.join('; ')}.`);
    }
    if (contexto.leituraDoDia) linhas.push(`- Leitura de hoje completa: ${curto(contexto.leituraDoDia, 160)}.`);
    return linhas.length ? linhas.join('\n') : '- (sem dados extras do app)';
}

export function montarPromptExplicarTestamento({ testamento, referencia, versiculos, capitulos, quantidade, contexto, maxPalavras }: {
    testamento: string;
    referencia: string;
    versiculos: string;
    capitulos: number;
    quantidade: number;
    contexto?: ContextoTestamento | null;
    maxPalavras: number;
}): string {
    return `
# EXPLICAÇÃO DO ${testamento.toUpperCase()} TESTAMENTO DA LEITURA DE HOJE

Você é um mentor bíblico conversando à mesa com alguém que hoje não tem tempo de ler toda esta parte da Bíblia na NTLH. Esta explicação vai ser a leitura dele de hoje: ao terminar, ele precisa saber o que acontece ou o que é dito em CADA capítulo, entender o sentido e o que isso revela de Deus. A aplicação vem só no fim.

## O QUE ELE IA LER: ${referencia} (${capitulos} ${capitulos === 1 ? 'capítulo' : 'capítulos'}, ${quantidade} versículos)
${versiculos}

## CONTEXTO CONFIÁVEL DO APP (use quando ajudar; não contradiga)
${descreverContextoTestamento(contexto)}

## COMO EXPLICAR
1. Situe: gênero, quem fala, para quem e em que situação; onde esta leitura está na história do livro — só o que é certo.
2. Percorra os capítulos em ordem, um bloco por capítulo (nos Salmos, um por salmo), sem pular nenhum: o que acontece ou o que é dito do começo ao fim do capítulo, e o sentido. Cite versículos pelo número quando ajudar (v. 5).
3. Explique palavras, imagens, costumes, lugares ou pessoas que o leitor de hoje não conhece, quando for conhecimento bíblico ou histórico consolidado.
4. Escolha uma "gema": o detalhe de contexto, de linguagem ou de estrutura que só quem conhece o pano de fundo percebe e que muda a leitura — não uma observação que qualquer leitor faria sozinho.
5. No fim, aterrisse: o que esta leitura revela de Deus e o que pede de nós hoje.
Proporção: cerca de 70% explicação e contexto, 30% aplicação.

## FORMATO (cada seção começa com o título em negrito, em linha própria)
**Contexto:** 2 a 4 frases.
**Nome do capítulo · título curto:** um bloco por capítulo, em ordem, com o nome escrito como no cabeçalho do texto (ex.: **Salmos 92 · O justo floresce:** ou **Efésios 3 · O segredo revelado:**), em 3 a 6 frases.
**Para entender melhor:** a gema, em 1 a 3 frases.
**Ligação na Bíblia:** 1 ou 2 passagens diretamente ligadas: escreva só a referência exata (ex.: Salmos 27:4) e, em uma frase, por que ela se liga a esta leitura. NÃO copie nem cite entre aspas o texto de nenhum versículo de fora; o app mostra o texto da NTLH. Omita a seção se não houver ligação direta.
**Para hoje:** 2 a 3 frases.

## REGRAS
- Não invente dado exegético, histórico, nomes, datas ou costumes. Se não tiver certeza, omita; se for algo incerto entre estudiosos, diga isso em poucas palavras.
- Entre aspas, só palavras do texto acima, copiadas exatamente.
- Não vire devocional, oração ou mensagem motivacional; não termine com oração.
- Linguagem simples e calorosa de mentor, sem jargão acadêmico, sem emojis, sem grego ou hebraico (no máximo a palavra transliterada, se ajudar).
- Até ${maxPalavras} palavras.
`;
}

export function montarPromptRevisaoTestamento({ referencia, versiculos, rascunho }: {
    referencia: string;
    versiculos: string;
    rascunho: string;
}): string {
    return `
# REVISÃO DE PRECISÃO

Revise a explicação abaixo para que cada afirmação seja verdadeira e útil.

## REGRAS DE REVISÃO
1. Confira que todos os capítulos de ${referencia} têm o seu bloco, em ordem; se faltar algum, acrescente-o no lugar certo.
2. Remova ou corrija afirmações históricas, culturais, geográficas ou de autoria que não sejam conhecimento bíblico consolidado; nomes, datas e números errados; referências bíblicas trocadas.
3. Mantenha o contexto correto, a gema e as explicações de palavras e costumes: NÃO reduza a explicação a uma paráfrase dos versículos.
4. Remova qualquer texto citado entre aspas que não esteja no texto bíblico abaixo; na Ligação na Bíblia fica só a referência e a frase que explica a ligação.
5. Mantenha as seções em negrito, a voz de mentor e o tamanho.
6. Retorne somente a explicação final revisada, sem notas sobre a revisão.
7. Sua resposta deve terminar obrigatoriamente neste envelope exato:
<FINAL>
[explicação final completa]
</FINAL>
Tudo que estiver fora do envelope será descartado.

## TEXTO BÍBLICO DA LEITURA
${versiculos}

## EXPLICAÇÃO A REVISAR
${rascunho}
`;
}
