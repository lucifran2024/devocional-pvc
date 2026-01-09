
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const SUPABASE_URL = "https://tayopwdelkmelgmrtnoa.supabase.co";
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRheW9wd2RlbGttZWxnbXJ0bm9hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Nzc5NzA5NCwiZXhwIjoyMDgzMzczMDk0fQ.gscZbZa5_yFZ2HD0XZlaGwaFxNHGxDECVr-IoTWMGVw";

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function syncData() {
    console.log("🔄 Lendo arquivo SECAO6_LOCAL.json...");

    try {
        const rawData = fs.readFileSync('SECAO6_LOCAL.json', 'utf-8');
        const items = JSON.parse(rawData);

        console.log(`📦 Preparando para sincronizar ${items.length} itens...`);

        // Mapeamento de campos conforme pedido do usuário
        // JSON -> DB (payload_do_dia)
        // referencia -> capitulos (o usuário pediu esse map)
        // arquetipo_maestro -> arquetipo
        // lexico_do_dia -> lexico_do_dia
        // insights_pre_minerados -> insights_pre_minerados

        const rowsToUpsert = items.map(item => ({
            data: item.data,
            passagem_do_dia: item.referencia, // Mantemos passagem_do_dia para compatibilidade visual
            livro: item.referencia.split(' ')[0], // Extrai o primeiro nome como Livro (simples)
            capitulos: item.referencia,       // Campo capitulos pedido
            voice_pack_id: 1, // Default para evitar erro NOT NULL
            arquetipo: item.arquetipo_maestro,
            lexico_do_dia: item.lexico_do_dia,
            insights_pre_minerados: item.insights_pre_minerados,
        }));

        console.log("🚀 Enviando UPSERT para Supabase...");

        const { data, error } = await supabase
            .from('leitura_do_dia') // Tabela real base
            .upsert(rowsToUpsert, { onConflict: 'data' })
            .select();

        if (error) {
            console.error("❌ Erro no UPSERT:", error);
        } else {
            console.log(`✅ Sucesso! ${data.length} registros atualizados/inseridos.`);
            console.log("Exemplo do registro atualizado (08/01):");
            console.log(data.find(d => d.data === '2026-01-08'));
        }

    } catch (err) {
        console.error("💥 Erro:", err);
    }
}

syncData();
