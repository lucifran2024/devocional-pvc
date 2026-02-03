import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// RAG REMOVIDO - Agora baixamos o arquivo INTEIRO para evitar fragmentação
import { BIBLE_TOOLS_DEFINITION, consultarVersiculo } from './bible-tools.ts';
import { RSS_TOOLS_DEFINITION, consultarRSS } from './rss-tools.ts';
import { consultarBibleAPI } from './bible-api.ts';
import { getContextoTemporal } from './date-helper.ts';
import { formatVoiceSection } from './voice-selector.ts';
import { getArchetype, formatArchetypeSection } from './archetype-selector.ts';

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

// =====================================================
// CACHE GLOBAL - Arquivos de conhecimento (não mudam)
// Evita baixar ~500KB+ em cada requisição
// =====================================================
let cachedBaseConhecimento: string | null = null;
let cachedConhecimentoCompilado: string | null = null;
let cachedBancoOuroExemplos: string | null = null;
let cacheTimestamp: number | null = null;
const CACHE_TTL_MS = 1000 * 60 * 60; // 1 hora de cache

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
    const { modo_id, data, fonte_rss, pergunta, filtros } = await req.json();
    console.log(`🚀 Iniciando execução. Modo: ${modo_id}, Data: ${data}, Fonte RSS: ${fonte_rss || 'auto'}`);
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

      const fontesValidas = ['voltemos', 'bible_gateway'];
      const fonteEscolhida = fontesValidas.includes(fonte_rss) ? fonte_rss : 'voltemos';

      const conteudoExterno = await consultarRSS(fonteEscolhida);

      console.log(`✅ Devocional externo obtido de: ${fonteEscolhida}`);

      return new Response(
        JSON.stringify({
          ok: true,
          resultado: conteudoExterno,
          fonte: fonteEscolhida,
          tipo: 'devocional_externo'
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
      const geminiKey = Deno.env.get("GEMINI_API_KEY") || Deno.env.get("GEMINI_KEY");

      if (!supabaseUrl || !serviceKey || !geminiKey) {
        throw new Error("Variáveis de ambiente não configuradas.");
      }

      const supabase = createClient(supabaseUrl, serviceKey);

      // 1. Buscar TODAS as favoritas
      const { data: favoritas, error: favError } = await supabase
        .from("favoritos_mensagens")
        .select("texto_msg, created_at")
        .order("created_at", { ascending: false })
        .limit(100);

      if (favError || !favoritas || favoritas.length === 0) {
        return new Response(
          JSON.stringify({
            ok: false,
            error: "Nenhuma mensagem favorita encontrada. Adicione favoritas primeiro!"
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }

      console.log(`📚 [FAVORITAS] Encontradas: ${favoritas.length} mensagens`);

      // 2. Aplicar filtro DNA Base se especificado
      let favoritasFiltradas = favoritas;
      if (filtros?.dnaBase) {
        const dnaBase = filtros.dnaBase;
        const limite = parseInt(dnaBase.split(' ')[0]) || 10;

        if (dnaBase.includes('primeiras')) {
          // Primeiras = mais recentes (início da lista ordenada por created_at DESC)
          favoritasFiltradas = favoritas.slice(0, limite);
          console.log(`🔝 [DNA] Usando ${limite} primeiras (mais recentes)`);
        } else if (dnaBase.includes('últimas')) {
          // Últimas = mais antigas (final da lista)
          favoritasFiltradas = favoritas.slice(-limite);
          console.log(`🔚 [DNA] Usando ${limite} últimas (mais antigas)`);
        } else if (dnaBase.includes('do meio')) {
          // Do meio = centro da lista
          const meio = Math.floor(favoritas.length / 2);
          const inicio = Math.max(0, meio - Math.floor(limite / 2));
          favoritasFiltradas = favoritas.slice(inicio, inicio + limite);
          console.log(`🎯 [DNA] Usando ${limite} do meio (posições ${inicio} a ${inicio + limite})`);
        } else if (dnaBase.includes('aleatórias')) {
          // Embaralha e pega as primeiras
          const embaralhadas = [...favoritas].sort(() => Math.random() - 0.5);
          favoritasFiltradas = embaralhadas.slice(0, limite);
          console.log(`🎲 [DNA] Usando ${limite} aleatórias`);
        } else if (dnaBase.includes('recentes')) {
          // Legado: mesma coisa que primeiras
          favoritasFiltradas = favoritas.slice(0, limite);
          console.log(`🔍 [DNA] Usando ${limite} mais recentes`);
        }
      }

      // 3. Preparar DNA das favoritas (texto completo para análise)
      const dnaFavoritas = favoritasFiltradas
        .map((f: any, i: number) => `### FAVORITA ${i + 1}:\n${f.texto_msg}`)
        .join("\n\n---\n\n");

      // 3. Processar filtros
      const quantidade = filtros?.quantidade || 10;
      const temFiltros = filtros && (filtros.tema || filtros.tipo || filtros.formato || filtros.periodo || filtros.diaSemana || filtros.momento);

      // Montar instruções de filtro - MAIS CLARAS E OBRIGATÓRIAS
      let instrucoesFiltro = '';
      if (temFiltros) {
        instrucoesFiltro = '\n## 🎯 FILTROS OBRIGATÓRIOS (SIGA TODOS SIMULTANEAMENTE):\n';
        instrucoesFiltro += '> ⚠️ IMPORTANTE: Você DEVE aplicar TODOS os filtros abaixo EM CADA mensagem.\n\n';

        if (filtros.tipo) {
          const descTipo = filtros.tipo === 'Versículo' ? 'foque em versículos bíblicos com breve reflexão'
            : filtros.tipo === 'Oração' ? 'escreva como oração/prece falando diretamente com Deus (Senhor, Te peço...)'
              : filtros.tipo === 'Devocional' ? 'reflexão devocional completa e elaborada'
                : 'reflexão curta e direta';
          instrucoesFiltro += `1. **TIPO [${filtros.tipo.toUpperCase()}]**: ${descTipo}\n`;
        }
        if (filtros.periodo) {
          instrucoesFiltro += `2. **SAUDAÇÃO**: COMECE cada mensagem com "${filtros.periodo}" (ex: "${filtros.periodo}, amado(a)!")\n`;
        }
        if (filtros.diaSemana) {
          instrucoesFiltro += `3. **DIA**: Mencione "${filtros.diaSemana}" no texto (ex: "Neste ${filtros.diaSemana}...")\n`;
        }
        if (filtros.momento) {
          const descMomento = filtros.momento === 'Fim de Semana' ? 'mensagem de descanso e renovação para o fim de semana'
            : filtros.momento === 'Começo de Semana' ? 'mensagem de força e motivação para iniciar a semana'
              : filtros.momento === 'Início do Mês' ? 'mensagem de renovação, novos começos e expectativas para o mês que inicia'
                : 'mensagem de gratidão e reflexão sobre o mês que encerra';
          instrucoesFiltro += `4. **MOMENTO [${filtros.momento.toUpperCase()}]**: ${descMomento}\n`;
        }
        if (filtros.tema) {
          instrucoesFiltro += `5. **TEMA**: Todas mensagens devem abordar "${filtros.tema}"\n`;
        }
        if (filtros.formato) {
          const descFormato = filtros.formato === 'Staccato' ? 'frases curtas, impacto, quebras de linha'
            : filtros.formato === 'Narrativo' ? 'texto fluido como história'
              : filtros.formato === 'Lista' ? 'tópicos numerados'
                : 'use perguntas reflexivas';
          instrucoesFiltro += `6. **FORMATO**: Estilo ${filtros.formato} - ${descFormato}\n`;
        }
        if (filtros.tamanho) {
          const descTamanho = filtros.tamanho === 'Curto' ? 'máximo 50 palavras, direto ao ponto'
            : filtros.tamanho === 'Médio' ? 'entre 50-100 palavras, equilibrado'
              : 'mais de 100 palavras, desenvolvido e profundo';
          instrucoesFiltro += `7. **TAMANHO [${filtros.tamanho.toUpperCase()}]**: ${descTamanho}\n`;
        }
        if (filtros.tom) {
          const descTom = filtros.tom === 'Alegre' ? 'tom positivo, vibrante, celebrando a vida'
            : filtros.tom === 'Sereno' ? 'tom calmo, pacífico, reconfortante'
              : filtros.tom === 'Reflexivo' ? 'tom contemplativo, profundo, questionador'
                : filtros.tom === 'Motivacional' ? 'tom energético, inspirador, que impulsiona ação'
                  : 'tom pensativo, meditativo, introspectivo';
          instrucoesFiltro += `8. **TOM [${filtros.tom.toUpperCase()}]**: ${descTom}\n`;
        }

        instrucoesFiltro += '\n> Aplique TODOS os filtros acima em CADA mensagem gerada.\n';
      }

      // 4. PASSAGEM DO DIA - Buscar se filtro ativo
      let passagemDoDia = '';
      let passagemRef = '';
      if (filtros?.usarPassagemDia) {
        console.log('📖 [PASSAGEM] Buscando passagem do dia...');
        const dataAlvo = data || new Date().toISOString().split('T')[0];
        const { data: payloadDia, error: payloadErr } = await supabase
          .from("payload_do_dia")
          .select("*")
          .eq("data", dataAlvo)
          .maybeSingle();

        if (payloadErr) {
          console.error("Erro ao buscar passagem:", payloadErr);
        }

        passagemRef = payloadDia?.passagem_do_dia || payloadDia?.passagem || "";
        passagemDoDia = payloadDia?.texto || "";
        console.log(`📖 [PASSAGEM] Ref: ${passagemRef}`);
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

      const promptFavoritas = `
# MODO FAVORITAS — GERADOR DE DNA
${formatoPassagemDoDia ? '\n## 🔀 MODO: FAVORITAS + PASSAGEM DO DIA' : ''}

Você é um especialista em capturar a ESSÊNCIA de textos devocionais.

## SUA MISSÃO:
Analise as mensagens FAVORITAS abaixo e gere **EXATAMENTE ${quantidade} NOVAS MENSAGENS** que capturam o DNA delas.
${formatoPassagemDoDia}${instrucoesFiltro}
## REGRAS CRÍTICAS:
1. **NÃO COPIE** literalmente — absorva o TOM, RITMO e VOCABULÁRIO
2. **MISTURE** elementos de diferentes favoritas para criar algo novo
3. Cada mensagem deve ter **80-150 palavras** (curta e impactante)
4. Use a mesma **estrutura** que as favoritas usam (títulos em caps, frases curtas, contrastes)
${!filtros?.formato ? '5. **VARIE OS ESTILOS**: algumas curtas (staccato), algumas narrativas, algumas com perguntas' : ''}
${filtros?.usarPassagemDia ? '6. **TODAS as mensagens devem referenciar a PASSAGEM DO DIA acima**' : ''}

## ⚠️ COTA DE VERSÍCULOS (OBRIGATÓRIO):
- **MÍNIMO ${Math.ceil(quantidade * 0.4)} MENSAGENS** devem incluir um versículo bíblico
- ${filtros?.usarPassagemDia ? 'Use versículos da PASSAGEM DO DIA ou relacionados' : 'O versículo pode vir das favoritas OU ser um novo que combine com a mensagem'}
- Formate assim: "Texto do versículo" — Livro Capítulo:Versículo

## FORMATO DE SAÍDA:
Para cada mensagem, use o formato:
${filtros?.usarPassagemDia ? `
**📖 LEITURA DO DIA — ${passagemRef}**

**[TÍTULO EM CAPS]**

[Cabeçalho]

[Corpo]

> "Versículo" — Ref

[Fechamento]

---
` : `
**MENSAGEM 01 — [TÍTULO EM CAPS]**

[Corpo da mensagem]

---
`}
(continue até MENSAGEM ${quantidade})

## MENSAGENS FAVORITAS (DNA BASE):
${dnaFavoritas}

## GERE AGORA ${quantidade} MENSAGENS NOVAS:
`;

      // 4. Chamar Gemini
      const MODEL_NAME = "gemini-2.0-flash";
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${geminiKey}`;

      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: promptFavoritas }] }],
          generationConfig: {
            temperature: 0.9, // Mais criativo
            maxOutputTokens: 4096
          }
        })
      });

      if (!resp.ok) {
        const errorBody = await resp.text();
        console.error(`❌ Erro Gemini:`, errorBody);
        throw new Error(`Erro API Gemini: ${resp.status}`);
      }

      const aiData = await resp.json();
      const resultado = aiData.candidates?.[0]?.content?.parts?.[0]?.text || "Erro ao gerar mensagens.";

      console.log(`✅ [MODO FAVORITAS] Geração concluída!`);

      return new Response(
        JSON.stringify({
          ok: true,
          resultado: resultado,
          tipo: 'modo_favoritas',
          total_favoritas: favoritas.length
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
    // MODO HÍBRIDO: PASSAGEM DO DIA + FAVORITAS
    // ========================================
    if (modo_id === 'modo_hibrido') {
      console.log(`🔀 [MODO HÍBRIDO] Gerando 10 mensagens: Passagem + Favoritas...`);

      // Inicializar Supabase
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const geminiKey = Deno.env.get("GEMINI_API_KEY") || Deno.env.get("GEMINI_KEY");

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

      console.log(`📖 Passagem encontrada: ${passagemRef}`);

      // 2. Buscar Favoritas
      const { data: favoritas } = await supabase
        .from("favoritos_mensagens")
        .select("texto_msg")
        .order("created_at", { ascending: false })
        .limit(30);

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

Gere as 10 mensagens agora:
`;

      // 4. Chamar Gemini
      const MODEL_NAME = "gemini-2.0-flash";
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${geminiKey}`;

      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: promptHibrido }] }],
          generationConfig: {
            temperature: 0.85,
            maxOutputTokens: 4096
          }
        })
      });

      if (!resp.ok) {
        const errorBody = await resp.text();
        console.error(`❌ Erro Gemini:`, errorBody);
        throw new Error(`Erro API Gemini: ${resp.status}`);
      }

      const aiData = await resp.json();
      const resultado = aiData.candidates?.[0]?.content?.parts?.[0]?.text || "Erro ao gerar mensagens.";

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
      const geminiKey = Deno.env.get("GEMINI_API_KEY") || Deno.env.get("GEMINI_KEY");

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
        4: { dia: 'Quinta', categoria: 'DEVOCIONAL', formato: 'Longo', extra: 'Passagem do Dia' },
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
        .from("palavra_manha_cache")
        .select("mensagem, categoria")
        .order("data", { ascending: false })
        .limit(3);

      const contextoEvitar = historicoRecente?.map(h => `(Evite repetir este tema/estilo): ${h.mensagem.substring(0, 50)}...`).join('\n') || "Nenhum histórico recente.";

      // 4. Buscar Favoritas (DNA BASE)
      const { data: favoritas } = await supabase
        .from("favoritos_mensagens")
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

## ANTI-REPETIÇÃO (O QUE NÃO FAZER):
${contextoEvitar}

## INSTRUÇÕES DE GERAÇÃO:
Gere UMA ÚNICA mensagem que siga estritamente a configuração acima.

1. **Se for ORAÇÃO:** Escreva em primeira pessoa dirigindo-se a Deus.
2. **Se for VERSÍCULO:** Cite um versículo chave e faça um breve comentário.
3. **Se for QUINTA (Passagem do Dia):** Explique e aplique a passagem ${passagemRef}.
4. **Se for INÍCIO SEMANA:** Dê força, ânimo e direção.
5. **Se for FIM SEMANA:** Dê descanso, paz e gratidão.

## FORMATO DE SAÍDA OBRIGATÓRIO:
[Título Curto e Impactante em CAIXA ALTA]

[Corpo da Mensagem]

${config.categoria === 'VERSICULO' || config.extra === 'Passagem do Dia' ? '' : '> "Versículo de apoio" — Ref'}

[Fechamento Breve]
`;

      // 6. Chamar Gemini
      const MODEL_NAME = "gemini-2.0-flash";
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${geminiKey}`;

      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.85,
            maxOutputTokens: 2000
          }
        })
      });

      if (!resp.ok) throw new Error(`Erro Gemini: ${resp.status}`);

      const aiData = await resp.json();
      const resultado = aiData.candidates?.[0]?.content?.parts?.[0]?.text || "Erro na geração.";

      console.log(`✅ [PALAVRA DA MANHÃ] Gerada com sucesso!`);

      return new Response(
        JSON.stringify({
          ok: true,
          resultado: resultado,
          config: config,
          passagem_usada: passagemRef
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
    const geminiKey = Deno.env.get("GEMINI_API_KEY") || Deno.env.get("GEMINI_KEY");
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

    // Arquivos de conhecimento (COM CACHE)
    const agora = Date.now();
    const cacheExpirado = !cacheTimestamp || (agora - cacheTimestamp) > CACHE_TTL_MS;

    if (cacheExpirado || !cachedBaseConhecimento || !cachedConhecimentoCompilado || !cachedBancoOuroExemplos) {
      console.log("📥 [CACHE] Baixando arquivos de conhecimento (cache expirado ou vazio)...");

      const [base, compilado, ouro] = await Promise.all([
        downloadFile("base/BASE_DE_CONHECIMENTO_UNIFICADA_v2.txt"),
        downloadFile("base/Conhecimento_Compilado_Essencial.v1.4.txt"),
        downloadFile("base/BANCO_DE_OURO_EXEMPLOS E BANCO_MICRO_SHOTS.txt")
      ]);

      if (!base) console.warn("⚠️ AVISO: BASE_DE_CONHECIMENTO_UNIFICADA não encontrada ou falhou. Usando vazio.");
      if (!compilado) console.warn("⚠️ AVISO: Conhecimento Essencial vazio/falhou.");
      if (!ouro) console.warn("⚠️ AVISO: Banco de Ouro vazio/falhou.");

      cachedBaseConhecimento = base || "";
      cachedConhecimentoCompilado = compilado || "";
      cachedBancoOuroExemplos = ouro || "";
      cacheTimestamp = agora;

      console.log(`📚 [CACHE] Atualizado. Base=${cachedBaseConhecimento.length}`);
    } else {
      console.log("⚡ [CACHE] Usando arquivos de conhecimento do cache (rápido!)");
    }

    const baseConhecimentoCompleta = cachedBaseConhecimento!;
    const conhecimentoCompilado = cachedConhecimentoCompilado!;
    const bancoOuroExemplos = cachedBancoOuroExemplos!;

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
      .from("favoritos_mensagens")
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
        const partesAntigo = historicoAntigo.map((h: any) =>
          `-- 📜 Histórico Aprovado (${h.passagem}):\n${h.resultado_texto.substring(0, 250)}...`
        );
        memoriaPartes.push(...partesAntigo);
        console.log(`📜 [HISTORICO] Fallback: ${historicoAntigo.length} favoritos antigos`);
      }
    }

    const memoria = memoriaPartes.length > 0
      ? memoriaPartes.join("\n\n")
      : "Não há favoritos ainda. Gere devocionais e curta suas mensagens preferidas!";

    // 8. Montar Prompt
    // HIERARQUIA v4 (CORRIGIDA - Janeiro 2026):
    // 1. PASSAGEM_DO_DIA (SSOT - Fonte de Verdade)
    // 2. BASE_UNIFICADA (Regras e Proibições)
    // 3. CCE (Conhecimento Compilado - Repertório)
    // 4. MODO (Instruções Específicas)
    // 5. Exemplos e Ajustes Finais
    const promptFinal = `
### [PASSAGEM_DO_DIA] ⭐⭐⭐ FONTE DE VERDADE ABSOLUTA (SSOT)
Esta é a passagem bíblica do dia. TODO o conteúdo deve ser derivado EXCLUSIVAMENTE deste texto.
DATA: ${payload.data}
PASSAGEM: ${payload.passagem_do_dia}
${deepContext}

### [MOMENTO_E_DATA] (Contexto Temporal)
${contextoTemporal}

### [MEMORIA_DE_OURO] ⭐⭐⭐⭐⭐ DNA SUPREMO (PRIORIDADE MÁXIMA)
ATENÇÃO: Estes textos representam a "Voz Real" que o usuário deseja.
Se houver conflito de estilo entre o MODO e estes EXEMPLOS, OS EXEMPLOS VENCEM.
O MODO define "O QUE" falar (tópico).
ESTES EXEMPLOS definem "COMO" falar (tom, ritmo, vocabulário).

IMITE OBSESSIVAMENTE O ESTILO DESTES EXEMPLOS:
${memoria}

### [REGRAS_DE_ESTILO] ⭐⭐⭐ OBRIGATÓRIO - ESTILO DA MENSAGEM

📏 LIMITE DE TAMANHO (CRÍTICO):
- MÁXIMO 150 palavras por mensagem (corpo + fechamento)
- Corpo do devocional: MÁXIMO 120 palavras
- Se ultrapassar: CORTAR e simplificar
- Menos texto = mais lido. Seja CONCISO.

🚫 PROIBIDO (NÃO USE):
- TEXTOS LONGOS: Cada devocional deve ser CURTO e IMPACTANTE
- Palavras/termos: "norte", "rota", "Farol", "neblina", "bússola" (exceto se no versículo)
- METÁFORAS EM EXCESSO: NÃO repita "Agricultor", "vinha", "plantio", "solo", "semente", "raízes", "fruto", "pomar", "terra" em todas as mensagens. Use NO MÁXIMO 1 metáfora por mensagem.
- RÓTULOS/MARCADORES: NÃO use "Aplicação:", "Hoje:", "Ação:", "Lembre-se:", "Sua resposta:", "Faça isso:", "Reflexão:", "Oração:". O texto deve fluir naturalmente SEM marcadores.
- Frases longas e poéticas rebuscadas
- Clichês de auto-ajuda
- Versículo jogado no final sem explicação

🎯 TOM PASTORAL SIMPLES:
- Fale como um pastor experiente conversando com alguém na sala da igreja
- Seja DIRETO, não poético
- Use linguagem do dia a dia, não rebuscada
- Confronte com amor, mas sem rodeios
- Menos metáforas, mais verdade crua

📅 CONTEXTO DO DIA (OBRIGATÓRIO):
- SEMPRE mencione o DIA DA SEMANA quando relevante (ex: "nesta segunda-feira", "o peso desta semana")
- Use o MOMENTO_E_DATA para contextualizar (segunda = início de semana, sexta = fim de expediente, domingo = culto)
- Conecte a mensagem com a REALIDADE do dia do leitor

✅ OBRIGATÓRIO (SEMPRE USE):

1. TÍTULO: Provocativo, em CAIXA ALTA, máximo 15 palavras
   - CERTO: "A FALTA DE PERDÃO NÃO PRENDE QUEM TE FERIU. PRENDE VOCÊ."
   - ERRADO: "O fim da neblina"

2. FRASES CURTAS E PUNCHY:
   - CERTO: "Arrependimento não é vergonha. É coragem."
   - ERRADO: "Quando a neblina do luto invade a casa..."

3. CONTRASTES (não é X, é Y / menos X, mais Y):
   - CERTO: "Perdoar não é concordar. Não é esquecer. É decidir não continuar preso."
   - ERRADO: "O perdão é importante para a cura"

4. TOM DIRETO E PESSOAL:
   - CERTO: "Enquanto você segura a mágoa, o inimigo constrói fortalezas."
   - ERRADO: "Quando a gente tateia as paredes..."

5. DECLARAÇÕES PROFÉTICAS (lista de "não vai"):
   - CERTO: "O cansaço não vai te parar. A dúvida não vai te governar. O medo não vai ter a última palavra."

6. PROFUNDIDADE TEOLÓGICA:
   - Explique o contexto histórico do versículo (o que Israel vivia)
   - Conecte com a passagem do dia
   - Use termos bíblicos quando relevante

7. EXEGESE DO VERSÍCULO:
   - Não apenas cite, EXPLIQUE o que o texto significa
   - CERTO: "Jesus foi direto: 'Se vocês não perdoarem...' Perdoar não é concordar..."
   - ERRADO: Apenas colocar o versículo entre aspas

8. FECHAMENTO COM IMPERATIVO CLARO:
   - CERTO: "Perdoe. Seja livre." / "Hoje, escolha soltar."
   - ERRADO: "Peça a Deus força para continuar"

📐 ESTRUTURA IDEAL:
1. Título provocativo (CAPS)
2. Abertura com afirmação forte
3. Desenvolvimento com contrastes e explicação
4. Versículo como PROVA (no meio, não no final)
5. Aplicação direta com "você"
6. Fechamento imperativo

### [PERSONALIDADE_DINAMICA] ⭐⭐⭐ ÂNGULO E TEMPERATURA DO DIA
${instrucaoVariabilidade}

### [INSTRUCOES_MODO] ⭐ DIRETRIZES TÉCNICAS
Use estas instruções para estruturar o conteúdo, mas mantenha a VOZ dos exemplos acima a todo custo:
${modoTexto}

### [ARQUETIPO_E_VOZ] Ajustes de Tom
ARQUETIPO: ${payload.arquetipo}
VOZ: ${payload.voice_nome} - ${payload.voice_descricao}
${formatVoiceSection(payload.passagem_do_dia)}
${formatArchetypeSection(arquetipoSorteado)}

### [AGENT_START] (Regras Gerais do Agente)
${agentStartFinal}

### [CONHECIMENTO_E_REGRAS_COMPLETO] BASE UNIFICADA (Consulta)
Este é o arquivo de conhecimento completo. Use como referência para dúvidas sobre teologia e vocabulário:
${baseConhecimentoCompleta}

### [CONHECIMENTO_COMPILADO_ESSENCIAL] CCE (Repertório de Consulta)
Catálogo de temas, metáforas e aplicações. Use para enriquecer quando necessário:
${conhecimentoCompilado}

### [BANCO_DE_OURO_EXEMPLOS] EXEMPLOS DE ESTILO (Referência Adicional)
Use estes exemplos como referência de qualidade e estilo, NÃO copie literalmente:
${bancoOuroExemplos}


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
      const MODEL_NAME = "gemini-3-flash-preview"; // Solicitado EXPLICITAMENTE pelo usuário
      console.log(`🤖 Chamando ${MODEL_NAME} (Endpoint v1beta)...`);

      // MUDANÇA: Voltando para v1beta pois modelos "preview" geralmente não estão na v1 (GA)
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${geminiKey}`;

      try {
        const resp = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: msgs,
            tools: [{ function_declarations: ALL_TOOLS }]
          })
        });

        if (!resp.ok) {
          const errorBody = await resp.text();
          console.error(`❌ Erro Gemini (Status ${resp.status}):`, errorBody);

          // TENTATIVA DE DEBUG: Listar modelos disponíveis
          console.log("🔍 Tentando listar modelos disponíveis para esta Chave (v1beta)...");
          try {
            const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${geminiKey}`;
            const listResp = await fetch(listUrl);
            const listData = await listResp.json();
            console.log("📋 MODELOS DISPONÍVEIS:", JSON.stringify(listData, null, 2));
          } catch (listErr) {
            console.error("❌ Falha ao listar modelos:", listErr);
          }

          return { error: { message: `Erro API: ${resp.status} - ${errorBody}` } };
        }

        return await resp.json();
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