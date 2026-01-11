// Script para capturar erro detalhado da Edge Function
import fs from 'fs';

// Carregar .env.local manualmente
const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key) env[key.trim()] = valueParts.join('=').trim();
});

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function testEdge() {
    const dataHoje = new Date().toISOString().split('T')[0];
    console.log(`📅 Testando para data: ${dataHoje}\n`);

    const response = await fetch(`${SUPABASE_URL}/functions/v1/execute`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${ANON_KEY}`,
            'apikey': ANON_KEY
        },
        body: JSON.stringify({ modo_id: 'MODO_1', data: dataHoje })
    });

    console.log(`Status: ${response.status} ${response.statusText}`);

    const text = await response.text();
    console.log(`\n📄 Response Body:`);
    console.log(text);

    try {
        const json = JSON.parse(text);
        console.log(`\n📋 Parsed JSON:`);
        console.log(JSON.stringify(json, null, 2));
    } catch (e) {
        console.log(`\n(Resposta não é JSON válido)`);
    }
}

testEdge().catch(console.error);
