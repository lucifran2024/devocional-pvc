import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// RAG REMOVIDO - Agora baixamos o arquivo INTEIRO para evitar fragmentação
import { BIBLE_TOOLS_DEFINITION, consultarVersiculo } from './bible-tools.ts';
import { RSS_TOOLS_DEFINITION, consultarRSS } from './rss-tools.ts';
import { gerarTexto, chamarCompatGemini, get9RouterEndpoint } from './openrouter-client.ts';
import { gerarPalavraComReserva } from './palavra-manha-provider.ts';
import { consultarInstagram } from './apify-tools.ts';
import { consultarBibleAPI } from './bible-api.ts';
import { getContextoTemporal } from './date-helper.ts';
import { formatVoiceSection } from './voice-selector.ts';
import { getArchetype, formatArchetypeSection } from './archetype-selector.ts';


/**
 * Garante que a Palavra da Manhã não fique "muito grande".
 * O LLM ignora o limite de caracteres pedido no prompt (vinham mensagens de
 * 1200–1860 chars para um alvo de 600). Aqui aplicamos um teto REAL: cortamos
 * no fim de frase/parágrafo mais próximo do limite, nunca no meio de uma
 * palavra ou oração.
 */
function limitarTamanhoMensagem(texto: string, maxChars: number): string {
  const limpo = (texto || '').trim();
  if (limpo.length <= maxChars) return limpo;

  const corte = limpo.slice(0, maxChars);
  // Procura o melhor ponto de quebra: parágrafo > fim de frase.
  const candidatos = [
    corte.lastIndexOf('\n\n'),
    corte.lastIndexOf('. '),
    corte.lastIndexOf('.\n'),
    corte.lastIndexOf('! '),
    corte.lastIndexOf('!\n'),
    corte.lastIndexOf('? '),
    corte.lastIndexOf('?\n'),
    corte.lastIndexOf('”'),
    corte.lastIndexOf('"'),
  ];
  const pos = Math.max(...candidatos);
  // Só usa o ponto de quebra se ele não jogar fora mais da metade do texto.
  if (pos > maxChars * 0.5) {
    return limpo.slice(0, pos + 1).trim();
  }
  return corte.trim();
}


// 1. Configuração de CORS (RESTRITIVO - apenas origens permitidas)
const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  'https://devocional-pvc.vercel.app',
  'https://www.devocional-pvc.vercel.app',
];

// Função para verificar se é uma origem válida (incluindo previews do Vercel)
function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  // Origens exatas
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  // Preview URLs do Vercel (pattern: devocional-pvc-*.vercel.app)
  if (origin.match(/^https:\/\/devocional-pvc(-[a-z0-9]+)?\.vercel\.app$/)) return true;
  return false;
}

function getCorsHeaders(origin: string | null) {
  const allowedOrigin = isAllowedOrigin(origin) ? origin! : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

function getCacheRangeForSaoPauloDate(dateStr: string): { startUtcIso: string; endUtcIso: string; mode: 'calendar_day' | 'fallback_24h' } {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (!match) {
    const end = new Date();
    const start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
    return {
      startUtcIso: start.toISOString(),
      endUtcIso: end.toISOString(),
      mode: 'fallback_24h',
    };
  }

  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  const day = Number(match[3]);

  // America/Sao_Paulo = UTC-3. O cron já envia `data` no calendário local de SP.
  const startUtc = new Date(Date.UTC(year, monthIndex, day, 3, 0, 0, 0));
  const endUtc = new Date(Date.UTC(year, monthIndex, day + 1, 3, 0, 0, 0));

  return {
    startUtcIso: startUtc.toISOString(),
    endUtcIso: endUtc.toISOString(),
    mode: 'calendar_day',
  };
}

// =====================================================
// CACHE GLOBAL - CCE (Conhecimento Compilado Essencial)
// BASE foi removida — MODO agora é self-contained
// =====================================================
let cachedConhecimentoCompilado: string | null = null;
let cacheTimestamp: number | null = null;
const CACHE_TTL_MS = 1000 * 60 * 60; // 1 hora de cache

// =====================================================
// CONSTANTES E UTILS COMPARTILHADOS (modo_favoritas + modo_estilo)
// =====================================================

const TEMAS_POOL = [
  'Gratidão', 'Fé', 'Esperança', 'Amor', 'Perdão', 'Confiança', 'Paz Interior',
  'Força na Adversidade', 'Paciência', 'Sabedoria', 'Propósito', 'Renovação',
  'Coragem', 'Humildade', 'Misericórdia', 'Alegria', 'Provisão de Deus',
  'Obediência', 'Descanso em Deus', 'Transformação', 'Graça', 'Comunhão',
  'Perseverança', 'Integridade', 'Liberdade', 'Cura Interior', 'Adoração',
  'Identidade em Cristo', 'Novo Começo', 'Fidelidade de Deus', 'Entrega Total',
  'Contentamento', 'Resiliência', 'Generosidade', 'Santidade', 'Direção Divina',
  'Consagração', 'Refúgio em Deus', 'Vitória Espiritual', 'Gratidão pelo Simples',
  'Família', 'Trabalho como Adoração', 'Ansiedade', 'Solidão', 'Recomeço',
  'Compromisso', 'Arrependimento', 'Restauração', 'Soberania de Deus', 'Eternidade'
];

const LIVROS_AT = ['Gênesis', 'Êxodo', 'Levítico', 'Números', 'Deuteronômio', 'Josué', 'Juízes', 'Rute', 'Samuel', 'Reis', 'Crônicas', 'Esdras', 'Neemias', 'Ester', 'Jó', 'Salmos', 'Provérbios', 'Eclesiastes', 'Cantares', 'Isaías', 'Jeremias', 'Lamentações', 'Ezequiel', 'Daniel', 'Oséias', 'Joel', 'Amós', 'Obadias', 'Jonas', 'Miquéias', 'Naum', 'Habacuque', 'Sofonias', 'Ageu', 'Zacarias', 'Malaquias'];
const LIVROS_NT = ['Mateus', 'Marcos', 'Lucas', 'João', 'Atos', 'Romanos', 'Coríntios', 'Gálatas', 'Efésios', 'Filipenses', 'Colossenses', 'Tessalonicenses', 'Timóteo', 'Tito', 'Filemom', 'Hebreus', 'Tiago', 'Pedro', 'Judas', 'Apocalipse'];

function extrairVersiculos(texto: string): string[] {
  const regex = /(?:\d\s)?[A-ZÀ-Ú][a-zà-ú]+\s+\d+[:\s]*\d+(?:\s*[-–]\s*\d+)?/g;
  const matches = texto.match(regex) || [];
  return matches.map(m => m.trim());
}

function extrairTemaDoTitulo(texto: string): string {
  const linhas = texto.split('\n').filter((l: string) => l.trim());
  const titulo = linhas[0] || '';
  return titulo.replace(/[*#📖🌟✨💫🙏❤️]/g, '').trim().substring(0, 50);
}

// Remove raciocínio/planejamento vazado do modelo que não pode virar devocional:
// blocos <thinking> (fechados OU sem fechamento), preâmbulos em inglês
// ("We need to...", "Now ensure...", "Message 2: Thinking:...") e em português
// ("Okay, entendido! Preparando..."), cercas de código, metadados de sementes e
// tags de categoria vazadas. Os devocionais são sempre em português.
function limparTextoGerado(texto: string): string {
  let t = (texto || '')
    .replace(/\r\n/g, '\n')
    .replace(/<thinking>[\s\S]*?<\/thinking>/gi, '\n')   // bloco fechado
    .replace(/<thinking>[\s\S]*$/gi, '\n')                // bloco sem fechamento
    .replace(/```(?:xml|json|markdown|text)?/gi, '')
    .replace(/\(\s*Sementes?\s*:[^)]*\)/gi, '')
    .replace(/\[(ORAÇÃO|REFLEXÃO|DEVOCIONAL|VERSÍCULO|DECLARAÇÃO|EXORTAÇÃO)\]\s*/gim, '');

  // Linhas de preâmbulo/raciocínio (PT + inglês) removidas por inteiro.
  const linhasRaciocinio = [
    /^\s*(?:okay|ok|certo|claro|perfeito|beleza|entendido|prontinho)\b[^\n]*\b(?:vamos|vou|gerar|gerando|preparando|prepara|entendido|seguindo|criar|criando|produzir)\b[^\n]*$/gim,
    /^\s*(?:okay|now|first|firstly|then|next|also|finally|we|we['’]ll|i['’]ll|let me|let['’]s|repeat|step \d+)\b[^\n]*$/gim,
    /^\s*(?:note|plan|thinking|planejamento|racioc[ií]nio)\s*:[^\n]*$/gim,
    /^\s*\[[^\]\n]{2,}\]\s*$/gim, // linha que é só um placeholder do template, ex.: [Título...]
    /^\s*(?:title|body|t[íi]tulo|corpo|closing|fechamento)\s*:[^\n]*$/gim, // rótulos de rascunho
    /^\s*sentence\s*\d+\s*[:.)\-–][^\n]*$/gim, // esqueleto vazado: "Sentence 1: Introduce passage."
    /^\s*(?:blank line|line break|new line|empty line|paragraph)\b[^\n]*$/gim, // "Blank line." / "Paragraph"
    /^\s*(?:introduce|introduces|explain|explains|describe|describes|summari[sz]e|conclude|mention|include|outline|draft|opening line|closing line)\b[^\n]*$/gim, // instruções de formato em inglês
  ];
  for (const re of linhasRaciocinio) t = t.replace(re, '');

  // "Message 2: **Título**" -> "**Título**" (mantém o corpo da mensagem).
  t = t.replace(/^\s*Message\s*\d+\s*[-—:.)]*\s*/gim, '');

  return t
    .replace(/^\s*\*\*\s*/gim, '**') // Corrige **  Espaço
    .replace(/^\s*\*\*\s*$/gim, '')  // Remove linhas só com **
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// Detecta quando o modelo vazou raciocinio/planejamento (geralmente em ingles)
// em vez de devolver a mensagem final. Devocionais sao sempre em portugues.
function pareceVazamentoRaciocinio(texto: string): boolean {
  const t = (texto || '').trim();
  if (!t) return true;
  if (/\b(we need to|we must|we['’]?ll|we will|we have to|let['’]?s|i need to|i['’]?ll|must follow|must not exceed|must be a single|aim around|single message|max \d+ characters?|in uppercase|format m[ée]dio|category \w+\s*:)\b/i.test(t)) return true;
  // Eco do template do prompt (placeholders) ou rótulos de rascunho — não é a mensagem final.
  if (/\[\s*(?:t[íi]tulo|corpo|fechamento|mensagem|body|title)/i.test(t)) return true;
  if (/vers[íi]culo de apoio|—\s*ref\b/i.test(t)) return true;
  if (/^\s*(?:title|body|t[íi]tulo|corpo|closing|fechamento)\s*:/im.test(t)) return true;
  // Esqueleto/outline vazado (o modelo descreve o formato em vez de escrevê-lo).
  if (/^\s*sentence\s*\d+\s*[:.]/im.test(t)) return true;
  if (/\b(blank line|introduce (?:the )?passage|explain (?:the )?meaning|opening line|closing line|first sentence|second sentence|third sentence)\b/i.test(t)) return true;
  const en = (t.toLowerCase().match(/\b(the|we|need|needs|must|should|verse|title|body|format|category|character|characters|produce|context|style|closing|brief|message|today|then|include|reference|maybe|aim|sentence|introduce|explain|meaning|passage|line|blank|paragraph|describe|summary|summari[sz]e|outline|draft|structure|opening)\b/g) || []).length;
  return en >= 4;
}

// Fallbacks seguros caso a geracao da Palavra da Manha falhe ou vaze raciocinio.
// São VÁRIOS e rotacionam por dia — antes era um texto único, então quando a
// geração falhava vários dias seguidos o app mostrava sempre a mesma mensagem.
const FALLBACKS_PALAVRA = [
  `NOVO DIA, NOVA GRAÇA

O Senhor preparou este dia para você. Respire fundo, entregue a Ele as suas preocupações e caminhe em paz, confiando que Ele cuida de cada detalhe da sua vida.

«Este é o dia que fez o Senhor; regozijemo-nos e alegremo-nos nele.»
Salmos 118:24

Vá com a certeza de que o amor de Deus te acompanha hoje.`,

  `AS MISERICÓRDIAS SE RENOVAM

O que passou, passou. Hoje a bondade de Deus recomeça sobre você — não pelo que fez, mas por quem Ele é. Levante os olhos e receba um novo começo.

«As misericórdias do Senhor são a causa de não sermos consumidos; renovam-se cada manhã.»
Lamentações 3:22-23

Comece este dia sabendo que a graça já chegou antes de você.`,

  `NÃO TEMA, EU TE SUSTENTO

Antes que a ansiedade fale mais alto, ouça a voz que te firma. Você não caminha sozinho: a mão que sustenta o universo segura também a sua.

«Não temas, porque eu sou contigo; eu te fortaleço, te ajudo e te sustento com a minha destra fiel.»
Isaías 41:10

Siga hoje apoiado n'Aquele que nunca solta a tua mão.`,

  `TROQUE A PREOCUPAÇÃO PELA PAZ

Há uma troca oferecida a você hoje: entregar o peso e receber a paz. Ore, agradeça, e deixe que Deus guarde o teu coração.

«Não estejais inquietos por coisa alguma; e a paz de Deus guardará os vossos corações.»
Filipenses 4:6-7

Entregue o dia nas mãos d'Ele e caminhe leve.`,

  `DEUS É O TEU REFÚGIO

Mesmo que tudo pareça instável, existe um lugar firme. Deus é abrigo e força — perto, presente e pronto para te socorrer agora.

«Deus é o nosso refúgio e fortaleza, socorro bem presente na angústia.»
Salmos 46:1

Descanse hoje na certeza de que Ele está contigo.`,
];

// Escolhe um fallback de forma determinística por data (rotaciona ao longo dos dias).
function escolherFallbackPalavra(data: string): string {
  const d = new Date(data);
  const chave = Number.isNaN(d.getTime())
    ? 0
    : d.getUTCFullYear() * 372 + d.getUTCMonth() * 31 + d.getUTCDate();
  return FALLBACKS_PALAVRA[Math.abs(chave) % FALLBACKS_PALAVRA.length];
}

// ── Extração de versículo (para anti-repetição de 365 dias) ──────────────────
// Livros da Bíblia em PT (normalizados: minúsculo, sem acento) para validar
// referências extraídas e evitar falsos positivos como "capítulo 3:16".
const LIVROS_BIBLIA_SET = new Set([
  'genesis','exodo','levitico','numeros','deuteronomio','josue','juizes','rute',
  '1 samuel','2 samuel','1 reis','2 reis','1 cronicas','2 cronicas','esdras','neemias','ester',
  'jo','salmo','salmos','proverbios','eclesiastes','cantico','canticos','cantares',
  'isaias','jeremias','lamentacoes','ezequiel','daniel','oseias','joel','amos','obadias','jonas',
  'miqueias','naum','habacuque','sofonias','ageu','zacarias','malaquias',
  'mateus','marcos','lucas','joao','atos','romanos','1 corintios','2 corintios','galatas',
  'efesios','filipenses','colossenses','1 tessalonicenses','2 tessalonicenses','1 timoteo','2 timoteo',
  'tito','filemom','hebreus','tiago','1 pedro','2 pedro','1 joao','2 joao','3 joao','judas','apocalipse',
]);

function normalizarRefTexto(s: string): string {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Extrai a referência bíblica de um texto (ex.: "Salmos 118:24", "1 Coríntios 13:4").
// Prefere a ÚLTIMA referência válida (normalmente o versículo de apoio no fim).
function extrairVersiculoRef(texto: string): { ref: string; norm: string } | null {
  if (!texto) return null;
  const re = /([1-3]|I{1,3})?\s*([A-Za-zÀ-ÿ]{2,})(?:\s+([A-Za-zÀ-ÿ]{2,}))?\.?\s+(\d{1,3})\s*[:.]\s*(\d{1,3})(?:\s*-\s*\d{1,3})?/g;
  let m: RegExpExecArray | null;
  const achados: { ref: string; norm: string }[] = [];
  while ((m = re.exec(texto)) !== null) {
    const numPref = (m[1] || '').replace(/I{3}/i, '3').replace(/I{2}/i, '2').replace(/I/i, '1').trim();
    const w1 = m[2];
    const w2 = m[3] || '';
    const cap = m[4];
    const ver = m[5];
    const cand2 = normalizarRefTexto((numPref ? numPref + ' ' : '') + w1 + (w2 ? ' ' + w2 : ''));
    const cand1 = normalizarRefTexto((numPref ? numPref + ' ' : '') + w1);
    let bookNorm = '';
    let bookDisp = '';
    const candW2 = w2 ? normalizarRefTexto(w2) : '';
    if (w2 && LIVROS_BIBLIA_SET.has(cand2)) {
      bookNorm = cand2;
      bookDisp = (numPref ? numPref + ' ' : '') + w1 + ' ' + w2;
    } else if (LIVROS_BIBLIA_SET.has(cand1)) {
      bookNorm = cand1;
      bookDisp = (numPref ? numPref + ' ' : '') + w1;
    } else if (candW2 && LIVROS_BIBLIA_SET.has(candW2)) {
      // Palavra comum antes do livro (ex.: "diz João 3:16"): o 2º token é o livro.
      bookNorm = candW2;
      bookDisp = w2;
    }
    if (!bookNorm) continue;
    achados.push({ ref: `${bookDisp} ${cap}:${ver}`, norm: `${bookNorm} ${cap}:${ver}` });
  }
  return achados.length ? achados[achados.length - 1] : null;
}

// Trava de léxico: força o modelo a reaproveitar o vocabulário dominante do DNA.
const STOPWORDS_DNA = new Set([
  'de', 'da', 'do', 'das', 'dos', 'em', 'no', 'na', 'nos', 'nas', 'um', 'uma', 'uns', 'umas',
  'por', 'para', 'com', 'sem', 'que', 'como', 'mas', 'ou', 'se', 'ao', 'aos', 'à', 'às',
  'e', 'o', 'a', 'os', 'as', 'eu', 'tu', 'ele', 'ela', 'nós', 'nos', 'vós', 'vocês', 'voce',
  'me', 'te', 'lhe', 'lhes', 'meu', 'minha', 'seu', 'sua', 'teu', 'tua', 'esse', 'essa',
  'isso', 'isto', 'aquele', 'aquela', 'aqui', 'ali', 'já', 'ja', 'não', 'nao', 'sim',
  'ser', 'estar', 'ter', 'fazer', 'foi', 'era', 'são', 'sao', 'será', 'sera', 'vai'
]);

function normalizarLexToken(token: string): string {
  return token
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function extrairLexicoDominante(textos: string[], limite: number = 24): string[] {
  const freq = new Map<string, number>();
  const original = new Map<string, string>();

  for (const texto of textos) {
    const tokens = texto.match(/[A-Za-zÀ-ÖØ-öø-ÿ0-9]+/g) || [];
    for (const token of tokens) {
      const norm = normalizarLexToken(token);
      if (!norm || norm.length < 4) continue;
      if (STOPWORDS_DNA.has(norm)) continue;
      if (/^\d+$/.test(norm)) continue;

      freq.set(norm, (freq.get(norm) || 0) + 1);
      if (!original.has(norm)) {
        original.set(norm, token.toLowerCase());
      }
    }
  }

  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limite)
    .map(([norm]) => original.get(norm) || norm);
}

function buildLexicoLockInstruction(textos: string[], minTermosPorMensagem: number): string {
  const lexico = extrairLexicoDominante(textos, 24);
  if (lexico.length === 0) return '';

  const termos = lexico.map((t) => `"${t}"`).join(', ');
  return `
## 🔒 TRAVA DE LÉXICO DNA (OBRIGATÓRIA):
Use o vocabulário dominante do DNA abaixo.
Em CADA mensagem:
1. Inclua pelo menos ${minTermosPorMensagem} termos DIFERENTES desta lista.
2. Não troque por sinônimos genéricos quando houver termo equivalente no DNA.
3. Evite palavras "neutras de IA" se não estiverem nas sementes.

LÉXICO DNA: ${termos}
`;
}

// Helper para buscar histórico em paralelo
async function fetchAntiRepeticaoHistory(
  supabase: any,
  buildStyle: string = 'favoritas',
  categoriaAlvo?: string
): Promise<{ globalRecentes: any[], catRecentes: any[] }> {
  const style = (buildStyle || 'favoritas').toLowerCase().trim();
  const dataCorte = new Date();
  dataCorte.setDate(dataCorte.getDate() - 7);

  // 1. Busca Global (50 últimas)
  const queryGlobal = supabase
    .from("dna_geracoes")
    .select("texto_msg, versiculos_usados, created_at")
    .gte("created_at", dataCorte.toISOString())
    .order("created_at", { ascending: false })
    .limit(50);

  // 2. Busca por Categoria (50 últimas)
  let queryCat = supabase
    .from("dna_geracoes")
    .select("texto_msg, tema_principal, versiculos_usados, titulo, imagem_central, abertura_tipo, fechamento_tipo, punchline, build_style, categoria")
    .gte("created_at", dataCorte.toISOString())
    .order("created_at", { ascending: false })
    .limit(50);

  if (style === 'favoritas') {
    queryCat = queryCat.or('build_style.eq.favoritas,build_style.is.null');
  } else if (style === 'estilo') {
    queryCat = queryCat.eq('build_style', 'estilo');
  }

  if (categoriaAlvo && categoriaAlvo !== 'todas') {
    queryCat = queryCat.eq('categoria', categoriaAlvo);
  }

  const [resGlobal, resCat] = await Promise.all([queryGlobal, queryCat]);

  return {
    globalRecentes: resGlobal.data || [],
    catRecentes: resCat.data || []
  };
}

// Anti-repetição centralizada: consulta gerações recentes e monta contexto
async function buildAntiRepeticaoContext(
  supabase: any,
  quantidade: number,
  dnaTextsParaCrosscheck?: string[],
  buildStyle: string = 'favoritas',
  categoriaAlvo?: string,
  historicoPreCarregado?: { globalRecentes: any[], catRecentes: any[] } // NOVO: Dados pré-carregados
): Promise<{
  contexto: string;
  temasUnicos: string[];
  versiculosUnicos: string[];
  versiculosDnaUnicos: string[];
  contAT: number;
  contNT: number;
}> {
  // Normalização do buildStyle
  const style = (buildStyle || 'favoritas').toLowerCase().trim();

  // Extrair versículos do DNA Base (crosscheck)
  const versiculosDoDna: string[] = [];
  if (dnaTextsParaCrosscheck) {
    dnaTextsParaCrosscheck.forEach((texto: string) => {
      versiculosDoDna.push(...extrairVersiculos(texto));
    });
  }
  const versiculosDnaUnicos = [...new Set(versiculosDoDna)];

  // Busca de Dados (Híbrida: Pre-carregado ou Fallback)
  let globalRecentes: any[] = [];
  let catRecentes: any[] = [];

  if (historicoPreCarregado) {
    globalRecentes = historicoPreCarregado.globalRecentes;
    catRecentes = historicoPreCarregado.catRecentes;
  } else {
    // Fallback: Busca agora se não veio pré-carregado
    const historico = await fetchAntiRepeticaoHistory(supabase, buildStyle, categoriaAlvo);
    globalRecentes = historico.globalRecentes;
    catRecentes = historico.catRecentes;
  }

  // Unificar listas (priorizando dados completos da busca por categoria)
  const geracoesRecentes = [...(catRecentes || [])];

  if ((!catRecentes?.length && !globalRecentes?.length)) {
    // Sem gerações recentes — só crosscheck de DNA se houver
    if (versiculosDnaUnicos.length > 0) {
      return {
        contexto: `

## ⚠️ CRUZAMENTO DE PASSAGENS:
O DNA Base contém estes versículos: ${versiculosDnaUnicos.slice(0, 10).join(', ')}

**IMPORTANTE**: Não use apenas esses versículos! CRUZE com passagens de outros livros da Bíblia.
Exemplo: Se o DNA tem Salmos 23, conecte com João 10 (Bom Pastor) ou Ezequiel 34.

### 📖 EQUILÍBRIO BÍBLICO:
Distribua versículos entre Antigo e Novo Testamento de forma equilibrada (50/50).
`,
        temasUnicos: [],
        versiculosUnicos: [],
        versiculosDnaUnicos,
        contAT: 0,
        contNT: 0
      };
    }
    return { contexto: '', temasUnicos: [], versiculosUnicos: [], versiculosDnaUnicos: [], contAT: 0, contNT: 0 };
  }

  console.log(`🔄 [ANTI-REPETIÇÃO] Modo: ${style} | Analisando ${catRecentes?.length || 0} msgs da categoria + ${globalRecentes?.length || 0} msgs globais`);

  const temasColetados: string[] = [];
  const versiculosColetados: string[] = []; // Este acumula de TODOS (Global + Categoria)
  const imagensColetadas: string[] = [];
  const aberturasColetadas: string[] = [];
  const fechamentosColetados: string[] = [];
  const punchlinesColetadas: string[] = [];
  const titulosColetados: string[] = [];

  // 1. Processar Categoria (Contexto Semântico)
  if (catRecentes) {
    catRecentes.forEach((g: any) => {
      // Temas
      if (g.tema_principal) {
        temasColetados.push(g.tema_principal);
      } else {
        const temaExtraido = extrairTemaDoTitulo(g.texto_msg || '');
        if (temaExtraido) temasColetados.push(temaExtraido);
      }
      // Novos campos profundos
      if (g.imagem_central) imagensColetadas.push(g.imagem_central);
      if (g.abertura_tipo) aberturasColetadas.push(g.abertura_tipo);
      if (g.fechamento_tipo) fechamentosColetados.push(g.fechamento_tipo);
      if (g.punchline) punchlinesColetadas.push(g.punchline);
      if (g.titulo) titulosColetados.push(g.titulo);

      // Versículos da categoria também contam
      if (g.versiculos_usados && Array.isArray(g.versiculos_usados)) {
        versiculosColetados.push(...g.versiculos_usados);
      } else {
        versiculosColetados.push(...extrairVersiculos(g.texto_msg || ''));
      }
    });
  }

  // 2. Processar Global (Apenas Versículos)
  if (globalRecentes) {
    globalRecentes.forEach((g: any) => {
      if (g.versiculos_usados && Array.isArray(g.versiculos_usados)) {
        versiculosColetados.push(...g.versiculos_usados);
      } else {
        versiculosColetados.push(...extrairVersiculos(g.texto_msg || ''));
      }
    });
  }

  const temasUnicos = [...new Set(temasColetados)].slice(0, 20);
  const versiculosUnicos = [...new Set(versiculosColetados)].slice(0, 30);
  const imagensUnicas = [...new Set(imagensColetadas)];
  const aberturasUnicas = [...new Set(aberturasColetadas)];
  const fechamentosUnicos = [...new Set(fechamentosColetados)];

  // Contagem de frequência de aberturas e fechamentos (para detectar excesso)
  const contAbertura: Record<string, number> = {};
  aberturasColetadas.forEach(a => { contAbertura[a] = (contAbertura[a] || 0) + 1; });
  const contFechamento: Record<string, number> = {};
  fechamentosColetados.forEach(f => { contFechamento[f] = (contFechamento[f] || 0) + 1; });

  // Detecção dinâmica de palavras saturadas nas punchlines
  const palavrasPunchlines: Record<string, number> = {};
  punchlinesColetadas.forEach(p => {
    const palavras = p.toLowerCase()
      .replace(/[.,!?;:""'"—\-]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 4); // Só palavras significativas
    palavras.forEach(w => { palavrasPunchlines[w] = (palavrasPunchlines[w] || 0) + 1; });
  });
  // Palavras que aparecem em 3+ punchlines = saturadas
  const palavrasSaturadasDinamicas = Object.entries(palavrasPunchlines)
    .filter(([_, c]) => c >= 3)
    .filter(([w]) => !['deus', 'senhor', 'jesus', 'cristo', 'coração', 'porque', 'quando', 'ainda', 'sobre', 'todos', 'entre', 'neste', 'mesmo', 'voces', 'nosso', 'minha'].includes(w))
    .map(([w, c]) => `"${w}" (${c}x)`)
    .slice(0, 10);

  // Detectar padrão de título saturado
  const padroesTitle: Record<string, number> = { 'a_de': 0, 'a_na': 0, 'a_e': 0, 'o_de': 0, 'o_na': 0 };
  titulosColetados.forEach(t => {
    const tLow = t.toLowerCase();
    if (/^(a|o)\s+\w+\s+(d[aoe]|n[ao])\s+/i.test(tLow)) padroesTitle['a_de']++;
    if (/^(a|o)\s+\w+\s+e\s+/i.test(tLow)) padroesTitle['a_e']++;
  });
  const tituloPatternSaturado = padroesTitle['a_de'] + padroesTitle['a_e'] >= 4;

  // Pegar as últimas 3 imagens (para evitar repetição imediata)
  const ultimas3Imagens = imagensColetadas.slice(0, 3);
  // Pegar os últimos 3 fechamentos
  const ultimos3Fechamentos = fechamentosColetados.slice(0, 3);

  console.log(`📊 [ANTI-REP] Temas: ${temasUnicos.length}, Versículos: ${versiculosUnicos.length}, Imagens: ${imagensUnicas.length}, Aberturas: ${aberturasUnicas.length}, Fechamentos: ${fechamentosUnicos.length}`);

  // Limitar resumo de títulos a 15
  const resumoGeracoes = titulosColetados.length > 0
    ? titulosColetados.slice(0, 15).map(t => `- ${t.substring(0, 60)}`).join('\n')
    : geracoesRecentes.slice(0, 15)
      .map((g: any) => {
        const texto = g.texto_msg || '';
        const linhas = texto.split('\n').filter((l: string) => l.trim());
        return `- ${linhas[0]?.substring(0, 60) || ''}`;
      })
      .join('\n');

  // Rotação AT/NT
  let contAT = 0, contNT = 0;
  versiculosUnicos.forEach((v: string) => {
    if (LIVROS_AT.some(l => v.includes(l))) contAT++;
    else if (LIVROS_NT.some(l => v.includes(l))) contNT++;
  });

  let instrucaoTestamento = '';
  if (contAT > contNT + 2) {
    instrucaoTestamento = `\n### 📖 ROTAÇÃO BÍBLICA OBRIGATÓRIA:\nAs últimas gerações usaram MUITO o Antigo Testamento (${contAT} AT vs ${contNT} NT).\n**PRIORIZE O NOVO TESTAMENTO** nesta geração: Romanos, João, Efésios, Filipenses, Tiago, Hebreus, etc.\nPelo menos ${Math.ceil(quantidade * 0.6)} mensagens devem usar versículos do NT.\n`;
  } else if (contNT > contAT + 2) {
    instrucaoTestamento = `\n### 📖 ROTAÇÃO BÍBLICA OBRIGATÓRIA:\nAs últimas gerações usaram MUITO o Novo Testamento (${contNT} NT vs ${contAT} AT).\n**PRIORIZE O ANTIGO TESTAMENTO** nesta geração: Salmos, Provérbios, Isaías, Jeremias, Eclesiastes, Daniel, etc.\nPelo menos ${Math.ceil(quantidade * 0.6)} mensagens devem usar versículos do AT.\n`;
  } else {
    instrucaoTestamento = `\n### 📖 EQUILÍBRIO BÍBLICO:\nDistribua versículos entre Antigo e Novo Testamento de forma equilibrada (50/50).\n`;
  }

  // =====================================================
  // BLOCO ANTI-MOLDE: Proibições de estrutura repetitiva
  // =====================================================
  const aberturaDominante = Object.entries(contAbertura).sort((a, b) => b[1] - a[1])[0];
  const fechamentoDominante = Object.entries(contFechamento).sort((a, b) => b[1] - a[1])[0];

  // Calcular distribuição ideal de aberturas/fechamentos para o lote
  const TIPOS_ABERTURA = ['cena', 'afirmacao', 'biblica', 'imperativo', 'pergunta', 'narrativa'];
  const TIPOS_FECHAMENTO = ['oracao', 'imperativo', 'declaracao', 'presenca', 'punchline', 'promessa'];

  let blocoAntiMolde = `
### 🚫 PROIBIÇÕES DE ESTRUTURA (ANTI-MOLDE) — ⭐ PRIORIDADE MÁXIMA:

**TIPOS DE ABERTURA** (como a mensagem COMEÇA após o título):
- cena: descreve uma situação do cotidiano ("A notificação...", "O quarto escuro...", "Sabe aquele momento...")
- afirmacao: declaração forte tipo "X é Y" ("A fé não é sentimento, é decisão")
- biblica: abre com versículo ou referência direta
- pergunta: abre com pergunta reflexiva
- narrativa: conta uma história curta
- imperativo: ordem/chamado direto ("Pare.", "Olhe.", "Levante-se.")

**TIPOS DE FECHAMENTO** (como a mensagem TERMINA):
- oracao: termina como oração ("Senhor...", "Amém")
- imperativo: termina com comando ("Descanse.", "Avance.", "Solte.")
- declaracao: termina com declaração de fé em 1ª pessoa
- presenca: termina mencionando Deus agindo ("Deus está...", "Ele te sustenta...")
- promessa: termina com promessa bíblica
- punchline: termina com frase de impacto/efeito

**REGRAS OBRIGATÓRIAS PARA O LOTE DE ${quantidade} MENSAGENS:**
1. ⛔ MÁXIMO 2 mensagens podem ter a MESMA abertura no lote. Distribua entre pelo menos 3 tipos.
2. ⛔ MÁXIMO 2 mensagens podem ter o MESMO fechamento no lote. Distribua entre pelo menos 3 tipos.
3. ⛔ PROIBIDO: "Boa noite!" + cena curta em TODAS as mensagens. Alterne: umas sem saudação, umas com "Boa noite!" direto na reflexão.
4. ⛔ PROIBIDO: Fechar com frase curta imperativa ("Celebre.", "Descanse.", "Avance.") em mais de 2 mensagens.
5. ⛔ PROIBIDO título no formato "A ___ da/na/e ___" em mais de 2 mensagens do lote.`;

  if (aberturaDominante && aberturaDominante[1] >= 3) {
    blocoAntiMolde += `\n\n🚨 **ALERTA CRÍTICO**: Abertura tipo "${aberturaDominante[0]}" foi usada ${aberturaDominante[1]}x nas últimas gerações. PROIBIDO usar "${aberturaDominante[0]}" em mais de 1 mensagem neste lote! Use: ${TIPOS_ABERTURA.filter(t => t !== aberturaDominante[0]).join(', ')}.`;
  }
  if (fechamentoDominante && fechamentoDominante[1] >= 3) {
    blocoAntiMolde += `\n🚨 **ALERTA CRÍTICO**: Fechamento tipo "${fechamentoDominante[0]}" foi usado ${fechamentoDominante[1]}x nas últimas gerações. PROIBIDO usar "${fechamentoDominante[0]}" em mais de 1 mensagem neste lote! Use: ${TIPOS_FECHAMENTO.filter(t => t !== fechamentoDominante[0]).join(', ')}.`;
  }

  // =====================================================
  // BLOCO IMAGENS/METÁFORAS USADAS
  // =====================================================
  // Imagens mais usadas (para forçar variedade)
  const contImagem: Record<string, number> = {};
  imagensColetadas.forEach(i => { contImagem[i] = (contImagem[i] || 0) + 1; });
  const imagensSaturadas = Object.entries(contImagem).filter(([_, c]) => c >= 3).map(([i, c]) => `${i} (${c}x)`);

  let blocoImagens = '';
  if (imagensUnicas.length > 0) {
    blocoImagens = `
### 🧠 IMAGENS/METÁFORAS USADAS RECENTEMENTE:
${imagensUnicas.map(i => `- ${i} (${contImagem[i] || 1}x)`).join('\n')}
${imagensSaturadas.length > 0 ? `\n🚨 **SATURADAS (PROIBIDAS neste lote)**: ${imagensSaturadas.join(', ')}` : ''}
${ultimas3Imagens.length > 0 ? `⛔ **Últimas 3 usadas (PROIBIDAS)**: ${ultimas3Imagens.join(', ')}` : ''}

**REGRAS:**
- NÃO repetir a mesma imagem central no mesmo lote (CADA mensagem = imagem diferente).
- NÃO usar imagens saturadas listadas acima.
- EXPLORE imagens NOVAS como: carta, tecido, janela, pérola, ponte, relógio, chave, escada, poço, vela, argila, sal, pedra preciosa, mapa, bússola interna, moldura.`;
  }

  // =====================================================
  // BLOCO FRASES SATURADAS
  // =====================================================
  const blocoFrasesSaturadas = `
### 🚫 FRASES/PADRÕES SATURADOS (PROIBIDOS):
**Clichês proibidos:**
- "Deus está no controle"
- "confie no processo" / "abrace o processo"
- "porto seguro"
- "obra-prima"
- "farol na tempestade"
- "A fé é..." / "A gratidão transforma..." / "Deus transforma..."
- "canteiro de obras" / "gente em construção"
- "sua singularidade é..." / "design divino"
- "floresce" / "florescer" (SATURADA — usada em excesso)

**Padrões de fechamento proibidos (muito repetidos):**
- Fechar com frase curta tipo "A [substantivo] [verbo]." (ex: "A honestidade edifica.", "A fragilidade revela.", "A gratidão floresce.")
- Fechar com "Celebre sua/o...", "Abrace o/a...", "Solte o que..."
${palavrasSaturadasDinamicas.length > 0 ? `\n**⚠️ PALAVRAS DETECTADAS COMO SATURADAS NAS ÚLTIMAS GERAÇÕES:**\n${palavrasSaturadasDinamicas.join(', ')}\nEVITE usar essas palavras nos fechamentos.` : ''}
${tituloPatternSaturado ? `\n**⚠️ PADRÃO DE TÍTULO SATURADO:** "A/O ___ da/na/e ___" apareceu ${padroesTitle['a_de'] + padroesTitle['a_e']}x. USE outros formatos: verbos, comandos, perguntas, frases impactantes.` : ''}

REGRA: Se precisar expressar essas ideias, reescreva com linguagem DIRETA, COLOQUIAL, sem poesia.`;

  // =====================================================
  // BLOCO CHECKLIST DE VALIDAÇÃO
  // =====================================================
  // Montar distribuição sugerida para o lote
  const aberturasSugeridas = TIPOS_ABERTURA.filter(t => t !== aberturaDominante?.[0]).slice(0, 4);
  const fechamentosSugeridos = TIPOS_FECHAMENTO.filter(t => t !== fechamentoDominante?.[0]).slice(0, 4);

  const blocoChecklist = `
### ✅ CHECKLIST OBRIGATÓRIO (valide CADA mensagem ANTES de finalizar):
1) ⬜ Meu título NÃO segue o padrão "A ___ da ___" nem "A ___ e ___" se já apareceu mais de 2x.
2) ⬜ Minha imagem central NÃO é uma das saturadas/proibidas acima.
3) ⬜ Minha última frase NÃO segue o padrão "[Substantivo] + [verbo]." curto.
4) ⬜ Minha abertura NÃO é do tipo "${aberturaDominante?.[0] || 'imperativo'}" (já saturado).
5) ⬜ Meu fechamento NÃO é do tipo "${fechamentoDominante?.[0] || 'imperativo'}" (já saturado).
6) ⬜ Meu versículo NÃO está na lista proibida.
7) ⬜ No lote completo: pelo menos 3 tipos DIFERENTES de abertura E 3 tipos DIFERENTES de fechamento.

📋 **DISTRIBUIÇÃO SUGERIDA PARA O LOTE:**
- Aberturas: use principalmente ${aberturasSugeridas.join(', ')}
- Fechamentos: use principalmente ${fechamentosSugeridos.join(', ')}`;

  // =====================================================
  // MONTAR CONTEXTO FINAL
  // =====================================================
  let contexto = '';

  if (style === 'favoritas') {
    // MODO FAVORITAS = REMIX — anti-repetição MODERADA
    // Evita mesma IDEIA/VERSO E agora também alerta sobre aberturas/fechamentos repetitivos

    // Anti-molde LEVE para favoritas (alerta, não proíbe)
    let alertaVariedadeFavoritas = '';
    const aberturaDomFav = Object.entries(contAbertura).sort((a, b) => b[1] - a[1])[0];
    const fechamentoDomFav = Object.entries(contFechamento).sort((a, b) => b[1] - a[1])[0];
    if (aberturaDomFav && aberturaDomFav[1] >= 4) {
      alertaVariedadeFavoritas += `\n⚠️ **VARIEDADE DE ABERTURA**: O tipo "${aberturaDomFav[0]}" foi usado ${aberturaDomFav[1]}x recentemente. VARIE: misture afirmacao, imperativo, cena, biblica.`;
    }
    if (fechamentoDomFav && fechamentoDomFav[1] >= 4) {
      alertaVariedadeFavoritas += `\n⚠️ **VARIEDADE DE FECHAMENTO**: O tipo "${fechamentoDomFav[0]}" foi usado ${fechamentoDomFav[1]}x recentemente. VARIE: misture punchline, oracao, imperativo, presenca.`;
    }
    // Detectar saudação repetitiva
    const saudacaoRepetitiva = geracoesRecentes.filter((g: any) => {
      const texto = g.texto_msg || '';
      return /^(Bom dia|Boa tarde|Boa noite|Boa madrugada)/i.test(texto.trim());
    }).length;
    if (saudacaoRepetitiva >= 5) {
      alertaVariedadeFavoritas += `\n⚠️ **SAUDAÇÃO REPETITIVA**: ${saudacaoRepetitiva}/${geracoesRecentes.length} gerações recentes começam com saudação. NÃO comece TODAS com saudação — alterne: umas com, umas sem.`;
    }

    contexto = `

## 🔄 ANTI-REPETIÇÃO MODO REMIX:

### 🚫 VERSÍCULOS JÁ USADOS (não repita o mesmo verso no lote):
${versiculosUnicos.length > 0 ? versiculosUnicos.slice(0, 15).join(', ') : 'Nenhum'}

### 🔸 TEMAS GERADOS RECENTEMENTE (varie a ideia central):
${temasUnicos.length > 0 ? temasUnicos.slice(0, 10).map(t => `- ${t}`).join('\n') : '- (sem dados)'}

### 📋 ÚLTIMAS GERAÇÕES (evite remixar a mesma ideia):
${resumoGeracoes}
${alertaVariedadeFavoritas}

**REGRA REMIX:** Você pode (e deve) manter o TOM, o VOCABULÁRIO e a ESTRUTURA das favoritas.
O que NÃO pode é gerar a mesma IDEIA/MENSAGEM que já foi gerada nos últimos 7 dias.
`;
  } else {
    // estilo
    contexto = `
## ⛔ SISTEMA ANTI-REPETIÇÃO PROFUNDA (CRÍTICO):

### 🚫 TEMAS PROIBIDOS (últimos 7 dias):
${temasUnicos.map(t => `- ${t}`).join('\n')}

### 🚫 VERSÍCULOS PROIBIDOS:
${versiculosUnicos.slice(0, 15).join(', ')}

### 📋 TÍTULOS RECENTES (não repita):
${resumoGeracoes}
${blocoAntiMolde}
${blocoImagens}
${blocoFrasesSaturadas}
${blocoChecklist}
`;
  }

  contexto += instrucaoTestamento;

  contexto += `\n**PENALIDADE**: Se repetir tema, versículo, imagem central, PALAVRA-CHAVE de algum título recente listado acima, ou padrão de abertura/fechamento da lista, a mensagem será DESCARTADA. Os títulos recentes mostram o que JÁ FOI dito nos últimos dias — crie algo de assunto DIFERENTE.\n`;

  return { contexto, temasUnicos, versiculosUnicos, versiculosDnaUnicos, contAT, contNT };
}

Deno.serve(async (req) => {
  // Extrair origin para CORS
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  // Tratamento de pre-flight request (OPTIONS)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 2. Receber dados do Frontend
    const { modo_id, data, fonte_rss, pergunta, filtros, referencia, versiculos, parte, tipo_estudo, force_live_refresh } = await req.json();
    console.log(`🚀 Iniciando execução. Modo: ${modo_id}, Data: ${data}, Fonte RSS: ${fonte_rss || 'auto'}, Refresh ao vivo: ${force_live_refresh ? 'sim' : 'nao'}`);
    if (pergunta) console.log(`💬 Pergunta do chat: ${pergunta.substring(0, 100)}...`);
    if (filtros) console.log(`🔍 Filtros:`, filtros);

    if (!modo_id || !data) {
      throw new Error("Faltam dados obrigatórios: modo_id ou data.");
    }

    // ========================================
    // MODO ESPECIAL: DEVOCIONAL EXTERNO (BYPASS IA)
    // ========================================
    if (modo_id === 'devocional_externo') {
      console.log(`📡 [MODO ESPECIAL] Devocional Externo - fonte: ${fonte_rss}`);

      // Mapeamento de fontes

      const fontesValidas = ['voltemos', 'bible_gateway', 'instagram', 'tribo_juda'];
      let fonteEscolhida = fontesValidas.includes(fonte_rss) ? fonte_rss : 'voltemos';

      let conteudoExterno: any = "";
      let postsInstagram: any[] = [];

      if (fonteEscolhida === 'instagram' || fonteEscolhida === 'tribo_juda') {
        const username = fonteEscolhida === 'tribo_juda' ? "tribodejuda20" : "evangelhoparatodos__";
        // Inicializar Supabase Client para cache
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabaseAdmin = createClient(supabaseUrl, serviceKey);
        const forceLiveRefresh = force_live_refresh === true;

        // 1. Tentar buscar do CACHE do dia-alvo em America/Sao_Paulo.
        // Isso evita reaproveitar um post de ontem só porque ele foi salvo há menos de 24h.
        const { startUtcIso, endUtcIso, mode } = getCacheRangeForSaoPauloDate(data);
        if (mode === 'calendar_day') {
          console.log(`🔍 [CACHE] Buscando posts de @${username} publicados em ${data} (SP) | UTC ${startUtcIso} -> ${endUtcIso}...`);
        } else {
          console.warn(`⚠️ [CACHE] Data inválida (${data}). Fallback para janela móvel: ${startUtcIso} -> ${endUtcIso}`);
        }

        const { data: cachedPosts, error: cacheError } = await supabaseAdmin
          .from('devocional_externo_posts')
          .select('*')
          .eq('author_name', username) // Filtrar pelo username correto
          .gte('published_at', startUtcIso)
          .lt('published_at', endUtcIso)
          .order('published_at', { ascending: false })
          .limit(6);

        if (cacheError) {
          console.error("❌ [CACHE] Erro ao buscar posts no banco:", cacheError);
        }

        if (cachedPosts && cachedPosts.length > 0 && !forceLiveRefresh) {
          console.log(`✅ [CACHE] ${cachedPosts.length} posts encontrados no banco. (Bypass Apify)`);
          postsInstagram = cachedPosts;
        } else {
          if (forceLiveRefresh) {
            console.log(`🔄 [APIFY] Refresh ao vivo solicitado para @${username}. Consultando Instagram mesmo com cache do dia...`);
          } else {
            console.log(`⚠️ [CACHE] Nenhum post recente encontrado. Buscando do Instagram (Apify)...`);
          }

          // 2. Se não tiver cache, buscar do APIFY + OCR
          postsInstagram = await consultarInstagram(username);

          // Se houver posts, salvar no banco
          if (postsInstagram.length > 0) {
            // Só cacheia posts COM [OCR]: um re-scrape que falhou o OCR
            // (legenda-only) NÃO pode sobrescrever um [OCR] bom salvo numa run
            // anterior do mesmo dia (falha "grudenta"). Posts sem OCR seriam
            // pulados pela política ESTRITO de qualquer forma.
            const postsParaCache = postsInstagram.filter(
              (p: any) => typeof p.content === 'string' && p.content.includes('[OCR]')
            );

            if (postsParaCache.length > 0) {
              console.log(`💾 [DB] Salvando ${postsParaCache.length} posts COM OCR (de ${postsInstagram.length})...`);

              const { error: upsertError } = await supabaseAdmin
                .from('devocional_externo_posts')
                .upsert(postsParaCache, { onConflict: 'source, external_id' });

              if (upsertError) {
                console.error("❌ [DB] Erro ao salvar posts:", upsertError);
              } else {
                console.log("✅ [DB] Posts salvos/atualizados com sucesso.");
              }
            } else {
              console.log(`⚠️ [DB] Nenhum post com OCR para cachear (${postsInstagram.length} só legenda) — cache anterior preservado.`);
            }
          } else if (cachedPosts && cachedPosts.length > 0) {
            console.warn(`⚠️ [APIFY] Refresh ao vivo não retornou posts. Usando ${cachedPosts.length} posts do cache como fallback.`);
            postsInstagram = cachedPosts;
          }
        }

        // Para compatibilidade com o frontend atual que espera 'resultado' string ou objeto
        if (postsInstagram.length > 0) {
          conteudoExterno = postsInstagram;
        } else {
          conteudoExterno = "Nenhum post encontrado ou erro na API.";
        }
      } else {
        conteudoExterno = await consultarRSS(fonteEscolhida);
      }

      console.log(`✅ Devocional externo obtido de: ${fonteEscolhida}`);

      return new Response(
        JSON.stringify({
          ok: true,
          resultado: conteudoExterno,
          fonte: fonteEscolhida,
          tipo: 'devocional_externo',
          dados_estruturados: postsInstagram
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200
        }
      );
    }

    // ========================================
    // MODO ESPECIAL: FAVORITAS (GERA 10 MSG DO DNA)
    // ========================================
    if (modo_id === 'modo_favoritas') {
      console.log(`✨ [MODO FAVORITAS] Gerando 10 mensagens baseadas nas favoritas...`);

      // Inicializar Supabase
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const geminiKey = Deno.env.get("OPENROUTER_API_KEY") || Deno.env.get("GEMINI_API_KEY") || Deno.env.get("GEMINI_KEY");

      if (!supabaseUrl || !serviceKey || !geminiKey) {
        throw new Error("Variáveis de ambiente não configuradas.");
      }

      const supabase = createClient(supabaseUrl, serviceKey);

      // 🚀 PARALLEL FETCH: Iniciar busca de histórico enquanto processamos DNA
      const promiseHistorico = fetchAntiRepeticaoHistory(supabase, 'favoritas', filtros?.categoria);

      // 1. Buscar fonte de inspiração (DNA Categorizado OU Favoritas)
      const categoriaFiltro = filtros?.categoria; // Categoria selecionada no frontend
      const contextoManual = filtros?.contextoManual; // Array de strings (seleção manual)
      const contextoEstrategia = filtros?.contextoEstrategia || 'recent_5'; // default: 5 últimas
      const neutro = filtros?.neutro || false;

      let fonteInspiracao: any[] = [];
      let fonteNome = '';

      // Se tem categoria definida, busca do DNA Categorizado
      if (categoriaFiltro && categoriaFiltro !== 'todas') {
        console.log(`🎯 [DNA] Buscando categoria específica: ${categoriaFiltro}`);
        const { data: dnaCategorizado, error: dnaError } = await supabase
          .from("dna_categorizado")
          .select("texto_msg, created_at")
          .eq("categoria", categoriaFiltro)
          .order("created_at", { ascending: false })
          .limit(100);

        if (!dnaError && dnaCategorizado && dnaCategorizado.length > 0) {
          fonteInspiracao = dnaCategorizado;
          fonteNome = `DNA Categorizado (${categoriaFiltro})`;
          console.log(`✅ [DNA] Encontradas ${dnaCategorizado.length} mensagens em '${categoriaFiltro}'`);
        } else {
          console.log(`⚠️ [DNA] Categoria '${categoriaFiltro}' vazia, usando favoritas gerais`);
        }
      }

      // Se não tem categoria OU categoria vazia, busca TODAS com categoria para distribuição
      let _contagemPorCat: Record<string, number> = {};
      if (fonteInspiracao.length === 0) {
        const { data: favoritas, error: favError } = await supabase
          .from("dna_categorizado")
          .select("categoria, texto_msg, created_at")
          .order("created_at", { ascending: false })
          .limit(200);

        if (favError || !favoritas || favoritas.length === 0) {
          return new Response(
            JSON.stringify({
              ok: false,
              error: "Nenhuma mensagem encontrada. Adicione ao DNA ou Favoritas primeiro!"
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
          );
        }
        fonteInspiracao = favoritas;
        fonteNome = 'Todas as Categorias (Mix)';
        // Contar categorias para distribuição proporcional
        for (const item of favoritas) {
          const cat = (item as any).categoria || 'outro';
          _contagemPorCat[cat] = (_contagemPorCat[cat] || 0) + 1;
        }
        console.log(`📊 [CATEGORIAS] ${Object.entries(_contagemPorCat).map(([c, n]) => `${c}:${n}`).join(', ')}`);
      }

      console.log(`📚 [FONTE] Usando: ${fonteNome} (${fonteInspiracao.length} mensagens)`);

      // 2. Aplicar Estratégia de Contexto
      let favoritasFiltradas: any[] = [];

      if (contextoManual && Array.isArray(contextoManual) && contextoManual.length > 0) {
        // MODO MANUAL: Usa o que o usuário selecionou
        console.log(`👆 [DNA] Usando CONTEXTO MANUAL: ${contextoManual.length} mensagens selecionadas.`);
        favoritasFiltradas = contextoManual.map(texto => ({ texto_msg: texto }));
      } else if (contextoEstrategia === 'all') {
        // TODAS: Usa todo o acervo disponível
        console.log(`📚 [DNA] Estratégia ALL: Usando TODAS as ${fonteInspiracao.length} mensagens.`);
        favoritasFiltradas = fonteInspiracao;
      } else if (contextoEstrategia === 'mixed') {
        // Misturado: Embaralha e pega 15
        console.log(`🎲 [DNA] Estratégia MIXED: Embaralhando e pegando 15 aleatórios.`);
        favoritasFiltradas = [...fonteInspiracao].sort(() => 0.5 - Math.random()).slice(0, 15);
      } else if (contextoEstrategia === 'recent_20') {
        // 20 mais recentes
        console.log(`🔍 [DNA] Estratégia RECENT_20: Usando as 20 mais novas.`);
        favoritasFiltradas = fonteInspiracao.slice(0, 20);
      } else if (contextoEstrategia === 'recent_10') {
        // 10 mais recentes
        console.log(`🔍 [DNA] Estratégia RECENT_10: Usando as 10 mais novas.`);
        favoritasFiltradas = fonteInspiracao.slice(0, 10);
      } else {
        // Default: 5 mais recentes
        console.log(`🔍 [DNA] Estratégia RECENT_5: Usando as 5 mais novas.`);
        favoritasFiltradas = fonteInspiracao.slice(0, 5);
      }

      // 3. Preparar DNA das favoritas como SEMENTES numeradas para REMIX
      const dnaFavoritas = favoritasFiltradas
        .map((f: any, i: number) => `### [SEMENTE ${i + 1}]:\n${f.texto_msg}`)
        .join("\n\n---\n\n");

      // 3. Processar filtros
      const quantidade = filtros?.quantidade || 10;

      // Calcular distribuição proporcional por categoria (se sem filtro)
      let distribuicaoCategoria = '';
      const hasCatDistrib = Object.keys(_contagemPorCat).length > 0;
      if (hasCatDistrib) {
        const totalDna = Object.values(_contagemPorCat).reduce((a, b) => a + b, 0);
        const catsOrdenadas = Object.entries(_contagemPorCat).sort((a, b) => b[1] - a[1]);
        let restante = quantidade;
        const distrib: { cat: string; qtd: number; pct: number }[] = [];

        for (let i = 0; i < catsOrdenadas.length; i++) {
          const [cat, count] = catsOrdenadas[i];
          const pct = Math.round((count / totalDna) * 100);
          if (i === catsOrdenadas.length - 1) {
            if (restante > 0) distrib.push({ cat, qtd: restante, pct });
          } else {
            const qtd = Math.max(0, Math.round((count / totalDna) * quantidade));
            if (qtd > 0 && restante > 0) {
              const real = Math.min(qtd, restante);
              distrib.push({ cat, qtd: real, pct });
              restante -= real;
            }
          }
        }
        // Garantir top 3 categorias presentes
        if (distrib.length < 3 && catsOrdenadas.length >= 3) {
          const faltando = catsOrdenadas.filter(([c]) => !distrib.find(d => d.cat === c)).slice(0, 3 - distrib.length);
          for (const [c] of faltando) {
            if (distrib[0] && distrib[0].qtd > 1) {
              distrib[0].qtd--;
              distrib.push({ cat: c, qtd: 1, pct: Math.round((_contagemPorCat[c] / totalDna) * 100) });
            }
          }
        }

        const tamanhos = ['Curto (2-3 frases)', 'Médio (4-6 frases)', 'Longo (7-10 frases)'];
        const formatos = ['Staccato (frases curtas)', 'Fluido (frases conectadas)', 'Lista (pontos)', 'Oração (a Deus)'];

        distribuicaoCategoria = `\n## 📊 DISTRIBUIÇÃO OBRIGATÓRIA DO LOTE (${quantidade} MENSAGENS):\n\nDistribua as mensagens entre categorias conforme esta tabela:\n\n| # | Categoria | Qtd | DNA% | Tamanho | Formato |\n|---|-----------|-----|------|---------|---------|\n${distrib.map((d, i) => `| ${i + 1} | **${d.cat.toUpperCase()}** | ${d.qtd} | ${d.pct}% | ${tamanhos[i % tamanhos.length]} | ${formatos[i % formatos.length]} |`).join('\n')}\n\n### Guia de Categoria → Estilo:\n- REFLEXÃO: Contemplativo, convida a pensar\n- ORAÇÃO: Dirigido a Deus ("Senhor..."), fecha com Amém\n- VERSÍCULO: Verso bíblico protagonista + aplicação\n- DEVOCIONAL: Mais longo, introdução+desenvolvimento+aplicação\n- EXORTAÇÃO: Direto, confrontacional com amor\n- DECLARAÇÃO: 1ª pessoa ("Eu creio...")\n\n### Guia de Tamanho:\n- Curto: 2-3 frases | Médio: 4-6 frases | Longo: 7-10 frases\n\n⚠️ Marque a categoria no TÍTULO: **[CATEGORIA] TÍTULO EM CAPS**\n`;

        console.log(`📊 [DISTRIBUIÇÃO] ${distrib.map(d => `${d.cat}:${d.qtd}`).join(', ')}`);
      }

      // ========== ANTI-REPETIÇÃO + SMART AUTOPILOT 2.0 (DINÂMICO) ==========
      const { globalRecentes, catRecentes } = await promiseHistorico;
      const antiRep = await buildAntiRepeticaoContext(
        supabase,
        quantidade,
        favoritasFiltradas.map((f: any) => f.texto_msg || ''),
        'favoritas',
        filtros?.categoria, // Passando categoria alvo
        { globalRecentes, catRecentes }
      );
      const contextoAntiRepeticao = antiRep.contexto;

      let temaAutopilot = '';
      let instrucaoTematicaDinamica = '';

      // SE NÃO TEM TEMA DEFINIDO PELO USUÁRIO -> TENTA EXTRAIR DO DNA
      if (!filtros?.tema) {
        // Tenta extrair temas do próprio DNA para manter a "vibe"
        if (favoritasFiltradas.length > 0) {
          instrucaoTematicaDinamica = `
## 🧬 AUTOPILOT DE TEMAS (EXTRAÇÃO DE DNA):
O usuário NÃO definiu um tema específico. Sua missão é **EXTRAIR A ESSÊNCIA** das mensagens favoritas acima e criar novas mensagens que **EXPLOREM SUB-TEMAS E NUANCES** presentes nelas.

**NÃO USE TEMAS GENÉRICOS** (como apenas "Fé", "Gratidão", "Amor") a menos que o DNA seja estritamente sobre isso.
EM VEZ DISSO, busque **ANGULAÇÕES ESPECÍFICAS** que você detecta no DNA, por exemplo:
- Se o DNA fala de fé na prova -> Tema: "Fé inabalável em meio ao silêncio de Deus"
- Se o DNA fala de gratidão -> Tema: "A alegria oculta nas pequenas provisões diárias"
- Se o DNA fala de identidade -> Tema: "A segurança de ser filho(a) amado(a) independente das falhas"

**CMD:** Analise o DNA e gere mensagens que pareçam **CAPÍTULOS INÉDITOS** do mesmo autor.
`;
          console.log(`🧬 [AUTOPILOT] Modo Dinâmico Ativado: Extraindo temas do DNA.`);
        } else {
          // Fallback para pool se não tiver DNA (muito raro cair aqui no modo favoritas)
          const temasUsadosLower = antiRep.temasUnicos.map(t => t.toLowerCase());
          const temasDisponiveis = TEMAS_POOL.filter(t => !temasUsadosLower.includes(t.toLowerCase()));
          const pool = temasDisponiveis.length > 3 ? temasDisponiveis : TEMAS_POOL;
          temaAutopilot = pool[Math.floor(Math.random() * pool.length)];
          console.log(`🎯 [AUTOPILOT] Fallback para Pool: "${temaAutopilot}"`);
        }
      }

      const temaFinal = filtros?.tema || temaAutopilot; // Se extraiu do DNA, temaFinal fica vazio e vale a instrução

      const temFiltros = filtros && (temaFinal || filtros.tipo || filtros.categoria || filtros.formato || filtros.periodo || filtros.diasSemana || filtros.momento || filtros.tamanho || neutro);

      // Montar instruções de filtro - MAIS CLARAS E OBRIGATÓRIAS
      let instrucoesFiltro = '';
      if (temFiltros || instrucaoTematicaDinamica) {
        instrucoesFiltro = '\n## 🎯 FILTROS & DIRETRIZES DE CRIAÇÃO:\n';
        instrucoesFiltro += '> ⚠️ IMPORTANTE: Siga rigorosamente as instruções abaixo em CADA mensagem.\n\n';

        // BUG FIX: O frontend envia "categoria" mas o prompt procurava "tipo".
        // Agora aceita ambos: filtros.tipo OU filtros.categoria
        const tipoOuCategoria = filtros.tipo || filtros.categoria;
        if (tipoOuCategoria) {
          const tipoLower = tipoOuCategoria.toLowerCase();

          let descTipo = '';
          switch (tipoLower) {
            case 'versículo':
            case 'versiculo':
              descTipo = 'CADA mensagem DEVE ser centrada em um versículo bíblico específico. Formato: cite o versículo completo entre aspas, seguido de uma breve reflexão (2-3 frases). O versículo é o PROTAGONISTA.';
              break;
            case 'oração':
            case 'oracao':
              descTipo = 'escreva como oração/prece falando diretamente com Deus (Senhor, Te peço...). Use tom de entrega e confiança.';
              break;
            case 'devocional':
              descTipo = 'reflexão devocional **ROBUSTA (aprox. 90 palavras)**. DEVE ter base bíblica explícita. Use frases de efeito ("Staccato"). Termine com uma frase de impacto.';
              break;
            case 'exortação':
            case 'exortacao':
              descTipo = 'mensagem de exortação, encorajamento e chamado à ação. Use tom de autoridade amorosa. "Levanta-te", "Creia".';
              break;
            case 'declaração':
            case 'declaracao':
              descTipo = 'proclamação de fé em 1ª pessoa ("Eu creio", "Eu declaro"). Afirmações poderosas de identidade e promessa.';
              break;
            case 'reflexão':
            case 'reflexao':
              descTipo = 'reflexão **CURTA e INCISIVA (máx 30-40 palavras)**. Direto ao ponto. Sem rodeios. Uma verdade espiritual nua e crua.';
              break;
            default:
              descTipo = 'reflexão curta e direta.';
          }
          instrucoesFiltro += `1. **TIPO/CATEGORIA [${tipoOuCategoria.toUpperCase()}]**: ${descTipo}\n`;
        }

        if (filtros.periodo && !neutro) {
          // Mapear período para saudação correta
          const saudacaoMap: Record<string, string> = {
            'Manhã': 'Bom dia',
            'Tarde': 'Boa tarde',
            'Noite': 'Boa noite',
            'Madrugada': 'Paz nesta madrugada'
          };
          const saudacao = saudacaoMap[filtros.periodo] || filtros.periodo;
          instrucoesFiltro += `2. **SAUDAÇÃO [${filtros.periodo.toUpperCase()}]**: COMECE cada mensagem com "${saudacao}!" (sem vocativos como "amado(a)")\n`;
        } else if (neutro) {
          instrucoesFiltro += `2. **🚫 MODO NEUTRO (OBRIGATÓRIO)**: É PROIBIDO usar qualquer saudação temporal. Comece DIRETO com o gancho/frase de impacto. (Ex: "A maior batalha é...")\n`;
        }

        if (filtros.diasSemana) {
          // Citação do dia: opcional, sutil e NUNCA repetitiva — modelos tendem
          // a martelar o dia em toda mensagem se a instrução for "distribua".
          instrucoesFiltro += `3. **DIA DA SEMANA (REGRA RÍGIDA)**: No MÁXIMO 1 mensagem DO LOTE INTEIRO pode citar o dia da semana (se citar, use apenas "${filtros.diasSemana}", de forma natural no MEIO do texto — NUNCA no título, NUNCA na primeira frase). TODAS as outras mensagens NÃO mencionam dia nenhum. Frases como "Nesta quinta...", "Hoje é segunda..." em mais de 1 mensagem = LOTE DESCARTADO.\n`;
        }
        if (filtros.momento) {
          const descMomento = filtros.momento === 'Fim de Semana' ? 'foco em descanso e renovação'
            : filtros.momento === 'Começo de Semana' ? 'foco em força e motivação inicial'
              : filtros.momento === 'Início do Mês' ? 'foco em novos começos e primícias'
                : 'foco em gratidão e fechamento de ciclos';
          instrucoesFiltro += `4. **MOMENTO [${filtros.momento.toUpperCase()}]**: ${descMomento}\n`;
        }

        // LÓGICA DE TEMA (User defined OR Autopilot Dynamic)
        if (temaFinal) {
          instrucoesFiltro += `5. **TEMA OBRIGATÓRIO**: Todas mensagens devem abordar "${temaFinal}"${!filtros?.tema ? ' (tema surpresa — explore nuances!)' : ''}\n`;
        } else if (instrucaoTematicaDinamica) {
          instrucoesFiltro += instrucaoTematicaDinamica;
        }

        // REGRAS DE ESTILO (DNA DO USUÁRIO)
        instrucoesFiltro += `
6. **🧬 ESTILO (DNA OBRIGATÓRIO):**
   - **ZERO PERGUNTAS (TOTAL):** Não use "?" em nenhum lugar.
     (Se precisar de reflexão, use afirmação direta.)
   ${modo_id === 'modo_favoritas' ? `
   - **SEM CENAS INVENTADAS (CRÍTICO):** NÃO crie "ambientação" (ex: "o dia amanheceu", "a chuva cai", "na fila do banco", "notificação no celular").
     **Use APENAS o vocabulário e a imagética JÁ PRESENTES nas sementes.**
     Se a semente é abstrata, o remix é abstrato. Se a semente é direta, o remix é direto.
   - **ABERTURA:** Comece direto ao ponto, com a frase mais forte da semente.` : `
   - **ABERTURA FORTE (1ª LINHA):** A primeira linha deve ser:
     **(A)** uma AFIRMAÇÃO DE IMPACTO, ou **(B)** uma CENA CONCRETA, ou **(C)** uma MINI-CENA BÍBLICA.
   - **GANCHO VISUAL:** Use imagens concretas para ilustrar, mas evite clichês (café, chuva).
     Prefira cenas bíblicas ou metáforas de construção/batalha/caminho.`}
   - **STACCATO COM VIDA:** Frases curtas. Ritmo. Pausas.
     **Máx. 1 frase longa** por mensagem (quando necessário).
     Evite explicar demais a metáfora.
   - **ÂNCORA BÍBLICA:** Inclua **1 versículo curto OU 1 referência bíblica** que sustente a ideia.
     Evite “mensagem bonita” sem base bíblica.
   - **PALAVRAS SATURADAS (PROIBIDAS):**
     Evite: "confie no processo", "Deus está no controle", "abrace o processo",
     "obra-prima", "plenitude do ser", "porto seguro", "melhor versão",
     "abre portas no tempo certo", "no tempo certo", "profetize",
     "Deus está cuidando de você/mim", "recomeço" (como tema central repetido).
     Use linguagem bíblica simples e concreta.
   - **FECHAMENTOS VARIADOS (OBRIGATÓRIO):** NÃO termine todas com punchline.
     Distribua os fechamentos do lote entre: (A) punchline memorável (máx. 12 palavras),
     (B) oração de 1 linha, (C) desafio prático para hoje, (D) declaração de fé em 1ª pessoa.
     Cada fechamento sem clichê e sem repetir a última ideia do versículo.
`;

        if (filtros.tamanho) {
          const tamanhoMap: Record<string, string> = {
            'Curto': 'MAXIMO 40 palavras por mensagem. Frases objetivas e diretas.',
            'Médio': 'Entre 60 e 90 palavras por mensagem. Equilibrado e claro.',
            'Longo': 'Mais de 120 palavras por mensagem. Aprofundado e explicativo.'
          };
          const descTamanho = tamanhoMap[filtros.tamanho] || filtros.tamanho;
          instrucoesFiltro += `7. **TAMANHO [${filtros.tamanho.toUpperCase()}]**: ${descTamanho}\n`;
        }

        if (filtros.formato) {
          const descFormato = filtros.formato === 'Staccato' ? 'frases curtas, ritmo rápido (PRIORIDADE)'
            : filtros.formato === 'Narrativo' ? 'estilo storytelling curto'
              : filtros.formato === 'Lista' ? 'tópicos numerados'
                : 'direto e incisivo';
          instrucoesFiltro += `8. **FORMATO**: Estilo ${filtros.formato} - ${descFormato}\n`;
        }




        instrucoesFiltro += '\n> Aplique RIGOROSAMENTE as regras de estilo acima.\n';
      }

      // 4. PASSAGEM DO DIA - Buscar se filtro ativo (UNIFICADO: Storage → DB → Fallback)
      let passagemDoDia = '';
      let passagemRef = '';
      if (filtros?.usarPassagemDia) {
        console.log('📖 [PASSAGEM] Buscando passagem do dia (UNIFICADO)...');
        const dataAlvo = data || new Date().toISOString().split('T')[0];

        // FONTE 1: Tentar Storage (SECAO6.TXT) - SSOT
        try {
          const { data: secao6File, error: secao6Err } = await supabase.storage
            .from('pvc')
            .download('secao6/SECAO6.TXT');

          if (!secao6Err && secao6File) {
            const text = await secao6File.text();
            const jsonMarker = '### JSON_BEGIN';
            const jsonStartIndex = text.indexOf(jsonMarker);
            if (jsonStartIndex !== -1) {
              let jsonString = text.substring(jsonStartIndex + jsonMarker.length).trim();
              const jsonEndMarker = '### JSON_END';
              const jsonEndIndex = jsonString.indexOf(jsonEndMarker);
              if (jsonEndIndex !== -1) jsonString = jsonString.substring(0, jsonEndIndex).trim();

              // Tentar parse direto
              try {
                const passagens = JSON.parse(jsonString);
                const passagemHoje = passagens.find((p: any) => p.data === dataAlvo);
                if (passagemHoje) {
                  passagemRef = passagemHoje.referencia || '';
                  passagemDoDia = ''; // Storage não tem texto completo
                  console.log(`📖 [PASSAGEM] Encontrada no Storage: ${passagemRef}`);
                }
              } catch {
                // Fallback: extração manual por data
                const dataPattern = `"data": "${dataAlvo}"`;
                const dataIndex = jsonString.indexOf(dataPattern);
                if (dataIndex !== -1) {
                  const refMatch = jsonString.substring(dataIndex, dataIndex + 500).match(/"referencia":\s*"([^"]+)"/);
                  if (refMatch) {
                    passagemRef = refMatch[1];
                    console.log(`📖 [PASSAGEM] Extraída via fallback do Storage: ${passagemRef}`);
                  }
                }
              }
            }
          }
        } catch (storageErr) {
          console.warn('⚠️ [PASSAGEM] Erro ao buscar do Storage:', storageErr);
        }

        // FONTE 2: Se Storage falhou, tentar tabela leitura_do_dia
        if (!passagemRef) {
          const { data: leituraDia } = await supabase
            .from("leitura_do_dia")
            .select("*")
            .eq("data", dataAlvo)
            .maybeSingle();

          if (leituraDia) {
            passagemRef = leituraDia.passagem_do_dia || '';
            passagemDoDia = leituraDia.texto || '';
            console.log(`📖 [PASSAGEM] Encontrada no DB (leitura_do_dia): ${passagemRef}`);
          }
        }

        // FONTE 3: Fallback final - tabela payload_do_dia
        if (!passagemRef) {
          const { data: payloadDia, error: payloadErr } = await supabase
            .from("payload_do_dia")
            .select("*")
            .eq("data", dataAlvo)
            .maybeSingle();

          if (payloadErr) {
            console.error("Erro ao buscar passagem (payload_do_dia):", payloadErr);
          }

          passagemRef = payloadDia?.passagem_do_dia || payloadDia?.passagem || "";
          passagemDoDia = payloadDia?.texto || "";
        }

        console.log(`📖 [PASSAGEM] Ref Final: ${passagemRef || '(não encontrada)'}`);
      }

      // 5. Prompt interno para gerar mensagens
      // Se usarPassagemDia, usa formato estruturado
      const formatoPassagemDoDia = filtros?.usarPassagemDia ? `
## 📖 PASSAGEM DO DIA:
**${passagemRef}**
${passagemDoDia ? `\n"${passagemDoDia}"` : ''}

## ⚠️ FORMATO OBRIGATÓRIO (Passagem do Dia):
Cada mensagem DEVE seguir esta estrutura:

**📖 LEITURA DO DIA — ${passagemRef}**

**[TÍTULO CRIATIVO EM CAPS]**

[Cabeçalho/Gancho - 1 frase que conecta com o leitor]

[Corpo da mensagem - reflexão sobre a passagem]

> "Versículo chave" — Referência

[Fechamento - aplicação prática ou oração breve]

---

` : '';

      // Detectar se é modo de referência única (1-2 mensagens selecionadas)
      const isReferenciaUnica = favoritasFiltradas.length <= 2;
      const totalReferencias = favoritasFiltradas.length;
      const minLexTermFavoritas = isReferenciaUnica ? 3 : 4;
      const instrucaoLexicoFavoritas = buildLexicoLockInstruction(
        favoritasFiltradas.map((f: any) => f.texto_msg || ''),
        minLexTermFavoritas
      );


      // REGRAS GLOBAIS DE ESTILO (CENTRALIZADAS)
      const REGRAS_ESTILO_GLOBAIS = `
### 🚫 PROIBIÇÕES GLOBAIS (CRÍTICO):
- **Palavras Banidas**: "norte", "rota", "neblina", "bússola", "farol", "cais", "porto seguro", "âncora" (exceto se no versículo).
- **Clichês Banidos**: "confie no processo", "Deus está no controle", "tudo tem um tempo", "a tempestade vai passar".
- **Jargão Banido**: "quebrantamento", "eis que", "varão", "muralha", "gigante", "vitória", "bênção" (sem contexto).
- **Estrutura Banida**: NÃO comece com "No turbilhão da vida..." ou "Na caminhada da fé...".
- **Metáforas Banidas**: "Olaria", "Deserto" (se não for o tema), "Tempestade" (se não for o tema).

### ⭐ REGRAS DE OURO (O QUE FAZER):
1. **STACCATO REAL**: Frases curtas e diretas. Mas AGRUPE-AS em parágrafos. Não pule linha a cada ponto.
2. **ZERO EMOJIS NO TEXTO**: Use emojis APENAS no título (se quiser) ou bullet points. Nunca no meio da frase.
3. **TOM DE CONVERSA**: Escreva como se estivesse mandando um áudio no WhatsApp para um amigo próximo.
4. **VERSÍCULO INTEGRADO**: Não jogue o versículo. Costure ele no texto. "Como diz em X..." ou "Lembra de Y?".
5. **TWIST FINAL**: A última frase deve inverter a expectativa ou fechar com chave de ouro.
`;

      const promptFavoritas = `
<system_role>
Você é um Editor Sênior de Devocionais com especialização em remixagem criativa.
Sua função é analisar o DNA do autor (sementes) e criar novos textos com a MESMA "vibe", vocabulário e energia.
NÃO seja uma IA genérica. Seja o autor.
</system_role>

<context>
  <mode>${formatoPassagemDoDia ? 'REMIX + PASSAGEM DO DIA' : 'REMIX PURO (Fidelidade Extrema)'}</mode>

  <dna_seeds>
    Abaixo estão as sementes de inspiração (DNA). Use-as como base absoluta.
${dnaFavoritas}
  </dna_seeds>
  
  <anti_repetition>
${contextoAntiRepeticao}
  </anti_repetition>
  
  <lexicon_requirements>
${instrucaoLexicoFavoritas || 'Copie o vocabulário (palavras exatas) das sementes.'}
  </lexicon_requirements>
</context>

<global_rules>
${REGRAS_ESTILO_GLOBAIS}
  <rule priority="critical">VOCATIVOS PROIBIDOS: Nunca use "amado", "querido", "irmão", "filho".${neutro ? ' MODO NEUTRO: Não use saudações temporais.' : ''}</rule>
  <rule priority="critical">VERSÍCULOS OBRIGATÓRIOS: Pelo menos 50% das mensagens DEVEM ter versículo explícito com referência (ex: João 3:16). Costure o versículo no texto de forma natural.</rule>
  <rule priority="high">ESTILO: Curto, direto, "staccato". Sem floreios poéticos desnecessários.</rule>
  <rule priority="critical">FORMATO VISUAL: NÃO escreva uma frase por linha. Agrupe o texto em parágrafos normais (3-4 frases juntas). O texto deve fluir, não parecer uma lista.</rule>
</global_rules>

<task>
  Gere EXATAMENTE ${quantidade} mensagens remixadas.

  <distribution>
${distribuicaoCategoria || 'Distribua o remix variando as sementes usadas (não repita a mesma semente primária seguidas vezes).'}
  </distribution>

  <variety priority="critical">
    REGRAS DE VARIEDADE DO LOTE (mensagens iguais entre si = lote descartado):
    1. TEMAS DISTINTOS: cada mensagem do lote aborda um tema/personagem/passagem bíblica DIFERENTE das outras. PROIBIDO duas mensagens com a mesma imagem central (ex: "porta", "recomeço", "deserto").
    2. ABERTURAS DISTINTAS: varie a estrutura da primeira frase entre as mensagens — (A) afirmação de impacto, (B) mini-cena bíblica (personagem + ação), (C) versículo citado direto, (D) declaração em 1ª pessoa. Não repita a mesma estrutura de abertura em mais de 2 mensagens.
    3. NÃO COMECE duas mensagens com a mesma palavra.
  </variety>
  
  <filters>
${instrucoesFiltro}
${filtros?.usarPassagemDia ? `Referência Obrigatória: ${passagemRef}` : ''}
  </filters>
  
  <process_instructions>
    Para CADA mensagem, siga estritamente este fluxo:
    
    1. "THINKING" (Planejamento Mental):
       Abra uma tag <thinking>. Planeje:
       - Qual semente primária usar? (cite o ID)
       - Qual semente secundária misturar?
       - Qual versículo usar? (se aplicável)
       - Qual será o tom/título?
    
    2. "WRITING" (Escrita Final):
       Feche a tag </thinking>.
       Escreva a mensagem final formatada, limpa, pronta para envio.
  </process_instructions>
</task>

<output_format>
  Para cada mensagem, use este formato LIMPO:
  
  <thinking>
  [Seu planejamento breve aqui]
  </thinking>
  
  ${filtros?.usarPassagemDia ? `**📖 LEITURA DO DIA — ${passagemRef}**\n\n` : ''}**Título da Mensagem** (Capitalização Normal, SEM CAPS LOCK)
  
  [Corpo da mensagem com parágrafos bem definidos]
  
  (NÃO use tags como [REFLEXÃO] ou [ORAÇÃO]. Comece direto.)

  ---

  (Repita para todas as ${quantidade} mensagens.)

  REGRAS DE SAÍDA (CRÍTICAS):
  - Escreva SOMENTE em português. Nunca em inglês.
  - Fora da tag <thinking> NÃO escreva nenhum raciocínio, planejamento, lista de regras ou comentário — apenas as mensagens finais prontas para envio.
  - NÃO rotule as mensagens (nada de "Message 1", "Mensagem 2:", "Thinking:", "We need...").
</output_format>
`;

      // 4. Chamar LLM (OpenRouter free com fallbacks)
      // Temperatura estável por perfil para reduzir variância de qualidade.
      let tempSorteada = 0.78;
      if (filtros?.formato === 'Staccato') tempSorteada = 0.72;
      if (filtros?.formato === 'Lista') tempSorteada = 0.70;

      console.log(`🌡️ [FAVORITAS] Temperature: ${tempSorteada}`);

      const llmResp = await gerarTexto(promptFavoritas, {
        temperature: tempSorteada,
        maxTokens: quantidade <= 5 ? 4096 : quantidade <= 15 ? 6000 : 8192
      });

      if (!llmResp.ok) {
        console.error(`❌ Erro LLM:`, llmResp.error);
        throw new Error(`Erro API LLM: ${llmResp.error}`);
      }

      // CLEANER: remove <thinking> (fechado ou não), preâmbulo de raciocínio (EN/PT),
      // cercas de código, metadados de sementes e tags de categoria vazadas.
      let resultado = limparTextoGerado(llmResp.text || "Erro ao gerar mensagens.");

      // VALIDAÇÃO: Verificar presença de versículos bíblicos nas mensagens
      const mensagensGeradas = resultado.split(/---/).filter((m: string) => m.trim().length > 20);
      const regexVersiculo = /(?:Gn|Gênesis|Ex|Êxodo|Lv|Nm|Dt|Js|Jz|Rt|1\s?Sm|2\s?Sm|1\s?Rs|2\s?Rs|1\s?Cr|2\s?Cr|Ed|Ne|Et|Jó|Sl|Salmos?|Pv|Provérbios|Ec|Ct|Is|Isaías|Jr|Lm|Ez|Dn|Os|Jl|Am|Ob|Jn|Mq|Na|Hc|Sf|Ag|Zc|Ml|Mt|Mateus|Mc|Marcos|Lc|Lucas|Jo|João|At|Atos|Rm|Romanos|1\s?Co|2\s?Co|Gl|Gálatas|Ef|Efésios|Fp|Filipenses|Cl|Colossenses|1\s?Ts|2\s?Ts|1\s?Tm|2\s?Tm|Tt|Fm|Hb|Hebreus|Tg|Tiago|1\s?Pe|2\s?Pe|1\s?Jo|2\s?Jo|3\s?Jo|Jd|Ap|Apocalipse)\s+\d+[:.\s]\d+/i;
      const msgsComVersiculo = mensagensGeradas.filter((m: string) => regexVersiculo.test(m));
      const percentual = mensagensGeradas.length > 0 ? Math.round((msgsComVersiculo.length / mensagensGeradas.length) * 100) : 0;
      console.log(`📖 [VERSÍCULOS] ${msgsComVersiculo.length}/${mensagensGeradas.length} mensagens com versículo (${percentual}%)`);
      if (percentual < 40) {
        console.warn(`⚠️ [VERSÍCULOS] ABAIXO DO MÍNIMO! Apenas ${percentual}% das mensagens têm versículo (mínimo: 50%)`);
      }

      console.log(`✅ [MODO FAVORITAS] Geração concluída!`);

      return new Response(
        JSON.stringify({
          ok: true,
          resultado: resultado,
          tipo: 'modo_favoritas',
          total_favoritas: fonteInspiracao.length,
          // Tracking para anti-repetição
          tema_usado: temaFinal || null,
          categoria_usada: filtros?.categoria || null,
          autopilot: !filtros?.tema ? temaAutopilot : null
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200
        }
      );
    }
    // ========================================
    // FIM DO MODO FAVORITAS
    // ========================================


    // ========================================
    // MODO ESPECIAL: GERADOR POR ESTILO (HÍBRIDO: DNA + ESTILO FORÇADO)
    // ========================================
    if (modo_id === 'modo_estilo') {
      console.log(`🎨 [MODO ESTILO] Iniciando geração híbrida com filtros...`);

      const estiloAlvo = filtros?.estilo; // String (Categoria)
      const quantidade = filtros?.quantidade || 5;

      // Novos Filtros
      const usarPassagemDia = filtros?.usarPassagemDia || false;
      const usarDnaBase = filtros?.usarDnaBase !== false; // Default true
      const diasSemana = filtros?.diasSemana; // String "Segunda, Quarta"
      const neutro = filtros?.neutro || false; // NOVO: Filtro Neutro
      const contextoEstrategia = filtros?.contextoEstrategia || 'recent_5'; // NOVO: Estratégia

      if (!estiloAlvo) throw new Error("Estilo não especificado para modo_estilo");

      // Inicializar Supabase
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const geminiKey = Deno.env.get("OPENROUTER_API_KEY") || Deno.env.get("GEMINI_API_KEY") || Deno.env.get("GEMINI_KEY");

      if (!supabaseUrl || !serviceKey || !geminiKey) {
        throw new Error("Variáveis de ambiente não configuradas.");
      }

      const supabase = createClient(supabaseUrl, serviceKey);

      // 🚀 PARALLEL FETCH: Iniciar busca de histórico agora
      const promiseHistoricoEstilo = fetchAntiRepeticaoHistory(supabase, 'estilo', undefined);

      // 1. Buscar DNA (Fonte de TEOLOGIA/ESSÊNCIA)
      // ESTRATÉGIA DE OURO: Tentar buscar DNA da PRÓPRIA CATEGORIA primeiro para garantir o gênero.
      let dnaEssencia = "";
      let dnaSourceType = "GENERICO"; // ou 'ESPECIFICO'

      if (usarDnaBase) {
        // CHECK MANUAL CONTEXT FIRST
        const contextoManual = filtros?.contextoManual;

        if (contextoManual && Array.isArray(contextoManual) && contextoManual.length > 0) {
          console.log(`👆 [DNA] Usando CONTEXTO MANUAL: ${contextoManual.length} mensagens.`);
          dnaEssencia = contextoManual.join("\n\n---\n\n");
          dnaSourceType = "MANUAL";
        } else {
          // Definir limites baseados na estratégia
          const limitMap: Record<string, number> = { 'recent_5': 5, 'recent_10': 10, 'recent_20': 20, 'all': 200, 'mixed': 50 };
          const limitFetch = limitMap[contextoEstrategia] || 5;

          // Tenta buscar do DNA Categorizado (que já é filtrado por tipo: oração, versículo, etc)
          const { data: dnaEspecifico } = await supabase
            .from("dna_categorizado")
            .select("texto_msg")
            .eq("categoria", estiloAlvo)
            .order("created_at", { ascending: false })
            .limit(limitFetch); // Usa o limite da estratégia

          if (dnaEspecifico && dnaEspecifico.length > 0) {
            let selecionados = dnaEspecifico;

            // Se for MIXED, embaralha e pega 15
            if (contextoEstrategia === 'mixed') {
              selecionados = dnaEspecifico.sort(() => 0.5 - Math.random()).slice(0, 15);
            }

            dnaEssencia = selecionados.map((d: any) => d.texto_msg.replace(/^\s*\*\*?\[.*?\]\s*\*\*?/gim, '').trim()).join("\n\n---\n\n");
            dnaSourceType = "ESPECIFICO";
            console.log(`📚 [DNA] Usando estratégia '${contextoEstrategia}': ${selecionados.length} exemplos.`);
          } else {
            // Fallback para Favoritas Gerais (mistureba, mas garante teologia)
            const { data: favoritas, error: favError } = await supabase
              .from("dna_categorizado")
              .select("texto_msg")
              .order("created_at", { ascending: false })
              .limit(60);

            dnaEssencia = favoritas?.map((f: any) => f.texto_msg.replace(/^\s*\*\*?\[.*?\]\s*\*\*?/gim, '').trim()).join("\n\n---\n\n") || "";
            console.log(`📚 [DNA] Usando ${favoritas?.length || 0} favoritas GERAIS (Fallback).`);
          }
        }
      } else {
        console.log(`📚 [DNA] DNA Base desativado pelo usuário.`);
      }

      // 2. Buscar Exemplos do Estilo - FONTE DE ESTRUTURA
      // FIX 5: Se já buscamos DNA da mesma categoria, REUSAR resultado (evita query duplicada)
      let exemplosEstrutura = "";
      if (dnaSourceType === 'ESPECIFICO' && dnaEssencia) {
        // DNA já foi buscado da mesma categoria — reusar como exemplos de estrutura
        exemplosEstrutura = dnaEssencia;
        console.log(`🎨 [ESTILO] Reusando DNA da mesma categoria '${estiloAlvo}' como exemplos de estrutura (query otimizada).`);
      } else {
        const { data: exemplosEstilo, error: styleError } = await supabase
          .from("dna_categorizado")
          .select("texto_msg")
          .eq("categoria", estiloAlvo)
          .order("created_at", { ascending: false })
          .limit(10);

        if (exemplosEstilo && exemplosEstilo.length > 0) {
          // CLEANER: Limpar exemplos para não contaminar o prompt com tags antigas
          exemplosEstrutura = exemplosEstilo.map((e: any) =>
            e.texto_msg.replace(/^\s*\*\*?\[.*?\]\s*\*\*?/gim, '').trim()
          ).join("\n\n---\n\n");
          console.log(`🎨 [ESTILO] ${exemplosEstilo.length} exemplos de '${estiloAlvo}' carregados (LIMPOS).`);
        } else {
          console.log(`⚠️ [ESTILO] Nenhum exemplo encontrado para '${estiloAlvo}'. Usando fallback SINTÉTICO LIMPO.`);
          exemplosEstrutura = `
**O Milagre do Amanhã**

Não se preocupe com o que virá.
Deus já está lá.
Onde seus pés falharem, a graça dEle te sustenta.

Confie no processo.
O milagre é agora.
          `.trim();
        }
      }

      // 3. Buscar Passagem do Dia (SE CHECADO) - UNIFICADO: Storage → DB → Fallback
      let passagemDoDia = '';
      let passagemRef = '';
      if (usarPassagemDia) {
        console.log('📖 [PASSAGEM ESTILO] Buscando passagem do dia (UNIFICADO)...');
        const dataAlvo = data || new Date().toISOString().split('T')[0];

        // FONTE 1: Tentar Storage (SECAO6.TXT) - SSOT
        try {
          const { data: secao6File, error: secao6Err } = await supabase.storage
            .from('pvc')
            .download('secao6/SECAO6.TXT');

          if (!secao6Err && secao6File) {
            const text = await secao6File.text();
            const jsonMarker = '### JSON_BEGIN';
            const jsonStartIndex = text.indexOf(jsonMarker);
            if (jsonStartIndex !== -1) {
              let jsonString = text.substring(jsonStartIndex + jsonMarker.length).trim();
              const jsonEndMarker = '### JSON_END';
              const jsonEndIndex = jsonString.indexOf(jsonEndMarker);
              if (jsonEndIndex !== -1) jsonString = jsonString.substring(0, jsonEndIndex).trim();

              try {
                const passagens = JSON.parse(jsonString);
                const passagemHoje = passagens.find((p: any) => p.data === dataAlvo);
                if (passagemHoje) {
                  passagemRef = passagemHoje.referencia || '';
                  console.log(`📖 [PASSAGEM ESTILO] Encontrada no Storage: ${passagemRef}`);
                }
              } catch {
                const dataPattern = `"data": "${dataAlvo}"`;
                const dataIndex = jsonString.indexOf(dataPattern);
                if (dataIndex !== -1) {
                  const refMatch = jsonString.substring(dataIndex, dataIndex + 500).match(/"referencia":\s*"([^"]+)"/);
                  if (refMatch) {
                    passagemRef = refMatch[1];
                    console.log(`📖 [PASSAGEM ESTILO] Extraída via fallback: ${passagemRef}`);
                  }
                }
              }
            }
          }
        } catch (storageErr) {
          console.warn('⚠️ [PASSAGEM ESTILO] Erro Storage:', storageErr);
        }

        // FONTE 2: Tabela leitura_do_dia
        if (!passagemRef) {
          const { data: leituraDia } = await supabase
            .from("leitura_do_dia")
            .select("*")
            .eq("data", dataAlvo)
            .maybeSingle();

          if (leituraDia) {
            passagemRef = leituraDia.passagem_do_dia || '';
            passagemDoDia = leituraDia.texto || '';
            console.log(`📖 [PASSAGEM ESTILO] Encontrada em leitura_do_dia: ${passagemRef}`);
          }
        }

        // FONTE 3: Fallback - payload_do_dia
        if (!passagemRef) {
          const { data: payloadDia } = await supabase
            .from("payload_do_dia")
            .select("*")
            .eq("data", dataAlvo)
            .maybeSingle();

          passagemRef = payloadDia?.passagem_do_dia || payloadDia?.passagem || "";
          passagemDoDia = payloadDia?.texto || "";
        }

        console.log(`📖 [PASSAGEM ESTILO] Ref Final: ${passagemRef || '(não encontrada)'}`);
      }

      // 4. Anti-Repetição + Smart Autopilot (usando função centralizada)
      const { globalRecentes: grEstilo, catRecentes: crEstilo } = await promiseHistoricoEstilo;
      const dnaTextsEstilo = dnaEssencia ? [dnaEssencia] : [];
      const antiRepEstilo = await buildAntiRepeticaoContext(supabase, quantidade, dnaTextsEstilo, 'estilo', undefined, { globalRecentes: grEstilo, catRecentes: crEstilo });
      const contextoAntiRepeticao = antiRepEstilo.contexto;

      let temaAutopilotEstilo = '';
      let instrucaoTematicaDinamicaEstilo = '';
      if (!filtros?.tema) {
        // Se tem DNA carregado, extrair temas do próprio DNA (evita temas genéricos)
        if (dnaEssencia && dnaEssencia.length > 100) {
          instrucaoTematicaDinamicaEstilo = `
## 🧬 AUTOPILOT DE TEMAS (EXTRAÇÃO DE DNA):
O usuário NÃO definiu um tema específico. Sua missão é **EXTRAIR A ESSÊNCIA** do DNA/exemplos acima e criar mensagens que **EXPLOREM SUB-TEMAS E NUANCES** presentes neles.

**NÃO USE TEMAS GENÉRICOS** (como apenas "Fé", "Gratidão", "Amor") a menos que o DNA seja estritamente sobre isso.
EM VEZ DISSO, busque **ANGULAÇÕES ESPECÍFICAS** que você detecta no DNA, por exemplo:
- Se o DNA fala de fé na prova → "Fé inabalável em meio ao silêncio de Deus"
- Se o DNA fala de gratidão → "A alegria oculta nas pequenas provisões diárias"
- Se o DNA fala de identidade → "A segurança de ser filho(a) amado(a) independente das falhas"

**CADA MENSAGEM deve ter um sub-tema DIFERENTE** extraído do DNA.
`;
          console.log(`🧬 [AUTOPILOT ESTILO] Modo Dinâmico: Extraindo temas do DNA (${dnaEssencia.length} chars).`);
        } else {
          // Fallback para pool se não tiver DNA
          const temasUsadosLower = antiRepEstilo.temasUnicos.map(t => t.toLowerCase());
          const temasDisponiveis = TEMAS_POOL.filter(t => !temasUsadosLower.includes(t.toLowerCase()));
          const pool = temasDisponiveis.length > 3 ? temasDisponiveis : TEMAS_POOL;
          temaAutopilotEstilo = pool[Math.floor(Math.random() * pool.length)];
          console.log(`🎯 [AUTOPILOT ESTILO] Fallback Pool: "${temaAutopilotEstilo}" (${temasDisponiveis.length} disponíveis)`);
        }
      }
      const temaFinalEstilo = filtros?.tema || temaAutopilotEstilo;

      // 5. Construção dos Filtros Dinâmicos
      let instrucoesFiltro = '';
      // BUG FIX: Separar tamanho (Curto/Médio/Longo) de formato (Staccato/Narrativo/Lista/Perguntas)
      // O frontend envia 'formato' com valores de tamanho — aceitar ambos para backward compat
      const TAMANHOS_VALIDOS = ['Curto', 'Médio', 'Longo'];
      const tamanhoEstilo = filtros?.tamanho || (TAMANHOS_VALIDOS.includes(filtros?.formato) ? filtros.formato : null);
      const formatoEstilo = !TAMANHOS_VALIDOS.includes(filtros?.formato) ? filtros?.formato : null;

      const temFiltrosExtras = (temaFinalEstilo || instrucaoTematicaDinamicaEstilo || tamanhoEstilo || formatoEstilo || filtros?.periodo || filtros?.momento || diasSemana || neutro);

      if (temFiltrosExtras) {
        instrucoesFiltro = '\n## 🎯 INSTRUÇÕES ESPECÍFICAS (FILTROS):\n';

        if (temaFinalEstilo) {
          instrucoesFiltro += `• **TEMA**: O assunto principal deve ser "${temaFinalEstilo}"${!filtros?.tema ? ' (tema surpresa — explore com profundidade!)' : ''}\n`;
        } else if (instrucaoTematicaDinamicaEstilo) {
          instrucoesFiltro += instrucaoTematicaDinamicaEstilo;
        }
        if (tamanhoEstilo) {
          const sizeInstructions: Record<string, string> = {
            'Curto': 'MÁXIMO 40 palavras. 1 parágrafo curto. Direto e incisivo. SEM enrolação.',
            'Médio': 'Entre 60-90 palavras. 2 parágrafos. Equilibrado e objetivo.',
            'Longo': 'Mais de 120 palavras. 3+ parágrafos. Detalhado, profundo e bem explicado.'
          };
          const instruction = sizeInstructions[tamanhoEstilo] || tamanhoEstilo;
          instrucoesFiltro += `• **TAMANHO RIGOROSO**: ${instruction}\n`;
        }
        if (formatoEstilo) {
          const formatInstructions: Record<string, string> = {
            'Staccato': 'frases curtas e impactantes, mas agrupadas em parágrafos (texto corrido, não lista)',
            'Narrativo': 'texto fluido como uma história, com começo, meio e fim',
            'Lista': 'tópicos numerados ou com bullets, organizados logicamente',
            'Perguntas': 'use perguntas reflexivas que levem o leitor a meditar'
          };
          const fmtInstruction = formatInstructions[formatoEstilo] || formatoEstilo;
          instrucoesFiltro += `• **FORMATO TEXTUAL [${formatoEstilo.toUpperCase()}]**: ${fmtInstruction}\n`;
        }

        if (filtros.periodo && !neutro) {
          const saudacaoMap: Record<string, string> = {
            'Manhã': 'Bom dia',
            'Tarde': 'Boa tarde',
            'Noite': 'Boa noite',
            'Madrugada': 'Paz na madrugada'
          };
          const saudacao = saudacaoMap[filtros.periodo] || filtros.periodo;
          instrucoesFiltro += `• **PERÍODO**: Inicie com saudação de "${saudacao}!" (sem vocativos)\n`;
        } else if (neutro) {
          instrucoesFiltro += `• **🚫 MODO NEUTRO (OBRIGATÓRIO)**: É PROIBIDO usar qualquer saudação temporal. NÃO escreva "Bom dia", "Boa tarde", "Boa noite", "Bom fim de semana" ou variações. Comece DIRETO com o conteúdo da mensagem. Esta regra tem PRIORIDADE MÁXIMA.\n`;
        }
        if (filtros.momento) {
          instrucoesFiltro += `• **CONTEXTO**: Foque no momento "${filtros.momento}"\n`;
        }
        if (diasSemana) {
          // Citação do dia: opcional e sutil — nunca em todas as mensagens
          instrucoesFiltro += `• **DIA DA SEMANA (REGRA RÍGIDA)**: No MÁXIMO 1 mensagem DO LOTE INTEIRO pode citar o dia da semana (se citar, use apenas "${diasSemana}", de forma natural no MEIO do texto — NUNCA no título, NUNCA na primeira frase, NUNCA em linha própria). TODAS as outras mensagens NÃO mencionam dia nenhum.\n`;
        }
      }


      const minLexTermEstilo = usarDnaBase ? 3 : 0;
      const instrucaoLexicoEstilo = usarDnaBase
        ? buildLexicoLockInstruction(
          dnaEssencia.split(/\n\s*---\s*\n/g).map((t: string) => t.trim()).filter(Boolean),
          minLexTermEstilo
        )
        : '';

      // REGRAS GLOBAIS DE ESTILO (CENTRALIZADAS)
      const REGRAS_ESTILO_GLOBAIS = `
### 🚫 PROIBIÇÕES GLOBAIS (CRÍTICO):
- **Palavras Banidas**: "norte", "rota", "neblina", "bússola", "farol", "cais", "porto seguro", "âncora" (exceto se no versículo).
- **Clichês Banidos**: "confie no processo", "Deus está no controle", "tudo tem um tempo", "a tempestade vai passar".
- **Jargão Banido**: "quebrantamento", "eis que", "varão", "muralha", "gigante", "vitória", "bênção" (sem contexto).
- **Estrutura Banida**: NÃO comece com "No turbilhão da vida..." ou "Na caminhada da fé...".
- **Metáforas Banidas**: "Olaria", "Deserto" (se não for o tema), "Tempestade" (se não for o tema).

### ⭐ REGRAS DE OURO (O QUE FAZER):
1. **STACCATO REAL**: Frases curtas. Ponto. Outra frase. Ponto. Sem vírgulas desnecessárias.
2. **ZERO EMOJIS NO TEXTO**: Use emojis APENAS no título (se quiser) ou bullet points. Nunca no meio da frase.
3. **TOM DE CONVERSA**: Escreva como se estivesse mandando um áudio no WhatsApp para um amigo próximo.
4. **VERSÍCULO INTEGRADO**: Não jogue o versículo. Costure ele no texto. "Como diz em X..." ou "Lembra de Y?".
5. **TWIST FINAL**: A última frase deve inverter a expectativa ou fechar com chave de ouro.
`;


      // 6. Montar Prompt Híbrido - AGORA COM INSTRUÇÃO DE GÊNERO EXPLÍCITA
      const promptHibrido = `
# GERADOR DE CONTEÚDO CATEGORIZADO
Data Atual: ${new Date().toLocaleDateString('pt-BR')}

${REGRAS_ESTILO_GLOBAIS || ''}


Você atua como um "Ghostwriter Espiritual".
Sua missão é gerar **${quantidade} NOVAS ${estiloAlvo.toUpperCase()}S**.

🚨 **REGRA DE OURO (GÊNERO TEXTUAL)**:
Você está gerando uma **${estiloAlvo.toUpperCase()}**.
${estiloAlvo === 'oração' ? 'O texto DEVE ser uma conversa direta com Deus (usar "Senhor", "Pai", 1ª pessoa falando com Deus).' : ''}
${estiloAlvo === 'devocional' ? 'O texto DEVE ser uma reflexão ou ensino bíblico (falar sobre Deus/vida).' : ''}
${(estiloAlvo === 'versículo' || estiloAlvo === 'versiculo') ? 'O texto DEVE ser centrado em um versículo bíblico específico. CADA mensagem deve citar o versículo completo entre aspas e oferecer uma reflexão.' : ''}
${estiloAlvo === 'declaração' ? 'O texto DEVE ser uma proclamação de fé em 1ª pessoa ("Eu creio", "Eu declaro").' : ''}
${estiloAlvo === 'reflexão' ? 'O texto DEVE ser uma reflexão contemplativa e profunda sobre a vida espiritual e a jornada de fé.' : ''}
${estiloAlvo === 'exortação' ? 'O texto DEVE ser uma exortação — mensagem de encorajamento forte, chamado à ação, motivação espiritual.' : ''}
NÃO GERE OUTRO TIPO DE TEXTO. SE É ${estiloAlvo}, FAÇA ${estiloAlvo}!

🚫 **PROIBIDO USAR TAGS/RÓTULOS NO INÍCIO**:
NÃO comece escrevendo **[ORAÇÃO]**, **[REFLEXÃO]** ou similar.
O texto deve ser LIMPO. O leitor saberá o que é pelo conteúdo.

📌 **FORMATO DE CADA MENSAGEM (OBRIGATÓRIO)**:
- A PRIMEIRA LINHA de cada mensagem é um TÍTULO curto (3-6 palavras) em **negrito**.
- PROIBIDO prefixo de estilo no título (nada de "Devocional |", "Oração |", etc).
- PROIBIDO linha separada com o dia da semana (nada de "Segunda-feira" sozinho numa linha).
- Depois do título: 1 linha em branco e o corpo da mensagem.
- Mesmo copiando a estrutura visual dos exemplos, o cabeçalho segue ESTA regra (os exemplos podem ter cabeçalhos antigos — ignore-os).

## 1. FONTE DE ESTRUTURA VISUAL (COPIAR FORMATO):
Use os exemplos abaixo APENAS para copiar a formatação (emojis, quebras de linha, estrutura visual).
NÃO COPIE O CONTEÚDO, APENAS A "ROUPA" DO TEXTO.

--- INÍCIO EXEMPLOS VISUAIS (${estiloAlvo}) ---
${exemplosEstrutura}
--- FIM EXEMPLOS ---

${usarDnaBase ? `
## 2. FONTE DE CONTEÚDO (INSPIRAÇÃO + VOCABULÁRIO):
Use a base abaixo para:
- Entender o TOM e a TEOLOGIA.
- **COPIAR O VOCABULÁRIO**: Use as MESMAS PALAVRAS e EXPRESSÕES do DNA. Não troque por sinônimos genéricos de IA.
- **PROIBIDO**: palavras como "genuina", "calmaria", "jornada", "propósito divino", "liberada" (se não estão no DNA).
- **USE**: palavras do DNA como aparecem lá (ex: se o DNA diz "rasga tudo" use "rasga tudo", não "transforma tudo").
${dnaSourceType === 'ESPECIFICO' ? 'Estes são exemplos PERFEITOS do mesmo tipo. Use como forte inspiração.' : 'Estes são exemplos gerais. Adapte a teologia para o formato de ' + estiloAlvo + '.'}

--- INÍCIO DNA (INSPIRAÇÃO) ---
${dnaEssencia}
--- FIM DNA ---
` : ''}

${usarPassagemDia ? `
## 3. PASSAGEM BÍBLICA:
Baseie-se nisto:
📖 **${passagemRef}**
"${passagemDoDia}"
` : ''}

${instrucoesFiltro}
${instrucaoLexicoEstilo}

## 4. REGRAS ESTRUTURAIS (OBRIGATÓRIO):
${(estiloAlvo === 'versículo' || estiloAlvo === 'versiculo')
          ? `1. **VERSÍCULOS OBRIGATÓRIOS (100%)**: TODAS AS ${quantidade} MENSAGENS devem ser centradas em um versículo bíblico. O versículo é o PROTAGONISTA. Cada mensagem deve: (1) Citar o versículo completo entre aspas, (2) Dar uma reflexão. USE VERSÍCULOS DIFERENTES em cada uma.`
          : `1. **VERSÍCULOS OBRIGATÓRIOS**: Pelo menos 40% das mensagens geradas (aprox. ${Math.ceil(quantidade * 0.4)}) DEVEM conter um versículo bíblico no corpo ou ao final.`}
2. **ANTI-REPETIÇÃO RIGOROSA**:
   Abaixo estão as mensagens que você gerou recentemente.
   **Analise os TEMAS, ÂNGULOS e VERSÍCULOS usados nelas.**
   **VOCÊ ESTÁ PROIBIDO DE REPETIR O MESMO TEMA OU ÂNGULO HOJE.**
   Se a última mensagem foi sobre "Confiança", fale sobre "Gratidão" ou "Sabedoria". Mude o disco!
   
   --- HISTÓRICO RECENTE (EVITAR ESSES TEMAS) ---
${contextoAntiRepeticao}
   ----------------------------------------------

## SUA TAREFA:
Gere **${quantidade} NOVAS ${estiloAlvo.toUpperCase()}S**.

**CHECKLIST:**
1. [GÊNERO] O texto é realmente uma ${estiloAlvo}? (Se Oração, fala com Deus? Se Devocional, ensina?)
2. [VERSÍCULO] ${(estiloAlvo === 'versículo' || estiloAlvo === 'versiculo') ? '100% tem versículo central? Cada uma com versículo DIFERENTE?' : '40% tem bíblia? AT e NT equilibrados?'}
3. [TEMA] ${temaFinalEstilo ? `Abordou "${temaFinalEstilo}" em todas?` : 'Cada mensagem tem tema único?'}
4. [FILTROS] ${diasSemana ? `Se citou dia, foi APENAS ${diasSemana}, em NO MÁXIMO 1 mensagem do lote, nunca no título nem na primeira frase?` : 'Ok.'}
4b. [TÍTULO] Cada mensagem começa com título curto em **negrito**, SEM prefixo de estilo e SEM linha de dia da semana?
5. [SEPARAÇÃO] Use "---" entre as mensagens.
6. [ANTI-REP] Nenhum tema ou versículo da lista proibida foi repetido?
${instrucaoLexicoEstilo ? `7. [LEXICO DNA] Cada mensagem tem pelo menos ${minLexTermEstilo} termos do léxico DNA?` : ''}
${neutro ? `${instrucaoLexicoEstilo ? '8' : '7'}. [NEUTRO] NENHUMA mensagem começa com "Bom dia", "Boa tarde", "Boa noite" ou variações? CONFIRME!` : ''}

Gere agora:
`;

      // 7. Chamar LLM (OpenRouter free com fallbacks)
      // Temperatura estável por perfil para reduzir variância de qualidade.
      let tempSorteadaEstilo = 0.78;
      if (formatoEstilo === 'Staccato') tempSorteadaEstilo = 0.72;
      if (formatoEstilo === 'Lista') tempSorteadaEstilo = 0.70;

      console.log(`🌡️ [ESTILO] Temperature: ${tempSorteadaEstilo}`);

      const llmRespEstilo = await gerarTexto(promptHibrido, {
        temperature: tempSorteadaEstilo,
        maxTokens: quantidade <= 5 ? 4096 : quantidade <= 15 ? 6000 : 8192,
      });

      if (!llmRespEstilo.ok) {
        console.error(`❌ MODO ESTILO - Erro LLM:`, llmRespEstilo.error);
        throw new Error(`Erro LLM: ${llmRespEstilo.error}`);
      }

      const resultado = limparTextoGerado(llmRespEstilo.text || "Erro na geração.");

      // FIX 3: Pós-processamento — verificar palavras banidas
      const PALAVRAS_BANIDAS_CHECK = ['norte', 'rota', 'neblina', 'bússola', 'farol', 'cais', 'porto seguro', 'âncora', 'obra-prima', 'confie no processo', 'jornada de fé', 'propósito divino'];
      const textoLower = resultado.toLowerCase();
      const banidasEncontradas = PALAVRAS_BANIDAS_CHECK.filter(p => textoLower.includes(p));
      if (banidasEncontradas.length > 0) {
        console.warn(`⚠️ [PÓS-CHECK] Palavras banidas detectadas na geração: ${banidasEncontradas.join(', ')}`);
      }

      return new Response(
        JSON.stringify({
          ok: true,
          resultado: resultado,
          tipo: 'modo_estilo',
          // Tracking para anti-repetição
          tema_usado: temaFinalEstilo || null,
          estilo_usado: estiloAlvo || null,
          autopilot: !filtros?.tema ? temaAutopilotEstilo : null
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // ========================================
    // MODO ESPECIAL: EXPLICAR PASSAGEM (GERAÇÃO IA)
    // ========================================
    if (modo_id === 'explicar_passagem') {
      console.log(`🔍 [EXPLICAR PASSAGEM] Gerando explicação com IA...`);

      const geminiKey = Deno.env.get("OPENROUTER_API_KEY") || Deno.env.get("GEMINI_API_KEY") || Deno.env.get("GEMINI_KEY");
      if (!geminiKey) {
        throw new Error("GEMINI_API_KEY não configurada.");
      }

      // Usar dados já parseados do início
      const versiculosTexto = versiculos || '';
      const referenciaPassagem = referencia || 'Passagem bíblica';
      const parteAtual = parte || 1;

      console.log(`📖 Referência: ${referenciaPassagem}, Parte: ${parteAtual}`);

      const promptExplicar = `
# EXPLICAÇÃO DO TRECHO BÍBLICO

Você é um estudioso bíblico experiente. Seu trabalho é explicar o trecho que o usuário ACABOU DE LER, da mesma forma que um comentarista bíblico faria.

## PASSAGEM: ${referenciaPassagem}
## PARTE: ${parteAtual}

### VERSÍCULOS QUE O USUÁRIO ACABOU DE LER:
${versiculosTexto}

## FORMATO OBRIGATÓRIO DA RESPOSTA:

Gere uma explicação usando EXATAMENTE este formato com bullets (•):

🔍 **CONTEXTO & EXPLICAÇÃO**

• **O que está acontecendo:** [1-2 frases explicando o que está literalmente acontecendo no texto. Quem fala, para quem, qual a ação.]

• **Contexto:** [2-3 frases com background histórico, cultural ou literário ESPECÍFICO deste trecho. Mencione versículos específicos quando relevante. Se há conexão com outras passagens, cite. Explique símbolos, nomes ou referências que o leitor moderno pode não entender.]

• **Significado:** [A parte mais rica. Explique a mensagem teológica, espiritual ou prática. Pode ter múltiplos pontos se necessário. Use frases impactantes. Termine com uma verdade que ressoa no coração.]

## REGRAS:
1. Use o formato acima COM BULLETS (•), não números
2. Cite versículos específicos do trecho (ex: "v.3", "v.9")
3. Faça conexões com outras passagens da Bíblia quando relevante
4. Linguagem profunda mas acessível — não acadêmica
5. NÃO inclua oração
6. NÃO inclua seção de aplicação prática separada
7. A verdade prática deve estar DENTRO do "Significado"
8. Máximo 200 palavras
9. NÃO use emojis além do 🔍 no início

Gere a explicação agora:
`;

      const llmExplicar = await gerarTexto(promptExplicar, { temperature: 0.7, maxTokens: 2048 });

      if (!llmExplicar.ok) {
        console.error(`❌ Erro LLM:`, llmExplicar.error);
        throw new Error(`Erro API LLM: ${llmExplicar.error}`);
      }

      const explicacao = llmExplicar.text || "Erro ao gerar explicação.";

      console.log(`✅ [EXPLICAR PASSAGEM] Explicação gerada com sucesso!`);

      return new Response(
        JSON.stringify({
          ok: true,
          resultado: explicacao,
          tipo: 'explicar_passagem'
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200
        }
      );
    }
    // ========================================
    // FIM DO MODO EXPLICAR PASSAGEM
    // ========================================

    // ========================================
    // MODO ESTUDO BÍBLICO (3 TIPOS VIA IA)
    // ========================================
    if (modo_id === 'estudo_biblico') {
      console.log(`📚 [ESTUDO BÍBLICO] Tipo: ${tipo_estudo}`);

      const geminiKey = Deno.env.get("OPENROUTER_API_KEY") || Deno.env.get("GEMINI_API_KEY") || Deno.env.get("GEMINI_KEY");
      if (!geminiKey) throw new Error("GEMINI_API_KEY não configurada.");

      const versiculosTexto = versiculos || '';
      const referenciaPassagem = referencia || 'Passagem bíblica';
      const tipoEstudo = tipo_estudo || 'estudo_profundo';

      // CACHE: o estudo é determinístico por (referência, tipo). Se já existe,
      // retorna instantaneamente — sem chamar a IA.
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL") || Deno.env.get("SB_URL");
        const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SB_SERVICE_ROLE_KEY");
        if (supabaseUrl && serviceKey) {
          const cacheClient = createClient(supabaseUrl, serviceKey);
          const { data: cached } = await cacheClient
            .from('estudo_cache')
            .select('resultado')
            .eq('referencia', referenciaPassagem)
            .eq('tipo_estudo', tipoEstudo)
            .maybeSingle();
          if (cached?.resultado) {
            console.log(`⚡ [ESTUDO BÍBLICO] Cache hit: ${referenciaPassagem} / ${tipoEstudo}`);
            return new Response(
              JSON.stringify({ ok: true, resultado: cached.resultado, tipo: 'estudo_biblico', tipo_estudo: tipoEstudo, cached: true }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
            );
          }
        }
      } catch (cacheErr) {
        console.warn('[ESTUDO BÍBLICO] Falha ao ler cache (segue gerando):', cacheErr);
      }

      // Prompts pedagógicos: ENTENDER (2) → VIVER (3) → FIXAR (4)
      // (as chaves antigas são mantidas por compatibilidade com o app)
      const PROMPTS: Record<string, string> = {
        // OPÇÃO 2 — ENTENDER A PASSAGEM
        // Professor que conta história, não acadêmico. Explica bloco a bloco.
        estudo_profundo: `
# ENTENDER A PASSAGEM

Você é um professor de Bíblia querido por explicar passagens difíceis como quem conta uma boa história. Linguagem simples do dia a dia, zero jargão acadêmico. PORTUGUÊS DO BRASIL impecável.

## PASSAGEM: ${referenciaPassagem}

### VERSÍCULOS:
${versiculosTexto}

## FORMATO OBRIGATÓRIO (siga EXATAMENTE, sem texto antes ou depois):

📖 **ENTENDER: ${referenciaPassagem}**

---

**🗺️ ONDE ESTAMOS NA HISTÓRIA**

[2-3 frases situando o leitor: quem escreveu/viveu isso, para quem, e o que estava acontecendo antes. Como uma "cena de abertura de filme".]

---

**📚 A PASSAGEM EXPLICADA**

**v.[X]–[Y]: [mini-título do bloco]**
[Reconte e explique este bloco em 2-3 frases simples, como se explicasse para um amigo. O que está acontecendo? O que significa?]

**v.[X]–[Y]: [mini-título do bloco]**
[Mesmo formato. Divida a passagem em 2 a 4 blocos no total, cobrindo TODOS os versículos.]

---

**💡 O DETALHE QUE DESTRAVA O TEXTO**

[UM costume da época, UMA palavra-chave (se citar hebraico/grego, traduza na hora) ou UM fato histórico que faz a passagem fazer sentido. 2-3 frases. Tipo "sabia disso?"]

---

**❤️ O QUE DEUS ESTÁ DIZENDO AQUI**

[2-3 frases com o coração da mensagem: o que esta passagem revela sobre Deus e o que ela aponta em Cristo.]

## REGRAS:
1. BASEIE-SE EXCLUSIVAMENTE nos versículos fornecidos
2. Cite os versículos pelos números reais (v.1, v.5...)
3. PROIBIDO: palavras difíceis sem explicar, tom de palestra, frases longas
4. Escreva como quem conversa, com exemplos visuais
5. Máximo 380 palavras
6. NÃO invente conteúdo que não está nos versículos
`,

        // OPÇÃO 3 — MEDITAR E VIVER
        // Reflexão pessoal real em vez de tarefas genéricas de casa/trabalho.
        aplicacao_pratica: `
# MEDITAR E VIVER A PASSAGEM

Você é um mentor espiritual que ajuda a pessoa a deixar a passagem LER ELA, e não só ela ler a passagem. Perguntas que tocam de verdade, desafio concreto, sem clichê de coach. PORTUGUÊS DO BRASIL impecável.

## PASSAGEM: ${referenciaPassagem}

### VERSÍCULOS:
${versiculosTexto}

## FORMATO OBRIGATÓRIO (siga EXATAMENTE, sem texto antes ou depois):

🙏 **MEDITAR E VIVER: ${referenciaPassagem}**

---

**⭐ VERSO PARA GUARDAR**

> "[Copie aqui o versículo mais central da passagem, na íntegra]" — ${referenciaPassagem.split(';')[0]}, v.[X]

[1 frase: por que ESTE verso é o coração do texto.]

---

**🪞 PARA VOCÊ SE PERGUNTAR**

1. [Pergunta pessoal e direta ligada a um versículo específico — que faça a pessoa se examinar de verdade]
2. [Segunda pergunta, ângulo diferente: relacionamentos, medos, decisões...]
3. [Terceira pergunta, a mais profunda: o que precisa mudar?]

*Não corra. Responda mentalmente uma por uma.*

---

**🔥 DESAFIO DE HOJE**

[UM único desafio concreto, específico e realizável HOJE, nascido diretamente desta passagem. Não "seja mais grato" — e sim algo que dá para FAZER e saber que fez.]

---

**🙌 ORE COM A PASSAGEM**

*"[Oração de 3-4 frases construída com as próprias palavras e imagens DESTA passagem, em primeira pessoa.]"*

## REGRAS:
1. BASEIE-SE EXCLUSIVAMENTE nos versículos fornecidos
2. As perguntas devem ser ESPECÍFICAS desta passagem (nunca serviriam para outro texto)
3. PROIBIDO: linguagem de coach ("destrave", "tome posse"), tarefas genéricas, julgamento
4. Tom: mesa de café com um mentor sábio
5. Máximo 320 palavras
`,

        // OPÇÃO 4 — FIXAR EM 1 MINUTO
        // Resumo + retenção ativa (mini-quiz) para a pessoa LEMBRAR o que leu.
        sintese_rapida: `
# FIXAR A PASSAGEM EM 1 MINUTO

Você é um comunicador que faz qualquer pessoa LEMBRAR o que leu. Resumo vivo + memorização ativa. PORTUGUÊS DO BRASIL impecável.

## PASSAGEM: ${referenciaPassagem}

### VERSÍCULOS:
${versiculosTexto}

## FORMATO OBRIGATÓRIO (siga EXATAMENTE, sem texto antes ou depois):

⚡ **FIXAR EM 1 MINUTO: ${referenciaPassagem}**

---

**📜 A HISTÓRIA EM 5 LINHAS**

[Conte a passagem inteira em no máximo 5 frases curtas e fluidas, em sequência, como um trailer. Quem lê só isto entende o que aconteceu.]

---

**🧠 3 COISAS PARA NÃO ESQUECER**

1. **[Fato/ideia memorável]** (v.[X])
2. **[Fato/ideia memorável]** (v.[X])
3. **[Fato/ideia memorável]** (v.[X])

---

**✍️ TESTE RÁPIDO** *(responda de cabeça antes de olhar)*

**P1:** [Pergunta objetiva sobre a passagem]
**P2:** [Pergunta sobre o significado central]

**Respostas:** 1) [resposta em poucas palavras] · 2) [resposta em poucas palavras]

---

**💎 FRASE PARA LEVAR O DIA**

> **[Uma frase curta e marcante que resume a passagem — fácil de repetir de memória]**

## REGRAS:
1. BASEIE-SE EXCLUSIVAMENTE nos versículos fornecidos
2. Frases CURTAS. Cada palavra conta.
3. O teste rápido deve ser respondível só com o que está na passagem
4. Máximo 230 palavras
5. NÃO invente conteúdo que não está nos versículos
`,

        // VERSÍCULOS-CHAVE — saída JSON pura para o destaque automático
        // na tela Ler Passagem (o app pinta esses versículos ao abrir).
        versiculos_chave: `
# VERSÍCULOS-CHAVE DA PASSAGEM

Você é um professor de Bíblia experiente. Da passagem abaixo, escolha os versículos que carregam o CORAÇÃO do texto — a promessa central, a verdade principal sobre Deus, o mandamento decisivo ou o versículo mais memorável.

## PASSAGEM: ${referenciaPassagem}

### VERSÍCULOS (formato capítulo:versículo. texto):
${versiculosTexto}

## TAREFA
Escolha de 2 a 5 versículos-chave (nunca mais que 5, nunca menos que 2).

## RESPONDA APENAS COM JSON PURO — sem \`\`\`, sem comentário, sem texto antes ou depois:
{"chave":[{"c":3,"v":16,"tipo":"promessa"},{"c":3,"v":17,"tipo":"verdade"}]}

## REGRAS:
1. "c" = número do capítulo e "v" = número do versículo, EXATAMENTE como aparecem na lista fornecida
2. "tipo" deve ser um destes: "promessa", "mandamento", "verdade", "oracao", "alerta"
3. Escolha SOMENTE versículos que existem na lista fornecida
4. Priorize os versículos que alguém sublinharia na Bíblia física
`
      };

      const promptFinal = PROMPTS[tipoEstudo] || PROMPTS['estudo_profundo'];

      console.log(`📝 Prompt selecionado: ${tipoEstudo} (${promptFinal.length} chars)`);

      // versiculos_chave: saída JSON curta e determinística → temperatura baixa
      const llmOpts = tipoEstudo === 'versiculos_chave'
        ? { temperature: 0.2, maxTokens: 400 }
        : { temperature: 0.75, maxTokens: 3072 };
      const llmEstudo = await gerarTexto(promptFinal, llmOpts);

      if (!llmEstudo.ok) {
        console.error(`❌ Erro LLM:`, llmEstudo.error);
        throw new Error(`Erro API LLM: ${llmEstudo.error}`);
      }

      const resultado = llmEstudo.text || "Erro ao gerar estudo.";

      console.log(`✅ [ESTUDO BÍBLICO] ${tipoEstudo} gerado com sucesso!`);

      // Salva no cache para as próximas leituras da mesma passagem (fire-and-forget)
      if (resultado && !resultado.startsWith('Erro')) {
        try {
          const supabaseUrl = Deno.env.get("SUPABASE_URL") || Deno.env.get("SB_URL");
          const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SB_SERVICE_ROLE_KEY");
          if (supabaseUrl && serviceKey) {
            const cacheClient = createClient(supabaseUrl, serviceKey);
            await cacheClient.from('estudo_cache').upsert(
              { referencia: referenciaPassagem, tipo_estudo: tipoEstudo, resultado },
              { onConflict: 'referencia,tipo_estudo' }
            );
          }
        } catch (saveErr) {
          console.warn('[ESTUDO BÍBLICO] Falha ao salvar cache:', saveErr);
        }
      }

      return new Response(
        JSON.stringify({
          ok: true,
          resultado: resultado,
          tipo: 'estudo_biblico',
          tipo_estudo: tipoEstudo
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200
        }
      );
    }
    // ========================================
    // FIM DO MODO ESTUDO BÍBLICO
    // ========================================


    // ========================================
    // MODO HÍBRIDO: PASSAGEM DO DIA + FAVORITAS
    // ========================================
    if (modo_id === 'modo_hibrido') {
      console.log(`🔀 [MODO HÍBRIDO] Gerando 10 mensagens: Passagem + Favoritas...`);

      // Inicializar Supabase
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const geminiKey = Deno.env.get("OPENROUTER_API_KEY") || Deno.env.get("GEMINI_API_KEY") || Deno.env.get("GEMINI_KEY");

      if (!supabaseUrl || !serviceKey || !geminiKey) {
        throw new Error("Variáveis de ambiente não configuradas.");
      }

      const supabase = createClient(supabaseUrl, serviceKey);

      // 1. Buscar Passagem do Dia (usando SELECT * como outros modos)
      const dataAlvo = data || new Date().toISOString().split('T')[0];
      const { data: payloadDia, error: payloadErr } = await supabase
        .from("payload_do_dia")
        .select("*")
        .eq("data", dataAlvo)
        .maybeSingle();

      if (payloadErr) {
        console.error("Erro ao buscar payload:", payloadErr);
      }

      // Usar mesmos campos que outros modos
      const passagemRef = payloadDia?.passagem_do_dia || payloadDia?.passagem || "Passagem não encontrada";
      const passagemTexto = payloadDia?.texto || "";

      // 1.1 BUSCAR FAVORITAS (CRÍTICO PARA MODO HÍBRIDO)
      const { data: favoritas } = await supabase
        .from("dna_categorizado")
        .select("texto_msg")
        .order("created_at", { ascending: false })
        .limit(20);

      // ========================================
      // 2. BUSCAR CONTEXTO ANTERIOR (ANTI-REPETIÇÃO)
      // ========================================
      console.log(`🧠 [CONTEXTO] Buscando últimas 3 gerações para o modo: ${modo_id}`);

      const { data: historicoRecente } = await supabase
        .from("historico_geracoes")
        .select("resultado_texto, created_at")
        .eq("modo_id", modo_id)
        // QUERY DE 3 DIAS PARA O MODO HIBRIDO TAMBÉM
        .gte("created_at", new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString())
        .order("created_at", { ascending: false });

      let contextoAnterior = "";
      if (historicoRecente && historicoRecente.length > 0) {
        contextoAnterior = `
## 🧠 CONTEXTO ANTERIOR (O QUE VOCÊ JÁ GEROU RECENTEMENTE):
Abaixo estão as últimas mensagens que você gerou. 
⚠️ **OBJETIVO:** EVITE REPETIR AS MESMAS FRASES, VERSÍCULOS OU ESTRUTURAS EXATAS. CRIE ALGO NOVO.

${historicoRecente.map((h, i) => `--- GERAÇÃO ${i + 1} ---\n${h.resultado_texto.substring(0, 300)}...`).join('\n')}
`;
      } else {
        contextoAnterior = "\n## 🧠 CONTEXTO: Primeira execução recente.\n";
      }

      // ========================================
      // ========================================
      // 3. RECUPERAR FAVORITAS (DNA)
      // ========================================
      const dnaFavoritas = favoritas?.length
        ? favoritas.map((f: any, i: number) => `### FAVORITA ${i + 1}:\n${f.texto_msg}`).join("\n\n---\n\n")
        : "Não há favoritas ainda.";

      console.log(`📚 Favoritas: ${favoritas?.length || 0}`);

      // 3. Prompt Híbrido EQUILIBRADO 50/50 com FORMATO DINÂMICO
      const promptHibrido = `
# MODO HÍBRIDO — EQUILÍBRIO 50/50: PASSAGEM + FAVORITAS

Você vai gerar **10 MENSAGENS DEVOCIONAIS** que combinam IGUALMENTE:
- **50% PASSAGEM DO DIA** (tema e conteúdo bíblico)
- **50% DNA FAVORITAS** (estilo, tom, estrutura E FORMATO)

## PASSAGEM DO DIA (50% - TEMA):
**${passagemRef}**
${passagemTexto ? `\n"${passagemTexto}"` : ""}

## DNA DAS FAVORITAS (50% - ESTILO E FORMATO):
${dnaFavoritas}

## REGRAS CRÍTICAS:

### OBRIGATÓRIO EM TODAS AS 10 MENSAGENS:
1. 📖 Começar com: "📖 Leitura do dia: ${passagemRef}"
2. ⚖️ Equilibrar 50% passagem + 50% estilo das favoritas

### OBRIGATÓRIO EM PELO MENOS 4 MENSAGENS:
3. Incluir versículo bíblico formatado: "Texto" — Referência

### FORMATO DE CADA MENSAGEM:
4. ⚠️ **IMITE OS FORMATOS DAS FAVORITAS** - NÃO use template fixo!
5. Se as favoritas usam staccato, use staccato
6. Se as favoritas usam narrativo, use narrativo
7. Se as favoritas usam listas, use listas
8. VARIE os formatos entre as 10 mensagens

### SEPARADOR:
Use --- entre cada mensagem

${contextoAnterior}

Gere as 10 mensagens agora:
`;

      // 4. Chamar LLM (OpenRouter free com fallbacks)
      const llmHibrido = await gerarTexto(promptHibrido, { temperature: 0.85, maxTokens: 4096 });

      if (!llmHibrido.ok) {
        console.error(`❌ Erro LLM:`, llmHibrido.error);
        throw new Error(`Erro API LLM: ${llmHibrido.error}`);
      }

      const resultado = llmHibrido.text || "Erro ao gerar mensagens.";

      console.log(`✅ [MODO HÍBRIDO] Geração concluída!`);

      // 5. Salvar no histórico (MESMOS CAMPOS DOS OUTROS MODOS)
      const { data: historicoData, error: insertError } = await supabase
        .from("historico_geracoes")
        .insert({
          modo_id: 'modo_hibrido',
          data_referencia: dataAlvo,
          passagem: passagemRef,
          resultado_texto: resultado,
          aprovado: false
        })
        .select("id")
        .single();

      if (insertError) {
        console.error("Erro ao salvar histórico:", insertError);
      }

      return new Response(
        JSON.stringify({
          ok: true,
          resultado: resultado,
          modo: 'Híbrido (Passagem + Favoritas)',
          id: historicoData?.id,
          passagem: passagemRef
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200
        }
      );
    }
    // ========================================
    // FIM DO MODO HÍBRIDO
    // ========================================    // ========================================
    // MODO ESPECIAL: PALAVRA DA MANHÃ (AUTO)
    // ========================================
    if (modo_id === 'modo_palavra_manha') {
      console.log(`🌅 [PALAVRA DA MANHÃ] Iniciando geração para ${data}...`);

      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const geminiKey = Deno.env.get("OPENROUTER_API_KEY") || Deno.env.get("GEMINI_API_KEY") || Deno.env.get("GEMINI_KEY");

      if (!supabaseUrl || !serviceKey || !geminiKey) {
        throw new Error("Variáveis de ambiente não configuradas.");
      }

      const supabase = createClient(supabaseUrl, serviceKey);

      // 1. Determinar Configuração do Dia
      const dataObj = new Date(data);
      const diaSemana = dataObj.getUTCDay(); // 0=Domingo, 1=Segunda, ...

      const CONFIG_DIA: Record<number, any> = {
        1: { dia: 'Segunda', categoria: 'ORACAO', formato: 'Curto', extra: 'Início da Semana' },
        2: { dia: 'Terça', categoria: 'VERSICULO', formato: 'Médio', extra: '' },
        3: { dia: 'Quarta', categoria: 'REFLEXAO', formato: 'Médio', extra: '' },
        4: { dia: 'Quinta', categoria: 'DEVOCIONAL', formato: 'Médio', extra: 'Passagem do Dia' },
        5: { dia: 'Sexta', categoria: 'EXORTACAO', formato: 'Médio', extra: '' },
        6: { dia: 'Sábado', categoria: 'MEDITACAO', formato: 'Curto', extra: 'Fim de Semana' },
        0: { dia: 'Domingo', categoria: 'LOUVOR', formato: 'Médio', extra: 'Fim de Semana' }
      };

      const config = CONFIG_DIA[diaSemana] || CONFIG_DIA[1];
      console.log(`📅 Configuração: ${config.dia} | Cat: ${config.categoria} | Fmt: ${config.formato}`);

      // 2. Buscar Passagem do Dia (APENAS SE FOR QUINTA OU CONFIGURADO)
      let passagemRef = '';
      let passagemTexto = '';

      if (config.extra === 'Passagem do Dia') {
        console.log('📖 Buscando Passagem do Dia...');
        const { data: payloadDia } = await supabase
          .from("payload_do_dia")
          .select("*")
          .eq("data", data)
          .maybeSingle();

        passagemRef = payloadDia?.passagem_do_dia || payloadDia?.passagem || "";
        passagemTexto = payloadDia?.texto || "";
      }

      // 3. Buscar Histórico Recente (Anti-Repetição)
      // Buscar últimas 3 gerações da palavra da manhã para evitar repetição
      const { data: historicoRecente } = await supabase
        .from("palavra_manha_diaria")
        .select("mensagem, categoria")
        .order("data", { ascending: false })
        .limit(3);

      const contextoEvitar = historicoRecente?.map(h => `(Evite repetir este tema/estilo): ${h.mensagem.substring(0, 50)}...`).join('\n') || "Nenhum histórico recente.";

      // 3b. Buscar versículos já usados nos últimos 365 dias (anti-repetição de verso).
      const dataLimiteVers = new Date(data);
      dataLimiteVers.setUTCDate(dataLimiteVers.getUTCDate() - 365);
      const dataLimiteStr = dataLimiteVers.toISOString().slice(0, 10);
      const { data: versUsadosRows } = await supabase
        .from("palavra_manha_versiculos")
        .select("versiculo_ref, ref_norm")
        .gte("data", dataLimiteStr)
        .order("data", { ascending: false });

      const versUsadosSet = new Set((versUsadosRows || []).map((v: any) => v.ref_norm));
      const versUsadosLista = [...new Set((versUsadosRows || []).map((v: any) => v.versiculo_ref))];
      const secaoVersEvitar = versUsadosLista.length
        ? `\n## VERSÍCULOS JÁ USADOS (NÃO REPETIR — últimos 365 dias):\nNÃO use nenhum destes versículos como base ou apoio hoje. Escolha um DIFERENTE:\n${versUsadosLista.join(', ')}\n`
        : '';

      // 4. Buscar Favoritas (DNA BASE)
      const { data: favoritas } = await supabase
        .from("dna_categorizado")
        .select("texto_msg")
        .order("created_at", { ascending: false })
        .limit(20);

      const dnaFavoritas = favoritas?.length
        ? favoritas.map((f: any, i: number) => `### FAVORITA ${i + 1}:\n${f.texto_msg}`).join("\n\n---\n\n")
        : "Sem favoritas. Use estilo devocional genérico, mas profundo.";

      // 5. Construir Prompt
      const prompt = `
# GERADOR PALAVRA DA MANHÃ (MODO AUTOMÁTICO)

## CONTEXTO
Você é um mentor espiritual gerando a "Palavra da Manhã" para o usuário. 
Hoje é **${config.dia}**.

## DNA DA ESCRITA (CRUCIAL):
Baseie-se PLENAMENTE no estilo destas favoritas:
${dnaFavoritas}

## CONFIGURAÇÃO DE HOJE:
- **CATEGORIA:** ${config.categoria}
- **FORMATO:** ${config.formato}
- **CONTEXTO EXTRA:** ${config.extra}
${passagemRef ? `- **BASE BÍBLICA OBRIGATÓRIA:** ${passagemRef}\n"${passagemTexto}"` : ''}

## TAMANHO (REGRA RÍGIDA — A MAIS IMPORTANTE):
- Formato "Curto": mensagem COMPLETA com no máximo 400 caracteres.
- Formato "Médio": mensagem COMPLETA com no máximo 600 caracteres.
- O limite inclui título, corpo, versículo de apoio e fechamento.
- Seja direto e impactante: UMA ideia central, frases curtas, sem parágrafos longos. Qualidade sobre quantidade. NUNCA ultrapasse o limite.

## ABERTURA E DIA DA SEMANA (REGRA RÍGIDA):
- VARIE a abertura todo dia. NÃO comece com o dia da semana nem com "Hoje é...".
- NÃO cite o nome do dia (domingo, segunda, terça, quarta, quinta, sexta, sábado) no texto — a data já aparece no topo do card. Comece direto pelo tema/conteúdo, de um jeito diferente do dia anterior. (Use ${config.dia} apenas como contexto interno para escolher o tom, nunca escreva o dia na mensagem.)

## ANTI-REPETIÇÃO (O QUE NÃO FAZER):
${contextoEvitar}
${secaoVersEvitar}
## INSTRUÇÕES DE GERAÇÃO:
Gere UMA ÚNICA mensagem que siga estritamente a configuração acima.

1. **Se for ORAÇÃO:** Escreva em primeira pessoa dirigindo-se a Deus.
2. **Se for VERSÍCULO:** Cite um versículo chave e faça um breve comentário.
3. **Se for QUINTA (Passagem do Dia):** Explique e aplique a passagem ${passagemRef}.
4. **Se for INÍCIO SEMANA:** Dê força, ânimo e direção.
5. **Se for FIM SEMANA:** Dê descanso, paz e gratidão.

## FORMATO DE SAÍDA (responda APENAS com a mensagem final pronta, em português):
- 1ª linha: um TÍTULO curto e impactante, TODO EM MAIÚSCULAS.
- (linha em branco)
- o corpo da mensagem (2 a 4 frases).
${config.categoria === 'VERSICULO' || config.extra === 'Passagem do Dia' ? '' : '- (linha em branco) e um versículo de apoio entre « », com a referência (livro capítulo:versículo) na linha de baixo.'}
- (linha em branco) e uma frase curta de fechamento.

NUNCA escreva rótulos como "Título:", "Corpo:", "Title:", "Body:" ou "Fechamento:". NUNCA use colchetes [ ]. NUNCA escreva contagem de caracteres, instruções, planejamento ou qualquer texto em inglês. Escreva somente o conteúdo real, pronto para enviar.
`;

      // 6. Chamar LLM. Palavra da Manhã é tarefa CRIATIVA em PT — usa modelos
      // INSTRUCT (não-raciocínio). Modelos de raciocínio (ex.: gpt-oss-120b,
      // nemotron-reasoning) vazavam o rascunho ("Sentence 1: Introduce passage...")
      // em vez do texto final. Se o túnel do 9Router estiver setado, ainda o
      // usamos, mas com um modelo não-raciocínio à frente do combo "openclaw".
      const epPalavra = get9RouterEndpoint();
      const MODELOS_PALAVRA_OR = [
        'meta-llama/llama-3.3-70b-instruct:free',
        'qwen/qwen3-next-80b-a3b-instruct:free',
        'google/gemma-4-31b-it:free',
        'deepseek/deepseek-v4-flash',
      ];
      const MODELOS_PALAVRA_TUNEL = [
        'gemini/gemini-3-flash-preview',
        'openclaw',
        'ds/deepseek-v4-flash',
      ];

      // Teto de tokens: modelos instruct são concisos; 500 dá folga p/ o limite
      // de caracteres (400/600) sem virar "textão" (o corte por chars ainda existe).
      const gerarPalavra = (promptTxt: string, temp: number) => gerarPalavraComReserva({
        prompt: promptTxt,
        temperature: temp,
        maxTokens: 500,
        useTunnel: epPalavra.useTunnel,
        tunnelUrl: epPalavra.url,
        tunnelApiKey: epPalavra.apiKey,
        modelosTunel: MODELOS_PALAVRA_TUNEL,
        modelosReserva: MODELOS_PALAVRA_OR,
        gerarTexto,
      });

      const llmPalavra = await gerarPalavra(prompt, 0.85);
      if (!llmPalavra.ok) throw new Error(`Erro LLM: ${llmPalavra.error}`);

      // ENFORCEMENT DE TAMANHO: rede de segurança caso o modelo ainda exceda.
      // Curto -> ~500 chars | Médio -> ~750 chars (corta no fim de frase).
      const limiteChars = config.formato === 'Curto' ? 500 : 750;

      // Limpa raciocinio vazado (mesma rede dos modos favoritas/estilo).
      let textoPalavra = limparTextoGerado(llmPalavra.text || "");

      // Se o modelo vazou planejamento/esqueleto em vez da mensagem, regenera 1x.
      if (pareceVazamentoRaciocinio(textoPalavra)) {
        console.warn('⚠️ [PALAVRA DA MANHÃ] Vazamento de raciocínio detectado — regenerando...');
        const retryPalavra = await gerarPalavra(
          prompt + '\n\nRESPONDA SOMENTE com a mensagem final em PORTUGUÊS (título em maiúsculas, corpo, versículo e fechamento). NÃO escreva raciocínio, esqueleto, "Sentence 1/2/3", planejamento, contagem de caracteres, nem nada em inglês.',
          0.7,
        );
        if (retryPalavra.ok) textoPalavra = limparTextoGerado(retryPalavra.text || "");
      }

      // ANTI-REPETIÇÃO DE VERSÍCULO (garantia forte): se o versículo usado já
      // apareceu nos últimos 365 dias, regenera 1x pedindo explicitamente outro.
      if (textoPalavra && textoPalavra.length >= 40 && !pareceVazamentoRaciocinio(textoPalavra) && !passagemRef) {
        const refTmp = extrairVersiculoRef(textoPalavra);
        if (refTmp && versUsadosSet.has(refTmp.norm)) {
          console.warn(`⚠️ [PALAVRA DA MANHÃ] Versículo repetido (${refTmp.ref}) — regenerando com outro...`);
          const retryVers = await gerarPalavra(
            prompt + `\n\nATENÇÃO: NÃO use o versículo "${refTmp.ref}" nem nenhum já listado como usado nos últimos 365 dias. Escolha um versículo DIFERENTE. Responda só com a mensagem final em português.`,
            0.8,
          );
          if (retryVers.ok) {
            const limpo = limparTextoGerado(retryVers.text || "");
            if (limpo && limpo.length >= 40 && !pareceVazamentoRaciocinio(limpo)) textoPalavra = limpo;
          }
        }
      }

      // Se ainda assim ficou vazio/curto demais ou continua vazando, usa fallback
      // seguro ROTATIVO (não repete o mesmo texto vários dias seguidos).
      if (!textoPalavra || textoPalavra.length < 40 || pareceVazamentoRaciocinio(textoPalavra)) {
        console.warn('⚠️ [PALAVRA DA MANHÃ] Conteúdo inválido — usando fallback seguro rotativo.');
        textoPalavra = escolherFallbackPalavra(data);
      }

      const resultado = limitarTamanhoMensagem(textoPalavra, limiteChars);

      console.log(`✅ [PALAVRA DA MANHÃ] Geração concluída! (${resultado.length} chars)`);

      // 7. Salvar no Cache (SERVER-SIDE SAVE - CRITICAL FIX)
      // Garante persistência mesmo se o cliente falhar
      const cachedData = {
        data: data,
        dia_semana: config.dia,
        categoria: config.categoria,
        formato: config.formato,
        mensagem: resultado,
        passagem_ref: passagemRef || null,
        amei_count: 0 // Novo campo default
      };

      console.log('💾 [SERVER SAVE] Salvando no banco:', cachedData);

      const { data: savedRecord, error: saveError } = await supabase
        .from('palavra_manha_diaria')
        .upsert(cachedData, { onConflict: 'data' })
        .select()
        .single();

      if (saveError) {
        console.error('❌ [SERVER SAVE] Erro crítico:', saveError);
      } else {
        console.log('✅ [SERVER SAVE] Salvo com ID:', savedRecord.id);
      }

      // 8. Registrar o versículo usado hoje (anti-repetição de 365 dias).
      const refFinal = passagemRef ? extrairVersiculoRef(passagemRef) : extrairVersiculoRef(resultado);
      if (refFinal) {
        const { error: versErr } = await supabase
          .from('palavra_manha_versiculos')
          .upsert(
            {
              data: data,
              versiculo_ref: refFinal.ref,
              ref_norm: refFinal.norm,
              categoria: config.categoria,
              mensagem_id: savedRecord?.id ?? null,
            },
            { onConflict: 'data' },
          );
        if (versErr) console.error('❌ [VERSÍCULO] Erro ao registrar:', versErr.message);
        else console.log(`📌 [VERSÍCULO] Registrado: ${refFinal.ref}`);
      } else {
        console.log('ℹ️ [VERSÍCULO] Nenhuma referência detectada na mensagem de hoje.');
      }

      return new Response(
        JSON.stringify({
          ok: true,
          resultado: resultado,
          config: config,
          passagem_usada: passagemRef,
          versiculo_registrado: refFinal?.ref || null,
          // Retornamos o registro completo (o frontend vai usar isso agora)
          registro: savedRecord || { ...cachedData, id: 0 },
          debug_save_error: saveError // Expondo erro para debug
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200
        }
      );
    }

    // --- INICIO DA LÓGICA DE VARIABILIDADE (DNA PVC OFICIAL) ---

    // 1. SORTEIO DO ARQUÉTIPO (CAMALEÃO)
    const arquetipoSorteado = getArchetype(data);

    // 2. CALEIDOSCÓPIO DE ÂNGULOS (NOVO SISTEMA DE NUANCE)
    const listaAngulos = [
      "ÂNGULO 1: O ESPELHO MODERNO (Tradução Cultural) - O que fazer: Traduza a metáfora bíblica para hoje. Exemplo: Em vez de falar de 'carros de guerra', fale de 'status' e 'influência'. Em vez de 'leprosos', fale de 'excluídos'.",
      "ÂNGULO 2: A RAIZ HISTÓRICA (Respeito ao Texto) - O que fazer: Mantenha os termos originais (Sião, Egito, Pastor, Ovelha), mas extraia uma lição profunda. Exemplo: 'Assim como Israel desceu ao Egito, nós voltamos aos velhos hábitos.'",
      "ÂNGULO 3: O RAIO-X EMOCIONAL (Foco na Alma) - O que fazer: Ignore o cenário externo e fale só do sentimento. Exemplo: Não fale de guerra nem de boleto. Fale de Medo, Ansiedade, Paz e Esperança. Foque no interior.",
      "ÂNGULO 4: A LENTE DE JESUS (Cristocêntrico) - O que fazer: Conecte esse texto antigo diretamente a Jesus ou à Graça. Mostre como Cristo resolve esse problema."
    ];

    const listaTemperaturas = [
      "DEVOCIONAL E ÍNTIMO: Tom de oração, sussurro e entrega.",
      "SAPIENCIAL E PRÁTICO: Tom de conselho, decisão e ação ('segunda-feira').",
      "PROFÉTICO E DENÚNCIA: Tom firme, urgente, apontando ídolos.",
      "CONSOLADOR E PASTORAL: Tom de graça, acolhimento e respiro."
    ];

    // Helpers para extrair IDs dos ângulos/temperaturas
    const extrairIdAngulo = (angulo: string): string => {
      if (angulo.includes("ESPELHO MODERNO")) return "ESPELHO_MODERNO";
      if (angulo.includes("RAIZ HISTÓRICA")) return "RAIZ_HISTORICA";
      if (angulo.includes("RAIO-X EMOCIONAL")) return "RAIO_X_EMOCIONAL";
      if (angulo.includes("LENTE DE JESUS")) return "LENTE_DE_JESUS";
      return "DESCONHECIDO";
    };

    const extrairIdTemperatura = (temp: string): string => {
      if (temp.includes("DEVOCIONAL")) return "DEVOCIONAL";
      if (temp.includes("SAPIENCIAL")) return "SAPIENCIAL";
      if (temp.includes("PROFÉTICO")) return "PROFETICO";
      if (temp.includes("CONSOLADOR")) return "CONSOLADOR";
      return "DESCONHECIDO";
    };

    // =====================================================
    // SORTEIO INICIAL (será refinado pelo sistema anti-repetição após init do Supabase)
    // =====================================================
    let anguloSorteado = listaAngulos[Math.floor(Math.random() * listaAngulos.length)];
    let temperaturaSorteada = listaTemperaturas[Math.floor(Math.random() * listaTemperaturas.length)];

    // Contexto Temporal
    const contextoTemporal = getContextoTemporal(data);
    console.log(`📅 [DATA] ${contextoTemporal}`);

    // Limpeza de códgo duplicado

    // LÓGICA DE PROIBIÇÃO DINÂMICA (TRAVA DE VOCABULÁRIO)
    let proibicaoExtra = "";
    if (anguloSorteado.includes("ESPELHO MODERNO")) {
      proibicaoExtra = `
⚠️ PROIBIÇÃO ESTRITA(MODO MODERNO ATIVADO):
Neste ângulo, você está PROIBIDO de usar as palavras: Egito, Faraó, Carros, Cavalos, Assíria, Babilônia, Tenda, Espada.
Você DEVE substituir por termos equivalentes da vida atual:
    - Egito -> Sistema / Mundo / Atalho fácil
      - Carros / Cavalos -> Recursos / Status / Tecnologia / Influência
      - Espada -> Palavras / Ações / Defesa
      - Faraó -> O Chefe / O Dono da Bola / A Pressão
        - Assíria -> O Inimigo / A Crise / A Ansiedade

SE VOCÊ USAR "EGITO" OU "CAVALOS" NESTE MODO, A GERAÇÃO FALHARÁ. TRADUZA TUDO.
`;
    }

    const instrucaoVariabilidade = `
    \n\n === [SISTEMA CALEIDOSCÓPIO - NUANCE INFINITA] ===
      ATENÇÃO: Para evitar repetição, você deve observar este texto através de um ÂNGULO ESPECÍFICO.
Não use sempre a mesma fórmula. 

🎲 SEU ÂNGULO SORTEADO PARA ESTA EXECUÇÃO:
${anguloSorteado}

🌡️ SUA TEMPERATURA EMOCIONAL:
${temperaturaSorteada}

👤 SEU ARQUÉTIPO ESTRUTURAL:
${arquetipoSorteado.nome}

${proibicaoExtra}

⚠️ INSTRUÇÃO DE MIXAGEM(CRUCIAL):
    1. O ÂNGULO define "DO QUE" você fala(se é do Egito, se é da Ansiedade, ou se é de Status).Obedeça o ângulo sorteado para esta execução.
2. A TEMPERATURA define "COMO" você fala(se está orando, aconselhando ou exortando).
3. O ARQUÉTIPO define a ESTRUTURA(o esqueleto do texto).

REGRAS FINAIS DE NUANCE:
- Se o ângulo for "RAIZ HISTÓRICA", use os termos bíblicos(Egito, Tenda).
- Se o ângulo for "ESPELHO MODERNO", obedeça a PROIBIÇÃO acima.Traduza tudo para vida urbana atual.
- Se o ângulo for "RAIO-X EMOCIONAL", foque apenas no sentimento humano.
- Varie.Surpreenda.Não seja robótico.
==================================================\n
`;

    // --- FIM DA LÓGICA DE VARIABILIDADE ---

    // 3. Inicializar Supabase
    // IMPORTANTE: Certifique-se de ter setado as Secrets no painel!
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    // Tenta pegar a chave de duas variáveis possíveis para garantir
    const geminiKey = Deno.env.get("OPENROUTER_API_KEY") || Deno.env.get("GEMINI_API_KEY") || Deno.env.get("GEMINI_KEY");
    const bibleApiKey = Deno.env.get("BIBLE_API_KEY"); // Opcional - para API.Bible

    if (!supabaseUrl || !serviceKey || !geminiKey) {
      throw new Error("Variáveis de ambiente (Secrets) não configuradas no Supabase: SUPABASE_URL, SERVICE_ROLE_KEY ou GEMINI_API_KEY.");
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    // =====================================================
    // SISTEMA ANTI-REPETIÇÃO (DNA POR DIA)
    // Consulta últimos 5 dias para evitar repetir ângulos
    // =====================================================
    console.log("🧬 [DNA] Consultando histórico dos últimos 5 dias...");

    const { data: dnaRecente } = await supabase
      .from("historico_geracoes")
      .select("data_referencia, dna_geracao")
      .not("dna_geracao", "is", null)
      .lt("data_referencia", data) // Só dias ANTERIORES ao atual
      .order("data_referencia", { ascending: false })
      .limit(20);

    // Extrair datas únicas (últimos 5 dias)
    const diasUnicos = [...new Set(dnaRecente?.map(d => d.data_referencia) || [])].slice(0, 5);
    const angulosUsados = dnaRecente
      ?.filter(d => diasUnicos.includes(d.data_referencia))
      ?.map(d => d.dna_geracao?.angulo)
      ?.filter(Boolean) || [];
    const temperaturasUsadas = dnaRecente
      ?.filter(d => diasUnicos.includes(d.data_referencia))
      ?.map(d => d.dna_geracao?.temperatura)
      ?.filter(Boolean) || [];

    console.log(`🧬 [DNA] Dias com histórico: ${diasUnicos.length}`);
    console.log(`🧬 [DNA] Ângulos já usados: ${angulosUsados.join(", ") || "nenhum"}`);

    // Refinar sorteio com base no histórico
    const angulosDisponiveis = listaAngulos.filter(a =>
      !angulosUsados.includes(extrairIdAngulo(a))
    );
    const temperaturasDisponiveis = listaTemperaturas.filter(t =>
      !temperaturasUsadas.includes(extrairIdTemperatura(t))
    );

    // Se esgotou opções, usar pool completo (passagem vence)
    if (angulosDisponiveis.length > 0) {
      anguloSorteado = angulosDisponiveis[Math.floor(Math.random() * angulosDisponiveis.length)];
      console.log(`✅ [ANTI-REP] Filtrou ${listaAngulos.length - angulosDisponiveis.length} ângulos já usados`);
    }
    if (temperaturasDisponiveis.length > 0) {
      temperaturaSorteada = temperaturasDisponiveis[Math.floor(Math.random() * temperaturasDisponiveis.length)];
    }

    console.log(`🎲 [VARIABILIDADE] Ângulo: ${extrairIdAngulo(anguloSorteado)} | Temp: ${extrairIdTemperatura(temperaturaSorteada)} | Arq: ${arquetipoSorteado.id}`);

    // 4. Buscar LEITURA (Usando a VIEW para evitar erro de nome de coluna)
    // Se não achar o dia 07, vai dar erro aqui.
    const { data: payload, error: payloadErr } = await supabase
      .from("payload_do_dia")
      .select("*")
      .eq("data", data)
      .maybeSingle(); // Usa maybeSingle para não quebrar se vier vazio, tratamos abaixo

    if (payloadErr) {
      console.error("Erro no Banco (View):", payloadErr);
      throw new Error(`Erro ao ler view: ${payloadErr.message}`);
    }
    if (!payload) {
      console.error(`Nenhuma leitura encontrada para a data ${data}`);
      throw new Error(`Não existe leitura cadastrada para o dia ${data}. Verifique o banco.`);
    }

    // 5. Buscar o MODO
    const { data: modoRow, error: modoErr } = await supabase
      .from("modos")
      .select("*")
      .eq("id", modo_id)
      .single();

    if (modoErr || !modoRow) {
      console.error("Erro ao buscar Modo:", modoErr);
      throw new Error(`Modo ${modo_id} não encontrado.`);
    }

    // 6. Baixar Arquivos do Storage (Base, Agent, Modo)
    console.log("📂 Baixando arquivos do Storage...");
    const BUCKET = "pvc";

    async function downloadFile(path: string) {
      if (!path) return "";
      const { data: file, error } = await supabase.storage.from(BUCKET).download(path.trim());
      if (error) {
        console.error(`Erro ao baixar arquivo ${path}:`, error);
        return null;
      }
      return await file.text();
    }

    // INJEÇÃO DE CONTEXTO TOTAL - Baixa arquivos INTEIROS (com CACHE)
    // Isso garante que a IA tenha acesso a TODAS as regras e proibições

    // Arquivos que mudam por requisição (sem cache)

    const [agentStart, modoTexto] = await Promise.all([
      downloadFile("agent_start/AGENT_START.txt"),
      downloadFile(modoRow.storage_path) // ex: modos/MODO_1.txt
    ]);


    // Se AGENT_START falhar, usa um fallback simples para não travar
    const agentStartFinal = agentStart || "Você é um assistente pastoral sábio e acolhedor.";

    // MODO é obrigatório - se falhar, o sistema não sabe o que fazer
    if (!modoTexto) {
      // Tenta recuperar do erro sem crashar tudo? Não, modo é essencial.
      // Mas vamos dar uma mensagem mais clara
      throw new Error(`CRÍTICO: Arquivo do modo (${modoRow.storage_path}) não encontrado. Verifique se o arquivo existe no Bucket 'pvc'.`);
    }

    // Arquivos de conhecimento (COM CACHE) — apenas CCE (BASE foi removida, MODO agora é self-contained)
    const agora = Date.now();
    const cacheExpirado = !cacheTimestamp || (agora - cacheTimestamp) > CACHE_TTL_MS;

    if (cacheExpirado || !cachedConhecimentoCompilado) {
      console.log("📥 [CACHE] Baixando CCE (cache expirado ou vazio)...");

      const compilado = await downloadFile("base/Conhecimento_Compilado_Essencial.v1.4.txt");

      if (!compilado) console.warn("⚠️ AVISO: Conhecimento Essencial vazio/falhou.");

      cachedConhecimentoCompilado = compilado || "";
      cacheTimestamp = agora;

      console.log(`📚 [CACHE] Atualizado. CCE=${cachedConhecimentoCompilado.length}`);
    } else {
      console.log("⚡ [CACHE] Usando CCE do cache (rápido!)");
    }

    const conhecimentoCompilado = cachedConhecimentoCompilado!;

    // 2. Buscar dados PROFUNDOS do dia na tabela leitura_do_dia
    // O payload do front pode estar desatualizado (View), então buscamos direto da fonte.
    const { data: deepData, error: deepError } = await supabase
      .from('leitura_do_dia')
      .select('lexico_do_dia, insights_pre_minerados')
      .eq('data', data)
      .maybeSingle();

    if (deepError) {
      console.error("Erro ao buscar dados profundos:", deepError);
    }

    // Preparar contexto extra
    let deepContext = "";
    if (deepData) {
      if (deepData.lexico_do_dia && Array.isArray(deepData.lexico_do_dia)) {
        deepContext += `\n\n### LÉXICO CHAVE (Palavras Essenciais):\nUtilize estas palavras ou conceitos chave para ancorar o texto:\n${deepData.lexico_do_dia.join(", ")}.`;
      }
      if (deepData.insights_pre_minerados) {
        deepContext += `\n\n### INSIGHTS PRÉ-MINERADOS (Teologia e Profundidade):\nUse estes insights como base para a profundidade teológica, expandindo-os:\n${JSON.stringify(deepData.insights_pre_minerados, null, 2)}`;
      }
    }

    // 7.1 CONTEXTO TOTAL (SEM RAG!) - Arquivo inteiro já foi baixado acima
    // MOTIVO: RAG poderia "esquecer" regras importantes como "PROIBIDO teologia da troca"
    // Com injeção total, a IA sempre lê TODAS as regras antes de escrever
    console.log("📖 Usando CONTEXTO TOTAL (sem fragmentação RAG)");

    // 7.2 CONSULTA OBRIGATÓRIA DE DEVOCIONAL EXTERNO - REMOVIDA (Jan 2026)
    // O usuário solicitou remover essa dependência para limpar a hierarquia.
    // O modo "Devocional Externo" standalone continua existindo lá em cima.

    // 7. Contexto de Memória (SORTEIO INTELIGENTE COM DIVERSIDADE)
    // Busca TODOS os favoritos e sorteia 1 de cada categoria para máxima diversidade

    // 7a. Busca TODOS os favoritos individuais
    const { data: todosFavoritos } = await supabase
      .from("dna_categorizado")
      .select("texto_msg, created_at");

    // 7b. Função para detectar categoria do texto
    const detectarCategoria = (texto: string): string => {
      const textoLower = texto.toLowerCase();

      // Oração - detecta padrões de oração
      if (textoLower.includes("senhor,") || textoLower.includes("pai,") ||
        textoLower.includes("amém") || textoLower.includes("te peço")) {
        return "ORACAO";
      }

      // Staccato - frases curtas, muitas quebras de linha
      const linhas = texto.split("\n").filter(l => l.trim().length > 0);
      const mediaCaracteresPorLinha = texto.length / linhas.length;
      if (linhas.length >= 5 && mediaCaracteresPorLinha < 80) {
        return "STACCATO";
      }

      // Lista - detecta bullets ou numeração
      if (texto.includes("•") || texto.includes("1.") || texto.includes("- ")) {
        return "LISTA";
      }

      // Micro - texto muito curto
      if (texto.length < 300) {
        return "MICRO";
      }

      // Narrativo - padrão
      return "NARRATIVO";
    };

    // 7c. Agrupa por categoria
    const porCategoria: Record<string, any[]> = {
      ORACAO: [],
      STACCATO: [],
      LISTA: [],
      MICRO: [],
      NARRATIVO: []
    };

    if (todosFavoritos && todosFavoritos.length > 0) {
      todosFavoritos.forEach((f: any) => {
        const cat = detectarCategoria(f.texto_msg);
        porCategoria[cat].push(f);
      });
    }

    // 7d. Sorteia 3 de cada categoria (máximo 15 total)
    let memoriaPartes: string[] = [];
    const categorias = Object.keys(porCategoria);

    for (const cat of categorias) {
      const favoritos = porCategoria[cat];
      if (favoritos.length > 0) {
        // Sorteia aleatoriamente - 3 de cada categoria
        const sorteados = favoritos
          .sort(() => Math.random() - 0.5)
          .slice(0, 3); // 3 de CADA categoria

        sorteados.forEach((f: any) => {
          memoriaPartes.push(`-- ⭐ [${cat}] Exemplo:\n${f.texto_msg.substring(0, 350)}...`);
        });
      }
    }

    console.log(`🎲 [FAVORITOS] Sorteio diversificado: ${memoriaPartes.length} exemplos de ${categorias.length} categorias`);

    // 7e. Se não tiver favoritos individuais, usa histórico antigo
    if (memoriaPartes.length === 0) {
      const { data: historicoAntigo } = await supabase
        .from("historico_geracoes")
        .select("passagem, resultado_texto, aprovado")
        .eq("aprovado", true)
        .order("created_at", { ascending: false })
        .limit(5);

      if (historicoAntigo && historicoAntigo.length > 0) {
        memoriaPartes = historicoAntigo.map((h: any) =>
          `-- 📜 Histórico Aprovado (${h.passagem}):\n${h.resultado_texto.substring(0, 250)}...`
        );
      }
    }

    const memoria = memoriaPartes.length > 0
      ? memoriaPartes.join("\n\n")
      : "Não há favoritas ainda. Gere devocionais e curta suas mensagens preferidas!";

    // ========================================
    // 7f. CONTEXTO RECENTE (ANTI-REPETIÇÃO - ÚLTIMOS 3 DIAS)
    // ========================================
    console.log(`🧠 [CONTEXTO] Buscando gerações dos ÚLTIMOS 3 DIAS para o modo: ${modo_id}`);

    // Calcular data de 3 dias atrás
    const tresDiasAtras = new Date();
    tresDiasAtras.setDate(tresDiasAtras.getDate() - 3);
    const dataCorte = tresDiasAtras.toISOString();

    const { data: historicoRecente } = await supabase
      .from("historico_geracoes")
      .select("resultado_texto, created_at")
      .eq("modo_id", modo_id)
      .gte("created_at", dataCorte) // Filtra pelos últimos 3 dias
      .order("created_at", { ascending: false });

    const contextoRecenteTexto = historicoRecente && historicoRecente.length > 0
      ? historicoRecente.map((h: any, i: number) =>
        `--- GERAÇÃO RECENTE ${i + 1} (${h.created_at}) ---\n${h.resultado_texto.substring(0, 400)}...`
      ).join('\n\n')
      : "Nenhuma geração recente encontrada. Terra virgem.";

    // 8. Montar Prompt
    // HIERARQUIA v5 (Março 2026 — MODO SELF-CONTAINED):
    // 1. PASSAGEM_DO_DIA (SSOT - Fonte de Verdade)
    // 2. MODO (Instruções completas — voz, formato, auditoria, tudo)
    // 3. CCE (Conhecimento Compilado — repertório de consulta)
    // 4. Contexto temporal e anti-repetição
    const promptFinal = `
### [PASSAGEM_DO_DIA] ⭐⭐⭐ FONTE DE VERDADE ABSOLUTA (SSOT)
Esta é a passagem bíblica do dia. TODO o conteúdo deve ser derivado EXCLUSIVAMENTE deste texto.
DATA: ${payload.data}
PASSAGEM: ${payload.passagem_do_dia}
${deepContext}

### [MOMENTO_E_DATA] (Contexto Temporal)
${contextoTemporal}

### [INSTRUCOES_MODO] ⭐⭐⭐ MODO ATIVO (PRIORIDADE MÁXIMA)
Este é o prompt completo do modo. Contém TODAS as regras: identidade, voz, formato,
matrizes, anti-clichê, auditoria. Seguir INTEGRALMENTE.
Em caso de conflito com qualquer outra seção: o MODO vence.
${modoTexto}

### [PERSONALIDADE_DINAMICA] ÂNGULO E TEMPERATURA DO DIA
${instrucaoVariabilidade}

### [ARQUETIPO_E_VOZ] Ajustes de Tom
ARQUETIPO: ${payload.arquetipo}
VOZ: ${payload.voice_nome} - ${payload.voice_descricao}
${formatVoiceSection(payload.passagem_do_dia)}
${formatArchetypeSection(arquetipoSorteado)}

### [CONTEXTO_RECENTE] ⚠️ ANTI-REPETIÇÃO
Aqui está o que você gerou recentemente para este modo.
NÃO SE REPITA. Mude ângulo, estrutura e frases de impacto.
${contextoRecenteTexto}

### [MEMORIA_ESTILO] Exemplos Aprovados (Referência de Tom)
Estes textos representam o estilo desejado. Use como REFERÊNCIA de cadência e temperatura.
O MODO define as regras. Os exemplos calibram a música.
${memoria}

### [AGENT_START] (Regras Gerais do Agente)
${agentStartFinal}

### [CONHECIMENTO_COMPILADO_ESSENCIAL] CCE (Repertório de Consulta)
Catálogo de temas, versos por tema, movimentos DE→PARA, anti-arcaísmos, frases de autoridade.
Consultar quando o MODO indicar. CCE é CONTEÚDO de apoio, não muda regras.
${conhecimentoCompilado}

${pergunta ? `
### [PERGUNTA_DO_USUARIO] 🗣️ RESPONDA ESTA PERGUNTA
O usuário está em um chat interativo e fez a seguinte pergunta:

"${pergunta}"

IMPORTANTE: Responda DIRETAMENTE esta pergunta de forma pastoral e acolhedora.
Use a passagem do dia como base, mas foque em responder o que o usuário perguntou.
Seja conversacional, não gere 15 devocionais - gere UMA resposta de chat.
` : ''}
`;


    // 9. Chamar Gemini com Function Calling Loop
    console.log("🤖 Chamando Gemini 1.5 Flash (Latest)...");

    // Preparar mensagem inicial
    let messages: any[] = [{ role: 'user', parts: [{ text: promptFinal }] }];

    // COMBINA TODAS AS TOOLS
    const ALL_TOOLS = [
      ...BIBLE_TOOLS_DEFINITION[0].function_declarations,
      ...RSS_TOOLS_DEFINITION[0].function_declarations
    ];

    async function callGeminiAPI(msgs: any[]) {
      // OpenRouter (modelos free com fallback), mantendo o formato Gemini
      // de entrada/saída para não alterar o loop de ferramentas abaixo.
      console.log(`🤖 Chamando LLM via OpenRouter (cadeia free com fallbacks)...`);
      try {
        return await chamarCompatGemini(msgs, ALL_TOOLS);
      } catch (err: any) {
        return { error: { message: err.message || "Erro de conexão fetch" } };
      }
    }

    // Primeira chamada
    let aiData = await callGeminiAPI(messages);

    if (aiData.error) {
      console.error("Erro Gemini Inicial:", aiData.error);
      throw new Error(`Erro na IA: ${aiData.error.message}`);
    }

    let resultadoFinal = "IA falhou em gerar texto.";

    // Loop de Function Calling (Lógica robusta para Múltiplas Chamadas)
    let turnCount = 0;
    const MAX_TURNS = 5; // Limite de idas e voltas

    while (turnCount < MAX_TURNS) {
      turnCount++;
      const firstPart = aiData.candidates?.[0]?.content?.parts?.[0];

      // Se não houver parte válida, erro
      if (!firstPart) {
        throw new Error("Resposta inválida do Gemini (sem conteúdo).");
      }

      // Verificação 1: É chamada de ferramenta?
      if (firstPart.functionCall) {
        const fnName = firstPart.functionCall.name;
        const fnArgs = firstPart.functionCall.args;
        console.log(`🛠️ [Turno ${turnCount}] IA pediu ferramenta: ${fnName}`, JSON.stringify(fnArgs));

        // Executar ferramenta
        let toolResultText = "";
        try {
          if (fnName === 'consultar_versiculo') {
            toolResultText = await consultarVersiculo(fnArgs.referencia);
          } else if (fnName === 'consultar_devocional_externo') {
            toolResultText = await consultarRSS(fnArgs.fonte);
          } else {
            toolResultText = `Erro: Ferramenta '${fnName}' desconhecida.`;
          }
        } catch (err: any) {
          toolResultText = `Erro ao executar ferramenta: ${err.message}`;
        }

        // Adiciona histórico da conversa (Request da IA + Resposta da Tool)
        messages.push({
          role: 'model',
          parts: [firstPart] // O 'pedido' da ferramenta
        });

        messages.push({
          role: 'function',
          parts: [{
            functionResponse: {
              name: fnName,
              response: { content: toolResultText }
            }
          }]
        });

        // Chama IA de novo com o novo contexto
        console.log(`🔄 [Turno ${turnCount}] Retornando dados para IA...`);
        aiData = await callGeminiAPI(messages);

        if (aiData.error) {
          throw new Error(`Erro na IA (Turno ${turnCount}): ${aiData.error.message}`);
        }

        // LOOP CONTINUA para processar a próxima resposta (pode ser outra tool ou texto final)
        continue;
      }

      // Verificação 2: É texto final?
      if (firstPart.text) {
        resultadoFinal = firstPart.text;
        console.log(`✅ [Turno ${turnCount}] Resposta final gerada.`);
        break; // Sai do loop
      }

      // Se chegou aqui, não é tool nem text (caso raro)
      console.warn(`⚠️ [Turno ${turnCount}] Resposta estranha:`, firstPart);
      break;
    }

    if (turnCount >= MAX_TURNS) {
      console.warn("⚠️ Atingido limite máximo de turnos de ferramenta.");
      // Tenta pegar o que tiver ou falhar
      resultadoFinal = "Erro: Limite de chamadas de ferramenta excedido.";
    }

    // =====================================================
    // PASSE 2 — REVISÃO E REESCRITA (Técnica SQUAD)
    // Segundo call ao Gemini: revisa, pontua e reescreve peças fracas
    // =====================================================
    if (!pergunta && resultadoFinal && !resultadoFinal.startsWith("Erro")) {
      console.log("🔍 [PASSE 2] Iniciando revisão de qualidade (SQUAD)...");

      const promptRevisao = `
Você é uma REVISORA EXIGENTE de devocionais. Recebeu 6 peças para revisar.

## PEÇAS PARA REVISÃO:
${resultadoFinal}

## RUBRICA DE QUALIDADE (pontue cada peça de 0-10 em 5 categorias):
1. BÍBLICO (peso 3): Precisão teológica, verso correto no contexto, sem prosperidade
2. ESCRITA (peso 2): Gancho forte, ritmo, sem clichê, fechamento memorável
3. ENGAJAMENTO (peso 2): Para o scroll? Gera identificação? Faz salvar?
4. FORMATO (peso 1.5): Segue o formato declarado? Anatomia completa?
5. TOM (peso 1.5): Voz pastoral autêntica? Mesa de café, não púlpito?

NOTA FINAL = (Bíblico×3 + Escrita×2 + Engajamento×2 + Formato×1.5 + Tom×1.5) / 10

## REJEIÇÃO AUTOMÁTICA (nota 0 na peça):
- Versículo incorreto ou fora do contexto
- Teologia da prosperidade
- Gancho genérico ("Bom dia a todos", "A passagem de hoje nos ensina")
- Linguagem de coach ("destrave", "tome posse", "declare vitória")
- Peça idêntica em estrutura a outra do lote

## SUA TAREFA:
1. Pontue CADA peça (P01 a P06) com nota final
2. Identifique as peças com nota < 7.5
3. REESCREVA as peças fracas mantendo o verso mas melhorando gancho, ritmo e fechamento
4. Se TODAS as peças tiverem nota >= 7.5, retorne o lote ORIGINAL sem mudanças

## FORMATO DE SAÍDA OBRIGATÓRIO:
Retorne APENAS o lote final (6 peças revisadas), pronto para uso.
NÃO inclua a tabela de notas na saída final — apenas as peças.
Use o mesmo formato: separador --- entre peças, cabeçalho 📖 Leitura do dia em cada uma.
Se reescreveu alguma peça, ela substitui a original no lote.
`;

      try {
        const reviewData = await callGeminiAPI([{ role: 'user', parts: [{ text: promptRevisao }] }]);

        if (reviewData.candidates?.[0]?.content?.parts?.[0]?.text) {
          const revisado = reviewData.candidates[0].content.parts[0].text;
          // Validação básica: só aceita se tiver pelo menos 3 separadores (indica que tem peças)
          const separadores = (revisado.match(/---/g) || []).length;
          if (separadores >= 2) {
            console.log(`✅ [PASSE 2] Revisão concluída. ${separadores} separadores encontrados.`);
            resultadoFinal = revisado;
          } else {
            console.warn(`⚠️ [PASSE 2] Revisão retornou formato inválido (${separadores} separadores). Mantendo original.`);
          }
        } else {
          console.warn("⚠️ [PASSE 2] Revisão não retornou texto. Mantendo geração original.");
        }
      } catch (reviewErr: any) {
        console.error("❌ [PASSE 2] Erro na revisão:", reviewErr.message);
        // Não falha — mantém a geração original
      }
    }

    // 10. Salvar e Retornar
    // Alterado para select().single() para pegar o ID gerado
    // DNA da geração atual (para anti-repetição)
    const dnaAtual = {
      angulo: extrairIdAngulo(anguloSorteado),
      temperatura: extrairIdTemperatura(temperaturaSorteada),
      arquetipo: arquetipoSorteado.id,
      data_ref: data
    };

    const { data: insertData, error: insertError } = await supabase.from("historico_geracoes").insert({
      modo_id,
      data_referencia: data,
      passagem: payload.passagem_do_dia,
      resultado_texto: resultadoFinal,
      aprovado: false, // Default false, aguardando "Like" do usuário para favoritar
      dna_geracao: dnaAtual // Salva DNA para anti-repetição
    }).select("id").single();

    console.log(`🧬 [DNA] Salvo: ${JSON.stringify(dnaAtual)}`);

    if (insertError) {
      console.error("Erro ao salvar histórico:", insertError);
      // Não damos throw aqui para não perder o texto gerado, apenas logamos
    }

    console.log("✅ Sucesso! ID:", insertData?.id);

    return new Response(
      JSON.stringify({
        ok: true,
        resultado: resultadoFinal,
        id: insertData?.id // Retornando o ID para o frontend
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200
      }
    );

  } catch (error: any) {
    console.error("❌ ERRO FATAL NA FUNCTION:", error.message);
    return new Response(
      JSON.stringify({ ok: false, error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500
      }
    );
  }
});

// EDGE_DEPLOY_TRIGGER: 2026-02-10T00:05:08
