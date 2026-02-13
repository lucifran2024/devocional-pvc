
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    Deno.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const { data, error } = await supabase
    .from('devocional_externo_posts')
    .select('content, created_at, source, image_url')
    .order('created_at', { ascending: false })
    .limit(3);

if (error) {
    console.error("Error fetching posts:", error);
} else {
    console.log("Recent posts:");
    data.forEach((post, index) => {
        console.log(`\n--- Post ${index + 1} ---`);
        console.log(`Source: ${post.source}`);
        console.log(`Created At: ${post.created_at}`);
        console.log(`Image URL: ${post.image_url}`);
        console.log(`Content Preview (first 200 chars):`);
        console.log(post.content.substring(0, 200));
        console.log(`-------------------\n`);
    });
}
