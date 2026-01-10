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

async function gerarSQLParaTodasDatas() {
    console.log('📦 Baixando SECAO6.TXT do Storage...\n');

    // 1. Baixar arquivo
    const { data: fileData, error: fileError } = await supabase.storage
        .from('pvc')
        .download('secao6/SECAO6.TXT');

    if (fileError) {
        console.error('❌ Erro:', fileError);
        return;
    }

    const text = await fileData.text();

    // 2. Encontrar todas as datas no arquivo
    const dataPattern = /"data":\s*"(\d{4}-\d{2}-\d{2})"/g;
    const datasNoArquivo = [];
    let match;
    while ((match = dataPattern.exec(text)) !== null) {
        datasNoArquivo.push(match[1]);
    }

    console.log('📅 Datas encontradas no arquivo:', datasNoArquivo.length);
    console.log('   ', datasNoArquivo.join(', '));

    // 3. Verificar quais já existem no banco
    const { data: existentes } = await supabase
        .from('leitura_do_dia')
        .select('data');

    const datasExistentes = new Set(existentes?.map(e => e.data) || []);
    console.log('\n📊 Datas já no banco:', datasExistentes.size);

    // 4. Filtrar datas faltantes
    const datasFaltantes = datasNoArquivo.filter(d => !datasExistentes.has(d));
    console.log('⚠️  Datas faltantes:', datasFaltantes.length);
    console.log('   ', datasFaltantes.join(', '));

    if (datasFaltantes.length === 0) {
        console.log('\n✅ Todas as datas já estão no banco!');
        return;
    }

    // 5. Para cada data faltante, extrair dados e gerar SQL
    const sqlStatements = [];

    for (const dataAlvo of datasFaltantes) {
        const dataIndex = text.indexOf(`"data": "${dataAlvo}"`);
        if (dataIndex === -1) continue;

        // Funções de extração
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

        // Encontrar limites
        const nextDataPattern = /"data":\s*"\d{4}-\d{2}-\d{2}"/g;
        nextDataPattern.lastIndex = dataIndex + 10;
        const nextMatch = nextDataPattern.exec(text);
        const searchEnd = nextMatch ? nextMatch.index : text.length;

        let objStart = dataIndex;
        for (let i = dataIndex; i >= 0; i--) {
            if (text[i] === '{') { objStart = i; break; }
        }

        const referencia = extractField('referencia', objStart);
        const arquetipo = extractField('arquetipo_maestro', objStart);
        const lexico = extractArray('lexico_do_dia', objStart);
        const livro = referencia?.split(' ')[0] || 'Bíblia';

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

        // Gerar SQL
        const lexicoSQL = `ARRAY[${lexico.map(l => `'${l.replace(/'/g, "''")}'`).join(', ')}]`;
        const insightsJSON = JSON.stringify(insights).replace(/'/g, "''");

        const sql = `INSERT INTO leitura_do_dia (data, passagem_do_dia, livro, capitulos, arquetipo, voice_pack_id, lexico_do_dia, insights_pre_minerados)
VALUES (
  '${dataAlvo}',
  '${referencia}',
  '${livro}',
  '${referencia}',
  '${arquetipo || 'Profeta'}',
  '1',
  ${lexicoSQL},
  '${insightsJSON}'::jsonb
)
ON CONFLICT (data) DO UPDATE SET
  passagem_do_dia = EXCLUDED.passagem_do_dia,
  livro = EXCLUDED.livro,
  arquetipo = EXCLUDED.arquetipo,
  lexico_do_dia = EXCLUDED.lexico_do_dia,
  insights_pre_minerados = EXCLUDED.insights_pre_minerados;`;

        sqlStatements.push(sql);
        console.log(`   ✅ ${dataAlvo} - ${referencia}`);
    }

    // 6. Salvar arquivo SQL
    const sqlFinal = sqlStatements.join('\n\n');
    fs.writeFileSync('inserir_todas_datas.sql', sqlFinal);

    console.log(`\n📝 SQL gerado e salvo em: inserir_todas_datas.sql`);
    console.log(`   Total de statements: ${sqlStatements.length}`);
    console.log(`\n⚠️  IMPORTANTE: Execute este arquivo no SQL Editor do Supabase!`);
}

gerarSQLParaTodasDatas();
