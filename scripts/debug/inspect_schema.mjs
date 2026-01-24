
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://tayopwdelkmelgmrtnoa.supabase.co";
// Usando a Service Role Key que já conhecemos de passos anteriores
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRheW9wd2RlbGttZWxnbXJ0bm9hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Nzc5NzA5NCwiZXhwIjoyMDgzMzczMDk0fQ.gscZbZa5_yFZ2HD0XZlaGwaFxNHGxDECVr-IoTWMGVw";

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function inspectSchema() {
    console.log("🔍 Inspecionando tabelas...");

    // Verificar tabela payload_do_dia
    const { data: payloadData, error: payloadError } = await supabase
        .from('payload_do_dia')
        .select('*')
        .limit(1);

    if (payloadError) {
        console.log("❌ Tabela 'payload_do_dia' erro:", payloadError.message);
    } else {
        console.log("✅ Tabela 'payload_do_dia' existe.");
        if (payloadData.length > 0) {
            console.log("   Colunas detectadas:", Object.keys(payloadData[0]).join(", "));
        } else {
            // Tentar inserir um dummy pra ver colunas ou assumir que existe
            console.log("   Tabela vazia, não consigo inferir colunas facilmente pelo select *.");
        }
    }

    // Verificar se existe tabela leitura_do_dia
    const { data: leituraData, error: leituraError } = await supabase
        .from('leitura_do_dia')
        .select('*')
        .limit(1);

    if (leituraError) {
        console.log("ℹ️ Tabela 'leitura_do_dia' parece não existir (ou erro):", leituraError.message);
    } else {
        console.log("✅ Tabela 'leitura_do_dia' existe.");
        if (leituraData.length > 0) {
            console.log("   Colunas detectadas:", Object.keys(leituraData[0]).join(", "));
        }
    }
}

inspectSchema();
