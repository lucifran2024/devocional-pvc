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

    // Rastrear a profundidade para encontrar onde o problema ocorre
    const lines = jsonString.split('\n');
    let braceDepth = 0;
    let bracketDepth = 0;

    console.log('Procurando linhas onde a profundidade muda inesperadamente...\n');

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const prevBrace = braceDepth;
        const prevBracket = bracketDepth;

        for (const char of line) {
            if (char === '{') braceDepth++;
            if (char === '}') braceDepth--;
            if (char === '[') bracketDepth++;
            if (char === ']') bracketDepth--;
        }

        // Verificar se há uma mudança estranha
        // Se uma linha abre braces sem fechar antes, pode ser um problema

        // Procurar especificamente por linhas problemáticas
        // Por exemplo, se a linha tem "Profeta" mas não tem } para fechar o objeto
        if (line.includes('"voz_performance"') && !line.includes('}')) {
            // Verificar se a próxima linha é o fechamento
            const nextLine = lines[i + 1]?.trim();
            if (nextLine && !nextLine.startsWith('}')) {
                console.log(`⚠️  Possível problema na linha ${i + 1}: ${line.trim()}`);
                console.log(`    Próxima linha: ${nextLine}`);
            }
        }
    }

    console.log('\n\nProfundidade final:');
    console.log(`  Braces: ${braceDepth}`);
    console.log(`  Brackets: ${bracketDepth}`);

    // Procurar por `{` sem correspondente `}`
    // Vamos rastrear por "data": para encontrar objetos de passagem
    const dataMatches = jsonString.match(/"data":\s*"\d{4}-\d{2}-\d{2}"/g);
    console.log(`\nTotal de entradas com "data": ${dataMatches?.length || 0}`);
}

debug();
