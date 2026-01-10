import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envFile = fs.readFileSync('.env.local', 'utf8');
const envVars = {};
envFile.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) envVars[key.trim()] = value.trim();
});

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function debug() {
    const { data, error } = await supabase.storage
        .from('pvc')
        .download('secao6/SECAO6.TXT');

    if (error) {
        console.error('❌ ERRO:', error);
        return;
    }

    const text = await data.text();

    const jsonMarker = '### JSON_BEGIN';
    const jsonStartIndex = text.indexOf(jsonMarker);
    let jsonString = text.substring(jsonStartIndex + jsonMarker.length).trim();

    const jsonEndMarker = '### JSON_END';
    const jsonEndIndex = jsonString.indexOf(jsonEndMarker);
    if (jsonEndIndex !== -1) {
        jsonString = jsonString.substring(0, jsonEndIndex).trim();
    }

    // SEM CORREÇÃO - Ver o original

    // Ver a transição de passagem 1 (2025-12-31) para passagem 2 (2026-01-01)
    const p1Start = jsonString.indexOf('"data": "2025-12-31"');
    const p2Start = jsonString.indexOf('"data": "2026-01-01"');

    console.log('=== FIM DA PASSAGEM 1 E INÍCIO DA PASSAGEM 2 ===');
    console.log(jsonString.substring(p1Start + 500, p2Start + 100));

    console.log('\n\n=== CHARS EM TORNO DA TRANSIÇÃO ===');
    const transition = jsonString.substring(p2Start - 10, p2Start + 30);
    console.log('Texto:', JSON.stringify(transition));
}

debug();
