import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envFile = fs.readFileSync('.env.local', 'utf8');
const envVars = {};
envFile.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) envVars[key.trim()] = value.trim();
});

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
    console.log('🔍 Verificando schema das tabelas...\n');

    // Tentar pegar um registro de payload_do_dia para ver as colunas
    const { data: payloadSample, error: payloadErr } = await supabase
        .from('payload_do_dia')
        .select('*')
        .limit(1)
        .maybeSingle();

    if (payloadSample) {
        console.log('📋 Colunas em payload_do_dia:');
        console.log('   ', Object.keys(payloadSample).join(', '));
        console.log('\nExemplo de registro:');
        console.log(JSON.stringify(payloadSample, null, 2));
    } else if (payloadErr) {
        console.log('❌ Erro payload_do_dia:', payloadErr.message);
    }

    // Tentar pegar um registro de leitura_do_dia
    const { data: leituraSample, error: leituraErr } = await supabase
        .from('leitura_do_dia')
        .select('*')
        .limit(1)
        .maybeSingle();

    if (leituraSample) {
        console.log('\n📋 Colunas em leitura_do_dia:');
        console.log('   ', Object.keys(leituraSample).join(', '));
        console.log('\nExemplo de registro:');
        console.log(JSON.stringify(leituraSample, null, 2));
    } else if (leituraErr) {
        console.log('❌ Erro leitura_do_dia:', leituraErr.message);
    }
}

checkSchema();
