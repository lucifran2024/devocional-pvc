import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://tayopwdelkmelgmrtnoa.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRheW9wd2RlbGttZWxnbXJ0bm9hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3OTcwOTQsImV4cCI6MjA4MzM3MzA5NH0.TGvk6rrIkFnmxKrKg63t9L6HMN3Zc9bRYWnvQ0yfXoA";

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing env vars");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function listTables() {
    console.log("Listing tables in public schema...");
    const { data, error } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public');

    if (error) {
        // Try RPC or just listing from a known likely table if this fails due to permissions
        console.error("Error listing tables:", error);
    } else {
        console.table(data);
    }
}

listTables();

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
