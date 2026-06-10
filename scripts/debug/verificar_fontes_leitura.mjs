import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://tayopwdelkmelgmrtnoa.supabase.co";
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRheW9wd2RlbGttZWxnbXJ0bm9hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Nzc5NzA5NCwiZXhwIjoyMDgzMzczMDk0fQ.gscZbZa5_yFZ2HD0XZlaGwaFxNHGxDECVr-IoTWMGVw";

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function verificar() {
    // 1. SECAO6.TXT no Storage
    console.log("📦 [1] Storage SECAO6.TXT:");
    const { data: file, error: stErr } = await supabase.storage.from('pvc').download('secao6/SECAO6.TXT');
    if (stErr) {
        console.log("   ❌ Erro:", stErr.message);
    } else {
        const text = await file.text();
        const linhas = text.split(/\r?\n/).filter(l => /^\d{4}-\d{2}-\d{2}\s*\|/.test(l));
        console.log(`   ${linhas.length} linhas com data`);
        if (linhas.length > 0) {
            const datas = linhas.map(l => l.split('|')[0].trim()).sort();
            console.log(`   Primeira: ${datas[0]} | Última: ${datas[datas.length - 1]}`);
            const hoje = linhas.find(l => l.startsWith('2026-06-10'));
            console.log(`   Hoje (2026-06-10): ${hoje || '❌ NÃO EXISTE'}`);
        }
    }

    // 2. payload_do_dia
    console.log("\n🗄️ [2] Tabela payload_do_dia:");
    const { data: payloads, error: pErr } = await supabase
        .from('payload_do_dia')
        .select('data, passagem_do_dia')
        .order('data', { ascending: false })
        .limit(5);
    if (pErr) console.log("   ❌ Erro:", pErr.message);
    else payloads?.forEach(r => console.log(`   ${r.data} | ${r.passagem_do_dia}`));

    // 3. Sequência final da leitura_do_dia (para saber onde o plano parou)
    console.log("\n📖 [3] Últimas 15 leituras (para continuar a sequência):");
    const { data: ultimas } = await supabase
        .from('leitura_do_dia')
        .select('data, passagem_do_dia')
        .order('data', { ascending: false })
        .limit(15);
    ultimas?.reverse().forEach(r => console.log(`   ${r.data} | ${r.passagem_do_dia}`));

    // 4. Colunas da tabela
    console.log("\n🔬 [4] Estrutura de uma linha:");
    const { data: amostra } = await supabase
        .from('leitura_do_dia')
        .select('*')
        .order('data', { ascending: false })
        .limit(1)
        .maybeSingle();
    if (amostra) console.log("   Colunas:", Object.keys(amostra).join(', '));
}

verificar();
