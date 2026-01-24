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

    // Extrair a primeira passagem (2025-12-31) que está OK 
    // e a primeira passagem com problema (2026-01-04)

    // Encontrar passagem 2025-12-31
    const passagem1Start = jsonString.indexOf('"data": "2025-12-31"');
    const passagem2Start = jsonString.indexOf('"data": "2026-01-01"');

    console.log('=== PASSAGEM 1 (2025-12-31) ===');
    const p1 = jsonString.substring(passagem1Start - 10, passagem2Start - 10);
    console.log(p1.split('\n').slice(-10).join('\n'));  // Últimas linhas

    // Encontrar passagem 2026-01-04 (a primeira com problema)
    const passagem5Start = jsonString.indexOf('"data": "2026-01-04"');
    const passagem6Start = jsonString.indexOf('"data": "2026-01-05"');

    console.log('\n\n=== PASSAGEM 5 (2026-01-04) - PRIMEIRA COM PROBLEMA ===');
    const p5 = jsonString.substring(passagem5Start - 10, passagem6Start - 10);
    console.log(p5);
}

debug();
