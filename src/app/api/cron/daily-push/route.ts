import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// ============================================
// CONFIG
// ============================================
// Geracao da Palavra + selecao de versiculo por IA podem passar de 60s;
// sem isso a Vercel mata a funcao no meio.
export const maxDuration = 300;

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Mapeamento de livros para IDs da API bolls.life
const LIVRO_PARA_ID: Record<string, number> = {
    'gênesis': 1, 'genesis': 1, 'gn': 1,
    'êxodo': 2, 'exodo': 2, 'ex': 2,
    'levítico': 3, 'levitico': 3, 'lv': 3,
    'números': 4, 'numeros': 4, 'nm': 4,
    'deuteronômio': 5, 'deuteronomio': 5, 'dt': 5,
    'josué': 6, 'josue': 6, 'js': 6,
    'juízes': 7, 'juizes': 7, 'jz': 7,
    'rute': 8, 'rt': 8,
    '1 samuel': 9, '1samuel': 9, '1sm': 9,
    '2 samuel': 10, '2samuel': 10, '2sm': 10,
    '1 reis': 11, '1reis': 11, '1rs': 11,
    '2 reis': 12, '2reis': 12, '2rs': 12,
    '1 crônicas': 13, '1cronicas': 13, '1cr': 13,
    '2 crônicas': 14, '2cronicas': 14, '2cr': 14,
    'esdras': 15, 'ed': 15,
    'neemias': 16, 'ne': 16,
    'ester': 17, 'et': 17,
    'jó': 18, 'jo': 18,
    'salmos': 19, 'sl': 19,
    'provérbios': 20, 'proverbios': 20, 'pv': 20,
    'eclesiastes': 21, 'ec': 21,
    'cantares': 22, 'ct': 22,
    'isaías': 23, 'isaias': 23, 'is': 23,
    'jeremias': 24, 'jr': 24,
    'lamentações': 25, 'lamentacoes': 25, 'lm': 25,
    'ezequiel': 26, 'ez': 26,
    'daniel': 27, 'dn': 27,
    'oséias': 28, 'oseias': 28, 'os': 28,
    'joel': 29, 'jl': 29,
    'amós': 30, 'amos': 30, 'am': 30,
    'obadias': 31, 'ob': 31,
    'jonas': 32, 'jn': 32,
    'miquéias': 33, 'miqueias': 33, 'mq': 33,
    'naum': 34, 'na': 34,
    'habacuque': 35, 'hc': 35,
    'sofonias': 36, 'sf': 36,
    'ageu': 37, 'ag': 37,
    'zacarias': 38, 'zc': 38,
    'malaquias': 39, 'ml': 39,
    'mateus': 40, 'mt': 40,
    'marcos': 41, 'mc': 41,
    'lucas': 42, 'lc': 42,
    'joão': 43, 'joao': 43,
    'atos': 44, 'at': 44,
    'romanos': 45, 'rm': 45,
    '1 coríntios': 46, '1corintios': 46, '1co': 46,
    '2 coríntios': 47, '2corintios': 47, '2co': 47,
    'gálatas': 48, 'galatas': 48, 'gl': 48,
    'efésios': 49, 'efesios': 49, 'ef': 49,
    'filipenses': 50, 'fp': 50,
    'colossenses': 51, 'cl': 51,
    '1 tessalonicenses': 52, '1tessalonicenses': 52, '1ts': 52,
    '2 tessalonicenses': 53, '2tessalonicenses': 53, '2ts': 53,
    '1 timóteo': 54, '1timoteo': 54, '1tm': 54,
    '2 timóteo': 55, '2timoteo': 55, '2tm': 55,
    'tito': 56, 'tt': 56,
    'filemom': 57, 'fm': 57,
    'hebreus': 58, 'hb': 58,
    'tiago': 59, 'tg': 59,
    '1 pedro': 60, '1pedro': 60, '1pe': 60,
    '2 pedro': 61, '2pedro': 61, '2pe': 61,
    '1 joão': 62, '1joao': 62, '1jo': 62,
    '2 joão': 63, '2joao': 63, '2jo': 63,
    '3 joão': 64, '3joao': 64, '3jo': 64,
    'judas': 65, 'jd': 65,
    'apocalipse': 66, 'ap': 66
};

// Mapa reverso: ID → nome do livro legivel
const ID_PARA_NOME: Record<number, string> = {
    1: 'Gênesis', 2: 'Êxodo', 3: 'Levítico', 4: 'Números', 5: 'Deuteronômio',
    6: 'Josué', 7: 'Juízes', 8: 'Rute', 9: '1 Samuel', 10: '2 Samuel',
    11: '1 Reis', 12: '2 Reis', 13: '1 Crônicas', 14: '2 Crônicas',
    15: 'Esdras', 16: 'Neemias', 17: 'Ester', 18: 'Jó', 19: 'Salmos',
    20: 'Provérbios', 21: 'Eclesiastes', 22: 'Cantares', 23: 'Isaías',
    24: 'Jeremias', 25: 'Lamentações', 26: 'Ezequiel', 27: 'Daniel',
    28: 'Oséias', 29: 'Joel', 30: 'Amós', 31: 'Obadias', 32: 'Jonas',
    33: 'Miquéias', 34: 'Naum', 35: 'Habacuque', 36: 'Sofonias',
    37: 'Ageu', 38: 'Zacarias', 39: 'Malaquias', 40: 'Mateus', 41: 'Marcos',
    42: 'Lucas', 43: 'João', 44: 'Atos', 45: 'Romanos', 46: '1 Coríntios',
    47: '2 Coríntios', 48: 'Gálatas', 49: 'Efésios', 50: 'Filipenses',
    51: 'Colossenses', 52: '1 Tessalonicenses', 53: '2 Tessalonicenses',
    54: '1 Timóteo', 55: '2 Timóteo', 56: 'Tito', 57: 'Filemom',
    58: 'Hebreus', 59: 'Tiago', 60: '1 Pedro', 61: '2 Pedro',
    62: '1 João', 63: '2 João', 64: '3 João', 65: 'Judas', 66: 'Apocalipse'
};

// ============================================
// HELPERS
// ============================================

function getDataHoje(): string {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
}

async function enviarTelegram(texto: string): Promise<{ ok: boolean; message_id?: number }> {
    try {
        const resp = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json; charset=utf-8' },
            body: JSON.stringify({
                chat_id: TELEGRAM_CHAT_ID,
                text: texto,
            }),
        });
        const data = await resp.json();
        if (!data.ok) {
            console.error('Telegram error:', data.description);
            return { ok: false };
        }
        console.log(`Telegram enviado: message_id=${data.result?.message_id}`);
        return { ok: true, message_id: data.result?.message_id };
    } catch (e) {
        console.error('Erro ao enviar Telegram:', e);
        return { ok: false };
    }
}

function parseReferencia(referencia: string): {
    livro: string;
    livroId: number;
    capituloInicio: number;
    capituloFim: number;
} | null {
    const refLower = referencia.toLowerCase().trim();

    // "Isaías 16-18"
    const regexMultiCap = /^(.+?)\s+(\d+)[-–](\d+)$/;
    // "Isaías 16"
    const regexSingleCap = /^(.+?)\s+(\d+)$/;

    let livro: string;
    let capituloInicio: number;
    let capituloFim: number;

    let match = refLower.match(regexMultiCap);
    if (match) {
        livro = match[1].trim();
        capituloInicio = parseInt(match[2]);
        capituloFim = parseInt(match[3]);
    } else {
        match = refLower.match(regexSingleCap);
        if (match) {
            livro = match[1].trim();
            capituloInicio = parseInt(match[2]);
            capituloFim = capituloInicio;
        } else {
            return null;
        }
    }

    const livroId = LIVRO_PARA_ID[livro];
    if (!livroId) return null;

    return { livro, livroId, capituloInicio, capituloFim };
}

async function buscarCapitulo(livroId: number, capitulo: number): Promise<{ verse: number; text: string }[]> {
    try {
        const response = await fetch(
            `https://bolls.life/get-chapter/NTLH/${livroId}/${capitulo}/`,
            { headers: { 'Accept': 'application/json' } }
        );
        if (!response.ok) return [];
        const data = await response.json();
        if (Array.isArray(data)) {
            return data.map((v: { verse: number; text: string }) => ({
                verse: v.verse,
                text: v.text
                    .replace(/<br\s*\/?>/gi, ' ')
                    .replace(/<[^>]+>/g, '')
                    .replace(/\s+/g, ' ')
                    .trim()
            }));
        }
        return [];
    } catch {
        return [];
    }
}

/**
 * Seleciona os 3 melhores versiculos usando IA (Gemini via Edge Function)
 * Fallback: algoritmo local por palavras-chave
 */
async function selecionarMelhoresVersiculosIA(
    versiculos: { verse: number; text: string; capitulo: number; livroId?: number }[],
    referencia: string,
    quantidade: number = 3
): Promise<{ verse: number; text: string; capitulo: number; livroId?: number }[]> {
    if (versiculos.length <= quantidade) return versiculos;

    try {
        // Monta lista compacta para a IA avaliar
        const listaVersiculos = versiculos.map(v =>
            `[${v.capitulo}:${v.verse}] ${v.text}`
        ).join('\n');

        const prompt = `Voce e um especialista em Biblia. Da leitura de hoje (${referencia}), selecione exatamente ${quantidade} versiculos que sejam os mais impactantes, inspiradores e bonitos para compartilhar como "Versiculo do Dia" nas redes sociais.

Criterios:
- Versiculos que funcionam sozinhos (faz sentido sem contexto)
- Mensagem positiva, esperanca, fe, forca, promessa de Deus
- Bom para copiar e postar no Instagram/WhatsApp
- Evite versiculos narrativos ou de contexto historico
- Prefira falas diretas de Deus ou promessas

Responda APENAS com os numeros no formato capitulo:versiculo separados por virgula. Exemplo: 37:4,38:12,39:7

Versiculos disponíveis:
${listaVersiculos}`;

        const resp = await fetch(`${supabaseUrl}/functions/v1/execute`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${supabaseAnonKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                modo_id: 'chat_pastoral',
                data: new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' }),
                pergunta: prompt
            })
        });

        if (resp.ok) {
            const json = await resp.json();
            const resultado = json.resultado || '';

            // Parsear resposta: "37:4,38:12,39:7" ou variações
            const refs = resultado.match(/(\d+):(\d+)/g);
            if (refs && refs.length >= quantidade) {
                const selecionados: typeof versiculos = [];
                for (const ref of refs) {
                    const [cap, vers] = ref.split(':').map(Number);
                    const encontrado = versiculos.find(v => v.capitulo === cap && v.verse === vers);
                    if (encontrado && !selecionados.includes(encontrado)) {
                        selecionados.push(encontrado);
                    }
                    if (selecionados.length >= quantidade) break;
                }
                if (selecionados.length >= quantidade) {
                    console.log('IA selecionou versiculos:', refs.slice(0, quantidade).join(', '));
                    return selecionados;
                }
            }
        }
    } catch (e) {
        console.error('Erro na selecao por IA, usando fallback:', e);
    }

    // FALLBACK: algoritmo local
    return selecionarMelhoresVersiculosLocal(versiculos, quantidade);
}

/**
 * Fallback: selecao local por palavras-chave
 */
function selecionarMelhoresVersiculosLocal(
    versiculos: { verse: number; text: string; capitulo: number; livroId?: number }[],
    quantidade: number = 3
): { verse: number; text: string; capitulo: number; livroId?: number }[] {
    const palavrasFortes = [
        'senhor', 'deus', 'amor', 'paz', 'esperança', 'esperanca', 'fé', 'fe',
        'força', 'forca', 'coragem', 'misericórdia', 'misericordia', 'graça', 'graca',
        'salvação', 'salvacao', 'promessa', 'eterno', 'fiel', 'proteger', 'refugio',
        'sabedoria', 'justiça', 'justica', 'perdão', 'perdao', 'bendito', 'louvor',
        'alegria', 'consolo', 'luz', 'caminho', 'verdade', 'vida', 'coração', 'coracao',
        'santo', 'poder', 'glória', 'gloria', 'benção', 'bencao', 'confiança', 'confianca',
        'forte', 'corajoso', 'não temas', 'nao temas', 'não tenha medo', 'nao tenha medo'
    ];

    const pontuados = versiculos.map(v => {
        let score = 0;
        const lower = v.text.toLowerCase();

        if (v.text.length >= 40 && v.text.length <= 200) score += 3;
        else if (v.text.length >= 20 && v.text.length <= 300) score += 1;
        else score -= 2;

        for (const palavra of palavrasFortes) {
            if (lower.includes(palavra)) score += 2;
        }

        if (v.text.includes('"') || v.text.includes('\u201c') || v.text.includes('\u2014')) score += 3;
        if (lower.includes('filho de') && lower.includes(',')) score -= 5;
        if (lower.includes('gerou')) score -= 5;

        return { ...v, score };
    });

    pontuados.sort((a, b) => b.score - a.score);

    const selecionados: typeof pontuados = [];
    const capitulosUsados = new Set<number>();

    for (const v of pontuados) {
        if (selecionados.length >= quantidade) break;
        if (!capitulosUsados.has(v.capitulo)) {
            selecionados.push(v);
            capitulosUsados.add(v.capitulo);
        }
    }

    for (const v of pontuados) {
        if (selecionados.length >= quantidade) break;
        if (!selecionados.includes(v)) {
            selecionados.push(v);
        }
    }

    return selecionados;
}

// ============================================
// CRON HANDLER
// ============================================
export async function GET(request: Request) {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
        return NextResponse.json({ error: 'TELEGRAM_BOT_TOKEN/TELEGRAM_CHAT_ID não configurados' }, { status: 500 });
    }

    try {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        const dataHoje = getDataHoje();
        const mensagensEnviadas: string[] = [];

        // =============================================
        // 1. PALAVRA DA MANHA (pre-gera para o app; NAO envia ao Telegram)
        // =============================================
        let palavraManha = (await supabase
            .from('palavra_manha_diaria')
            .select('*')
            .eq('data', dataHoje)
            .maybeSingle()).data;

        // Se ainda nao existe (cron roda antes do app), gera via Edge Function
        if (!palavraManha) {
            console.log('Palavra da Manha nao existe ainda, gerando via Edge Function...');
            try {
                const gerarResp = await fetch(`${supabaseUrl}/functions/v1/execute`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${supabaseAnonKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        modo_id: 'modo_palavra_manha',
                        data: dataHoje
                    })
                });
                if (gerarResp.ok) {
                    const gerarJson = await gerarResp.json();
                    // Busca de novo do banco (a Edge Function salva automaticamente)
                    if (gerarJson.ok) {
                        const { data: novaPalavra } = await supabase
                            .from('palavra_manha_diaria')
                            .select('*')
                            .eq('data', dataHoje)
                            .maybeSingle();
                        palavraManha = novaPalavra;
                        console.log('Palavra da Manha gerada com sucesso!');
                    }
                }
            } catch (e) {
                console.error('Erro ao gerar Palavra da Manha:', e);
            }
        }

        // A Palavra da Manha fica SO no app (o Telegram recebe apenas o
        // Versiculo do Dia abaixo e as mensagens do DNA no cron daily-dna).
        if (palavraManha && palavraManha.mensagem) {
            console.log('Palavra da Manha pronta para o app (nao enviada ao Telegram).');
        } else {
            console.log('Palavra da Manha nao encontrada para hoje:', dataHoje);
        }

        // =============================================
        // 2. VERSICULOS DO DIA (da passagem do dia - payload_do_dia)
        // =============================================

        // Busca a passagem do dia direto da tabela payload_do_dia
        const { data: payload } = await supabase
            .from('payload_do_dia')
            .select('passagem_do_dia')
            .eq('data', dataHoje)
            .maybeSingle();

        const referenciaDoDia = payload?.passagem_do_dia;

        if (referenciaDoDia) {
            // Parsear referencia e buscar versiculos da API
            // Suporta multi-livro: "Jeremias 51-52; Lamentações 1"
            const partes = referenciaDoDia.split(';').map((p: string) => p.trim()).filter(Boolean);

            const todosVersiculos: { verse: number; text: string; capitulo: number; livroId: number }[] = [];

            for (const parte of partes) {
                const parsed = parseReferencia(parte);
                if (!parsed) continue;

                const { livroId, capituloInicio, capituloFim } = parsed;

                for (let cap = capituloInicio; cap <= Math.min(capituloFim, capituloInicio + 4); cap++) {
                    const versiculos = await buscarCapitulo(livroId, cap);
                    for (const v of versiculos) {
                        todosVersiculos.push({ ...v, capitulo: cap, livroId });
                    }
                }
            }

            if (todosVersiculos.length > 0) {
                // Selecionar os 3 melhores
                const parsed0 = parseReferencia(partes[0]);
                const livroIdPrincipal = parsed0?.livroId || 1;

                const melhores = await selecionarMelhoresVersiculosIA(todosVersiculos, referenciaDoDia, 1);

                // Enviar apenas o melhor versículo
                if (melhores.length > 0) {
                    const v = melhores[0];
                    const livroNome = (v.livroId ? ID_PARA_NOME[v.livroId] : null) || ID_PARA_NOME[livroIdPrincipal] || '';
                    const refCompleta = `${livroNome} ${v.capitulo}:${v.verse}`;
                    const msgVersiculo = `Versiculo do Dia\n\n"${v.text}"\n\n${refCompleta}`;

                    const enviou = await enviarTelegram(msgVersiculo);
                    if (enviou.ok) mensagensEnviadas.push(`Versiculo: ${refCompleta}`);
                }
            } else {
                console.log('Nenhum versiculo carregado para:', referenciaDoDia);
            }
        } else {
            console.log('Passagem do dia nao encontrada para:', dataHoje);
        }

        return NextResponse.json({
            ok: true,
            data: dataHoje,
            mensagens_enviadas: mensagensEnviadas,
            total: mensagensEnviadas.length,
        });

    } catch (e) {
        console.error('Erro no cron daily-push:', e);
        return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
    }
}
