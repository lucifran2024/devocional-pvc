// Script para verificar quais modos o FRONTEND está recebendo

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://tayopwdelkmelgmrtnoa.supabase.co";
// Usando a ANON KEY correta do .env.local
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRheW9wd2RlbGttZWxnbXJ0bm9hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3OTcwOTQsImV4cCI6MjA4MzM3MzA5NH0.TGvk6rrIkFnmxKrKg63t9L6HMN3Zc9bRYWnvQ0yfXoA";

const supabase = createClient(SUPABASE_URL, ANON_KEY);

async function checkModos() {
    console.log("📋 Verificando modos que o FRONTEND ve...\n");

    const { data, error } = await supabase
        .from("modos")
        .select("*")
        .order("id");

    if (error) {
        console.error("❌ Erro:", error);
        return;
    }

    console.log("Total de modos:", data.length);
    console.log("\nIDs que serão enviados para a Edge Function:");
    data.forEach(m => {
        console.log(`  - "${m.id}" (${m.titulo}, ativo: ${m.ativo})`);
    });

    // Agora testar a chamada da Edge Function como o frontend faz
    console.log("\n\n🧪 Testando Edge Function VIA supabase.functions.invoke...\n");

    const { data: execData, error: execError } = await supabase.functions.invoke('execute', {
        body: { modo_id: "MODO_1.2", data: "2026-01-11" }
    });

    if (execError) {
        console.error("❌ Erro Edge Function:", execError);
    } else {
        console.log("✅ Resposta:", execData?.ok ? "SUCESSO" : "FALHA");
        if (execData?.error) console.log("   Erro:", execData.error);
        if (execData?.resultado) console.log("   Preview:", execData.resultado?.substring(0, 200));
    }
}

checkModos();
