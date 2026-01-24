// Verificar arquivos do Storage
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key) env[key.trim()] = valueParts.join('=').trim();
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function verificarStorage() {
    console.log('=== VERIFICANDO ARQUIVOS DO STORAGE ===\n');

    const arquivos = [
        'agent_start/AGENT_START.txt',
        'base/BASE_DE_CONHECIMENTO_UNIFICADA_v2.txt',
        'base/Conhecimento_Compilado_Essencial.v1.4.txt',
        'base/BANCO_DE_OURO_EXEMPLOS E BANCO_MICRO_SHOTS.txt',
        'modos/MODO_1.txt'
    ];

    for (const arq of arquivos) {
        const { data, error } = await supabase.storage.from('pvc').download(arq);
        if (error) {
            console.log(`❌ ${arq}`);
            console.log(`   Erro: ${error.message}`);
        } else {
            const text = await data.text();
            console.log(`✅ ${arq}`);
            console.log(`   Tamanho: ${text.length} caracteres`);
            console.log(`   Preview: ${text.substring(0, 100)}...`);
        }
        console.log('');
    }
}

verificarStorage().catch(console.error);
