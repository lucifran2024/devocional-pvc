
const SUPABASE_URL = "https://tayopwdelkmelgmrtnoa.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRheW9wd2RlbGttZWxnbXJ0bm9hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3OTcwOTQsImV4cCI6MjA4MzM3MzA5NH0.TGvk6rrIkFnmxKrKg63t9L6HMN3Zc9bRYWnvQ0yfXoA";

async function testFunction() {
    const url = `${SUPABASE_URL}/functions/v1/execute`;
    const today = new Date().toISOString().split('T')[0];

    console.log(`Testando função em: ${url}`);
    console.log(`Payload: { modo_id: "MODO_1", data: "${today}" }`);

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${ANON_KEY}`
            },
            body: JSON.stringify({
                modo_id: "MODO_1",
                data: today
            })
        });

        console.log("Status:", response.status);
        const text = await response.text();
        console.log("Body:", text);

    } catch (error) {
        console.error("Erro na requisição:", error);
    }
}

testFunction();
