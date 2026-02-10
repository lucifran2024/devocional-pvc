
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Missing env vars");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

console.log("Testing execute function...");

async function test() {
    // Method 1: Supabase Client
    const { data, error } = await supabase.functions.invoke('execute', {
        body: {
            modo_id: 'modo_estilo',
            data: new Date().toISOString().split('T')[0],
            filtros: {
                estilo: 'devocional',
                quantidade: 1,
                tom: 'Direto'
            }
        }
    });

    if (error) {
        console.error("Supabase Invoke Error:", error);
        if (error && typeof error === 'object' && 'context' in error) {
            // @ts-ignore
            const response = error.context as Response;
            if (response && typeof response.text === 'function') {
                try {
                    const text = await response.text();
                    console.error("Error Body:", text);
                } catch (e) {
                    console.error("Could not read error body", e);
                }
            }
        }
    } else {
        console.log("Function response:", JSON.stringify(data, null, 2));
    }


    // Method 2: Raw Fetch (to be sure)
    const funcUrl = `${supabaseUrl}/functions/v1/execute`;
    console.log(`Fetching from: ${funcUrl}`);
    try {
        const resp = await fetch(funcUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${supabaseAnonKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                modo_id: 'modo_estilo',
                data: new Date().toISOString().split('T')[0],
                filtros: {
                    estilo: 'devocional',
                    quantidade: 1,
                    tom: 'Direto'
                }
            })
        });

        console.log(`Fetch Status: ${resp.status}`);

        if (!resp.ok) {
            const text = await resp.text();
            console.error(`Raw Fetch Error Body:`, text);
        } else {
            const json = await resp.json();
            console.log("Raw Fetch Success:", JSON.stringify(json, null, 2));
        }

    } catch (err) {
        console.error("Raw Fetch Exception:", err);
    }
}

test();
