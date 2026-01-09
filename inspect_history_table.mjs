
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Carregar variáveis de ambiente locais do .env.local para teste local
// (Simplificado: apenas lendo se existirem hardcoded ou process.env)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://sua-url.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sua-key';

// Se não tiver variáveis, tentar ler do .env.local (basic parsing)
try {
    const envFile = fs.readFileSync('.env.local', 'utf8');
    const lines = envFile.split('\n');
    lines.forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) {
            process.env[key.trim()] = value.trim();
        }
    });
} catch (e) {
    console.log('⚠️ .env.local não encontrado ou erro ao ler.');
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
    console.error('❌ Erro: Variáveis de ambiente não encontradas.');
    process.exit(1);
}

const supabase = createClient(url, key);

async function inspect() {
    console.log('🔍 Inspecionando tabela historico_geracoes...');

    // Tenta fazer um select simples com limit 0 para ver se a tabela existe e erro
    const { data, error } = await supabase
        .from('historico_geracoes')
        .select('*')
        .limit(1);

    if (error) {
        console.error('❌ Erro ao acessar historico_geracoes:', error);
    } else {
        console.log('✅ Tabela historico_geracoes acessível.');
        if (data && data.length > 0) {
            console.log('📋 Colunas detectadas (amostra de 1 registro):', Object.keys(data[0]));
        } else {
            console.log('⚠️ Tabela vazia, não foi possível listar colunas automaticamente pelo select.');
            console.log('ℹ️ Para ver colunas, tente inserir um registro dummy ou verificar no Dashboard.');
        }
    }
}

inspect();
