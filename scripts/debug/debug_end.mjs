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

    // Ver posição do erro
    console.log('Tamanho do JSON:', jsonString.length);
    console.log('\nÚltimos 100 caracteres:');
    console.log(JSON.stringify(jsonString.substring(jsonString.length - 100)));

    console.log('\nÚltimas 10 linhas:');
    const lines = jsonString.split('\n');
    for (let i = Math.max(0, lines.length - 10); i < lines.length; i++) {
        console.log(`${i + 1}: ${lines[i]}`);
    }
}

debug();
