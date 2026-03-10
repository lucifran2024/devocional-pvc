import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Faltam variáveis NEXT_PUBLIC_SUPABASE_URL/NEXT_PUBLIC_SUPABASE_ANON_KEY.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

function isPrayerLike(text) {
    return /\b(senhor|pai|deus,|te peço|te entrego|te agradeço|em nome de jesus|am[eé]m)\b/i.test(text);
}

function isDeclarativeLike(text) {
    return /\b(eu declaro|hoje declaro|declaro hoje|eu creio|eu recebo|eu sou)\b/i.test(text);
}

function isExhortationLike(text) {
    return /\b(n[aã]o desista|levante|levanta-te|creia|avance|decida hoje|persevere|pare de|entregue|confie)\b/i.test(text);
}

function hasVerseReference(text) {
    return /(?:\d\s*)?[A-ZÀ-Ú][a-zà-ú]+(?:\s+[A-ZÀ-Ú][a-zà-ú]+)*\s+\d+\s*[:.]\s*\d+(?:\s*[-–]\s*\d+)?/i.test(text);
}

function classifySuspicion(item) {
    const text = item.texto_msg || '';

    if (item.categoria === 'reflexao' && isPrayerLike(text)) {
        return 'reflexao_parecendo_oracao';
    }
    if (item.categoria === 'oracao' && !isPrayerLike(text)) {
        return 'oracao_sem_voz_de_oracao';
    }
    if (item.categoria === 'declaracao' && !isDeclarativeLike(text)) {
        return 'declaracao_sem_voz_declarativa';
    }
    if (item.categoria === 'exortacao' && !isExhortationLike(text)) {
        return 'exortacao_sem_chamada_forte';
    }
    if (item.categoria === 'versiculo' && !hasVerseReference(text)) {
        return 'versiculo_sem_referencia_clara';
    }

    return null;
}

async function main() {
    const { data, error } = await supabase
        .from('dna_categorizado')
        .select('id, categoria, texto_msg, created_at')
        .order('created_at', { ascending: false })
        .limit(500);

    if (error) {
        console.error('Erro ao buscar dna_categorizado:', error);
        process.exit(1);
    }

    const findings = [];
    for (const item of data || []) {
        const reason = classifySuspicion(item);
        if (reason) {
            findings.push({
                id: item.id,
                categoria: item.categoria,
                reason,
                trecho: (item.texto_msg || '').slice(0, 180).replace(/\n/g, ' ⏎ '),
            });
        }
    }

    console.log(`Total auditado: ${(data || []).length}`);
    console.log(`Suspeitas encontradas: ${findings.length}`);

    const byReason = findings.reduce((acc, finding) => {
        acc[finding.reason] = (acc[finding.reason] || 0) + 1;
        return acc;
    }, {});

    console.log('\nResumo por motivo:');
    Object.entries(byReason)
        .sort((a, b) => b[1] - a[1])
        .forEach(([reason, total]) => {
            console.log(`- ${reason}: ${total}`);
        });

    console.log('\nAmostra:');
    findings.slice(0, 40).forEach((finding) => {
        console.log(`\n#${finding.id} [${finding.categoria}] ${finding.reason}`);
        console.log(finding.trecho);
    });
}

main().catch((error) => {
    console.error('Falha inesperada na auditoria:', error);
    process.exit(1);
});
