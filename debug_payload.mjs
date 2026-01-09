
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://tayopwdelkmelgmrtnoa.supabase.co";
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRheW9wd2RlbGttZWxnbXJ0bm9hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Nzc5NzA5NCwiZXhwIjoyMDgzMzczMDk0fQ.gscZbZa5_yFZ2HD0XZlaGwaFxNHGxDECVr-IoTWMGVw";

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function checkPayload() {
    const today = new Date().toISOString().split('T')[0];
    console.log(`Verificando payload_do_dia para: ${today}...`);

    const { data, error } = await supabase
        .from("payload_do_dia")
        .select("*")
        .eq("data", today);

    if (error) {
        console.error("Erro ao ler payload_do_dia:", error);
    } else {
        console.log(`Registros encontrados: ${data.length}`);
        if (data.length === 0) {
            console.warn("⚠️ NENHUM PAYLOAD ENCONTRADO PARA HOJE!");
        } else {
            console.log(JSON.stringify(data[0], null, 2));
        }
    }
}

checkPayload();
