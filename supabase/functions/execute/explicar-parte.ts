// ===========================================
// EXPLICAR A PARTE LIDA — instrução e revisão (02/10/2026)
// Método aprovado por Lucifran na task explicacao_passagem/explicao-do-dia.md:
// contexto certo → movimentos cobrindo todos os versículos → uma "gema" →
// ligação (só referência) → aplicação curta no fim (70/30), sem inventar.
// Substitui a versão de 14/08 que proibia contexto e virava paráfrase.
// Sem Deno aqui: o módulo é testado no Vitest.
// ===========================================

export interface ContextoParte {
    livro?: string;
    categoria?: string;
    autor?: string;
    epoca?: string;
    tema?: string;
    resumo?: string;
    secoes?: { verso: number; titulo: string }[];
    posicao?: string;
}

/** Tunel 9Router: escrita no Gemini caprichado (high); se falhar, o combo rápido do app. */
export const MODELOS_EXPLICAR_TUNEL = ['ag/gemini-3.8-flash-high', 'app-pvc'];
/** Revisão de precisão no combo rápido do app. */
export const MODELOS_REVISAO_TUNEL = ['app-pvc'];
/** Tipo no estudo_cache: a explicação de cada parte é gerada uma vez e serve a todos. */
export const CACHE_EXPLICAR = 'explicar_parte_v2';

const curto = (v: unknown, max = 400) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

export function limitesExplicacao(quantidadeVersiculos: number): { maxPalavras: number; maxTokens: number } {
    const n = Math.max(1, Math.floor(quantidadeVersiculos || 1));
    const maxPalavras = Math.min(650, Math.max(320, 150 + n * 20));
    // Folga para o modelo caprichado pensar antes de escrever sem esvaziar a resposta
    const maxTokens = Math.min(4000, Math.max(2000, maxPalavras * 5));
    return { maxPalavras, maxTokens };
}

/** Linhas do contexto que o app já tem (introdução do livro, seções, posição na leitura). */
export function descreverContexto(contexto?: ContextoParte | null): string {
    if (!contexto || typeof contexto !== 'object') return '- (sem dados extras do app)';
    const linhas: string[] = [];
    const livro = curto(contexto.livro, 60);
    const dados = [
        contexto.categoria && `categoria: ${curto(contexto.categoria, 60)}`,
        contexto.autor && `autor: ${curto(contexto.autor, 80)}`,
        contexto.epoca && `época: ${curto(contexto.epoca, 80)}`,
        contexto.tema && `tema: ${curto(contexto.tema, 80)}`,
    ].filter(Boolean).join('; ');
    if (livro || dados) linhas.push(`- Livro: ${[livro, dados].filter(Boolean).join(' — ')}.`);
    if (contexto.resumo) linhas.push(`- Sobre o livro: ${curto(contexto.resumo, 400)}`);
    const secoes = Array.isArray(contexto.secoes)
        ? contexto.secoes
            .filter((s) => s && Number.isFinite(Number(s.verso)) && s.titulo)
            .slice(0, 12)
            .map((s) => `v.${Number(s.verso)} "${curto(s.titulo, 80)}"`)
        : [];
    if (secoes.length) linhas.push(`- Seções do capítulo: ${secoes.join('; ')}.`);
    if (contexto.posicao) linhas.push(`- Posição: ${curto(contexto.posicao, 160)}.`);
    return linhas.length ? linhas.join('\n') : '- (sem dados extras do app)';
}

export function montarPromptExplicar({ referencia, parte, versiculos, quantidade, contexto, maxPalavras }: {
    referencia: string;
    parte: number;
    versiculos: string;
    quantidade: number;
    contexto?: ContextoParte | null;
    maxPalavras: number;
}): string {
    return `
# EXPLICAÇÃO DA PARTE LIDA — para o leitor entender o texto

Você é um mentor bíblico conversando à mesa com alguém que acabou de ler esta parte da Bíblia na NTLH. O objetivo é que a pessoa ENTENDA o texto: o contexto, o sentido das palavras e das imagens e o que ele revela de Deus. A aplicação vem só no fim.

## A PARTE LIDA: ${referencia} (parte ${parte}, ${quantidade} versículos)
${versiculos}

## CONTEXTO CONFIÁVEL DO APP (use quando ajudar; não contradiga)
${descreverContexto(contexto)}

## COMO EXPLICAR
1. Situe: gênero, quem fala, para quem e em que situação; o que acontece antes desta parte no livro — só o que é certo.
2. Caminhe pela parte em ordem, por movimentos de versículos consecutivos, cobrindo TODOS os versículos (começo, meio e fim).
3. Em cada movimento, explique palavras, imagens, costumes, lugares ou pessoas que o leitor de hoje não conhece, quando for conhecimento bíblico ou histórico consolidado.
4. Escolha uma "gema": o detalhe de contexto, de linguagem ou de estrutura que só quem conhece o pano de fundo percebe e que muda a leitura desta parte — não uma observação que qualquer leitor faria sozinho.
5. No fim, aterrisse: o que o texto revela de Deus e o que pede de nós hoje.
Proporção: cerca de 70% explicação e contexto, 30% aplicação.

## FORMATO (cada seção começa com o título em negrito, em linha própria)
**Contexto:** 2 a 4 frases.
**Versículos X-Y · título curto:** um bloco por movimento, em ordem, cobrindo todos os versículos.
**Para entender melhor:** a gema, em 1 a 3 frases.
**Ligação na Bíblia:** 1 ou 2 passagens diretamente ligadas: escreva só a referência exata (ex.: Salmos 27:4) e, em uma frase, por que ela se liga a esta parte. NÃO copie nem cite entre aspas o texto de nenhum versículo; o app mostra o texto da NTLH. Omita a seção se não houver ligação direta.
**Para hoje:** 2 a 3 frases.

## REGRAS
- Não invente dado exegético, histórico, nomes, datas ou costumes. Se não tiver certeza, omita; se for algo incerto entre estudiosos, diga isso em poucas palavras.
- Não traga acontecimentos de outras partes como se estivessem nesta; o que vem antes ou depois aparece só como contexto, dito como tal.
- Não vire devocional, oração ou mensagem motivacional; não termine com oração.
- Linguagem simples e calorosa de mentor, sem jargão acadêmico, sem emojis, sem grego ou hebraico (no máximo a palavra transliterada, se ajudar).
- Até ${maxPalavras} palavras.
`;
}

export function montarPromptRevisaoExplicar({ referencia, versiculos, rascunho }: {
    referencia: string;
    versiculos: string;
    rascunho: string;
}): string {
    return `
# REVISÃO DE PRECISÃO

Revise a explicação abaixo para que cada afirmação seja verdadeira e útil.

## REGRAS DE REVISÃO
1. Confira que todos os versículos de ${referencia} foram cobertos, em ordem; se faltar algum, acrescente-o no movimento certo.
2. Remova ou corrija afirmações históricas, culturais, geográficas ou de autoria que não sejam conhecimento bíblico consolidado; nomes, datas e números errados; referências bíblicas trocadas.
3. Mantenha o contexto correto, a gema e as explicações de palavras e costumes: NÃO reduza a explicação a uma paráfrase dos versículos.
4. Remova qualquer texto de versículo copiado ou citado entre aspas que não seja da parte lida; na Ligação na Bíblia fica só a referência e a frase que explica a ligação.
5. Mantenha as seções em negrito, a voz de mentor e o tamanho.
6. Retorne somente a explicação final revisada, sem notas sobre a revisão.
7. Sua resposta deve terminar obrigatoriamente neste envelope exato:
<FINAL>
[explicação final completa]
</FINAL>
Tudo que estiver fora do envelope será descartado.

## TEXTO BÍBLICO DA PARTE
${versiculos}

## EXPLICAÇÃO A REVISAR
${rascunho}
`;
}
