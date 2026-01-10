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

    // Aplicar correções
    const keysToFix = [
        'data', 'referencia', 'arquetipo_maestro', 'lexico_do_dia',
        'estrutura_dinamica', 'insights_pre_minerados',
        'tese', 'familia', 'verso_suporte', 'voz_performance'
    ];

    keysToFix.forEach(key => {
        const regexMid = new RegExp(`([^"\\w])(${key}"):`, 'g');
        jsonString = jsonString.replace(regexMid, '$1"$2":');

        const regexStart = new RegExp(`(^|\\r?\\n)(${key}"):`, 'gm');
        jsonString = jsonString.replace(regexStart, '$1"$2":');
    });

    // Ver linhas 1410-1425 após correções
    const lines = jsonString.split('\n');
    console.log('Linhas 1410-1421 após correções:');
    for (let i = 1409; i < Math.min(1421, lines.length); i++) {
        const charCodes = lines[i].split('').slice(0, 20).map(c => c.charCodeAt(0)).join(',');
        console.log(`${i + 1}: [${charCodes}] "${lines[i]}"`);
    }

    // Ver exatamente o caractere na posição 46229
    console.log('\nCaractere na posição 46229:', JSON.stringify(jsonString.charAt(46229)));
    console.log('Contexto em torno de 46229:');
    console.log(jsonString.substring(46220, 46250));
}

debug();
