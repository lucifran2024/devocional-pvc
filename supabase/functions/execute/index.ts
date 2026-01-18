import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// RAG REMOVIDO - Agora baixamos o arquivo INTEIRO para evitar fragmentação
import { BIBLE_TOOLS_DEFINITION, consultarVersiculo } from './bible-tools.ts';
import { RSS_TOOLS_DEFINITION, consultarRSS } from './rss-tools.ts';
import { consultarBibleAPI } from './bible-api.ts';
import { getContextoTemporal } from './date-helper.ts';
import { formatVoiceSection } from './voice-selector.ts';
import { getArchetype, formatArchetypeSection } from './archetype-selector.ts';

// 1. Configuração de CORS (Permite localhost:3000, 3001, etc.)
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
  // Tratamento de pre-flight request (OPTIONS)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 2. Receber dados do Frontend
    const { modo_id, data, fonte_rss, pergunta } = await req.json();
    console.log(`🚀 Iniciando execução. Modo: ${modo_id}, Data: ${data}, Fonte RSS: ${fonte_rss || 'auto'}`);
    if (pergunta) console.log(`💬 Pergunta do chat: ${pergunta.substring(0, 100)}...`);

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
    // FIM DO MODO ESPECIAL
    // ========================================

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
    const geminiKey = Deno.env.get("GEMINI_API_KEY");
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
    // Arquivos que mudam por requisição (sem cache)
    const [agentStart, modoTexto] = await Promise.all([
      downloadFile("agent_start/AGENT_START.txt"),
      downloadFile(modoRow.storage_path) // ex: modos/MODO_1.txt
    ]);

    if (!agentStart) throw new Error("CRÍTICO: AGENT_START.txt não encontrado ou vazio.");
    if (!modoTexto) throw new Error(`CRÍTICO: Arquivo do modo (${modoRow.storage_path}) não encontrado ou vazio.`);

    // Arquivos de conhecimento (COM CACHE)
    const agora = Date.now();
    const cacheExpirado = !cacheTimestamp || (agora - cacheTimestamp) > CACHE_TTL_MS;

    if (cacheExpirado || !cachedBaseConhecimento || !cachedConhecimentoCompilado || !cachedBancoOuroExemplos) {
      console.log("📥 [CACHE] Baixando arquivos de conhecimento (cache expirado ou vazio)...");

      const [base, compilado, ouro] = await Promise.all([
        downloadFile("base_conhecimento/BASE_DE_CONHECIMENTO_UNIFICADA_v2.txt"),
        downloadFile("conhecimento_essencial/Conhecimento_Compilado_Essencial.v1.4.txt"),
        downloadFile("banco_ouro_exemplos/BANCO_DE_OURO_EXEMPLOS E BANCO_MICRO_SHOTS.txt")
      ]);

      if (!base) throw new Error("CRÍTICO: BASE_DE_CONHECIMENTO_UNIFICADA não encontrada.");
      if (!compilado) console.warn("AVISO: Conhecimento Essencial vazio/falhou.");
      if (!ouro) console.warn("AVISO: Banco de Ouro vazio/falhou.");

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

    // 7.2 CONSULTA OBRIGATÓRIA DE DEVOCIONAL EXTERNO
    console.log(" Consultando devocional externo...");
    let devocionalExterno: string;

    if (bibleApiKey) {
      // Usa Bible API (preferencial)
      devocionalExterno = await consultarBibleAPI(bibleApiKey, data);
      console.log("✅ Devocional obtido via API.Bible");
    } else {
      // Fallback para RSS se não tiver API Key
      const fontesDisponiveis = ['voltemos', 'bible_gateway'] as const;
      const fonteSorteada = fontesDisponiveis[Math.floor(Math.random() * fontesDisponiveis.length)];
      devocionalExterno = await consultarRSS(fonteSorteada);
      console.log(`✅ Devocional externo obtido via RSS: ${fonteSorteada}`);
    }

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

### [MEMORIA_ESTILO] ⭐⭐⭐ APRENDA ESTE ESTILO (ALTA PRIORIDADE)
Estes são exemplos APROVADOS de mensagens que funcionaram muito bem.
IMITE o tom, estrutura e profundidade destas mensagens. Esta é sua referência principal de estilo:
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

### [INSTRUCOES_MODO] ⭐⭐ MODO ATIVO
Instruções específicas do modo selecionado:
${modoTexto}

### [ARQUETIPO_E_VOZ] Ajustes de Tom
ARQUETIPO: ${payload.arquetipo}
VOZ: ${payload.voice_nome} - ${payload.voice_descricao}
${formatVoiceSection(payload.passagem_do_dia)}
${formatArchetypeSection(arquetipoSorteado)}

### [AGENT_START] (Regras Gerais do Agente)
${agentStart}

### [CONHECIMENTO_E_REGRAS_COMPLETO] BASE UNIFICADA (Consulta)
Este é o arquivo de conhecimento completo. Use como referência para dúvidas sobre teologia e vocabulário:
${baseConhecimentoCompleta}

### [CONHECIMENTO_COMPILADO_ESSENCIAL] CCE (Repertório de Consulta)
Catálogo de temas, metáforas e aplicações. Use para enriquecer quando necessário:
${conhecimentoCompilado}

### [BANCO_DE_OURO_EXEMPLOS] EXEMPLOS DE ESTILO (Referência Adicional)
Use estes exemplos como referência de qualidade e estilo, NÃO copie literalmente:
${bancoOuroExemplos}

### [DEVOCIONAL_EXTERNO] (Inspiração do Dia - Use como referência, NÃO copie)
${devocionalExterno}

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
    console.log("🤖 Chamando Gemini 3 Flash (com Tools)...");

    // Preparar mensagem inicial
    let messages: any[] = [{ role: 'user', parts: [{ text: promptFinal }] }];

    // COMBINA TODAS AS TOOLS
    const ALL_TOOLS = [
      ...BIBLE_TOOLS_DEFINITION[0].function_declarations,
      ...RSS_TOOLS_DEFINITION[0].function_declarations
    ];

    async function callGeminiAPI(msgs: any[]) {
      // Usando gemini-3-pro-preview conforme solicitado pelo usuário
      // Note: pode ser mais lento, mas tem maior raciocínio
      const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-preview:generateContent?key=${geminiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: msgs,
          tools: [{ function_declarations: ALL_TOOLS }]
        })
      });
      return await resp.json();
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