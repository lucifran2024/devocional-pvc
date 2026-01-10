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

    console.log('📝 Aplicando correções de JSON...\n');

    // NOVA LÓGICA DE CORREÇÃO (igual ao código corrigido em supabase.ts)
    const keysToFix = [
        'data', 'referencia', 'arquetipo_maestro', 'lexico_do_dia',
        'estrutura_dinamica', 'insights_pre_minerados',
        'tese', 'familia', 'verso_suporte', 'voz_performance'
    ];

    keysToFix.forEach(key => {
        // Caso 1: chave sem aspas NO MEIO de linha (ex: `  { tese": `)
        const regexMid = new RegExp(`([^"\\w])(${key}"):`, 'g');
        jsonString = jsonString.replace(regexMid, '$1"$2":');

        // Caso 2: chave sem aspas NO INÍCIO de linha (ex: `\ntese": ` ou `\r\ntese": `)
        const regexStart = new RegExp(`(^|\\r?\\n)(${key}"):`, 'gm');
        jsonString = jsonString.replace(regexStart, '$1"$2":');
    });

    try {
        const passagens = JSON.parse(jsonString);
        console.log('✅ JSON parseado com sucesso!');
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

        // Procurar linhas problemáticas
        const lines = jsonString.split('\n');
        console.log('\n🔍 Procurando linhas problemáticas...');
        lines.forEach((line, i) => {
            if (line.match(/[^"](tese"|familia"|verso_suporte"|voz_performance")/) ||
                line.match(/^\s*(tese"|familia"|verso_suporte"|voz_performance")/)) {
                console.log(`Linha ${i + 1}: ${line}`);
            }
        });
    }
}

testFix();
