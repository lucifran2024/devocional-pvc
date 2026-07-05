// ============================================================
// EXPORTA os devocionais do @evangelhoparatodos enviados ao
// Telegram (tabela dna_categorizado, tag 'evangelhoparatodos')
// para uma pasta organizada por mês no pen drive.
//
// Uso:  node scripts/exportar-devocionais-telegram.cjs [destino]
//       (destino padrão: E:\02-Conteudo\Telegram\Devocionais - Evangelho para Todos)
//
// Requer leitura na tabela: ou a policy temporária de export
// (tmp_export_devocionais_anon) ou uma SUPABASE_SERVICE_ROLE_KEY.
// ============================================================

const path = require('node:path');
const fs = require('node:fs');

process.chdir(path.join(__dirname, '..'));
require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const DESTINO = process.argv[2] || 'E:\\02-Conteudo\\Telegram\\Devocionais - Evangelho para Todos';

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const DIAS_SEMANA = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira',
    'quinta-feira', 'sexta-feira', 'sábado'];

// Data local de São Paulo a partir do timestamp UTC do banco
function dataSP(iso) {
    const d = new Date(iso);
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Sao_Paulo',
        year: 'numeric', month: '2-digit', day: '2-digit',
    }).formatToParts(d);
    const get = (t) => parts.find(p => p.type === t).value;
    const ano = Number(get('year')), mes = Number(get('month')), dia = Number(get('day'));
    const diaSemana = new Date(`${get('year')}-${get('month')}-${get('day')}T12:00:00-03:00`).getUTCDay();
    return { ano, mes, dia, diaSemana, iso: `${get('year')}-${get('month')}-${get('day')}` };
}

async function main() {
    if (!URL || !KEY) {
        console.error('Faltam NEXT_PUBLIC_SUPABASE_URL / chave no .env.local');
        process.exit(1);
    }

    const supabase = createClient(URL, KEY);
    console.log('Buscando devocionais (tag evangelhoparatodos)...');

    const todos = [];
    for (let de = 0; ; de += 500) {
        const { data, error } = await supabase
            .from('dna_categorizado')
            .select('id, texto_msg, created_at')
            .contains('tags', ['evangelhoparatodos'])
            .order('created_at', { ascending: true })
            .range(de, de + 499);
        if (error) {
            console.error('Erro ao buscar:', error.message);
            process.exit(1);
        }
        todos.push(...(data || []));
        if (!data || data.length < 500) break;
    }

    if (todos.length === 0) {
        console.error('Nenhum devocional retornado — a policy de leitura está ativa?');
        process.exit(1);
    }
    console.log(`${todos.length} devocionais encontrados.`);

    fs.mkdirSync(DESTINO, { recursive: true });

    const usados = new Set();
    const consolidado = [];
    let gravados = 0;

    for (const item of todos) {
        const dt = dataSP(item.created_at);
        const pastaMes = path.join(DESTINO, `${dt.ano}-${String(dt.mes).padStart(2, '0')} ${MESES[dt.mes - 1]}`);
        fs.mkdirSync(pastaMes, { recursive: true });

        // Nome do arquivo: data + sufixo se houver mais de um no mesmo dia
        let base = `${dt.iso} - Devocional`;
        let nome = `${base}.txt`;
        for (let n = 2; usados.has(path.join(pastaMes, nome)); n++) {
            nome = `${base} (${n}).txt`;
        }
        const arquivo = path.join(pastaMes, nome);
        usados.add(arquivo);

        const dataExtenso = `${String(dt.dia).padStart(2, '0')}/${String(dt.mes).padStart(2, '0')}/${dt.ano} (${DIAS_SEMANA[dt.diaSemana]})`;
        const texto = (item.texto_msg || '').trim();

        const conteudo = [
            'DEVOCIONAL DO DIA — EVANGELHO PARA TODOS',
            `Data: ${dataExtenso}`,
            'Fonte: @evangelhoparatodos (Instagram) → enviado no Telegram',
            '─'.repeat(48),
            '',
            texto,
            '',
        ].join('\r\n');

        fs.writeFileSync(arquivo, '﻿' + conteudo, 'utf8'); // BOM: acentos ok no Bloco de Notas
        gravados++;

        consolidado.push(`${'='.repeat(56)}\r\n${dataExtenso}\r\n${'='.repeat(56)}\r\n\r\n${texto}\r\n`);
    }

    // Arquivo único com tudo, em ordem cronológica
    fs.writeFileSync(
        path.join(DESTINO, '00 - TODOS OS DEVOCIONAIS (completo).txt'),
        '﻿' + `DEVOCIONAIS — EVANGELHO PARA TODOS (enviados no Telegram)\r\nTotal: ${gravados} devocionais\r\nExportado em: ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}\r\n\r\n` + consolidado.join('\r\n'),
        'utf8'
    );

    // LEIA-ME
    fs.writeFileSync(
        path.join(DESTINO, 'LEIA-ME.txt'),
        '﻿' + [
            'DEVOCIONAIS — EVANGELHO PARA TODOS',
            '',
            'O que é: os devocionais do perfil @evangelhoparatodos (Instagram)',
            'que o app Bíblia envia todo dia no seu Telegram.',
            '',
            'Organização:',
            '  - Uma pasta por mês (ex: "2026-03 Março")',
            '  - Um arquivo .txt por devocional, nomeado pela data',
            '  - "00 - TODOS OS DEVOCIONAIS (completo).txt" tem tudo num arquivo só',
            '',
            `Total exportado: ${gravados}`,
            `Exportado em: ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`,
            '',
            'Para atualizar este export no futuro, rode no projeto:',
            '  node scripts/exportar-devocionais-telegram.cjs',
            '(peça ao Claude para liberar a leitura temporária da tabela antes)',
            '',
        ].join('\r\n'),
        'utf8'
    );

    console.log(`OK: ${gravados} arquivos gravados em "${DESTINO}"`);
}

main().catch(e => { console.error(e); process.exit(1); });
