import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Lê as variáveis de ambiente do .env.local
const envFile = fs.readFileSync('.env.local', 'utf8');
const envVars = {};
envFile.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) envVars[key.trim()] = value.trim();
});

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('URL:', supabaseUrl);
console.log('Key exists:', !!supabaseKey);

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log('\n📦 Baixando SECAO6.TXT do Storage...\n');

    const { data, error } = await supabase.storage
        .from('pvc')
        .download('secao6/SECAO6.TXT');

    if (error) {
        console.error('❌ ERRO:', error);
        return;
    }

    const text = await data.text();
    console.log('📄 Tamanho do arquivo:', text.length, 'caracteres');

    const jsonMarker = '### JSON_BEGIN';
    const jsonStartIndex = text.indexOf(jsonMarker);

    if (jsonStartIndex === -1) {
        console.log('❌ Marcador JSON não encontrado');
        return;
    }

    let jsonString = text.substring(jsonStartIndex + jsonMarker.length).trim();

    const jsonEndMarker = '### JSON_END';
    const jsonEndIndex = jsonString.indexOf(jsonEndMarker);
    if (jsonEndIndex !== -1) {
        jsonString = jsonString.substring(0, jsonEndIndex).trim();
    }

    try {
        const passagens = JSON.parse(jsonString);
        console.log('\n✅ JSON parseado com sucesso!');
        console.log('📊 Total de passagens:', passagens.length);
        console.log('\n📅 Datas disponíveis:');
        passagens.forEach(p => console.log(`   - ${p.data}: ${p.referencia}`));

        const hoje = passagens.find(p => p.data === '2026-01-10');
        console.log('\n🔍 Passagem de hoje (2026-01-10):', hoje ? '✅ ENCONTRADA - ' + hoje.referencia : '❌ NÃO ENCONTRADA');

    } catch (e) {
        console.log('\n❌ Erro no parse JSON:', e.message);
        console.log('\n📄 Primeiros 1000 chars do JSON:');
        console.log(jsonString.substring(0, 1000));
        console.log('\n📄 Últimos 1000 chars do JSON:');
        console.log(jsonString.substring(jsonString.length - 1000));
    }
}

check();
