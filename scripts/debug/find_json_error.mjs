import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Lê as variáveis de ambiente do .env.local
const envFile = fs.readFileSync('.env.local', 'utf8');
const envVars = {};
envFile.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) envVars[key.trim()] = value.trim();
});

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log('📦 Baixando SECAO6.TXT do Storage...\n');

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

    const lines = jsonString.split('\n');
    console.log('Total de linhas:', lines.length);

    // Mostrar linhas em torno do erro (1400-1421)
    console.log('\n📄 Linhas 1400-1421 (onde o erro ocorre):');
    for (let i = 1399; i < lines.length; i++) {
        console.log(`${i + 1}: ${lines[i]}`);
    }

    // Procurar onde falta aspas em "tese"
    const problematicLines = [];
    lines.forEach((line, i) => {
        // Procurar linhas onde "tese" não tem aspas antes
        if (line.match(/[^"](tese":)/) || line.match(/^\s*tese":/)) {
            problematicLines.push({ line: i + 1, content: line });
        }
    });

    if (problematicLines.length > 0) {
        console.log('\n⚠️  Linhas com "tese" sem aspas:');
        problematicLines.forEach(p => console.log(`Linha ${p.line}: ${p.content}`));
    }
}

check();
