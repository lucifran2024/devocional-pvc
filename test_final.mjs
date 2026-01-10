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

async function testFix() {
    console.log('📦 Baixando SECAO6.TXT do Storage...\n');

    const { data, error } = await supabase.storage
        .from('pvc')
        .download('secao6/SECAO6.TXT');

    if (error) {
        console.error('❌ ERRO:', error);
        return;
    }

    const text = await data.text();

    const jsonMarker = '### JSON_BEGIN';
    const jsonStartIndex = text.indexOf(jsonMarker);
    let jsonString = text.substring(jsonStartIndex + jsonMarker.length).trim();

    const jsonEndMarker = '### JSON_END';
    const jsonEndIndex = jsonString.indexOf(jsonEndMarker);
    if (jsonEndIndex !== -1) {
        jsonString = jsonString.substring(0, jsonEndIndex).trim();
    }

    console.log('📝 Aplicando correções de JSON (versão corrigida)...\n');

    // NOVA LÓGICA CORRIGIDA
    const keysToFix = [
        'data', 'referencia', 'arquetipo_maestro', 'lexico_do_dia',
        'estrutura_dinamica', 'insights_pre_minerados',
        'tese', 'familia', 'verso_suporte', 'voz_performance'
    ];

    keysToFix.forEach(key => {
        // Caso 1: chave sem aspas NO MEIO de linha
        // Procura por: não-aspa + chave + aspa + dois-pontos
        const regexMid = new RegExp(`([^"\\w])(${key})":`, 'g');
        jsonString = jsonString.replace(regexMid, '$1"$2":');

        // Caso 2: chave sem aspas NO INÍCIO de linha
        const regexStart = new RegExp(`(^|\\r?\\n)(${key})":`, 'gm');
        jsonString = jsonString.replace(regexStart, '$1"$2":');
    });

    // Ver linhas 1410-1421 após correções
    const lines = jsonString.split('\n');
    console.log('Linhas 1410-1421 após correções:');
    for (let i = 1409; i < Math.min(1421, lines.length); i++) {
        console.log(`${i + 1}: ${lines[i]}`);
    }

    try {
        const passagens = JSON.parse(jsonString);
        console.log('\n✅ JSON parseado com sucesso!');
        console.log('📊 Total de passagens:', passagens.length);

        const hoje = passagens.find(p => p.data === '2026-01-10');
        console.log('\n🔍 Passagem de hoje (2026-01-10):');
        if (hoje) {
            console.log('   ✅ ENCONTRADA!');
            console.log('   📖 Referência:', hoje.referencia);
            console.log('   🎭 Arquétipo:', hoje.arquetipo_maestro);
        } else {
            console.log('   ❌ NÃO ENCONTRADA');
        }

    } catch (e) {
        console.log('\n❌ Erro no parse JSON:', e.message);
    }
}

testFix();
