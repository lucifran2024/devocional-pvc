// Script para verificar dados no Supabase (SEM dotenv)
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Carregar .env.local manualmente
const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key) env[key.trim()] = valueParts.join('=').trim();
});

const supabase = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function verificar() {
    const dataHoje = new Date().toISOString().split('T')[0];
    console.log(`\n📅 Data de hoje: ${dataHoje}\n`);

    // 1. Verificar payload_do_dia
    console.log('=== PAYLOAD DO DIA ===');
    const { data: payload, error: payloadErr } = await supabase
        .from('payload_do_dia')
        .select('*')
        .eq('data', dataHoje)
        .maybeSingle();

    if (payloadErr) {
        console.log('❌ Erro:', payloadErr.message);
    } else if (payload) {
        console.log('✅ Encontrado:', payload);
    } else {
        console.log('⚠️ Nenhum payload para hoje! A Edge Function vai falhar.');
        console.log('   Isso causa o erro 500 - precisa inserir dados para hoje na tabela.');
    }

    // 2. Verificar modos
    console.log('\n=== MODOS ATIVOS ===');
    const { data: modos, error: modosErr } = await supabase
        .from('modos')
        .select('id, titulo, ativo, storage_path')
        .eq('ativo', true)
        .limit(5);

    if (modosErr) {
        console.log('❌ Erro:', modosErr.message);
    } else {
        console.log(`✅ ${modos?.length || 0} modos ativos encontrados`);
        modos?.forEach(m => console.log(`   - ${m.id}: ${m.titulo} (${m.storage_path})`));
    }

    // 3. Tentar chamar a Edge Function diretamente
    console.log('\n=== TESTE DA EDGE FUNCTION ===');
    try {
        const { data, error } = await supabase.functions.invoke('execute', {
            body: { modo_id: 'MODO_1', data: dataHoje }
        });

        if (error) {
            console.log('❌ Erro na Edge Function:', error.message);
            if (error.context) console.log('   Contexto:', error.context);
        } else {
            console.log('✅ Resposta OK:', data?.ok);
            if (data?.resultado) {
                console.log('   Texto gerado (primeiros 200 chars):', data.resultado.substring(0, 200));
            }
        }
    } catch (e) {
        console.log('💥 Exceção:', e.message);
    }
}

verificar().catch(console.error);
