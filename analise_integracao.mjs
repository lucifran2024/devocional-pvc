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

async function analisarIntegracao() {
    console.log('📊 ANÁLISE DE INTEGRAÇÃO MODO_1 ↔ SECAO6 ↔ EDGE FUNCTION\n');

    // 1. Verificar tabela modos
    console.log('1️⃣ Verificando modos cadastrados na tabela `modos`...');
    const { data: modos, error: modosErr } = await supabase
        .from('modos')
        .select('*');

    if (modosErr) {
        console.log('   ❌ Erro:', modosErr.message);
    } else {
        console.log(`   ✅ Total de modos: ${modos?.length}`);
        modos?.forEach(m => {
            console.log(`      - ${m.id}: ${m.titulo}`);
            console.log(`        storage_path: ${m.storage_path}`);
            console.log(`        ativo: ${m.ativo ? '✅' : '❌'}`);
        });
    }

    // 2. Verificar arquivos no Storage
    console.log('\n2️⃣ Verificando arquivos no Storage (bucket: pvc)...');
    const { data: files, error: filesErr } = await supabase.storage
        .from('pvc')
        .list('modos');

    if (filesErr) {
        console.log('   ❌ Erro:', filesErr.message);
    } else {
        console.log(`   ✅ Arquivos em modos/:`, files?.map(f => f.name).join(', '));
    }

    // 3. Verificar arquivos em base/
    const { data: baseFiles, error: baseErr } = await supabase.storage
        .from('pvc')
        .list('base');

    if (baseErr) {
        console.log('   ❌ Erro em base/:', baseErr.message);
    } else {
        console.log('   ✅ Arquivos em base/:', baseFiles?.map(f => f.name).join(', '));
    }

    // 4. Verificar secao6
    const { data: secao6Files, error: secao6Err } = await supabase.storage
        .from('pvc')
        .list('secao6');

    if (secao6Err) {
        console.log('   ❌ Erro em secao6/:', secao6Err.message);
    } else {
        console.log('   ✅ Arquivos em secao6/:', secao6Files?.map(f => f.name).join(', '));
    }

    // 5. Verificar payload de hoje
    console.log('\n3️⃣ Verificando payload_do_dia para hoje...');
    const hoje = '2026-01-10';
    const { data: payload, error: payloadErr } = await supabase
        .from('payload_do_dia')
        .select('*')
        .eq('data', hoje)
        .maybeSingle();

    if (payloadErr) {
        console.log('   ❌ Erro:', payloadErr.message);
    } else if (!payload) {
        console.log('   ❌ payload_do_dia não encontrado para hoje!');
    } else {
        console.log('   ✅ payload_do_dia encontrado:', payload.passagem_do_dia);
    }

    // 6. Verificar leitura_do_dia
    console.log('\n4️⃣ Verificando leitura_do_dia para hoje...');
    const { data: leitura, error: leituraErr } = await supabase
        .from('leitura_do_dia')
        .select('*')
        .eq('data', hoje)
        .maybeSingle();

    if (leituraErr) {
        console.log('   ❌ Erro:', leituraErr.message);
    } else if (!leitura) {
        console.log('   ❌ leitura_do_dia não encontrado para hoje!');
    } else {
        console.log('   ✅ leitura_do_dia encontrado:');
        console.log(`      - passagem: ${leitura.passagem_do_dia}`);
        console.log(`      - arquetipo: ${leitura.arquetipo}`);
        console.log(`      - lexico: ${leitura.lexico_do_dia?.length || 0} palavras`);
        console.log(`      - insights: ${leitura.insights_pre_minerados?.length || 0}`);
    }

    console.log('\n✅ Análise concluída!');
}

analisarIntegracao();
