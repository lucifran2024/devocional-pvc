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

async function test() {
    console.log('📦 Testando a nova função getPassagemFromStorage...\n');

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

    // CORREÇÃO de chaves
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

    // Simular o fallback
    const dataPreferida = '2026-01-10';

    // O JSON vai falhar porque está malformado
    // Então vamos testar diretamente o fallback

    const dataPattern = `"data": "${dataPreferida}"`;
    const dataIndex = jsonString.indexOf(dataPattern);

    if (dataIndex === -1) {
        console.error('❌ Data não encontrada:', dataPreferida);
        return;
    }

    console.log('📍 Data encontrada na posição:', dataIndex);

    // Encontrar o início do objeto
    let objStart = dataIndex;
    for (let i = dataIndex; i >= 0; i--) {
        if (jsonString[i] === '{') {
            objStart = i;
            break;
        }
    }

    // Funções de extração
    const extractField = (fieldName, startPos) => {
        const pattern = new RegExp(`"${fieldName}":\\s*"([^"]+)"`, 'g');
        pattern.lastIndex = startPos;
        const match = pattern.exec(jsonString);
        return match ? match[1] : null;
    };

    const extractArray = (fieldName, startPos) => {
        const pattern = new RegExp(`"${fieldName}":\\s*\\[([^\\]]+)\\]`, 'g');
        pattern.lastIndex = startPos;
        const match = pattern.exec(jsonString);
        if (!match) return [];
        const items = match[1].match(/"([^"]+)"/g);
        return items ? items.map(s => s.replace(/"/g, '')) : [];
    };

    // Encontrar onde a próxima passagem começa
    const nextDataPattern = /"data":\s*"\d{4}-\d{2}-\d{2}"/g;
    nextDataPattern.lastIndex = dataIndex + dataPattern.length;
    const nextMatch = nextDataPattern.exec(jsonString);
    const searchEnd = nextMatch ? nextMatch.index : jsonString.length;

    console.log('🔍 Busca limitada até:', searchEnd);

    // Extrair campos
    const referencia = extractField('referencia', objStart);
    const arquetipo = extractField('arquetipo_maestro', objStart);
    const lexico = extractArray('lexico_do_dia', objStart);

    console.log('\n📖 Campos extraídos:');
    console.log('   Referência:', referencia);
    console.log('   Arquétipo:', arquetipo);
    console.log('   Léxico:', lexico);

    // Extrair insights
    const insightsStart = jsonString.indexOf('"insights_pre_minerados"', objStart);
    const insights = [];

    if (insightsStart !== -1 && insightsStart < searchEnd) {
        const insightPattern = /"tese":\s*"([^"]+)"/g;
        insightPattern.lastIndex = insightsStart;
        let insightMatch;

        while ((insightMatch = insightPattern.exec(jsonString)) !== null) {
            if (insightMatch.index > searchEnd) break;

            const tese = insightMatch[1];
            const familia = extractField('familia', insightMatch.index) || 'Teologia';
            const verso = extractField('verso_suporte', insightMatch.index) || '';
            const voz = extractField('voz_performance', insightMatch.index) || 'Profeta';

            insights.push({ tese, familia, verso_suporte: verso, voz_performance: voz });
        }
    }

    console.log('\n💡 Insights encontrados:', insights.length);
    insights.forEach((i, idx) => {
        console.log(`   ${idx + 1}. ${i.tese.substring(0, 50)}...`);
    });

    // Montar resultado final
    const resultado = {
        data: dataPreferida,
        referencia,
        arquetipo_maestro: arquetipo || 'Profeta',
        lexico_do_dia: lexico,
        insights_pre_minerados: insights
    };

    console.log('\n✅ Resultado final:');
    console.log(JSON.stringify(resultado, null, 2));
}

test();
