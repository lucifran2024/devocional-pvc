// ===========================================
// EXPLICAR — método novo de 03/10/2026, escrito do zero a pedido de Lucifran:
// a explicação anterior "está muito engessada" (os mesmos títulos todo dia) e
// "não reaproveite nada do que tinha antigamente". Agora ela segue o TIPO de
// texto lido (história, salmo, lei, lista, profecia, evangelho, carta,
// sabedoria), com títulos que dizem o conteúdo, e é feita para aprender:
// "Em uma frase" no começo (orienta) e "Para guardar" no fim (fixa).
// Dois usos: a PARTE lida (botão Explicar) e o TESTAMENTO inteiro da leitura
// do dia (botões Explicar o Antigo / o Novo e o "Entender a Passagem").
// Um arquivo só e sem imports: a Edge (Deno) exige ".ts" nos imports locais e
// o tsc do app não aceita; assim o Vitest testa tudo daqui.
// ===========================================

// ---------- O MÉTODO (comum aos dois usos) ----------

export const GUIA_TIPOS_DE_TEXTO = `- História: conte o que acontece em ordem — o cenário, o problema, a virada e o desfecho — e por que isso importa na história do livro.
- Salmo ou poema: diga que tipo de oração ou canto é (lamento, louvor, confiança, gratidão, sabedoria, salmo do rei) e mostre o caminho que o texto faz, de onde sai e aonde chega; explique as imagens.
- Lei e instruções: o que a instrução pedia, para que servia para Israel naquele tempo e o que mostra de Deus; quando o Novo Testamento retoma o assunto, diga onde.
- Lista, genealogia, censo ou divisão de terras: não reconte nome por nome; explique por que a lista está ali, o que ela revela e destaque o nome ou o número que importa.
- Profecia: a quem o profeta fala e em que situação; o que ele denuncia, avisa ou promete; quando o Novo Testamento mostra o cumprimento, dê a referência.
- Evangelho: o que Jesus faz ou ensina, como as pessoas reagem e o que isso revela sobre quem ele é.
- Carta: siga o raciocínio do autor passo a passo (o "porque", o "por isso"), ligue com o que ele disse antes e explique as palavras-chave.
- Sabedoria (Provérbios, Eclesiastes, Jó): o tema, os contrastes e como ler esse tipo de texto (um provérbio ensina um caminho; não é promessa automática).`;

export const REGRAS_DA_EXPLICACAO = `- Fiel ao texto: não invente fatos, nomes, datas, números ou costumes. Se não tiver certeza, deixe de fora; se os estudiosos discordam, diga isso em poucas palavras.
- Entre aspas, só palavras do texto bíblico acima, copiadas exatamente; não cite outras passagens de memória.
- Linguagem simples e calorosa, frases curtas, sem jargão, sem emoji, sem grego ou hebraico (no máximo uma palavra transliterada, explicada).
- Escreva só a explicação: não fale de você, deste pedido ou do formato, e não use palavras como "gema", "seção" ou "bloco".
- Não vire sermão nem oração.
- Títulos sempre em negrito, como nos exemplos; não use # nem ##.`;

export const LIGACAO_NA_BIBLIA = `Se houver uma ligação clara com outra parte da Bíblia, acrescente **Ligação na Bíblia:** com a referência exata em texto normal, sem negrito (de 1 a 3 versículos, ex.: Hebreus 3:7-8), e uma frase dizendo por que ela se liga. Não escreva o texto dessa passagem: o app mostra o texto da NTLH.`;

export const PARA_GUARDAR = `Termine com **Para guardar:** uma frase que resume o que aprender e, quando ajudar, uma pergunta curta para pensar hoje.`;

/** Revisão de precisão comum: confere cobertura, fatos, citações e forma, e devolve no envelope <FINAL>. */
export function montarRevisaoDoMetodo({ cobertura, versiculos, rascunho }: {
    cobertura: string;
    versiculos: string;
    rascunho: string;
}): string {
    return `
# REVISÃO DE PRECISÃO

Revise a explicação abaixo para que tudo seja verdadeiro, claro e útil para quem quer aprender.

1. Cobertura: ${cobertura}; acrescente o que faltar.
2. Precisão: corrija ou retire afirmações históricas, culturais, geográficas ou de autoria que não sejam conhecimento bíblico consolidado; nomes, números, datas e referências errados.
3. Citações: entre aspas, só palavras do texto bíblico abaixo; retire citações de outras passagens. Na Ligação na Bíblia fica só a referência (de 1 a 3 versículos) e a frase do porquê.
4. Forma: mantenha **Em uma frase:** no começo e **Para guardar:** no fim, os títulos que dizem o conteúdo e o jeito de explicar que serve a este tipo de texto. Não reduza a explicação a uma paráfrase.
5. Retire qualquer fala sobre o pedido, o método ou o formato (como "gema", "seção" ou "bloco").
6. Linguagem simples, frases curtas, sem emoji; mantenha o tamanho.
7. Retorne só a explicação revisada, sem notas sobre a revisão, terminando obrigatoriamente neste envelope exato:
<FINAL>
[explicação final completa]
</FINAL>
Tudo que estiver fora do envelope será descartado.

## TEXTO BÍBLICO
${versiculos}

## EXPLICAÇÃO A REVISAR
${rascunho}
`;
}

/** Texto comparável: sem marcas de versículo, pontuação, aspas e diferença de maiúsculas. */
function comparavel(texto: string): string {
    return String(texto || '')
        .normalize('NFC')
        .toLowerCase()
        .replace(/<[^>]+>/g, ' ')
        .replace(/\*\*\d+\.\*\*/g, ' ')
        .replace(/[^\p{L}\p{N}\s]/gu, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

const INICIO_LIGACAO = /^\s*\*\*\s*Liga[çc][ãa]o na B[íi]blia/iu;
const OUTRO_TITULO = /^\s*\*\*[^*]+:\s*\*\*/u;
const CITACAO = /“([^”]+)”|"([^"]+)"/g;
const REFERENCIA = '(?:[1-3]\\s)?\\p{Lu}[\\p{L} ]*?\\s\\d{1,3}:\\d{1,3}(?:\\s?[-–]\\s?\\d{1,3})?';
const REFERENCIA_EM_NEGRITO = new RegExp(`\\*\\*(${REFERENCIA})\\*\\*`, 'gu');
/** "1 Pedro 2:9 — "texto de memória"." → "1 Pedro 2:9 — " (o app põe o texto da NTLH). */
const TEXTO_DEPOIS_DA_REFERENCIA = new RegExp(`(${REFERENCIA})\\s*[—–:-]?\\s*(?:“[^”]*”|"[^"]*")[\\s.]*(?:[—–-]\\s*)?`, 'gu');

/**
 * Conferência das citações (03/10/2026: no teste real a IA pôs entre aspas
 * frases que não eram o texto da NTLH e citou 1 Pedro 2:9 de memória, e a
 * revisão nem sempre pega). Trecho entre aspas que não está no texto lido
 * perde as aspas: fica como explicação, não como citação. Na Ligação na
 * Bíblia, o texto escrito logo depois da referência sai (o app mostra a NTLH
 * real) e a referência perde o negrito para o app achá-la.
 */
export function conferirCitacoes(explicacao: string, textoBiblico: string): string {
    const base = comparavel(textoBiblico);
    const conferir = (linha: string) => linha.replace(CITACAO, (inteira, curvas, retas) => {
        const trecho = curvas ?? retas ?? '';
        const palavras = comparavel(trecho);
        // palavra solta entre aspas ("tolo") é destaque, não citação
        if (palavras.split(' ').length < 3 || base.includes(palavras)) return inteira;
        return trecho;
    });
    let naLigacao = false;
    return String(explicacao || '').split('\n').map((linha) => {
        if (INICIO_LIGACAO.test(linha)) naLigacao = true;
        else if (OUTRO_TITULO.test(linha)) naLigacao = false;
        if (!naLigacao) return conferir(linha);
        const semTextoDeFora = linha
            .replace(REFERENCIA_EM_NEGRITO, '$1')
            .replace(TEXTO_DEPOIS_DA_REFERENCIA, '$1 — ')
            .replace(/\s+—\s*$/u, '')
            .replace(/ {2,}/g, ' ');
        return conferir(semTextoDeFora);
    }).join('\n');
}

/**
 * Títulos em markdown ("## Salmo 96 · …") viram títulos em negrito, como o app
 * espera (03/10/2026: a explicação real de Salmos 96-99 veio com # e ##, que na
 * tela ficavam como texto comum e escondiam a Ligação na Bíblia). O título
 * geral (#) antes de todo o conteúdo sai: a tela já tem o seu.
 */
export function normalizarTitulos(texto: string): string {
    const saida: string[] = [];
    let antesDoConteudo = true;
    for (const linha of String(texto || '').split('\n')) {
        const m = linha.match(/^\s*(#{1,6})\s+(.+?)\s*#*\s*$/u);
        if (m) {
            if (antesDoConteudo && m[1].length === 1) continue;
            saida.push(`**${m[2].replace(/\*\*/g, '').replace(/[:：]\s*$/u, '').trim()}:**`);
        } else {
            saida.push(linha);
        }
        if (linha.trim()) antesDoConteudo = false;
    }
    return saida.join('\n');
}

/** O que sai para a tela e para a cópia guardada: títulos em negrito e citações conferidas. */
export function prepararExplicacao(texto: string, textoBiblico: string): string {
    return conferirCitacoes(normalizarTitulos(texto), textoBiblico);
}

// ---------- A PARTE LIDA ----------

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
/** Tipo no estudo_cache: cada parte é explicada uma vez e serve a todos (v3 = método novo). */
export const CACHE_EXPLICAR = 'explicar_parte_v3';

const curto = (v: unknown, max = 400) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

/** Trecho curto pede explicação curta: de 260 a 520 palavras conforme os versículos. */
export function limitesExplicacao(quantidadeVersiculos: number): { maxPalavras: number; maxTokens: number } {
    const n = Math.max(1, Math.floor(quantidadeVersiculos || 1));
    const maxPalavras = Math.min(520, Math.max(260, 180 + n * 12));
    // Folga para o modelo caprichado pensar antes de escrever sem esvaziar a resposta
    const maxTokens = Math.min(4000, Math.max(2000, maxPalavras * 5));
    return { maxPalavras, maxTokens };
}

/** O que o app já sabe do trecho: livro e gênero, seções do capítulo e posição na leitura do dia. */
export function descreverContexto(contexto?: ContextoParte | null): string {
    if (!contexto || typeof contexto !== 'object') return '- (sem dados extras do app)';
    const linhas: string[] = [];
    const livro = curto(contexto.livro, 60);
    const dados = [
        contexto.categoria && `tipo de livro: ${curto(contexto.categoria, 60)}`,
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
    if (contexto.posicao) linhas.push(`- Na leitura do dia: ${curto(contexto.posicao, 160)}.`);
    return linhas.length ? linhas.join('\n') : '- (sem dados extras do app)';
}

export function montarPromptExplicar({ referencia, versiculos, quantidade, contexto, maxPalavras }: {
    referencia: string;
    parte?: number;
    versiculos: string;
    quantidade: number;
    contexto?: ContextoParte | null;
    maxPalavras: number;
}): string {
    return `
# EXPLICAR O TRECHO QUE A PESSOA ACABOU DE LER

Você é um professor de Bíblia experiente e acolhedor. A pessoa lê a Bíblia inteira num plano anual e acabou de ler o trecho abaixo na NTLH. Ajude-a a APRENDER: entender o que leu, saber onde isso se encaixa na Bíblia e guardar o essencial.

## O TRECHO: ${referencia} (${quantidade} ${quantidade === 1 ? 'versículo' : 'versículos'})
${versiculos}

## O QUE O APP SABE (confiável; use quando ajudar, sem contradizer)
${descreverContexto(contexto)}

## COMO EXPLICAR
1. Comece com **Em uma frase:** a ideia principal do trecho, simples e direta.
2. Explique o trecho do primeiro ao último versículo, do jeito que ESTE tipo de texto pede:
${GUIA_TIPOS_DE_TEXTO}
3. Use de 2 a 4 títulos curtos em negrito que digam o conteúdo daquele pedaço, com os versículos (ex.: **A virada (v. 7-9):** ou **Por que contar as tribos (v. 1-4):**). Nada de títulos genéricos que serviriam para qualquer texto.
4. Explique no lugar onde aparecem as palavras, os lugares, os costumes ou as pessoas que o leitor de hoje não conhece.
5. ${LIGACAO_NA_BIBLIA}
6. ${PARA_GUARDAR}

## REGRAS
${REGRAS_DA_EXPLICACAO}
- Até ${maxPalavras} palavras; trecho curto pede explicação curta.
`;
}

export function montarPromptRevisaoExplicar({ referencia, versiculos, rascunho }: {
    referencia: string;
    versiculos: string;
    rascunho: string;
}): string {
    return montarRevisaoDoMetodo({
        cobertura: `o trecho ${referencia} inteiro, do primeiro ao último versículo, em ordem`,
        versiculos,
        rascunho,
    });
}

// ---------- O TESTAMENTO INTEIRO DA LEITURA DO DIA ----------

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
// v3 (03/10/2026): método novo; a v1 deixou escapar "gema" e ligação de 13 versículos.
export const CACHE_EXPLICAR_TESTAMENTO = 'explicar_testamento_v3';
/** Vários capítulos levam mais que uma parte: tempo por modelo na escrita e na revisão. */
export const TEMPO_ESCRITA_TESTAMENTO_MS = 60_000;
export const TEMPO_REVISAO_TESTAMENTO_MS = 45_000;

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
            l.categoria && `tipo de livro: ${curto(l.categoria, 60)}`,
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
# EXPLICAR A LEITURA DE HOJE DO ${testamento.toUpperCase()} TESTAMENTO

Você é um professor de Bíblia experiente e acolhedor. A pessoa lê a Bíblia inteira num plano anual e hoje não tem tempo de ler toda esta parte na NTLH: esta explicação vai ser a leitura dela. Ao terminar, ela precisa saber o que acontece ou o que é dito em CADA capítulo, entender o sentido e guardar o essencial.

## A LEITURA: ${referencia} (${capitulos} ${capitulos === 1 ? 'capítulo' : 'capítulos'}, ${quantidade} versículos)
${versiculos}

## O QUE O APP SABE (confiável; use quando ajudar, sem contradizer)
${descreverContextoTestamento(contexto)}

## COMO EXPLICAR
1. Comece com **Em uma frase:** a ideia que une a leitura de hoje.
2. Se ajudar, **Onde estamos:** em 1 a 3 frases, em que ponto do livro ou da história esta leitura acontece.
3. Depois, um título por capítulo, em ordem, sem pular nenhum, com o nome do capítulo e o que ele traz (ex.: **Salmo 92 · O justo floresce:** ou **Efésios 3 · O segredo revelado:**). Em cada capítulo, explique do jeito que o tipo de texto pede:
${GUIA_TIPOS_DE_TEXTO}
4. Explique no lugar onde aparecem as palavras, os lugares, os costumes ou as pessoas que o leitor de hoje não conhece.
5. ${LIGACAO_NA_BIBLIA}
6. ${PARA_GUARDAR}

## REGRAS
${REGRAS_DA_EXPLICACAO}
- Até ${maxPalavras} palavras, divididas conforme o tamanho de cada capítulo.
`;
}

export function montarPromptRevisaoTestamento({ referencia, versiculos, rascunho }: {
    referencia: string;
    versiculos: string;
    rascunho: string;
}): string {
    return montarRevisaoDoMetodo({
        cobertura: `todos os capítulos de ${referencia}, em ordem, cada um com o seu título`,
        versiculos,
        rascunho,
    });
}

// ---------- MEDITAR E VIVER / FIXAR EM 1 MINUTO (opções 3 e 4 do menu) ----------
// Refeitos em 03/10/2026 (cartão de Lucifran: "Refazer os dois"): antes eram
// moldes fixos com emojis no modelo grátis do OpenRouter. Agora nascem da
// leitura do dia inteira (um cabeçalho por capítulo), no modelo do app, com a
// mesma conferência de citações; o versículo para guardar vai só como
// referência e o app põe o texto exato da NTLH.

/** Cache novo (v2): nada dos estudos antigos é servido. */
export const CACHE_ESTUDOS: Record<string, string> = {
    aplicacao_pratica: 'aplicacao_pratica_v2',
    sintese_rapida: 'sintese_rapida_v2',
};

const REGRAS_DOS_ESTUDOS = `- Fiel à leitura: nada que o texto não diga; não invente fatos.
- Entre aspas, só palavras da leitura acima, copiadas exatamente.
- Linguagem simples e calorosa, frases curtas, sem emoji, sem linguagem de coach ("destrave", "tome posse"), sem julgamento.
- Títulos em negrito, como acima; não use # nem ##; não fale do pedido ou do formato.`;

export function montarPromptMeditar({ referencia, versiculos }: { referencia: string; versiculos: string }): string {
    return `
# MEDITAR NA LEITURA DE HOJE

Você é um pastor experiente e acolhedor ajudando alguém a deixar a leitura de hoje, na NTLH, falar com a vida dela. Nada de autoajuda nem frase de efeito: tudo nasce do texto.

## A LEITURA DE HOJE: ${referencia}
${versiculos}

## COMO ESCREVER
1. **Em uma frase:** o que a leitura de hoje diz ao coração; se a leitura tem Antigo e Novo Testamento, ligue os dois.
2. **Verso para guardar:** só a referência exata de UM versículo da leitura (ex.: Salmos 96:1), um travessão e uma frase dizendo por que ele é o coração do texto. Não copie o texto do versículo: o app mostra o texto da NTLH.
3. **Para pensar:** 3 perguntas curtas, pessoais e diretas, cada uma presa a um versículo da leitura (diga qual), que só servem para esta leitura.
4. **Para viver hoje:** UMA atitude concreta, possível hoje, que nasce do texto — algo que dá para fazer e saber que fez.
5. **Para orar:** uma oração curta (3 a 4 frases), em primeira pessoa, com as palavras e as imagens da leitura.

## REGRAS
${REGRAS_DOS_ESTUDOS}
- Até 320 palavras.
`;
}

export function montarPromptFixar({ referencia, versiculos }: { referencia: string; versiculos: string }): string {
    return `
# FIXAR A LEITURA DE HOJE EM 1 MINUTO

Você é um professor que ajuda a pessoa a LEMBRAR o que leu hoje na NTLH.

## A LEITURA DE HOJE: ${referencia}
${versiculos}

## COMO ESCREVER
1. **Em uma frase:** a ideia principal da leitura de hoje.
2. **O que aconteceu:** de 3 a 6 frases curtas, em ordem, cobrindo TODA a leitura (cada capítulo ou livro; se houver Antigo e Novo Testamento, os dois).
3. **3 coisas para não esquecer:** três fatos ou ideias marcantes, numerados, cada um com o versículo entre parênteses (ex.: Salmos 97:5).
4. **Teste rápido:** 3 perguntas objetivas que se respondem só com a leitura, numeradas (P1, P2, P3).
5. **Frase para levar:** uma frase curta que resuma a leitura, fácil de repetir de memória.
6. **Respostas:** as respostas curtas das 3 perguntas, na mesma ordem, por último (para a pessoa tentar antes de olhar).

## REGRAS
${REGRAS_DOS_ESTUDOS}
- Até 260 palavras.
`;
}
