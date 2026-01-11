import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const { modo_id, data } = await req.json();
    console.log(`🚀 Iniciando execução. Modo: ${modo_id}, Data: ${data}`);

    if (!modo_id || !data) {
      throw new Error("Faltam dados obrigatórios: modo_id ou data.");
    }

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

    const [agentStart, baseRegras, conhecimentoCompilado, bancoDeOuro, modoTexto] = await Promise.all([
      downloadFile("agent_start/AGENT_START.txt"),
      downloadFile("base/BASE_DE_CONHECIMENTO_UNIFICADA_v2.txt"),
      downloadFile("base/Conhecimento_Compilado_Essencial.v1.4.txt"),
      downloadFile("base/BANCO_DE_OURO_EXEMPLOS E BANCO_MICRO_SHOTS.txt"),
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

    // 7. Contexto de Memória (Histórico)
    const { data: historico } = await supabase
      .from("historico_geracoes")
      .select("passagem, resultado_texto")
      .eq("modo_id", modo_id)
      .eq("aprovado", true)
      .order("created_at", { ascending: false })
      .limit(5);

    let memoria = "Não há histórico aprovado.";
    if (historico && historico.length > 0) {
      memoria = historico.map(h =>
        `-- Exemplo (${h.passagem}):\n${h.resultado_texto.substring(0, 300)}...`
      ).join("\n\n");
    }

    // 8. Montar Prompt
    // ORDEM OTIMIZADA: Modo primeiro (prioridade), depois contexto e referências
    const promptFinal = `
### [AGENT_START]
${agentStart}

### [INSTRUCOES_MODO] (PRIORIDADE MÁXIMA - SIGA ESTAS INSTRUÇÕES)
${modoTexto}

### [PERSONALIDADE_DINAMICA]
${instrucaoVariabilidade}

### [DADOS_DO_DIA]
DATA: ${payload.data}
PASSAGEM: ${payload.passagem_do_dia}
ARQUETIPO: ${payload.arquetipo}
VOZ: ${payload.voice_nome} - ${payload.voice_descricao}

### [MEMORIA_ESTILO]
${memoria}

### [BASE_DE_REGRAS]
${baseRegras}

### [CONHECIMENTO_COMPILADO]
${conhecimentoCompilado}

### [BANCO_DE_OURO]
${bancoDeOuro}
`;

    // 9. Chamar Gemini
    console.log("🤖 Chamando Gemini 3 Flash...");
    // Tentando gemini-3-flash-preview
    const aiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${geminiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: promptFinal }] }]
      })
    });

    const aiData = await aiResponse.json();
    if (aiData.error) {
      console.error("Erro Gemini:", aiData.error);
      throw new Error(`Erro na IA (${aiData.error.code}): ${aiData.error.message}`);
    }

    const resultadoFinal = aiData.candidates?.[0]?.content?.parts?.[0]?.text || "IA não gerou texto.";

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