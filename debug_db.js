
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Try to load .env manually
let envVars = {};
try {
    const envPath = path.resolve(__dirname, '.env.local');
    if (fs.existsSync(envPath)) {
        console.log("Found .env.local");
        const content = fs.readFileSync(envPath, 'utf8');
        content.split('\n').forEach(line => {
            const [key, val] = line.split('=');
            if (key && val) envVars[key.trim()] = val.trim();
        });
    } else {
        const envPath2 = path.resolve(__dirname, '.env');
        if (fs.existsSync(envPath2)) {
            console.log("Found .env");
            const content = fs.readFileSync(envPath2, 'utf8');
            content.split('\n').forEach(line => {
                const [key, val] = line.split('=');
                if (key && val) envVars[key.trim()] = val.trim();
            });
        }
    }
} catch (e) {
    console.log("Could not load .env files", e);
}

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL || envVars.SUPABASE_URL || 'https://tayopwdelkmelgmrtnoa.supabase.co';
const key = envVars.SUPABASE_SERVICE_ROLE_KEY || envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!key) {
    console.error("❌ Could not find SUPABASE_SERVICE_ROLE_KEY or ANON KEY in .env files.");
    process.exit(1);
}

console.log(`Connecting to ${supabaseUrl}...`);
const supabase = createClient(supabaseUrl, key);

async function check() {
    const { data, error } = await supabase
        .from('devocional_externo_posts')
        .select('content, created_at, source, image_url')
        .order('created_at', { ascending: false })
        .limit(3);

    if (error) {
        console.error("Error:", error);
    } else {
        console.log("Recent DB Posts:");
        data.forEach(p => {
            console.log(`[${p.created_at}] Source: ${p.source}`);
            console.log(`Content Preview: ${p.content.substring(0, 300)}`);
            console.log("---");
        });
    }
}

check();
