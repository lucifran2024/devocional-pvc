
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing vars");
    Deno.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log("Checking table 'palavra_manha_cache'...");

// 1. Try to select
const { data: rows, error: selectError } = await supabase
    .from('palavra_manha_cache')
    .select('*')
    .limit(5);

if (selectError) {
    console.error("SELECT Error:", selectError);
} else {
    console.log("Rows found:", rows?.length);
    console.log("Sample:", rows?.[0]);
}

// 2. Try to insert dummy
const testData = {
    data: '2099-01-01',
    dia_semana: 'Teste',
    categoria: 'TESTE',
    formato: 'Teste',
    mensagem: 'Mensagem de teste de debug',
    amei_count: 0
};

console.log("Attempting INSERT...");
const { data: inserted, error: insertError } = await supabase
    .from('palavra_manha_cache')
    .insert(testData)
    .select()
    .single();

if (insertError) {
    console.error("INSERT Error:", insertError);
} else {
    console.log("INSERT Success:", inserted);
    // Cleanup
    await supabase.from('palavra_manha_cache').delete().eq('id', inserted.id);
}
