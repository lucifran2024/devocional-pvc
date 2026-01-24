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

    // Procurar onde exatamente o problema ocorre
    const lines = jsonString.split('\n');
    let depth = 0;  // Combinado para { e [

    // Procurar por objetos que começam { mas não têm a estrutura esperada
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();

        // Procurar especificamente por linhas que têm problema:
        // - Uma linha com `{` seguida por uma propriedade SEM ter a aspa inicial
        // - Um último insight de array que pode não ter `}` antes do `]`

        // Procurar por `"Profeta"` no final que deveria ter `,` ou `}` depois 
        if (trimmed.includes('"voz_performance"')) {
            const nextLine = lines[i + 1]?.trim();
            const nextNextLine = lines[i + 2]?.trim();

            // Se a próxima linha é `{` em vez de `}`, temos um problema
            if (nextLine === '{') {
                console.log(`⚠️  Problema na linha ${i + 1}:`);
                console.log(`    Atual: ${trimmed}`);
                console.log(`    Próxima (deveria ser "}"): ${nextLine}`);
                console.log(`    Depois: ${nextNextLine}`);
            }
        }

        // Também procurar por padrões estranhos onde um objeto começa mas não fecha
        // antes do próximo
        if (trimmed === '{' && !trimmed.includes('"tese"')) {
            const nextLine = lines[i + 1]?.trim();
            // Se a próxima linha começa com uma propriedade válida do insight, está OK
            if (!nextLine?.startsWith('"tese"')) {
                // console.log(`Linha ${i+1} tem "{" e próxima não é tese: ${nextLine}`);
            }
        }
    }

    // Procurar por um padrão específico: `)` sem fechamento
    console.log('\n\nProcurando linhas problemáticas específicas...');
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();

        // Procurar por `},` seguido por linha que NÃO é `{` ou `]`
        if (trimmed === '},') {
            const nextLine = lines[i + 1]?.trim();
            if (nextLine && nextLine !== '{' && nextLine !== ']' && !nextLine.startsWith('{')) {
                console.log(`Linha ${i + 1}: "},"`);
                console.log(`  Próxima: ${nextLine} (esperado { ou ])`);
            }
        }

        // Procurar especificamente pelo primeiro objeto de cada passagem
        // que pode não ter todos os campos fechados
        if (/"Profeta"\s*$/.test(trimmed)) {
            // Linha termina com "Profeta" (sem vírgula) - pode ser o último insight
            const nextLine = lines[i + 1]?.trim();
            console.log(`Linha ${i + 1} termina com "Profeta": ${trimmed.substring(0, 50)}...`);
            console.log(`  Próxima: ${nextLine}`);
        }
    }
}

debug();
