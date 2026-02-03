import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://tayopwdelkmelgmrtnoa.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRheW9wd2RlbGttZWxnbXJ0bm9hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Nzc5NzA5NCwiZXhwIjoyMDgzMzczMDk0fQ.gscZbZa5_yFZ2HD0XZlaGwaFxNHGxDECVr-IoTWMGVw";
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTable() {
    console.log("Verificando tabela leitura_do_dia...\n");

    // Conta total de registros
    const { count } = await supabase
        .from('leitura_do_dia')
        .select('*', { count: 'exact', head: true });

    console.log(`Total de registros: ${count}\n`);

    // Busca primeiro e último registro por data
    const { data: first } = await supabase
        .from('leitura_do_dia')
        .select('data, passagem_do_dia')
        .order('data', { ascending: true })
        .limit(1);

    const { data: last } = await supabase
        .from('leitura_do_dia')
        .select('data, passagem_do_dia')
        .order('data', { ascending: false })
        .limit(1);

    console.log("Primeira data:", first?.[0]);
    console.log("Última data:", last?.[0]);

    // Busca hoje e amanhã
    const hoje = "2026-02-01";
    const { data: hojeData } = await supabase
        .from('leitura_do_dia')
        .select('data, passagem_do_dia')
        .eq('data', hoje);

    console.log(`\nHoje (${hoje}):`, hojeData?.[0] || "SEM DADOS!");

    // Lista as últimas 10 datas
    console.log("\nÚltimas 10 datas cadastradas:");
    const { data: ultimas } = await supabase
        .from('leitura_do_dia')
        .select('data, passagem_do_dia')
        .order('data', { ascending: false })
        .limit(10);

    console.table(ultimas);
}

checkTable();
