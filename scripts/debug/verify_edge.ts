
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Missing env vars");
    Deno.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

console.log("Testing execute function...");

const { data, error } = await supabase.functions.invoke('execute', {
    body: {
        modo_id: 'modo_estilo',
        data: new Date().toISOString().split('T')[0],
        filtros: {
            estilo: 'devocional',
            quantidade: 1,
            tom: 'Direto'
        }
    }
});

if (error) {
    console.error("Error invoking function:", error);
} else {
    console.log("Function response:", JSON.stringify(data, null, 2));
}
