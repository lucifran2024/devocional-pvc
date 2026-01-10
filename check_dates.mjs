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

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log('📦 Baixando SECAO6.TXT do Storage...\n');

    const { data, error } = await supabase.storage
        .from('pvc')
        .download('secao6/SECAO6.TXT');

    if (error) {
        console.error('❌ ERRO:', error);
        return;
    }

    const text = await data.text();
    console.log('📄 Tamanho do arquivo:', text.length, 'caracteres\n');

    // Procurar todas as datas no formato YYYY-MM-DD
    const dateRegex = /"data":\s*"(\d{4}-\d{2}-\d{2})"/g;
    const dates = [];
    let match;

    while ((match = dateRegex.exec(text)) !== null) {
        dates.push(match[1]);
    }

    console.log('📅 Datas encontradas no arquivo:', dates.length);
    console.log(dates.join('\n'));

    console.log('\n🔍 Verificando 2026-01-10:', dates.includes('2026-01-10') ? '✅ EXISTE' : '❌ NÃO EXISTE');
    console.log('🔍 Verificando 2026-01-09:', dates.includes('2026-01-09') ? '✅ EXISTE' : '❌ NÃO EXISTE');
}

check();
