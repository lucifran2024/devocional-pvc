
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://tayopwdelkmelgmrtnoa.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRheW9wd2RlbGttZWxnbXJ0bm9hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Nzc5NzA5NCwiZXhwIjoyMDgzMzczMDk0fQ.gscZbZa5_yFZ2HD0XZlaGwaFxNHGxDECVr-IoTWMGVw';

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
    data.forEach((msg, i) => {
        console.log(`\n--- FAVORITE ${i + 1} [${msg.categoria}] ---`);
        console.log(msg.texto_msg.substring(0, 300) + '...');
    });
}

fetchFavorites();
