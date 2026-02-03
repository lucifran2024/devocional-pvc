import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://tayopwdelkmelgmrtnoa.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRheW9wd2RlbGttZWxnbXJ0bm9hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Nzc5NzA5NCwiZXhwIjoyMDgzMzczMDk0fQ.gscZbZa5_yFZ2HD0XZlaGwaFxNHGxDECVr-IoTWMGVw";

const supabase = createClient(supabaseUrl, supabaseKey);

async function listBucket() {
    console.log("Listing root of 'pvc' bucket...");

    const { data, error } = await supabase
        .storage
        .from('pvc')
        .list('', { limit: 100 });

    if (error) {
        console.error("Error:", error);
    } else {
        console.log("Folders/Files in bucket root:");
        console.table(data);

        // List base folder too
        console.log("\nListing 'base' folder...");
        const { data: baseData } = await supabase.storage.from('pvc').list('base', { limit: 50 });
        console.table(baseData);
    }
}

listBucket();
