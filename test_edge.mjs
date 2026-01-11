import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing env vars");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testExecute() {
    // Get today's date
    const today = new Date().toISOString().split('T')[0];
    console.log("Testing with date:", today);

    // 1. First check if payload exists for today
    console.log("\n1. Checking payload_do_dia for", today);
    const { data: payload, error: payloadErr } = await supabase
        .from('payload_do_dia')
        .select('*')
        .eq('data', today)
        .maybeSingle();

    if (payloadErr) {
        console.error("Error:", payloadErr);
    } else if (!payload) {
        console.log("❌ No payload found for today!");
        console.log("This is likely why the Edge Function returns 500.");

        // Check what dates ARE available
        const { data: available } = await supabase
            .from('payload_do_dia')
            .select('data')
            .order('data', { ascending: false })
            .limit(5);

        console.log("\nAvailable dates:", available?.map(d => d.data));
    } else {
        console.log("✅ Payload found:", payload);
    }

    // 2. Try to invoke the function
    console.log("\n2. Invoking Edge Function...");
    try {
        const { data, error } = await supabase.functions.invoke('execute', {
            body: {
                option_id: '1',
                data: today
            }
        });

        if (error) {
            console.error("Function Error:", error);
        } else {
            console.log("Function Success:", data?.resultado?.substring(0, 200) + "...");
        }
    } catch (e) {
        console.error("Exception:", e);
    }
}

testExecute();
