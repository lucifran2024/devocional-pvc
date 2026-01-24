// Debug detalhado da Edge Function
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key) env[key.trim()] = valueParts.join('=').trim();
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function debugEdgeFunction() {
    const dataHoje = new Date().toISOString().split('T')[0];
    console.log(`\n🔍 Testando Edge Function 'execute' com MODO_1 e data ${dataHoje}\n`);

    try {
        // Tentar chamar diretamente via fetch para ver o corpo do erro
        const url = `${env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/execute`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
                'apikey': env.NEXT_PUBLIC_SUPABASE_ANON_KEY
            },
            body: JSON.stringify({ modo_id: 'MODO_1', data: dataHoje })
        });

        console.log('Status:', response.status, response.statusText);
        console.log('Headers:', Object.fromEntries(response.headers.entries()));

        const body = await response.text();
        console.log('\n📦 Corpo da Resposta:');
        console.log(body);

        // Tentar parsear como JSON para ver erro estruturado
        try {
            const json = JSON.parse(body);
            console.log('\n📋 JSON Parseado:');
            console.log(JSON.stringify(json, null, 2));
        } catch (e) {
            console.log('(Não é JSON válido)');
        }

    } catch (e) {
        console.log('💥 Exceção:', e.message);
    }
}

debugEdgeFunction().catch(console.error);
