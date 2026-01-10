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

async function debug() {
    console.log('🔍 Verificando dados necessários para o Gerador...\n');

    const hoje = '2026-01-10';

    // 1. Verificar payload_do_dia
    console.log(`1️⃣ Buscando payload_do_dia para ${hoje}...`);
    const { data: payload, error: payloadErr } = await supabase
        .from('payload_do_dia')
        .select('*')
        .eq('data', hoje)
        .maybeSingle();

    if (payloadErr) {
        console.log('   ❌ Erro:', payloadErr.message);
    } else if (!payload) {
        console.log('   ❌ NÃO EXISTE payload para hoje!');
        console.log('   ⚠️  Este é o provável motivo do erro 500!');
    } else {
        console.log('   ✅ Payload encontrado:', payload.passagem_do_dia);
    }

    // 2. Verificar leitura_do_dia
    console.log(`\n2️⃣ Buscando leitura_do_dia para ${hoje}...`);
    const { data: leitura, error: leituraErr } = await supabase
        .from('leitura_do_dia')
        .select('*')
        .eq('data', hoje)
        .maybeSingle();

    if (leituraErr) {
        console.log('   ❌ Erro:', leituraErr.message);
    } else if (!leitura) {
        console.log('   ❌ NÃO EXISTE leitura para hoje!');
    } else {
        console.log('   ✅ Leitura encontrada');
    }

    // 3. Verificar modos
    console.log(`\n3️⃣ Verificando tabela modos...`);
    const { data: modos, error: modosErr } = await supabase
        .from('modos')
        .select('id, titulo, ativo')
        .limit(5);

    if (modosErr) {
        console.log('   ❌ Erro:', modosErr.message);
    } else {
        console.log('   ✅ Modos encontrados:', modos?.length);
        modos?.forEach(m => console.log(`      - ${m.id}: ${m.titulo} (${m.ativo ? '✅' : '❌'})`));
    }

    // 4. Verificar datas disponíveis
    console.log(`\n4️⃣ Últimas datas em payload_do_dia...`);
    const { data: datas } = await supabase
        .from('payload_do_dia')
        .select('data')
        .order('data', { ascending: false })
        .limit(5);

    if (datas) {
        console.log('   Datas disponíveis:', datas.map(d => d.data).join(', '));
    }
}

debug();
