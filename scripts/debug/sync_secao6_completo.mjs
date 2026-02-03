import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const SUPABASE_URL = "https://tayopwdelkmelgmrtnoa.supabase.co";
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRheW9wd2RlbGttZWxnbXJ0bm9hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Nzc5NzA5NCwiZXhwIjoyMDgzMzczMDk0fQ.gscZbZa5_yFZ2HD0XZlaGwaFxNHGxDECVr-IoTWMGVw";

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function syncSecao6() {
    console.log("🔄 Lendo arquivo SECAO6_COMPLETO.txt...\n");

    try {
        const rawData = fs.readFileSync('SECAO6_COMPLETO.txt', 'utf-8');

        // Extrair o JSON entre ### JSON_BEGIN e ### JSON_END
        const jsonMatch = rawData.match(/### JSON_BEGIN\s*\n([\s\S]*?)\n\s*### JSON_END/);

        if (!jsonMatch) {
            console.error("❌ Não encontrei marcadores JSON_BEGIN/JSON_END no arquivo!");
            return;
        }

        let jsonStr = jsonMatch[1].trim();

        // Corrigir problemas comuns de encoding
        jsonStr = jsonStr.replace(/Ã§/g, 'ç');
        jsonStr = jsonStr.replace(/Ãµ/g, 'õ');
        jsonStr = jsonStr.replace(/Ã£/g, 'ã');
        jsonStr = jsonStr.replace(/Ã©/g, 'é');
        jsonStr = jsonStr.replace(/Ãª/g, 'ê');
        jsonStr = jsonStr.replace(/Ã¡/g, 'á');
        jsonStr = jsonStr.replace(/Ã­/g, 'í');
        jsonStr = jsonStr.replace(/Ãº/g, 'ú');
        jsonStr = jsonStr.replace(/Ã³/g, 'ó');
        jsonStr = jsonStr.replace(/Ã‚/g, 'Â');
        jsonStr = jsonStr.replace(/Â/g, '');

        const items = JSON.parse(jsonStr);

        console.log(`📦 Encontrados ${items.length} registros para sincronizar.`);
        console.log(`📅 Primeira data: ${items[0]?.data} - ${items[0]?.referencia}`);
        console.log(`📅 Última data: ${items[items.length - 1]?.data} - ${items[items.length - 1]?.referencia}\n`);

        // Mapeamento de campos para a tabela
        const rowsToUpsert = items.map(item => ({
            data: item.data,
            passagem_do_dia: item.referencia,
            livro: item.referencia.split(' ')[0],
            capitulos: item.referencia,
            voice_pack_id: 1,
            arquetipo: item.arquetipo_maestro,
            lexico_do_dia: item.lexico_do_dia,
            insights_pre_minerados: item.insights_pre_minerados,
        }));

        console.log("🚀 Enviando UPSERT para Supabase em lotes de 50...");

        // Processar em lotes de 50 para evitar timeout
        const batchSize = 50;
        let totalInserted = 0;

        for (let i = 0; i < rowsToUpsert.length; i += batchSize) {
            const batch = rowsToUpsert.slice(i, i + batchSize);

            const { data, error } = await supabase
                .from('leitura_do_dia')
                .upsert(batch, { onConflict: 'data' })
                .select('data');

            if (error) {
                console.error(`❌ Erro no lote ${Math.floor(i / batchSize) + 1}:`, error);
            } else {
                totalInserted += data.length;
                console.log(`✅ Lote ${Math.floor(i / batchSize) + 1}: ${data.length} registros`);
            }
        }

        console.log(`\n🎉 CONCLUÍDO! ${totalInserted} registros inseridos/atualizados.`);

        // Verificar uma data específica
        const { data: hoje } = await supabase
            .from('leitura_do_dia')
            .select('data, passagem_do_dia')
            .eq('data', '2026-02-01');

        console.log("\n📅 Verificando hoje (2026-02-01):", hoje?.[0] || "NÃO ENCONTRADO");

    } catch (err) {
        console.error("💥 Erro:", err.message);
        if (err.message.includes('JSON')) {
            console.log("\n🔧 Tentando identificar problema no JSON...");
        }
    }
}

syncSecao6();
