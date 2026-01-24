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

    // Encontrar todas as passagens (objetos com "data":)
    // e verificar cada uma individualmente

    // Primeira, encontrar as posições de cada "data":
    const dataPositions = [];
    let searchPos = 0;
    while (true) {
        const pos = jsonString.indexOf('"data":', searchPos);
        if (pos === -1) break;
        dataPositions.push(pos);
        searchPos = pos + 1;
    }

    console.log(`Encontradas ${dataPositions.length} passagens\n`);

    // Para cada passagem, encontrar o objeto completo
    for (let i = 0; i < dataPositions.length; i++) {
        const start = dataPositions[i];
        const end = i < dataPositions.length - 1 ? dataPositions[i + 1] : jsonString.length;

        // Encontrar o { que abre este objeto
        let objStart = start;
        for (let j = start; j >= 0; j--) {
            if (jsonString[j] === '{') {
                objStart = j;
                break;
            }
        }

        // Extrair a data
        const dataMatch = jsonString.substring(start, start + 30).match(/"data":\s*"(\d{4}-\d{2}-\d{2})"/);
        const dateStr = dataMatch ? dataMatch[1] : 'unknown';

        // Contar { e } neste trecho
        const segment = jsonString.substring(objStart, end);
        let braces = 0;
        let brackets = 0;
        for (const char of segment) {
            if (char === '{') braces++;
            if (char === '}') braces--;
            if (char === '[') brackets++;
            if (char === ']') brackets--;
        }

        if (braces !== 0 || brackets !== 0) {
            console.log(`❌ Passagem ${i + 1} (${dateStr}): braces=${braces}, brackets=${brackets}`);
            console.log(`   Posição: ${objStart} - ${end}`);
            console.log(`   Trecho: ${segment.substring(0, 200)}...`);
        }
    }

    console.log('\n✅ Verificação concluída');
}

debug();
