import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getRelevantContext } from './rag-helper.ts';
import { BIBLE_TOOLS_DEFINITION, consultarVersiculo } from './bible-tools.ts';
import { RSS_TOOLS_DEFINITION, consultarRSS } from './rss-tools.ts';
import { consultarBibleAPI } from './bible-api.ts';
import { getContextoTemporal } from './date-helper.ts';

// 1. Configuração de CORS (Permite localhost:3000, 3001, etc.)
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Tratamento de pre-flight request (OPTIONS)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 2. Receber dados do Frontend
    const { modo_id, data, fonte_rss } = await req.json();
    console.log(`🚀 Iniciando execução. Modo: ${modo_id}, Data: ${data}, Fonte RSS: ${fonte_rss || 'auto'}`);

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

    const listaLentes = [
      "SOBERANIA E REINO: Use termos como trono, cetro, governo, decreto, império, súdito, lealdade. Deus é o Rei, nós somos os servos. O controle é dEle.",
      "ANATOMIA DA ALMA: Foque no corpo e sentidos. Olhos (visão/cegueira), ouvidos (surdez), coração (duro/carne), joelhos (rendição), mãos (obras), fôlego.",
      "LUZ E NAVEGAÇÃO: Use contrastes de clareza/escuridão, rota, norte, abismo, farol, estrela da manhã, sombra, passos, caminho, neblina.",
      "JUGO E DESCANSO: Use metáforas de peso, fardo, alívio, cansaço, correntes, liberdade, escravidão, soltar a bagagem.",
      "CONSTRUÇÃO E ALICERCE: Fale sobre fundações, ruínas, edificar, porta, muros, 'casa interior', estrutura que balança, rocha x areia.",
      "AGRICULTURA BÍBLICA: Sementes, frutos, poda, raízes, terra seca, chuva, colheita, tempo de plantio, estações."
    ];

    const listaTemperaturas = [
      "DEVOCIONAL E ÍNTIMO: Comece ou termine falando diretamente com Deus (como uma oração). Tom de sussurro, reverência e entrega ('Eis-me aqui').",
      "SAPIENCIAL E PRÁTICO: Foco em decisões. 'Não faça isso, faça aquilo'. Tom de conselho de pai para filho. Focado em sabedoria para a segunda-feira.",
      "PROFÉTICO E DENÚNCIA: Aponte o dedo para um ídolo escondido (orgulho, vaidade, controle). Tom mais firme, urgente, 'acorde enquanto é tempo'.",
      "CONSOLADOR E PASTORAL: Foco na dor, no cansaço e na graça. Use palavras como 'calma', 'respire', 'Ele sabe', 'Ele viu'. Acolha o ferido."
    ];

    // Sorteio
    const lenteSorteada = listaLentes[Math.floor(Math.random() * listaLentes.length)];
    const temperaturaSorteada = listaTemperaturas[Math.floor(Math.random() * listaTemperaturas.length)];

    // Contexto Temporal (Novo!)
    const contextoTemporal = getContextoTemporal(data);
    console.log(`📅 [DATA] ${contextoTemporal}`);

    console.log(`[VARIABILIDADE] Lente: ${lenteSorteada} | Temp: ${temperaturaSorteada}`);

    const instrucaoVariabilidade = `
\n\n=== [AJUSTE FINO DE TOM - PRIORIDADE MAXIMA] ===
ATENÇÃO: Você recebeu uma "Lente" (${lenteSorteada}) e uma "Temperatura" (${temperaturaSorteada}).
MAS A REGRA DE OURO É: A NATURALIDADE VENCE A METÁFORA.

1. NÃO force a metáfora em todas as frases. Isso deixa o texto robótico.
2. Use a lente apenas como um "perfume" ou "inspiração de fundo".
3. Se a metáfora travar a leitura ou parecer artificial, DESCARTE-A e priorize uma linguagem humana, fluida e pastoral.
4. O objetivo é tocar o coração, não impressionar com vocabulário técnico.
5. SEJA SIMPLES. Fale como um pastor conversando na mesa, não como um poeta acadêmico.
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
        return ""; // Retorna vazio se falhar, para não travar tudo
      }
      return await file.text();
    }

    const [agentStart, modoTexto] = await Promise.all([
      downloadFile("agent_start/AGENT_START.txt"),
      downloadFile(modoRow.storage_path) // ex: modos/MODO_1.txt
    ]);

    if (!modoTexto) {
      throw new Error(`O arquivo do modo (${modoRow.storage_path}) está vazio ou não existe no Storage.`);
    }

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

    // 7.1 BUSCA CONTEXTUAL RAG (Novo Cérebro)
    console.log("🧠 Buscando contexto RAG...");
    const ragContext = await getRelevantContext(supabase, payload.passagem_do_dia, modoRow.titulo);

    // 7.2 CONSULTA OBRIGATÓRIA DE DEVOCIONAL EXTERNO
    console.log("� Consultando devocional externo...");
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

    // 7. Contexto de Memória (Histórico)
    const { data: historico } = await supabase
      .from("historico_geracoes")
      .select("passagem, resultado_texto, aprovado")
      .order("aprovado", { ascending: false, nullsLast: true })
      .order("created_at", { ascending: false })
      .limit(5);

    let memoria = "Não há histórico aprovado.";
    if (historico && historico.length > 0) {
      memoria = historico.map(h =>
        `-- Exemplo (${h.passagem}):\n${h.resultado_texto.substring(0, 300)}...`
      ).join("\n\n");
    }

    // 8. Montar Prompt
    // HIERARQUIA OTIMIZADA v2:
    // 1. MODO primeiro (máxima atenção no início)
    // 2. Contexto e dados no meio
    // 3. PERSONALIDADE_DINAMICA no final (memória recente)
    const promptFinal = `
### [MEMORIA_ESTILO] ⭐⭐⭐ MÁXIMA PRIORIDADE - APRENDA ESTE ESTILO
Estes são exemplos APROVADOS de mensagens que funcionaram muito bem. 
IMITE o tom, estrutura e profundidade destas mensagens:
${memoria}

### [REGRAS_DE_ESTILO] ⭐⭐ OBRIGATÓRIO - ESTILO DA MENSAGEM

🚫 PROIBIDO (NÃO USE):
- Palavras/termos: "norte", "rota", "Farol", "neblina", "bússola" (exceto se no versículo)
- METÁFORAS EM EXCESSO: NÃO repita "Agricultor", "vinha", "plantio", "solo", "semente", "raízes", "fruto", "pomar", "terra" em todas as mensagens. Use NO MÁXIMO 1 metáfora por mensagem.
- Frases longas e poéticas rebuscadas
- Tom distante ("a gente", "nós") - USE SEMPRE "você"
- Clichês de auto-ajuda
- Versículo jogado no final sem explicação

🎯 TOM PASTORAL SIMPLES:
- Fale como um pastor experiente conversando com alguém na sala da igreja
- Seja DIRETO, não poético
- Use linguagem do dia a dia, não rebuscada
- Confronte com amor, mas sem rodeios
- Menos metáforas, mais verdade crua

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

4. TOM DIRETO com "você" e "hoje":
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

### [DADOS_DO_DIA] ⭐ Contexto da Leitura
DATA: ${payload.data}
PASSAGEM: ${payload.passagem_do_dia}
ARQUETIPO: ${payload.arquetipo}
VOZ: ${payload.voice_nome} - ${payload.voice_descricao}

### [MOMENTO_E_DATA] (Contexto Temporal)
${contextoTemporal}

### [INSTRUCOES_MODO] Instruções Específicas do Modo
${modoTexto}

### [AGENT_START] (Regras Gerais do Agente)
${agentStart}

### [CONHECIMENTO_E_REGRAS_RELEVANTES] (via RAG)
${ragContext}

### [DEVOCIONAL_EXTERNO] (Inspiração do Dia - Use como referência, NÃO copie)
${devocionalExterno}

### [PERSONALIDADE_DINAMICA] ⭐ AJUSTE FINAL DE TOM
${instrucaoVariabilidade}
`;

    // 9. Chamar Gemini com Function Calling Loop
    console.log("🤖 Chamando Gemini 3 Flash (com Tools)...");

    // Preparar mensagem inicial
    let messages = [{ role: 'user', parts: [{ text: promptFinal }] }];

    // COMBINA TODAS AS TOOLS
    const ALL_TOOLS = [
      ...BIBLE_TOOLS_DEFINITION[0].function_declarations,
      ...RSS_TOOLS_DEFINITION[0].function_declarations
    ];

    async function callGeminiAPI(msgs: any[]) {
      // Usando gemini-3-flash-preview conforme solicitado pelo usuário
      // Note: pode ser instável ou requer v1beta
      const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${geminiKey}`, {
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

    let candidate = aiData.candidates?.[0];
    let firstPart = candidate?.content?.parts?.[0];
    let resultadoFinal = "IA falhou em gerar texto.";

    // Loop de Function Calling (Máximo 2 voltas para evitar loop infinito)
    if (firstPart?.functionCall) {
      const fnName = firstPart.functionCall.name;
      const fnArgs = firstPart.functionCall.args;

      console.log(`🛠️ IA pediu ferramenta: ${fnName}`, fnArgs);

      // Executa a ferramenta
      let toolResultText = "";
      if (fnName === 'consultar_versiculo') {
        toolResultText = await consultarVersiculo(fnArgs.referencia);
      } else if (fnName === 'consultar_devocional_externo') {
        toolResultText = await consultarRSS(fnArgs.fonte);
      } else {
        console.warn("Ferramenta desconhecida chamada:", fnName);
        toolResultText = "Ferramenta desconhecida ou não implementada.";
      }

      // Adiciona a chamada e o resultado ao histórico
      messages.push({
        role: 'model',
        parts: [firstPart] // A parte com functionCall
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

      // Segunda chamada (Com a resposta da ferramenta)
      console.log("🔄 Retornando resultado da tool para IA...");
      aiData = await callGeminiAPI(messages);

      // Pega resposta final
      const finalPart = aiData.candidates?.[0]?.content?.parts?.[0];
      if (finalPart?.text) {
        resultadoFinal = finalPart.text;
      }

    } else if (firstPart?.text) {
      // Resposta direta sem chamar tool
      resultadoFinal = firstPart.text;
    }

    // 10. Salvar e Retornar
    // Alterado para select().single() para pegar o ID gerado
    const { data: insertData, error: insertError } = await supabase.from("historico_geracoes").insert({
      modo_id,
      data_referencia: data,
      passagem: payload.passagem_do_dia,
      resultado_texto: resultadoFinal,
      aprovado: false // Default false, aguardando "Like" do usuário para favoritar
    }).select("id").single();

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