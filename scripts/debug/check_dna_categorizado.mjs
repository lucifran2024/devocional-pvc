import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Faltam variáveis de ambiente');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log('🔍 Verificando tabela dna_categorizado...\n');

    // 1. Buscar total e por categoria
    const { data: all, error: err1 } = await supabase
        .from('dna_categorizado')
        .select('id, categoria, texto_msg')
        .order('created_at', { ascending: false });

    if (err1) {
        console.error('❌ Erro:', err1);
        return;
    }

    console.log(`📊 Total de registros: ${all.length}\n`);

    // 2. Agrupar por categoria
    const porCategoria = {};
    for (const item of all) {
        const cat = item.categoria || 'null';
        if (!porCategoria[cat]) porCategoria[cat] = [];
        porCategoria[cat].push(item);
    }

    console.log('📁 Registros por categoria:');
    for (const [cat, items] of Object.entries(porCategoria)) {
        console.log(`  - "${cat}": ${items.length} itens`);
    }

    // 3. Mostrar exemplo de cada categoria
    console.log('\n📝 Exemplo de cada categoria:');
    for (const [cat, items] of Object.entries(porCategoria)) {
        const exemplo = items[0].texto_msg;
        console.log(`\n--- ${cat.toUpperCase()} ---`);
        console.log(exemplo.substring(0, 200) + (exemplo.length > 200 ? '...' : ''));
    }

    // 4. Testar busca com .in()
    console.log('\n\n🧪 Testando busca com .in() para "versículo"...');
    const { data: teste, error: err2 } = await supabase
        .from('dna_categorizado')
        .select('id, categoria, texto_msg')
        .in('categoria', ['versículo'])
        .limit(3);

    if (err2) {
        console.error('❌ Erro na busca:', err2);
    } else {
        console.log(`✅ Encontrados: ${teste.length} itens com categoria "versículo"`);
        teste.forEach((t, i) => {
            console.log(`  ${i + 1}. [${t.categoria}] ${t.texto_msg.substring(0, 80)}...`);
        });
    }
}

main();
