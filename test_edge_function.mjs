// Script para testar a Edge Function diretamente e ver o erro real

const SUPABASE_URL = "https://tayopwdelkmelgmrtnoa.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRheW9wd2RlbGttZWxnbXJ0bm9hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3OTcwOTQsImV4cCI6MjA4MzM3MzA5NH0.bZXBaXmwpP-XyONpfHnRTfKnCrWVnRxl9zXWQhOHIeA";

async function testEdgeFunction() {
    console.log("🧪 Testando Edge Function 'execute'...\n");

    const payload = {
        modo_id: "1.2",
        data: "2026-01-11"
    };

    console.log("📤 Enviando payload:", JSON.stringify(payload, null, 2));

    try {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/execute`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${ANON_KEY}`,
                "apikey": ANON_KEY
            },
            body: JSON.stringify(payload)
        });

        console.log("\n📥 Status:", response.status, response.statusText);
        console.log("📥 Headers:", Object.fromEntries(response.headers.entries()));

        const text = await response.text();

        console.log("\n📥 Resposta:");
        try {
            const json = JSON.parse(text);
            console.log(JSON.stringify(json, null, 2));
        } catch {
            console.log(text);
        }

    } catch (error) {
        console.error("\n❌ Erro de conexão:", error.message);
    }
}

testEdgeFunction();
