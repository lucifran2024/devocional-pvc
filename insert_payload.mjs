import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://tayopwdelkmelgmrtnoa.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRheW9wd2RlbGttZWxnbXJ0bm9hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Nzc5NzA5NCwiZXhwIjoyMDgzMzczMDk0fQ.gscZbZa5_yFZ2HD0XZlaGwaFxNHGxDECVr-IoTWMGVw";

const supabase = createClient(supabaseUrl, supabaseKey);

async function insertPayload() {
    const dataHoje = '2026-01-09';
    console.log(`Preparing to insert payload for ${dataHoje} into 'leitura_do_dia'...`);

    // 1. Get a valid voice_pack_id from a previous entry
    const { data: previous, error: fetchError } = await supabase
        .from('leitura_do_dia')
        .select('voice_pack_id')
        .limit(1)
        .order('data', { ascending: false });

    if (fetchError || !previous || previous.length === 0) {
        console.error("Error fetching reference voice_pack_id:", fetchError);
        return;
    }

    const voicePackId = previous[0].voice_pack_id;
    console.log(`Using voice_pack_id: ${voicePackId}`);

    // 2. Prepare payload matching leitura_do_dia columns
    const payload = {
        data: dataHoje,
        passagem_do_dia: 'Isaías 16-18',
        livro: 'Isaías',
        capitulos: '16-18',
        arquetipo: 'O Refúgio em Sião',
        voice_pack_id: voicePackId
        // lexico_do_dia and insights_pre_minerados are optional or can be null
    };

    const { data, error } = await supabase
        .from('leitura_do_dia')
        .insert([payload])
        .select();

    if (error) {
        console.error("Error inserting payload:", error);
    } else {
        console.log("Success! Inserted:", data);
    }
}

insertPayload();
