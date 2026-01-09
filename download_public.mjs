
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const SUPABASE_URL = "https://tayopwdelkmelgmrtnoa.supabase.co";
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRheW9wd2RlbGttZWxnbXJ0bm9hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Nzc5NzA5NCwiZXhwIjoyMDgzMzczMDk0fQ.gscZbZa5_yFZ2HD0XZlaGwaFxNHGxDECVr-IoTWMGVw";

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function downloadAuthenticated() {
    console.log(`🔐 Baixando 'secao6' via cliente autenticado...`);

    const { data, error } = await supabase
        .storage
        .from('pvc')
        .download('secao6/SECAO6.TXT');

    if (error) {
        console.error("❌ Erro no download:", error);
        return;
    }

    const text = await data.text();
    console.log("✅ Download bem sucedido! Tamanho:", text.length);
    console.log("Início:", text.substring(0, 200));

    // Salvar
    fs.writeFileSync('SECAO6_LOCAL.json', text);
    console.log("💾 Salvo em SECAO6_LOCAL.json");
}

downloadAuthenticated();
