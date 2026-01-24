
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://tayopwdelkmelgmrtnoa.supabase.co";
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRheW9wd2RlbGttZWxnbXJ0bm9hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Nzc5NzA5NCwiZXhwIjoyMDgzMzczMDk0fQ.gscZbZa5_yFZ2HD0XZlaGwaFxNHGxDECVr-IoTWMGVw";

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function verify() {
    console.log("--- VERIFYING STORAGE FETCH (Unified Logic) ---");
    const TODAY = "2026-01-09";
    console.log(`Target Date: ${TODAY}`);

    try {
        console.log("1. Downloading SECAO6.TXT...");
        const { data, error } = await supabase.storage
            .from('pvc')
            .download('secao6/SECAO6.TXT');

        if (error) {
            console.error("❌ Error downloading:", error);
            return;
        }

        const text = await data.text();
        const jsonMarker = '### JSON_BEGIN';
        const jsonStartIndex = text.indexOf(jsonMarker);

        if (jsonStartIndex === -1) {
            console.error('❌ JSON marker not found.');
            return;
        }

        const jsonEndMarker = '### JSON_END';
        const jsonEndIndex = text.indexOf(jsonEndMarker);

        // Extract JSON part
        let jsonString = text.substring(jsonStartIndex + jsonMarker.length, jsonEndIndex !== -1 ? jsonEndIndex : undefined).trim();

        // HOTFIXES
        const keysToFix = [
            'data', 'referencia', 'arquetipo_maestro', 'lexico_do_dia',
            'estrutura_dinamica', 'insights_pre_minerados',
            'tese', 'familia', 'verso_suporte', 'voz_performance'
        ];

        keysToFix.forEach(key => {
            const regex = new RegExp(`([^"])(${key}":)`, 'g');
            jsonString = jsonString.replace(regex, '$1"$2');
        });

        console.log("--- DEBUG: JSON TAIL ---");
        console.log(jsonString.substring(jsonString.length - 200));
        console.log("--- END TAIL ---");

        let passagens;
        try {
            passagens = JSON.parse(jsonString);
            console.log(`2. JSON Parsed. Total entries: ${passagens.length}`);
        } catch (e) {
            console.error("❌ JSON Parse Error:", e.message);
            const match = e.message.match(/position (\d+)/);
            if (match) {
                const pos = parseInt(match[1]);
                const start = Math.max(0, pos - 50);
                const end = Math.min(jsonString.length, pos + 50);
                console.log("Context:");
                console.log(jsonString.substring(start, end));
                console.log(" ".repeat(Math.max(0, pos - start)) + "^");
            }

            console.log("⚠️ JSON Parse failed. Attempting REGEX FALLBACK for target date...");

            // Regex Fallback
            // Find: { "data": "YYYY-MM-DD", ... }
            // We look for strict pattern of the data field
            const datePattern = `"data":\\s*"${TODAY}"`;
            const dateIndex = jsonString.indexOf(datePattern);

            if (dateIndex === -1) {
                console.error("❌ Date not found even with Regex.");
                return;
            }

            // Find the opening bracket '{' BEFORE the date
            const openBracket = jsonString.lastIndexOf('{', dateIndex);
            if (openBracket === -1) return;

            // Find the matching closing bracket '}'
            // Simple counter approach suitable for this file structure
            let balance = 0;
            let closeBracket = -1;

            for (let i = openBracket; i < jsonString.length; i++) {
                if (jsonString[i] === '{') balance++;
                else if (jsonString[i] === '}') {
                    balance--;
                    if (balance === 0) {
                        closeBracket = i;
                        break;
                    }
                }
            }

            if (closeBracket !== -1) {
                const objectStr = jsonString.substring(openBracket, closeBracket + 1);
                try {
                    const entry = JSON.parse(objectStr);
                    console.log("\n✅ SUCCESS (FALLBACK)! Found entry for today:");
                    console.log("------------------------------------------------");
                    console.log(`Ref: ${entry.referencia}`);
                    console.log(`Archetype: ${entry.arquetipo_maestro}`);
                    console.log(`Insights: ${entry.insights_pre_minerados.length}`);
                    console.log("------------------------------------------------");
                    return; // Success
                } catch (e2) {
                    console.error("❌ Fallback Parse Error:", e2.message);
                }
            }
            return;
        }

        const todayEntry = passagens.find(p => p.data === TODAY);

        if (todayEntry) {
            console.log("\n✅ SUCCESS! Found entry for today:");
            console.log("------------------------------------------------");
            console.log(`Ref: ${todayEntry.referencia}`);
        } else {
            console.error(`❌ Entry for ${TODAY} NOT FOUND in the file.`);
        }

    } catch (err) {
        console.error("💥 Exception:", err);
    }
}

verify();
