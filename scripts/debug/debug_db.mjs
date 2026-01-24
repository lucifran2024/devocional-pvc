
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://tayopwdelkmelgmrtnoa.supabase.co";
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRheW9wd2RlbGttZWxnbXJ0bm9hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Nzc5NzA5NCwiZXhwIjoyMDgzMzczMDk0fQ.gscZbZa5_yFZ2HD0XZlaGwaFxNHGxDECVr-IoTWMGVw";

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function listarModos() {
    console.log("Consultando tabela 'modos'...");
    const { data, error } = await supabase.from("modos").select("*");

    if (error) {
        console.error("Erro ao listar modos:", error);
    } else {
        console.log(`Total de modos encontrados: ${data.length}`);
        console.log(JSON.stringify(data, null, 2));
    }
}

listarModos();
