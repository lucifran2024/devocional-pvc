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

    // CORREÇÃO
    const keysToFix = [
        'data', 'referencia', 'arquetipo_maestro', 'lexico_do_dia',
        'estrutura_dinamica', 'insights_pre_minerados',
        'tese', 'familia', 'verso_suporte', 'voz_performance'
    ];

    keysToFix.forEach(key => {
        const regexMid = new RegExp(`([^"\\w])(${key})":`, 'g');
        jsonString = jsonString.replace(regexMid, '$1"$2":');

        const regexStart = new RegExp(`(^|\\r?\\n)(${key})":`, 'gm');
        jsonString = jsonString.replace(regexStart, '$1"$2":');
    });

    // Tentar parse incremental para encontrar o primeiro erro
    let lastGoodPos = 0;
    for (let i = 1000; i <= jsonString.length; i += 1000) {
        try {
            JSON.parse(jsonString.substring(0, i) + ']}]}]}]}]}');
        } catch (e) {
            // esperado
        }
    }

    // Ver contexto em torno do erro
    console.log('Contexto em torno de posição 46400-46404:');
    const chars = jsonString.substring(46390, 46410);
    console.log('Texto:', JSON.stringify(chars));
    console.log('Char codes:', chars.split('').map(c => c.charCodeAt(0)).join(', '));

    // Ver se o problema está na linha 1414
    console.log('\n\nLinha 1414 detalhada:');
    const lines = jsonString.split('\n');
    const line1414 = lines[1413];
    console.log('Conteúdo:', JSON.stringify(line1414));
    console.log('Char codes:', line1414.split('').map(c => c.charCodeAt(0)).join(', '));
}

debug();
