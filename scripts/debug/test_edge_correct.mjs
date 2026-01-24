// Script para testar a Edge Function com ID CORRETO

const SUPABASE_URL = "https://tayopwdelkmelgmrtnoa.supabase.co";
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRheW9wd2RlbGttZWxnbXJ0bm9hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Nzc5NzA5NCwiZXhwIjoyMDgzMzczMDk0fQ.gscZbZa5_yFZ2HD0XZlaGwaFxNHGxDECVr-IoTWMGVw";

async function testEdgeFunction() {
    console.log("🧪 Testando Edge Function com ID CORRETO...\n");

    const payload = {
        modo_id: "MODO_1.2",  // << ID CORRETO (com prefixo MODO_)
        data: "2026-01-11"
    };

    console.log("📤 Enviando payload:", JSON.stringify(payload, null, 2));

    try {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/execute`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${SERVICE_KEY}`
            },
            body: JSON.stringify(payload)
        });

        console.log("\n📥 Status:", response.status, response.statusText);

        const text = await response.text();

        console.log("\n📥 Resposta (primeiros 500 chars):");
        try {
            const json = JSON.parse(text);
            if (json.ok) {
                console.log("✅ SUCESSO!");
                console.log("Resultado:", json.resultado?.substring(0, 500) + "...");
            } else {
                console.log("❌ ERRO:", json.error);
            }
        } catch {
            console.log(text.substring(0, 500));
        }

    } catch (error) {
        console.error("\n❌ Erro de conexão:", error.message);
    }
}

testEdgeFunction();
