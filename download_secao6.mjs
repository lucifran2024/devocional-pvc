
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const SUPABASE_URL = "https://tayopwdelkmelgmrtnoa.supabase.co";
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRheW9wd2RlbGttZWxnbXJ0bm9hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Nzc5NzA5NCwiZXhwIjoyMDgzMzczMDk0fQ.gscZbZa5_yFZ2HD0XZlaGwaFxNHGxDECVr-IoTWMGVw";

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function downloadSecao6() {
    console.log("⬇️ Baixando SECAO6.TXT do bucket 'pvc'...");

    const { data, error } = await supabase
        .storage
        .from('pvc')
        .download('secao6.txt');

    if (error) {
        console.error("❌ Erro ao baixar:", error);
        return;
    }

    const text = await data.text();
    console.log("✅ Arquivo baixado. Tamanho:", text.length);

    // Tentar parsear JSON para ver estrutura
    try {
        // O arquivo pode ter texto antes do JSON ou ser um array direto. Vamos tentar achar o JSON.
        // Assumindo que é um JSON puro ou tem um bloco JSON.
        const firstBrace = text.indexOf('['); // Deve ser um array de objetos
        if (firstBrace === -1) {
            console.log("⚠️ Não parece ser um array JSON. Primeiros 500 chars:");
            console.log(text.substring(0, 500));
            return;
        }

        const jsonStr = text.substring(firstBrace);
        const jsonData = JSON.parse(jsonStr);

        console.log("✅ JSON Parseado com sucesso!");
        console.log("Exemplo do primeiro item:", jsonData[0]);

        fs.writeFileSync('SECAO6_LOCAL.json', JSON.stringify(jsonData, null, 2));
        console.log("💾 Salvo localmente como SECAO6_LOCAL.json");

    } catch (e) {
        console.error("❌ Erro ao parsear JSON:", e.message);
        console.log("Primeiros 500 chars:", text.substring(0, 500));
    }
}

downloadSecao6();
