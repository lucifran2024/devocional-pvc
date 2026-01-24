
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Faltam variáveis de ambiente.");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testHistory() {
    console.log("Testando busca de histórico...");
    const { data, error } = await supabase
        .from('historico_geracoes')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

    if (error) {
        console.error("Erro:", error);
    } else {
        console.log(`Sucesso! Encontrados ${data.length} registros.`);
        console.log(data);
    }
}

testHistory();
