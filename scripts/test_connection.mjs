
import { createClient } from '@supabase/supabase-js';

const URL = 'https://tayopwdelkmelgmrtnoa.supabase.co';
// Usando a chave que o usuário forneceu
const KEY = process.env.SUPABASE_SERVICE_KEY || 'sb_secret_wuhtFrma935c00_pq8h1xQ_dkNTQPeX';

const supabase = createClient(URL, KEY);

async function test() {
    console.log('🔍 Testando conexão com Supabase...');
    console.log('URL:', URL);
    console.log('Key (início):', KEY.substring(0, 10) + '...');

    // Teste DB
    console.log('\n1. Testando Banco de Dados...');
    const { count, error } = await supabase
        .from('historico_geracoes')
        .select('*', { count: 'exact', head: true });

    if (error) {
        console.error('❌ Erro DB:', error.message);
    } else {
        console.log('✅ Sucesso DB! Total registros:', count);
    }

    // Teste Storage
    console.log('\n2. Testando Storage (Listar Buckets)...');
    const { data: buckets, error: storageError } = await supabase.storage.listBuckets();

    if (storageError) {
        console.error('❌ Erro Storage:', storageError.message);
    } else {
        console.log('✅ Sucesso Storage! Buckets:', buckets.map(b => b.name));

        // Se tiver o bucket pvc, lista arquivos
        if (buckets.find(b => b.name === 'pvc')) {
            console.log('\n3. Listando arquivos em pvc/modos...');
            const { data: files, error: filesError } = await supabase.storage
                .from('pvc')
                .list('modos');

            if (filesError) {
                console.error('❌ Erro ao listar arquivos:', filesError.message);
            } else {
                console.log('✅ Arquivos encontrados:', files.map(f => f.name));
            }
        }
    }
}

test();
