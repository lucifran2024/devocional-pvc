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

    // Procurar por padrões inválidos no JSON
    // Por exemplo, `{ "key": "value" }` seguido de outro `{ ...` sem vírgula
    const lines = jsonString.split('\n');

    console.log('Procurando por problemas estruturais...\n');

    // Verificar se "tese" aparece direto no início de linha (problema de fechamento de objeto anterior)
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        // Se a linha começa com "tese" mas não está dentro de um objeto
        if (/^"tese":/.test(line)) {
            // Verificar a linha anterior
            const prevLine = lines[i - 1]?.trim();
            console.log(`Linha ${i + 1} começa com "tese":`);
            console.log(`  Anterior: ${prevLine}`);
            console.log(`  Atual: ${line}`);
            console.log('');
        }
    }
}

debug();
