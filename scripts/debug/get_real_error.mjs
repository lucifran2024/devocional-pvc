// Script para capturar o ERRO REAL da Edge Function

const SUPABASE_URL = "https://tayopwdelkmelgmrtnoa.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRheW9wd2RlbGttZWxnbXJ0bm9hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3OTcwOTQsImV4cCI6MjA4MzM3MzA5NH0.TGvk6rrIkFnmxKrKg63t9L6HMN3Zc9bRYWnvQ0yfXoA";

async function getRealError() {
    console.log("🔍 Capturando erro real da Edge Function...\n");

    const payload = {
        modo_id: "MODO_1.2",
        data: "2026-01-11"
    };

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

        console.log("Status:", response.status);
        const body = await response.text();
        console.log("\nBody completo:");
        console.log(body);

    } catch (error) {
        console.error("Erro:", error.message);
    }
}

getRealError();
