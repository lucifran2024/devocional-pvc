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
    const { modo_id, data, fonte_rss, pergunta, filtros, referencia, versiculos, parte } = await req.json();
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

      // Se não tem categoria OU categoria vazia, busca das Favoritas
      if (fonteInspiracao.length === 0) {
        const { data: favoritas, error: favError } = await supabase
          .from("favoritos_mensagens")
          .select("texto_msg, created_at")
          .order("created_at", { ascending: false })
          .limit(100);

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
        fonteNome = 'Favoritas Gerais';
      }

      console.log(`📚 [FONTE] Usando: ${fonteNome} (${fonteInspiracao.length} mensagens)`);

      // 2. Aplicar Estratégia de Contexto
      let favoritasFiltradas: any[] = [];

      if (contextoManual && Array.isArray(contextoManual) && contextoManual.length > 0) {
        // MODO MANUAL: Usa o que o usuário selecionou
        console.log(`👆 [DNA] Usando CONTEXTO MANUAL: ${contextoManual.length} mensagens selecionadas.`);
        favoritasFiltradas = contextoManual.map(texto => ({ texto_msg: texto }));
      } else if (contextoEstrategia === 'mixed') {
        // Misturado: Embaralha e pega 10
        console.log(`🎲 [DNA] Estratégia MIXED: Embaralhando e pegando 10 aleatórios.`);
        favoritasFiltradas = [...fonteInspiracao].sort(() => 0.5 - Math.random()).slice(0, 10);
      } else if (contextoEstrategia === 'recent_10') {
        // 10 mais recentes
        console.log(`🔍 [DNA] Estratégia RECENT_10: Usando as 10 mais novas.`);
        favoritasFiltradas = fonteInspiracao.slice(0, 10);
      } else {
        // Default: 5 mais recentes
        console.log(`🔍 [DNA] Estratégia RECENT_5: Usando as 5 mais novas.`);
        favoritasFiltradas = fonteInspiracao.slice(0, 5);
      }

      // 3. Preparar DNA das favoritas (texto completo para análise)
      const dnaFavoritas = favoritasFiltradas
        .map((f: any, i: number) => `### FAVORITA ${i + 1}:\n${f.texto_msg}`)
        .join("\n\n---\n\n");

      // 3. Processar filtros
      const quantidade = filtros?.quantidade || 10;

      // ========== SMART AUTOPILOT: Tema automático quando vazio ==========
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

      let temaAutopilot = '';
      if (!filtros?.tema) {
        // Buscar temas usados recentemente para evitar repetir
        const dataCorteAuto = new Date();
        dataCorteAuto.setDate(dataCorteAuto.getDate() - 7);
        const { data: temasRecentes } = await supabase
          .from("dna_geracoes")
          .select("tema_principal")
          .gte("created_at", dataCorteAuto.toISOString())
          .not("tema_principal", "is", null);

        const temasUsados = temasRecentes?.map((t: any) => t.tema_principal?.toLowerCase()) || [];
        const temasDisponiveis = TEMAS_POOL.filter(t => !temasUsados.includes(t.toLowerCase()));
        const pool = temasDisponiveis.length > 3 ? temasDisponiveis : TEMAS_POOL;
        temaAutopilot = pool[Math.floor(Math.random() * pool.length)];
        console.log(`🎯 [AUTOPILOT] Tema sorteado: "${temaAutopilot}" (${temasDisponiveis.length} disponíveis de ${TEMAS_POOL.length})`);
      }
      const temaFinal = filtros?.tema || temaAutopilot;

      const temFiltros = filtros && (temaFinal || filtros.tipo || filtros.categoria || filtros.formato || filtros.periodo || filtros.diasSemana || filtros.momento || filtros.tamanho || neutro);

      // Montar instruções de filtro - MAIS CLARAS E OBRIGATÓRIAS
      let instrucoesFiltro = '';
      if (temFiltros) {
        instrucoesFiltro = '\n## 🎯 FILTROS OBRIGATÓRIOS (SIGA TODOS SIMULTANEAMENTE):\n';
        instrucoesFiltro += '> ⚠️ IMPORTANTE: Você DEVE aplicar TODOS os filtros abaixo EM CADA mensagem.\n\n';

        // BUG FIX: O frontend envia "categoria" mas o prompt procurava "tipo".
        // Agora aceita ambos: filtros.tipo OU filtros.categoria
        const tipoOuCategoria = filtros.tipo || filtros.categoria;
        if (tipoOuCategoria) {
          const tipoLower = tipoOuCategoria.toLowerCase();
          const descTipo = (tipoLower === 'versículo' || tipoLower === 'versiculo')
            ? 'CADA mensagem DEVE ser centrada em um versículo bíblico específico. Formato: cite o versículo completo entre aspas, seguido de uma breve reflexão (2-3 frases). O versículo é o PROTAGONISTA, não coadjuvante.'
            : tipoLower === 'oração' ? 'escreva como oração/prece falando diretamente com Deus (Senhor, Te peço...)'
              : tipoLower === 'devocional' ? 'reflexão devocional completa e elaborada'
                : tipoLower === 'exortação' ? 'mensagem de exortação, encorajamento e chamado à ação espiritual'
                  : tipoLower === 'declaração' ? 'proclamação de fé em 1ª pessoa ("Eu creio", "Eu declaro")'
                    : tipoLower === 'reflexão' ? 'reflexão contemplativa e profunda sobre a vida espiritual'
                      : 'reflexão curta e direta';
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
          instrucoesFiltro += `2. **🚫 MODO NEUTRO (OBRIGATÓRIO)**: É PROIBIDO usar qualquer saudação temporal. NÃO escreva "Bom dia", "Boa tarde", "Boa noite", "Bom fim de semana" ou variações. Comece DIRETO com o conteúdo da mensagem (reflexão, versículo, declaração, etc). Esta regra tem PRIORIDADE MÁXIMA sobre qualquer outra instrução.\n`;
        }

        if (filtros.diasSemana) {
          // BUG FIX: Instrução mais restritiva para evitar dias não selecionados
          const diasArray = filtros.diasSemana.split(',').map((d: string) => d.trim());
          instrucoesFiltro += `3. **DIAS DA SEMANA (RESTRITIVO)**: Mencione APENAS e EXCLUSIVAMENTE estes dias: "${filtros.diasSemana}". NÃO mencione NENHUM outro dia da semana que não esteja nesta lista. Distribua os ${diasArray.length} dia(s) entre as ${quantidade} mensagens. (ex: "Neste(a) ${diasArray[0]} abençoado(a)...")\n`;
        }
        if (filtros.momento) {
          const descMomento = filtros.momento === 'Fim de Semana' ? 'mensagem de descanso e renovação para o fim de semana'
            : filtros.momento === 'Começo de Semana' ? 'mensagem de força e motivação para iniciar a semana'
              : filtros.momento === 'Início do Mês' ? 'mensagem de renovação, novos começos e expectativas para o mês que inicia'
                : 'mensagem de gratidão e reflexão sobre o mês que encerra';
          instrucoesFiltro += `4. **MOMENTO [${filtros.momento.toUpperCase()}]**: ${descMomento}\n`;
        }
        if (temaFinal) {
          instrucoesFiltro += `5. **TEMA**: Todas mensagens devem abordar "${temaFinal}"${!filtros?.tema ? ' (tema surpresa do dia — explore este assunto!)' : ''}\n`;
        }
        if (filtros.formato) {
          const descFormato = filtros.formato === 'Staccato' ? 'frases curtas, impacto, quebras de linha'
            : filtros.formato === 'Narrativo' ? 'texto fluido como história'
              : filtros.formato === 'Lista' ? 'tópicos numerados'
                : 'use perguntas reflexivas';
          instrucoesFiltro += `6. **FORMATO**: Estilo ${filtros.formato} - ${descFormato}\n`;
        }
        if (filtros.tamanho) {
          const sizeInstructions: Record<string, string> = {
            'Curto': 'MÁXIMO 40 palavras. 1 parágrafo curto. Direto e incisivo. SEM enrolação.',
            'Médio': 'Entre 60-90 palavras. 2 parágrafos. Equilibrado e objetivo.',
            'Longo': 'Mais de 120 palavras. 3+ parágrafos. Detalhado, profundo e bem explicado.'
          };
          const instruction = sizeInstructions[filtros.tamanho] || filtros.tamanho;
          instrucoesFiltro += `7. **TAMANHO RIGOROSO**: ${instruction}\n`;
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

      // 4.5 ANTI-REPETIÇÃO ROBUSTA: Extrair temas e versículos para não repetir
      let contextoAntiRepeticao = '';
      const dataCorte = new Date();
      dataCorte.setDate(dataCorte.getDate() - 7); // Aumentado para 7 dias

      // Função para extrair versículos de um texto
      const extrairVersiculos = (texto: string): string[] => {
        // Regex para encontrar referências bíblicas (ex: João 3:16, Salmos 23:1-4, 1 Coríntios 13:4)
        const regex = /(?:\d\s)?[A-ZÀ-Ú][a-zà-ú]+\s+\d+[:\s]*\d+(?:\s*[-–]\s*\d+)?/g;
        const matches = texto.match(regex) || [];
        return matches.map(m => m.trim());
      };

      // Função para extrair tema/ângulo do título
      const extrairTemaDoTitulo = (texto: string): string => {
        const linhas = texto.split('\n').filter((l: string) => l.trim());
        const titulo = linhas[0] || '';
        // Limpa asteriscos, emojis e pega palavras-chave
        const limpo = titulo.replace(/[*#📖🌟✨💫🙏❤️]/g, '').trim();
        return limpo.substring(0, 50);
      };

      const { data: geracoesRecentes, error: genError } = await supabase
        .from("dna_geracoes")
        .select("texto_msg, tema_principal, versiculos_usados")
        .gte("created_at", dataCorte.toISOString())
        .order("created_at", { ascending: false })
        .limit(100);

      // Extrair versículos do DNA Base também (para não repetir os mesmos do DNA)
      const versiculosDoDna: string[] = [];
      favoritasFiltradas.forEach((f: any) => {
        const versiculos = extrairVersiculos(f.texto_msg || '');
        versiculosDoDna.push(...versiculos);
      });
      const versiculosDnaUnicos = [...new Set(versiculosDoDna)];

      if (!genError && geracoesRecentes && geracoesRecentes.length > 0) {
        console.log(`🔄 [ANTI-REPETIÇÃO] Analisando ${geracoesRecentes.length} gerações dos últimos 7 dias`);

        // Coletar temas (salvos ou extraídos)
        const temasColetados: string[] = [];
        const versiculosColetados: string[] = [];

        geracoesRecentes.forEach((g: any) => {
          // Tema
          if (g.tema_principal) {
            temasColetados.push(g.tema_principal);
          } else {
            const temaExtraido = extrairTemaDoTitulo(g.texto_msg || '');
            if (temaExtraido) temasColetados.push(temaExtraido);
          }
          // Versículos
          if (g.versiculos_usados && Array.isArray(g.versiculos_usados)) {
            versiculosColetados.push(...g.versiculos_usados);
          } else {
            const versiculosExtraidos = extrairVersiculos(g.texto_msg || '');
            versiculosColetados.push(...versiculosExtraidos);
          }
        });

        const temasUnicos = [...new Set(temasColetados)].slice(0, 20);
        const versiculosUnicos = [...new Set(versiculosColetados)].slice(0, 30);

        console.log(`📊 [ANTI-REP] Temas encontrados: ${temasUnicos.length}, Versículos: ${versiculosUnicos.length}`);

        // Resumo das últimas 10 gerações
        const resumoGeracoes = geracoesRecentes.slice(0, 10)
          .map((g: any) => {
            const texto = g.texto_msg || '';
            const linhas = texto.split('\n').filter((l: string) => l.trim());
            const titulo = linhas[0]?.substring(0, 60) || '';
            return titulo;
          })
          .join('\n- ');

        contextoAntiRepeticao = `

## ⛔ SISTEMA ANTI-REPETIÇÃO (CRÍTICO - LEIA COM ATENÇÃO):

### 🚫 TEMAS PROIBIDOS (usados nos últimos 7 dias):
${temasUnicos.length > 0 ? temasUnicos.map(t => `- ${t}`).join('\n') : '- Nenhum tema registrado ainda'}

### 🚫 VERSÍCULOS PROIBIDOS (já usados recentemente):
${versiculosUnicos.length > 0 ? versiculosUnicos.slice(0, 15).join(', ') : 'Nenhum'}
${versiculosDnaUnicos.length > 0 ? `\n\n### 🚫 VERSÍCULOS DO DNA (evite repetir, CRUZE com outros):
${versiculosDnaUnicos.slice(0, 10).join(', ')}` : ''}

### 📋 TÍTULOS RECENTES (não repita abordagens):
- ${resumoGeracoes}

### ⚠️ REGRAS OBRIGATÓRIAS:
1. **CADA MENSAGEM DEVE TER UM TEMA DIFERENTE** - Se gerando 10 mensagens, são 10 temas distintos
2. **USE VERSÍCULOS NOVOS** - Busque passagens que NÃO estão na lista proibida
3. **CRUZE O DNA COM PASSAGENS DIFERENTES** - Se o DNA fala de Salmos 23, conecte com Isaías, João, etc
4. **VARIE O ÂNGULO** - Uma mensagem pode ser exortação, outra consolo, outra reflexão
5. **NÃO REPITA ESTRUTURAS** - Se uma começa com pergunta, a próxima não deve

**PENALIDADE**: Se repetir tema ou versículo da lista proibida, a mensagem será DESCARTADA.
`;

        // ========== ROTAÇÃO AT/NT ==========
        const LIVROS_AT = ['Gênesis','Êxodo','Levítico','Números','Deuteronômio','Josué','Juízes','Rute','Samuel','Reis','Crônicas','Esdras','Neemias','Ester','Jó','Salmos','Provérbios','Eclesiastes','Cantares','Isaías','Jeremias','Lamentações','Ezequiel','Daniel','Oséias','Joel','Amós','Obadias','Jonas','Miquéias','Naum','Habacuque','Sofonias','Ageu','Zacarias','Malaquias'];
        const LIVROS_NT = ['Mateus','Marcos','Lucas','João','Atos','Romanos','Coríntios','Gálatas','Efésios','Filipenses','Colossenses','Tessalonicenses','Timóteo','Tito','Filemom','Hebreus','Tiago','Pedro','Judas','Apocalipse'];

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
        contextoAntiRepeticao += instrucaoTestamento;

      } else if (versiculosDnaUnicos.length > 0) {
        // Mesmo sem gerações recentes, evita repetir versículos do DNA
        contextoAntiRepeticao = `

## ⚠️ CRUZAMENTO DE PASSAGENS:
O DNA Base contém estes versículos: ${versiculosDnaUnicos.slice(0, 10).join(', ')}

**IMPORTANTE**: Não use apenas esses versículos! CRUZE com passagens de outros livros da Bíblia.
Exemplo: Se o DNA tem Salmos 23, conecte com João 10 (Bom Pastor) ou Ezequiel 34.

### 📖 EQUILÍBRIO BÍBLICO:
Distribua versículos entre Antigo e Novo Testamento de forma equilibrada (50/50).
`;
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

      const promptFavoritas = `
# MODO FAVORITAS — GERADOR DE DNA
${formatoPassagemDoDia ? '\n## 🔀 MODO: FAVORITAS + PASSAGEM DO DIA' : ''}

Você é um especialista em capturar a ESSÊNCIA de textos devocionais.

## SUA MISSÃO:
${isReferenciaUnica
  ? `**ATENÇÃO: MODO REFERÊNCIA ÚNICA!**
Você tem apenas ${totalReferencias} mensagem(ns) como referência.
Gere **EXATAMENTE ${quantidade} NOVAS MENSAGENS** que REPLICAM FIELMENTE o estilo, tom e estrutura dessa(s) referência(s).
**COPIE O ESTILO EXATO**: mesmo tamanho de frases, mesma pontuação, mesma estrutura, mesmo vocabulário.`
  : `Analise as mensagens FAVORITAS abaixo e gere **EXATAMENTE ${quantidade} NOVAS MENSAGENS** que capturam o DNA delas.`}
${formatoPassagemDoDia}${instrucoesFiltro}
## REGRAS CRÍTICAS:
1. **NÃO COPIE** literalmente — absorva o TOM, RITMO e VOCABULÁRIO
${isReferenciaUnica
  ? `2. **REPLIQUE O ESTILO**: Como há apenas ${totalReferencias} referência(s), SIGA EXATAMENTE o mesmo padrão de escrita. Cada nova mensagem deve parecer escrita pela mesma pessoa.`
  : '2. **MISTURE** elementos de diferentes favoritas para criar algo novo'}
3. Cada mensagem deve ter **80-150 palavras** (curta e impactante)
4. Use a mesma **estrutura** que as favoritas usam (títulos em caps, frases curtas, contrastes)
${!filtros?.formato ? '5. **VARIE OS ESTILOS**: algumas curtas (staccato), algumas narrativas, algumas com perguntas' : ''}
${filtros?.usarPassagemDia ? '6. **TODAS as mensagens devem referenciar a PASSAGEM DO DIA acima**' : ''}
7. **SEM VOCATIVOS**: NÃO use "amado(a)", "irmão(ã)", "querido(a)" ou similares.${neutro ? ' Como o MODO NEUTRO está ativo, NÃO use NENHUMA saudação (Bom dia, Boa tarde, etc). Comece direto com o conteúdo.' : ' Se houver saudação, use apenas "Bom dia!", "Boa tarde!" ou "Boa noite!" sem complementos.'}
${isReferenciaUnica ? `
## ⚠️ IMPORTANTE - MODO REFERÊNCIA ÚNICA:
- Analise CADA DETALHE da mensagem de referência: comprimento das frases, uso de maiúsculas, pontuação, emojis
- Se a referência usa frases curtas, USE frases curtas
- Se a referência usa "..." ou "—", USE esses mesmos recursos
- O leitor deve sentir que TODAS as mensagens geradas vieram do mesmo autor da referência` : ''}

## ⚠️ COTA DE VERSÍCULOS (OBRIGATÓRIO):
- **MÍNIMO ${Math.ceil(quantidade * 0.4)} MENSAGENS** devem incluir um versículo bíblico
- ${filtros?.usarPassagemDia ? 'Use versículos da PASSAGEM DO DIA ou relacionados' : '**USE VERSÍCULOS DIFERENTES EM CADA MENSAGEM** - NÃO repita o mesmo versículo'}
- Formate assim: "Texto do versículo" — Livro Capítulo:Versículo
- **CRUZE LIVROS**: Se o DNA cita Salmos, use também Provérbios, Isaías, João, Romanos, etc.

## 🎯 DIVERSIDADE NO LOTE (${quantidade} MENSAGENS):
**CADA MENSAGEM DEVE SER ÚNICA!** Distribua assim:
- **TEMAS**: ${quantidade} temas DIFERENTES (Fé, Esperança, Gratidão, Confiança, Paz, Força, Amor, Sabedoria, etc)
- **ABERTURAS**: Varie como começa (pergunta, afirmação, citação, narrativa, exclamação)
- **TONS**: Misture consolador, motivacional, reflexivo, celebrativo, exortativo
- **LIVROS BÍBLICOS**: Use pelo menos ${Math.min(quantidade, 5)} livros diferentes da Bíblia
- **ESTRUTURAS**: Algumas curtas (3 linhas), outras médias (5-7 linhas), outras com lista

**CHECKPOINT**: Antes de finalizar, releia as ${quantidade} mensagens e confirme que:
✓ Nenhum tema se repete
✓ Nenhum versículo se repete
✓ Cada uma tem uma "personalidade" diferente
${neutro ? '✓ NENHUMA mensagem começa com "Bom dia", "Boa tarde", "Boa noite" ou variações (MODO NEUTRO ATIVO)' : ''}
${filtros?.diasSemana ? `✓ Mencionou APENAS os dias: ${filtros.diasSemana} (NENHUM outro dia)` : ''}

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

${contextoAntiRepeticao}
## MENSAGENS FAVORITAS(DNA BASE):
${dnaFavoritas}

## GERE AGORA ${quantidade} MENSAGENS NOVAS:
    `;

      // 4. Chamar Gemini
      const MODEL_NAME = "gemini-2.0-flash";
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${geminiKey}`;

      // Temperature dinâmica: varia entre 0.7 e 1.0 a cada lote
      const tempOptions = [0.7, 0.75, 0.8, 0.85, 0.9, 0.95, 1.0];
      const tempSorteada = tempOptions[Math.floor(Math.random() * tempOptions.length)];
      console.log(`🌡️ [FAVORITAS] Temperature sorteada: ${tempSorteada}`);

      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: promptFavoritas }] }],
          generationConfig: {
            temperature: tempSorteada,
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
      const geminiKey = Deno.env.get("GEMINI_API_KEY") || Deno.env.get("GEMINI_KEY");

      if (!supabaseUrl || !serviceKey || !geminiKey) {
        throw new Error("Variáveis de ambiente não configuradas.");
      }

      const supabase = createClient(supabaseUrl, serviceKey);

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
          const limitFetch = contextoEstrategia === 'mixed' ? 50 : (contextoEstrategia === 'recent_10' ? 10 : 5);

          // Tenta buscar do DNA Categorizado (que já é filtrado por tipo: oração, versículo, etc)
          const { data: dnaEspecifico } = await supabase
            .from("dna_categorizado")
            .select("texto_msg")
            .eq("categoria", estiloAlvo)
            .order("created_at", { ascending: false })
            .limit(limitFetch); // Usa o limite da estratégia

          if (dnaEspecifico && dnaEspecifico.length > 0) {
            let selecionados = dnaEspecifico;

            // Se for MIXED, embaralha e pega 10
            if (contextoEstrategia === 'mixed') {
              selecionados = dnaEspecifico.sort(() => 0.5 - Math.random()).slice(0, 10);
            }

            dnaEssencia = selecionados.map((d: any) => d.texto_msg).join("\n\n---\n\n");
            dnaSourceType = "ESPECIFICO";
            console.log(`📚 [DNA] Usando estratégia '${contextoEstrategia}': ${selecionados.length} exemplos.`);
          } else {
            // Fallback para Favoritas Gerais (mistureba, mas garante teologia)
            const { data: favoritas, error: favError } = await supabase
              .from("favoritos_mensagens")
              .select("texto_msg")
              .order("created_at", { ascending: false })
              .limit(60);

            dnaEssencia = favoritas?.map((f: any) => f.texto_msg).join("\n\n---\n\n") || "";
            console.log(`📚 [DNA] Usando ${favoritas?.length || 0} favoritas GERAIS (Fallback).`);
          }
        }
      } else {
        console.log(`📚 [DNA] DNA Base desativado pelo usuário.`);
      }

      // 2. Buscar Exemplos do Estilo - FONTE DE ESTRUTURA
      const { data: exemplosEstilo, error: styleError } = await supabase
        .from("dna_categorizado")
        .select("texto_msg")
        .eq("categoria", estiloAlvo)
        .order("created_at", { ascending: false })
        .limit(10);

      let exemplosEstrutura = "";
      if (exemplosEstilo && exemplosEstilo.length > 0) {
        exemplosEstrutura = exemplosEstilo.map((e: any) => e.texto_msg).join("\n\n---\n\n");
        console.log(`🎨 [ESTILO] ${exemplosEstilo.length} exemplos de '${estiloAlvo}' carregados.`);
      } else {
        console.log(`⚠️ [ESTILO] Nenhum exemplo encontrado para '${estiloAlvo}'. Usando fallback.`);
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

      // 4. Anti-Repetição ROBUSTA (Últimos 7 dias — equalizado com modo_favoritas)
      const dataCorte = new Date();
      dataCorte.setDate(dataCorte.getDate() - 7);

      // Função para extrair versículos de um texto
      const extrairVersiculos = (texto: string): string[] => {
        const regex = /(?:\d\s)?[A-ZÀ-Ú][a-zà-ú]+\s+\d+[:\s]*\d+(?:\s*[-–]\s*\d+)?/g;
        const matches = texto.match(regex) || [];
        return matches.map(m => m.trim());
      };

      const extrairTemaDoTitulo = (texto: string): string => {
        const linhas = texto.split('\n').filter((l: string) => l.trim());
        const titulo = linhas[0] || '';
        return titulo.replace(/[*#📖🌟✨💫🙏❤️]/g, '').trim().substring(0, 50);
      };

      const { data: geracoesRecentes } = await supabase
        .from("dna_geracoes")
        .select("texto_msg, tema_principal, versiculos_usados")
        .gte("created_at", dataCorte.toISOString())
        .order("created_at", { ascending: false })
        .limit(100);

      let contextoAntiRepeticao = '';
      let temasUnicos: string[] = [];
      let versiculosUnicos: string[] = [];

      if (geracoesRecentes && geracoesRecentes.length > 0) {
        console.log(`🔄 [ANTI-REP ESTILO] Analisando ${geracoesRecentes.length} gerações dos últimos 7 dias`);

        const temasColetados: string[] = [];
        const versiculosColetados: string[] = [];

        geracoesRecentes.forEach((g: any) => {
          if (g.tema_principal) {
            temasColetados.push(g.tema_principal);
          } else {
            const temaExtraido = extrairTemaDoTitulo(g.texto_msg || '');
            if (temaExtraido) temasColetados.push(temaExtraido);
          }
          if (g.versiculos_usados && Array.isArray(g.versiculos_usados)) {
            versiculosColetados.push(...g.versiculos_usados);
          } else {
            versiculosColetados.push(...extrairVersiculos(g.texto_msg || ''));
          }
        });

        temasUnicos = [...new Set(temasColetados)].slice(0, 20);
        versiculosUnicos = [...new Set(versiculosColetados)].slice(0, 30);

        const resumoGeracoes = geracoesRecentes.slice(0, 10)
          .map((g: any) => (g.texto_msg || '').split('\n').filter((l: string) => l.trim())[0]?.substring(0, 60) || '')
          .join('\n- ');

        // Rotação AT/NT
        const LIVROS_AT = ['Gênesis','Êxodo','Levítico','Números','Deuteronômio','Josué','Juízes','Rute','Samuel','Reis','Crônicas','Esdras','Neemias','Ester','Jó','Salmos','Provérbios','Eclesiastes','Cantares','Isaías','Jeremias','Lamentações','Ezequiel','Daniel','Oséias','Joel','Amós','Obadias','Jonas','Miquéias','Naum','Habacuque','Sofonias','Ageu','Zacarias','Malaquias'];
        const LIVROS_NT = ['Mateus','Marcos','Lucas','João','Atos','Romanos','Coríntios','Gálatas','Efésios','Filipenses','Colossenses','Tessalonicenses','Timóteo','Tito','Filemom','Hebreus','Tiago','Pedro','Judas','Apocalipse'];

        let contAT = 0, contNT = 0;
        versiculosUnicos.forEach((v: string) => {
          if (LIVROS_AT.some(l => v.includes(l))) contAT++;
          else if (LIVROS_NT.some(l => v.includes(l))) contNT++;
        });

        let instrucaoTestamento = '';
        if (contAT > contNT + 2) {
          instrucaoTestamento = `\n### 📖 ROTAÇÃO BÍBLICA OBRIGATÓRIA:\nÚltimas gerações usaram MUITO AT (${contAT} AT vs ${contNT} NT). **PRIORIZE O NOVO TESTAMENTO**: Romanos, João, Efésios, Filipenses, Tiago, Hebreus.\nPelo menos ${Math.ceil(quantidade * 0.6)} mensagens com versículos do NT.\n`;
        } else if (contNT > contAT + 2) {
          instrucaoTestamento = `\n### 📖 ROTAÇÃO BÍBLICA OBRIGATÓRIA:\nÚltimas gerações usaram MUITO NT (${contNT} NT vs ${contAT} AT). **PRIORIZE O ANTIGO TESTAMENTO**: Salmos, Provérbios, Isaías, Jeremias, Eclesiastes.\nPelo menos ${Math.ceil(quantidade * 0.6)} mensagens com versículos do AT.\n`;
        } else {
          instrucaoTestamento = `\n### 📖 EQUILÍBRIO BÍBLICO: Distribua versículos entre AT e NT (50/50).\n`;
        }

        contextoAntiRepeticao = `
## ⛔ SISTEMA ANTI-REPETIÇÃO (CRÍTICO):

### 🚫 TEMAS PROIBIDOS (últimos 7 dias):
${temasUnicos.map(t => `- ${t}`).join('\n')}

### 🚫 VERSÍCULOS PROIBIDOS:
${versiculosUnicos.slice(0, 15).join(', ')}

### 📋 TÍTULOS RECENTES (não repita):
- ${resumoGeracoes}
${instrucaoTestamento}
**PENALIDADE**: Se repetir tema ou versículo da lista, a mensagem será DESCARTADA.
`;
      }

      // ========== SMART AUTOPILOT: Tema automático quando vazio ==========
      const TEMAS_POOL_ESTILO = [
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

      let temaAutopilotEstilo = '';
      if (!filtros?.tema) {
        const temasUsadosLower = temasUnicos.map(t => t.toLowerCase());
        const temasDisponiveis = TEMAS_POOL_ESTILO.filter(t => !temasUsadosLower.includes(t.toLowerCase()));
        const pool = temasDisponiveis.length > 3 ? temasDisponiveis : TEMAS_POOL_ESTILO;
        temaAutopilotEstilo = pool[Math.floor(Math.random() * pool.length)];
        console.log(`🎯 [AUTOPILOT ESTILO] Tema sorteado: "${temaAutopilotEstilo}" (${temasDisponiveis.length} disponíveis)`);
      }
      const temaFinalEstilo = filtros?.tema || temaAutopilotEstilo;

      // 5. Construção dos Filtros Dinâmicos
      let instrucoesFiltro = '';
      const temFiltrosExtras = filtros && (temaFinalEstilo || filtros.formato || filtros.periodo || filtros.momento || diasSemana || neutro);

      if (temFiltrosExtras) {
        instrucoesFiltro = '\n## 🎯 INSTRUÇÕES ESPECÍFICAS (FILTROS):\n';

        if (temaFinalEstilo) {
          instrucoesFiltro += `• **TEMA**: O assunto principal deve ser "${temaFinalEstilo}"${!filtros?.tema ? ' (tema surpresa — explore com profundidade!)' : ''}\n`;
        }
        if (filtros.formato) {
          const sizeInstructions: Record<string, string> = {
            'Curto': 'MÁXIMO 40 palavras. 1 parágrafo curto. Direto e incisivo. SEM enrolação.',
            'Médio': 'Entre 60-90 palavras. 2 parágrafos. Equilibrado e objetivo.',
            'Longo': 'Mais de 120 palavras. 3+ parágrafos. Detalhado, profundo e bem explicado.'
          };
          const instruction = sizeInstructions[filtros.formato] || filtros.formato;
          instrucoesFiltro += `• **TAMANHO RIGOROSO**: ${instruction}\n`;
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
          // BUG FIX: Instrução mais restritiva para evitar dias não selecionados
          const diasArrayEstilo = diasSemana.split(',').map((d: string) => d.trim());
          instrucoesFiltro += `• **DIAS DA SEMANA (RESTRITIVO)**: Mencione APENAS e EXCLUSIVAMENTE estes dias: ${diasSemana}. NÃO mencione NENHUM outro dia da semana que não esteja nesta lista. Distribua os ${diasArrayEstilo.length} dia(s) entre as ${quantidade} mensagens. (Ex: "Neste(a) ${diasArrayEstilo[0]} abençoado(a)...")\n`;
        }
      }

      // 6. Montar Prompt Híbrido - AGORA COM INSTRUÇÃO DE GÊNERO EXPLÍCITA
      const promptHibrido = `
# GERADOR DE CONTEÚDO CATEGORIZADO
Data Atual: ${new Date().toLocaleDateString('pt-BR')}

Você atua como um "Ghostwriter Espiritual".
Sua missão é gerar **${quantidade} NOVAS ${estiloAlvo.toUpperCase()}S**.

🚨 **REGRA DE OURO (GÊNERO TEXTUAL)**:
Você está gerando uma **${estiloAlvo.toUpperCase()}**.
${estiloAlvo === 'oração' ? 'O texto DEVE ser uma conversa direta com Deus (usar "Senhor", "Pai", 1ª pessoa falando com Deus).' : ''}
${estiloAlvo === 'devocional' ? 'O texto DEVE ser uma reflexão ou ensino bíblico (falar sobre Deus/vida).' : ''}
${estiloAlvo === 'versículo' ? 'O texto DEVE ser centrado na explicação de um versículo específico.' : ''}
${estiloAlvo === 'declaração' ? 'O texto DEVE ser uma proclamação de fé em 1ª pessoa ("Eu creio", "Eu declaro").' : ''}
NÃO GERE OUTRO TIPO DE TEXTO. SE É ${estiloAlvo}, FAÇA ${estiloAlvo}!

## 1. FONTE DE ESTRUTURA VISUAL (COPIAR FORMATO):
Use os exemplos abaixo APENAS para copiar a formatação (emojis, quebras de linha, estrutura visual).
NÃO COPIE O CONTEÚDO, APENAS A "ROUPA" DO TEXTO.

--- INÍCIO EXEMPLOS VISUAIS (${estiloAlvo}) ---
${exemplosEstrutura}
--- FIM EXEMPLOS ---

${usarDnaBase ? `
## 2. FONTE DE CONTEÚDO (INSPIRAÇÃO):
Use a base abaixo para entender o TOM e a TEOLOGIA.
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

## 4. REGRAS ESTRUTURAIS (OBRIGATÓRIO):
1. **VERSÍCULOS OBRIGATÓRIOS**: Pelo menos 40% das mensagens geradas (aprox. ${Math.ceil(quantidade * 0.4)}) DEVEM conter um versículo bíblico no corpo ou ao final.
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
2. [VERSÍCULO] 40% tem bíblia? AT e NT equilibrados?
3. [TEMA] ${temaFinalEstilo ? `Abordou "${temaFinalEstilo}" em todas?` : 'Cada mensagem tem tema único?'}
4. [FILTROS] ${diasSemana ? `Citou APENAS ${diasSemana}? (NÃO citou outros dias?)` : 'Ok.'}
5. [SEPARAÇÃO] Use "---" entre as mensagens.
6. [ANTI-REP] Nenhum tema ou versículo da lista proibida foi repetido?
${neutro ? '7. [NEUTRO] NENHUMA mensagem começa com "Bom dia", "Boa tarde", "Boa noite" ou variações? CONFIRME!' : ''}

Gere agora:
`;

      // 7. Chamar Gemini
      const MODEL_NAME = "gemini-2.0-flash";
      const genUrl = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${geminiKey}`;

      // Temperature dinâmica: varia entre 0.7 e 1.0 a cada lote
      const tempOptionsEstilo = [0.7, 0.75, 0.8, 0.85, 0.9, 0.95, 1.0];
      const tempSorteadaEstilo = tempOptionsEstilo[Math.floor(Math.random() * tempOptionsEstilo.length)];
      console.log(`🌡️ [ESTILO] Temperature sorteada: ${tempSorteadaEstilo}`);

      const resp = await fetch(genUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: promptHibrido }] }],
          generationConfig: {
            temperature: tempSorteadaEstilo,
            maxOutputTokens: 4000,
          }
        })
      });

      if (!resp.ok) throw new Error(`Erro Gemini: ${resp.status}`);
      const aiData = await resp.json();
      const resultado = aiData.candidates?.[0]?.content?.parts?.[0]?.text || "Erro na geração.";

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

      const geminiKey = Deno.env.get("GEMINI_API_KEY") || Deno.env.get("GEMINI_KEY");
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

      const MODEL_NAME = "gemini-2.0-flash";
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${geminiKey}`;

      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: promptExplicar }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2048
          }
        })
      });

      if (!resp.ok) {
        const errorBody = await resp.text();
        console.error(`❌ Erro Gemini:`, errorBody);
        throw new Error(`Erro API Gemini: ${resp.status}`);
      }

      const aiData = await resp.json();
      const explicacao = aiData.candidates?.[0]?.content?.parts?.[0]?.text || "Erro ao gerar explicação.";

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

      // 1.1 BUSCAR FAVORITAS (CRÍTICO PARA MODO HÍBRIDO)
      const { data: favoritas } = await supabase
        .from("favoritos_mensagens")
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
        .from("palavra_manha_diaria")
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

      console.log(`✅ [PALAVRA DA MANHÃ] Geração concluída!`);

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

      return new Response(
        JSON.stringify({
          ok: true,
          resultado: resultado,
          config: config,
          passagem_usada: passagemRef,
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

### [CONTEXTO_RECENTE] ⚠️ O QUE NÃO DIZER (ANTI-REPETIÇÃO)
Aqui está o que você gerou recentemente para este modo.
OBJETIVO: **NÃO SE REPITA**. Não use a mesma estrutura exata, nem as mesmas frases de impacto.
Se a última mensagem foi sobre "paz", enfoque agora em "guerra" ou "vigilância". Mude o ângulo.
${contextoRecenteTexto}

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