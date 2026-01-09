
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://tayopwdelkmelgmrtnoa.supabase.co";
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRheW9wd2RlbGttZWxnbXJ0bm9hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Nzc5NzA5NCwiZXhwIjoyMDgzMzczMDk0fQ.gscZbZa5_yFZ2HD0XZlaGwaFxNHGxDECVr-IoTWMGVw";

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function inspect() {
    console.log("--- INSPECTING SUPABASE ---");

    // 1. List Buckets
    console.log("\n1. Listing Storage Buckets:");
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
    if (bucketError) console.error("Error listing buckets:", bucketError);
    else console.log(buckets);

    // 2. Inspect payload_do_dia structure
    console.log("\n2. Inspecting payload_do_dia (one record):");
    const { data: payload, error: payloadError } = await supabase
        .from('payload_do_dia')
        .select('*')
        .limit(1);

    if (payloadError) console.error("Error fetching payload:", payloadError);
    else console.log(JSON.stringify(payload, null, 2));

    // 3. Try to list files in a likely bucket if found (we'll guess 'secao6' or 'plans' or check root)
    if (buckets && buckets.length > 0) {
        for (const bucket of buckets) {
            console.log(`\n3. Listing files in bucket '${bucket.name}':`);
            const { data: files, error: filesError } = await supabase.storage.from(bucket.name).list();
            if (filesError) console.error(`Error listing files in ${bucket.name}:`, filesError);
            else console.log(files);
        }
    }
}

inspect();
