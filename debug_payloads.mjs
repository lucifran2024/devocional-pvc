import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing env vars");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPayloads() {
    const today = new Date().toISOString().split('T')[0];
    console.log(`Checking payloads for today (${today}) and recent days...`);

    const { data, error } = await supabase
        .from('payload_do_dia')
        .select('data, passagem_do_dia')
        .order('data', { ascending: false })
        .limit(5);

    if (error) {
        console.error("Error:", error);
    } else {
        console.table(data);
    }
}

checkPayloads();
