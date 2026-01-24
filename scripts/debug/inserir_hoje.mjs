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

async function inserirLeituraHoje() {
    console.log('📦 Baixando dados do Storage...\n');

    const hoje = '2026-01-10';

    // 1. Baixar SECAO6.TXT do Storage
    const { data: fileData, error: fileError } = await supabase.storage
        .from('pvc')
        .download('secao6/SECAO6.TXT');

    if (fileError) {
        console.error('❌ Erro ao baixar arquivo:', fileError);
        return;
    }

    const text = await fileData.text();

    // 2. Encontrar os dados de hoje
    const dataPattern = `"data": "${hoje}"`;
    const dataIndex = text.indexOf(dataPattern);

    if (dataIndex === -1) {
        console.error('❌ Data não encontrada no arquivo:', hoje);
        return;
    }

    // Extrair campos
    const extractField = (fieldName, startPos) => {
        const pattern = new RegExp(`"${fieldName}":\\s*"([^"]+)"`, 'g');
        pattern.lastIndex = startPos;
        const match = pattern.exec(text);
        return match ? match[1] : null;
    };

    const extractArray = (fieldName, startPos) => {
        const pattern = new RegExp(`"${fieldName}":\\s*\\[([^\\]]+)\\]`, 'g');
        pattern.lastIndex = startPos;
        const match = pattern.exec(text);
        if (!match) return [];
        const items = match[1].match(/"([^"]+)"/g);
        return items ? items.map(s => s.replace(/"/g, '')) : [];
    };

    // Encontrar onde a próxima passagem começa
    const nextDataPattern = /"data":\s*"\d{4}-\d{2}-\d{2}"/g;
    nextDataPattern.lastIndex = dataIndex + 10;
    const nextMatch = nextDataPattern.exec(text);
    const searchEnd = nextMatch ? nextMatch.index : text.length;

    // Encontrar o início do objeto
    let objStart = dataIndex;
    for (let i = dataIndex; i >= 0; i--) {
        if (text[i] === '{') {
            objStart = i;
            break;
        }
    }

    const referencia = extractField('referencia', objStart);
    const arquetipo = extractField('arquetipo_maestro', objStart);
    const lexico = extractArray('lexico_do_dia', objStart);

    // Extrair insights
    const insightsStart = text.indexOf('"insights_pre_minerados"', objStart);
    const insights = [];

    if (insightsStart !== -1 && insightsStart < searchEnd) {
        const insightPattern = /"tese":\s*"([^"]+)"/g;
        insightPattern.lastIndex = insightsStart;
        let insightMatch;

        while ((insightMatch = insightPattern.exec(text)) !== null) {
            if (insightMatch.index > searchEnd) break;

            const tese = insightMatch[1];
            const familia = extractField('familia', insightMatch.index) || 'Teologia';
            const verso = extractField('verso_suporte', insightMatch.index) || '';
            const voz = extractField('voz_performance', insightMatch.index) || 'Profeta';

            insights.push({ tese, familia, verso_suporte: verso, voz_performance: voz });
        }
    }

    // Extrair livro da referência (ex: "Isaías 19-21" -> "Isaías")
    const livro = referencia?.split(' ')[0] || 'Isaías';

    console.log('📖 Dados extraídos:');
    console.log('   Data:', hoje);
    console.log('   Referência:', referencia);
    console.log('   Livro:', livro);
    console.log('   Arquétipo:', arquetipo);
    console.log('   Léxico:', lexico.length, 'palavras');
    console.log('   Insights:', insights.length);

    // 3. Inserir na tabela leitura_do_dia (com colunas corretas)
    console.log('\n📝 Inserindo na tabela leitura_do_dia...');

    const leituraData = {
        data: hoje,
        passagem_do_dia: referencia,
        livro: livro,
        capitulos: referencia,
        arquetipo: arquetipo || 'Profeta',
        voice_pack_id: '1',
        lexico_do_dia: lexico,
        insights_pre_minerados: insights
    };

    const { error: insertLeituraError } = await supabase
        .from('leitura_do_dia')
        .upsert(leituraData, { onConflict: 'data' });

    if (insertLeituraError) {
        console.error('❌ Erro ao inserir leitura_do_dia:', insertLeituraError.message);
        return;
    } else {
        console.log('   ✅ leitura_do_dia inserido com sucesso!');
    }

    // 4. Verificar se payload_do_dia foi criado (é uma VIEW, deve atualizar automaticamente)
    console.log('\n🔍 Verificando payload_do_dia...');

    // Aguardar um pouco para a view atualizar
    await new Promise(resolve => setTimeout(resolve, 1000));

    const { data: payloadCheck, error: payloadError } = await supabase
        .from('payload_do_dia')
        .select('*')
        .eq('data', hoje)
        .maybeSingle();

    if (payloadError) {
        console.log('   ⚠️ Erro ao verificar payload:', payloadError.message);
    } else if (payloadCheck) {
        console.log('   ✅ payload_do_dia disponível:', payloadCheck.passagem_do_dia);
    } else {
        console.log('   ⚠️ payload_do_dia ainda não disponível (view pode precisar de refresh)');
    }

    console.log('\n✅ Processo concluído! Tente usar o Gerador novamente.');
}

inserirLeituraHoje();
