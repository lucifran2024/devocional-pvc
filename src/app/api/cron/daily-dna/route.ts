import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

// ============================================
// CONFIG
// ============================================
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8785996157:AAHaRBPg7wKFZ6aTgesRAR9CaCwDU1C3_00';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '8239043013';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// ============================================
// FILTROS - ROTAÇÃO DIÁRIA
// ============================================

const CATEGORIAS = ['devocional', 'oracao', 'versiculo', 'reflexao', 'exortacao', 'declaracao'];
const TAMANHOS = ['Curto', 'Médio', 'Longo'];
const FORMATOS = ['Staccato', 'Narrativo', 'Lista'];
const PERIODOS = ['Manhã', 'Madrugada'];
const TEMAS = [
    'Fé', 'Esperança', 'Amor', 'Gratidão', 'Perdão',
    'Coragem', 'Paz', 'Força', 'Confiança', 'Renovação',
    'Misericórdia', 'Graça', 'Vitória', 'Descanso', 'Propósito',
    'Fidelidade', 'Sabedoria', 'Proteção', 'Provisão', 'Adoração'
];
const CONTEXTOS: ('recent_5' | 'recent_10' | 'recent_20' | 'mixed')[] = ['recent_5', 'recent_10', 'recent_20', 'mixed'];

/**
 * Gera combinação de filtros que muda todo dia usando a data como seed
 * Garante que nunca repita a mesma combinação
 */
function getFiltrosDoDia(dataStr: string, modo: 'favoritas' | 'estilo'): Record<string, any> {
    // Usa data como seed numérica
    const seed = parseInt(dataStr.replace(/-/g, ''));
    const offset = modo === 'estilo' ? 7 : 0; // Offset para estilo não coincidir com favoritas

    const categoria = CATEGORIAS[(seed + offset) % CATEGORIAS.length];
    const tamanho = TAMANHOS[(seed + offset + 1) % TAMANHOS.length];
    const formato = FORMATOS[(seed + offset + 2) % FORMATOS.length];
    const tema = TEMAS[(seed + offset) % TEMAS.length];
    const periodo = PERIODOS[(seed + offset) % PERIODOS.length];
    const contexto = CONTEXTOS[(seed + offset) % CONTEXTOS.length];

    const filtros: Record<string, any> = {
        quantidade: 5,
        tamanho,
        formato,
        periodo,
        contextoEstrategia: contexto,
        usarDnaBase: true,
        usarPassagemDia: true,
        neutro: false,
    };

    // Favoritas: varia categoria e tema
    if (modo === 'favoritas') {
        filtros.tipo = categoria;
        filtros.tema = tema;
    }

    // Estilo: varia estilo e tema diferente
    if (modo === 'estilo') {
        filtros.estilo = categoria;
        const temaEstilo = TEMAS[(seed + offset + 5) % TEMAS.length]; // Tema diferente do favoritas
        filtros.tema = temaEstilo;
    }

    return filtros;
}

// ============================================
// HELPERS
// ============================================

function getDataHoje(): string {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
}

async function enviarTelegram(texto: string): Promise<boolean> {
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
            return false;
        }
        return true;
    } catch (e) {
        console.error('Erro ao enviar Telegram:', e);
        return false;
    }
}

/**
 * Chama a Edge Function para gerar conteúdo
 */
async function gerarConteudo(modo_id: string, data: string, filtros: Record<string, any>): Promise<string | null> {
    try {
        const resp = await fetch(`${supabaseUrl}/functions/v1/execute`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${supabaseAnonKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ modo_id, data, filtros })
        });

        if (!resp.ok) {
            console.error(`Edge Function erro ${resp.status}`);
            return null;
        }

        const json = await resp.json();
        if (json.ok && json.resultado) {
            return json.resultado;
        }
        console.error('Edge Function retornou erro:', json.error);
        return null;
    } catch (e) {
        console.error('Erro ao chamar Edge Function:', e);
        return null;
    }
}

/**
 * Parseia o texto gerado em mensagens individuais
 */
function parseMensagens(texto: string): string[] {
    if (!texto) return [];

    // 1. Separador explícito ---
    if (texto.includes('\n---\n') || texto.includes('\n---') || texto.includes('---\n')) {
        const partes = texto.split(/\n\s*---\s*\n/);
        if (partes.length > 1) return partes.filter(p => p.trim().length > 0);
    }

    // 2. Separador ### (títulos markdown)
    if (texto.includes('\n###') || texto.includes('\n## ')) {
        const partes = texto.split(/\n(?=###?\s)/);
        if (partes.length > 1) return partes.filter(p => p.trim().length > 0);
    }

    // 3. Separador por P01, P02, P03... (padrão PVC)
    const pNumberPattern = /\n(?=P\d{2}\s*[—–-]\s*)/;
    if (pNumberPattern.test(texto)) {
        const partes = texto.split(pNumberPattern);
        if (partes.length > 1) return partes.filter(p => p.trim().length > 0);
    }

    // 4. Separador por título em MAIÚSCULAS
    const upperTitlePattern = /\n\n(?=[A-ZÀ-Ú][A-ZÀ-Ú\s,.!?]{10,})/;
    if (upperTitlePattern.test(texto)) {
        const partes = texto.split(upperTitlePattern);
        if (partes.length > 1) return partes.filter(p => p.trim().length > 0);
    }

    // 5. Fallback: retorna texto inteiro
    return [texto];
}

/**
 * Limpa markdown para texto puro (Telegram)
 */
function limparMarkdown(texto: string): string {
    return texto
        .replace(/\*\*/g, '')
        .replace(/\*/g, '')
        .replace(/#{1,6}\s/g, '')
        .replace(/>\s?/g, '')
        .replace(/^P\d{2}\s*[—–-]\s*/gm, '') // Remove prefixo P01 —
        .trim();
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

    try {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        const dataHoje = getDataHoje();
        const mensagensEnviadas: string[] = [];

        // =============================================
        // 0. ANTI-REPETICAO: buscar o que ja foi gerado nos ultimos 7 dias
        // =============================================
        const seteDiasAtras = new Date();
        seteDiasAtras.setDate(seteDiasAtras.getDate() - 7);
        const dataLimite = seteDiasAtras.toISOString();

        const { data: geracoesRecentes } = await supabase
            .from('dna_geracoes')
            .select('texto_msg, categoria, tema_principal, angulo_usado, titulo, imagem_central, abertura_tipo, fechamento_tipo')
            .gte('created_at', dataLimite)
            .order('created_at', { ascending: false })
            .limit(50);

        // Monta contexto anti-repeticao para enviar nos filtros
        const temasUsados = [...new Set((geracoesRecentes || []).map(g => g.tema_principal).filter(Boolean))];
        const titulosUsados = [...new Set((geracoesRecentes || []).map(g => g.titulo).filter(Boolean))];
        const imagensUsadas = [...new Set((geracoesRecentes || []).map(g => g.imagem_central).filter(Boolean))];
        const aberturasUsadas = [...new Set((geracoesRecentes || []).map(g => g.abertura_tipo).filter(Boolean))];
        const fechamentosUsados = [...new Set((geracoesRecentes || []).map(g => g.fechamento_tipo).filter(Boolean))];

        // Extrair trechos curtos das msgs recentes para a IA evitar
        const trechosRecentes = (geracoesRecentes || [])
            .map(g => g.texto_msg?.substring(0, 80))
            .filter(Boolean)
            .slice(0, 20);

        const antiRepeticao = {
            temas_evitar: temasUsados.slice(0, 10),
            titulos_evitar: titulosUsados.slice(0, 15),
            imagens_evitar: imagensUsadas.slice(0, 10),
            aberturas_saturadas: aberturasUsadas.slice(0, 5),
            fechamentos_saturados: fechamentosUsados.slice(0, 5),
            trechos_recentes: trechosRecentes,
        };

        console.log(`Anti-repeticao: ${temasUsados.length} temas, ${titulosUsados.length} titulos, ${trechosRecentes.length} trechos dos ultimos 7 dias`);

        // =============================================
        // 1. GERAR DNA (modo_favoritas) - 5 mensagens
        // =============================================
        const filtrosFavoritas = getFiltrosDoDia(dataHoje, 'favoritas');
        // Injeta contexto anti-repeticao nos filtros
        filtrosFavoritas.anti_repeticao = antiRepeticao;
        console.log('Filtros Favoritas:', JSON.stringify({ ...filtrosFavoritas, anti_repeticao: '...(omitido)' }));

        const resultFavoritas = await gerarConteudo('modo_favoritas', dataHoje, filtrosFavoritas);

        let msgsFavoritas: string[] = [];
        if (resultFavoritas) {
            msgsFavoritas = parseMensagens(resultFavoritas).slice(0, 5);

            // Salvar no dna_geracoes
            const batchIdFav = randomUUID();
            for (const msg of msgsFavoritas) {
                await supabase.from('dna_geracoes').insert({
                    batch_id: batchIdFav,
                    texto_msg: msg.trim(),
                    categoria: filtrosFavoritas.tipo || 'devocional',
                    filtros: filtrosFavoritas,
                    build_style: 'favoritas',
                });
            }
            console.log(`Favoritas: ${msgsFavoritas.length} msgs salvas (batch: ${batchIdFav})`);
        }

        // =============================================
        // 2. GERAR ESTILO (modo_estilo) - 5 mensagens
        // =============================================
        const filtrosEstilo = getFiltrosDoDia(dataHoje, 'estilo');
        filtrosEstilo.anti_repeticao = antiRepeticao;
        console.log('Filtros Estilo:', JSON.stringify({ ...filtrosEstilo, anti_repeticao: '...(omitido)' }));

        const resultEstilo = await gerarConteudo('modo_estilo', dataHoje, filtrosEstilo);

        let msgsEstilo: string[] = [];
        if (resultEstilo) {
            msgsEstilo = parseMensagens(resultEstilo).slice(0, 5);

            // Salvar no dna_geracoes
            const batchIdEst = randomUUID();
            for (const msg of msgsEstilo) {
                await supabase.from('dna_geracoes').insert({
                    batch_id: batchIdEst,
                    texto_msg: msg.trim(),
                    categoria: filtrosEstilo.estilo || 'reflexao',
                    filtros: filtrosEstilo,
                    build_style: 'estilo',
                });
            }
            console.log(`Estilo: ${msgsEstilo.length} msgs salvas (batch: ${batchIdEst})`);
        }

        // =============================================
        // 3. ENVIAR TUDO VIA TELEGRAM
        // =============================================
        const todasMsgs = [...msgsFavoritas, ...msgsEstilo];

        // Envia cabeçalho
        if (todasMsgs.length > 0) {
            const header = `DNA Gerado - ${new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}\n\nFiltros DNA: ${filtrosFavoritas.tipo} | ${filtrosFavoritas.tema} | ${filtrosFavoritas.tamanho}\nFiltros Estilo: ${filtrosEstilo.estilo} | ${filtrosEstilo.tema} | ${filtrosEstilo.tamanho}\n\nTotal: ${todasMsgs.length} mensagens`;
            await enviarTelegram(header);
            await new Promise(r => setTimeout(r, 300));
        }

        // Envia cada mensagem numerada
        let num = 1;
        for (const msg of todasMsgs) {
            const textoLimpo = limparMarkdown(msg);
            const label = num <= msgsFavoritas.length ? 'DNA' : 'Estilo';
            const msgFinal = `[${num}/${todasMsgs.length}] ${label}\n\n${textoLimpo}`;

            const enviou = await enviarTelegram(msgFinal);
            if (enviou) mensagensEnviadas.push(`Msg ${num} (${label})`);

            await new Promise(r => setTimeout(r, 500));
            num++;
        }

        return NextResponse.json({
            ok: true,
            data: dataHoje,
            filtros_favoritas: filtrosFavoritas,
            filtros_estilo: filtrosEstilo,
            mensagens_enviadas: mensagensEnviadas,
            total: mensagensEnviadas.length,
        });

    } catch (e: any) {
        console.error('Erro no cron daily-dna:', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
