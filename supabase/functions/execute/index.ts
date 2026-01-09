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
    const promptFinal = `
### [AGENT_START]
${agentStart}

### [MEMORIA_ESTILO]
${memoria}

### [DADOS_DO_DIA]
DATA: ${payload.data}
PASSAGEM: ${payload.passagem_do_dia}
ARQUETIPO: ${payload.arquetipo}
VOZ: ${payload.voice_nome} - ${payload.voice_descricao}

### [BASE_DE_REGRAS]
${baseRegras}

### [CONHECIMENTO_COMPILADO]
${conhecimentoCompilado}

### [BANCO_DE_OURO]
${bancoDeOuro}

### [INSTRUCOES_MODO]
${modoTexto}
`;

    // 9. Chamar Gemini
    console.log("🤖 Chamando Gemini...");
    // Alterado para gemini-flash-latest (melhor suporte Free Tier)
    const aiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${geminiKey}`, {
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