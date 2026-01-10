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

    // Contar { e }
    let openBraces = 0;
    let closeBraces = 0;
    let openBrackets = 0;
    let closeBrackets = 0;

    for (const char of jsonString) {
        if (char === '{') openBraces++;
        if (char === '}') closeBraces++;
        if (char === '[') openBrackets++;
        if (char === ']') closeBrackets++;
    }

    console.log('Contagem de caracteres:');
    console.log(`  { : ${openBraces}`);
    console.log(`  } : ${closeBraces}`);
    console.log(`  [ : ${openBrackets}`);
    console.log(`  ] : ${closeBrackets}`);

    // Verificar se há objetos mal fechados
    console.log('\nDiferença:');
    console.log(`  { vs } : ${openBraces - closeBraces}`);
    console.log(`  [ vs ] : ${openBrackets - closeBrackets}`);

    // Procurar por problemas específicos na primeira passagem
    // (objetos sem fechar antes da próxima passagem)
    console.log('\n\nProcurando por primeira entrada com data 2025-12-31 e verificando estrutura...');

    // Pegar o primeiro objeto do JSON e analisar
    const firstObjStart = jsonString.indexOf('{');
    let depth = 0;
    let firstObjEnd = -1;
    for (let i = firstObjStart; i < jsonString.length; i++) {
        if (jsonString[i] === '{') depth++;
        if (jsonString[i] === '}') depth--;
        if (depth === 0) {
            firstObjEnd = i;
            break;
        }
    }

    if (firstObjEnd !== -1) {
        const firstObj = jsonString.substring(firstObjStart, firstObjEnd + 1);
        console.log('\nPrimeiro objeto extraído, tentando parse...');
        try {
            JSON.parse(firstObj);
            console.log('✅ Primeiro objeto é válido!');
        } catch (e) {
            console.log('❌ Primeiro objeto inválido:', e.message);
            console.log('\nConteúdo do primeiro objeto:');
            console.log(firstObj.substring(0, 500));
        }
    }
}

debug();
