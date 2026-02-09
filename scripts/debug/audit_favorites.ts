
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function fetchFavorites() {
    console.log('Fetching last 10 favorites...');
    const { data, error } = await supabase
        .from('dna_categorizado')
        .select('texto_msg, categoria, id')
        .order('created_at', { ascending: false })
        .limit(10);

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log(`Found ${data.length} favorites.`);
    data.forEach((msg: any, i: number) => {
        console.log(`\n--- FAVORITE ${i + 1} [${msg.categoria}] ---`);
        console.log(msg.texto_msg.substring(0, 300) + '...');
    });
}

fetchFavorites();
