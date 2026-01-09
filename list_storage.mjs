import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://tayopwdelkmelgmrtnoa.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRheW9wd2RlbGttZWxnbXJ0bm9hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Nzc5NzA5NCwiZXhwIjoyMDgzMzczMDk0fQ.gscZbZa5_yFZ2HD0XZlaGwaFxNHGxDECVr-IoTWMGVw";

const supabase = createClient(supabaseUrl, supabaseKey);

async function listBucketFiles() {
    console.log("Listing files in 'pvc' bucket...");

    const { data, error } = await supabase
        .storage
        .from('pvc')
        .list('base'); // list base folder

    if (error) {
        console.error("Error listing files:", error);
    } else {
        console.log("Files found:");
        console.table(data);
    }
}

listBucketFiles();
