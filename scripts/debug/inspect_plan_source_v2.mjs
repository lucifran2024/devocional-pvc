
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://tayopwdelkmelgmrtnoa.supabase.co";
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRheW9wd2RlbGttZWxnbXJ0bm9hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Nzc5NzA5NCwiZXhwIjoyMDgzMzczMDk0fQ.gscZbZa5_yFZ2HD0XZlaGwaFxNHGxDECVr-IoTWMGVw";

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function inspect() {
    console.log("--- INSPECTING PVC/SECAO6 ---");

    // 1. List files in pvc/secao6
    console.log("\n1. Listing files in pvc/secao6:");
    const { data: files, error: filesError } = await supabase.storage.from('pvc').list('secao6');

    if (filesError) {
        console.error("Error listing files:", filesError);
        return;
    }

    console.log(files);

    if (files && files.length > 0) {
        // 2. Try to download the first file to check structure
        const firstFile = files[0];
        console.log(`\n2. Downloading content of '${firstFile.name}'...`);

        const { data, error } = await supabase.storage
            .from('pvc')
            .download(`secao6/${firstFile.name}`);

        if (error) {
            console.error("Error downloading file:", error);
        } else {
            const text = await data.text();
            console.log("\n--- FILE CONTENT START ---");
            console.log(text.substring(0, 500) + "..."); // Show first 500 chars
            console.log("--- FILE CONTENT END ---");

            try {
                const json = JSON.parse(text);
                console.log("\nIsValidJSON: YES");
                console.log("Keys:", Object.keys(json));
            } catch (e) {
                console.log("\nIsValidJSON: NO");
            }
        }
    } else {
        console.log("No files found in pvc/secao6");
    }
}

inspect();
