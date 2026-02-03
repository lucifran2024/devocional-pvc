import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://tayopwdelkmelgmrtnoa.supabase.co";
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRheW9wd2RlbGttZWxnbXJ0bm9hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Nzc5NzA5NCwiZXhwIjoyMDgzMzczMDk0fQ.gscZbZa5_yFZ2HD0XZlaGwaFxNHGxDECVr-IoTWMGVw";

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function verificar() {
    console.log("🔍 Verificando tabela leitura_do_dia...\n");

    // Total de registros
    const { count, error: countErr } = await supabase
        .from('leitura_do_dia')
        .select('*', { count: 'exact', head: true });

    if (countErr) {
        console.error("❌ Erro ao contar:", countErr);
        return;
    }

    console.log(`📊 Total de registros na tabela: ${count}\n`);

    // Primeiros 5
    const { data: primeiros } = await supabase
        .from('leitura_do_dia')
        .select('data, passagem_do_dia')
        .order('data', { ascending: true })
        .limit(5);

    console.log("📅 Primeiras 5 datas:");
    primeiros?.forEach(r => console.log(`   ${r.data} | ${r.passagem_do_dia}`));

    // Últimos 5
    const { data: ultimos } = await supabase
        .from('leitura_do_dia')
        .select('data, passagem_do_dia')
        .order('data', { ascending: false })
        .limit(5);

    console.log("\n📅 Últimas 5 datas:");
    ultimos?.forEach(r => console.log(`   ${r.data} | ${r.passagem_do_dia}`));

    // Hoje e próximos dias
    const { data: fevereiro } = await supabase
        .from('leitura_do_dia')
        .select('data, passagem_do_dia')
        .gte('data', '2026-02-01')
        .lte('data', '2026-02-10')
        .order('data', { ascending: true });

    console.log("\n📅 Fevereiro (01-10):");
    if (fevereiro?.length > 0) {
        fevereiro.forEach(r => console.log(`   ${r.data} | ${r.passagem_do_dia}`));
    } else {
        console.log("   ❌ NENHUM REGISTRO PARA FEVEREIRO!");
    }
}

verificar();
