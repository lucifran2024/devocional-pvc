import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';

// ============================================
// CONFIG
// ============================================
// OCR + multiplas fontes externas podem passar de 60s;
// sem isso a Vercel mata a funcao no meio.
export const maxDuration = 300;

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;



const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// ============================================
// HELPERS
// ============================================

function getDataHoje(): string {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
}

function extrairOCR(content: string): string {
    if (!content) return '';

    if (content.includes('[OCR]:')) {
        const posOcr = content.indexOf('[OCR]:') + 6;
        let substringOcr = content.substring(posOcr);
        if (substringOcr.includes('[LEGENDA]:')) {
            substringOcr = substringOcr.substring(0, substringOcr.indexOf('[LEGENDA]:'));
        }
        return substringOcr.trim();
    }

    // ESTRITO: sem tag [OCR] o conteúdo é só a legenda do post — não é a
    // extração do reel/imagem. Retorna vazio para o post ser PULADO em vez
    // de enviar legenda no Telegram.
    return '';
}

function limparTexto(texto: string): string {
    // 1. Remove @menções (ex: @juciqueiroz, @evangelhoparatodos__, @Maria etc)
    let limpo = texto.replace(/@[\w._]+/g, '').trim();

    // 2. Remove handles/nomes de páginas conhecidos (com ou sem @)
    //    CRÍTICO: impede que o texto contenha referências a páginas originais
    const handles = [
        'tribodejuda.ofc', 'tribodejuda20', 'tribodejuda',
        'tribo de judá', 'tribo de juda',
        'evangelhoparatodos__', 'evangelhoparatodos',
        'evangelho para todos',
        'biblegateway', 'bible gateway',
        'juciqueiroz', 'juci queiroz',
        'instagram', 'facebook',
        'siga-nos', 'siga nos', 'sigam', 'siga a página',
        'curta e compartilhe', 'ative as notificações',
        'link na bio', 'compartilhe', 'marque alguém',
        'segue a gente', 'seguir',
    ];
    for (const handle of handles) {
        limpo = limpo.replace(new RegExp(handle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '');
    }

    // 3. Remove URLs
    limpo = limpo.replace(/https?:\/\/[^\s]+/g, '');

    // 4. Remove hashtags (#devocional, #deus, #DevocionalDiário, etc)
    limpo = limpo.replace(/#[^\s#]+/g, '');

    // 5. Remove emojis comuns de call-to-action (👉👆📲 etc) em linhas de CTA
    limpo = limpo.replace(/^.*(?:siga|curta|compartilhe|ative|link|bio|inscreva).*$/gim, '');

    // 6. Remove linhas vazias consecutivas (mais de 2)
    limpo = limpo.replace(/\n{3,}/g, '\n\n');
    // Remove espaços extras
    limpo = limpo.replace(/  +/g, ' ');
    // Remove pontos/espaços soltos no inicio de linhas (restos de @removidos)
    limpo = limpo.replace(/^\s*[.,]\s*/gm, '');

    // 7. Remove linhas fragmentadas no final (OCR cortado) - MENOS agressivo
    const linhas = limpo.trim().split('\n');
    while (linhas.length > 1) {
        const ultima = linhas[linhas.length - 1].trim();
        if (!ultima) { linhas.pop(); continue; }
        // Só remove se MUITO curto (≤3 chars) e sem pontuação
        const ehFragmento = ultima.length <= 3 && !/[.!?"\])…]$/.test(ultima);
        if (ehFragmento) {
            linhas.pop();
        } else {
            break;
        }
    }
    limpo = linhas.join('\n');
    return limpo.trim();
}

/**
 * Hash do conteúdo para dedupe semântico.
 * Posts como o card de "Bom dia" da Tribo de Judá mudam só o dia da semana —
 * external_id novo a cada dia, mas texto igual. Normaliza removendo dia da
 * semana, datas, emojis e pontuação antes de hashear, para que o mesmo card
 * seja bloqueado mesmo vindo de um post novo.
 */
function gerarHashConteudo(texto: string): string {
    const normalizado = texto
        .toLowerCase()
        .replace(/\b(segunda|ter[cç]a|quarta|quinta|sexta|s[aá]bado|domingo)(-feira)?\b/gi, '')
        .replace(/\d{1,2}\/\d{1,2}\/\d{2,4}/g, '')
        .replace(/\d{1,2}\s+de\s+[a-zç]+(\s+de\s+\d{4})?/gi, '')
        .replace(/[^a-z0-9à-ü]/gi, '');
    return 'hash_' + createHash('sha1').update(normalizado).digest('hex').slice(0, 32);
}

function ehDevocionalDoDia(textoOCR: string): boolean {
    const lower = textoOCR.toLowerCase();
    return (
        lower.includes('devocional') ||
        lower.includes('devocional do dia') ||
        lower.includes('reflexão do dia') ||
        lower.includes('reflexao do dia') ||
        lower.includes('palavra do dia') ||
        lower.includes('mensagem do dia')
    );
}

/* eslint-disable @typescript-eslint/no-explicit-any */
type SupabaseFunctionsClient = { functions: { invoke: (name: string, opts: { body: Record<string, unknown> }) => Promise<{ data: any; error: { message: string } | null }> } };

/**
 * Busca uma fonte externa com refresh ao vivo; se a Edge Function falhar
 * (ex.: estouro de tempo 546), tenta de novo só com o cache do dia — barato
 * e aproveita posts salvos por uma execução anterior do cron.
 */
async function invocarFonteExterna(
    supabase: SupabaseFunctionsClient,
    dataHoje: string,
    fonte: string,
    permitirAoVivo: boolean = true
): Promise<{ data: any; error: { message: string } | null }> {
    if (permitirAoVivo) {
        const aoVivo = await supabase.functions.invoke('execute', {
            body: { modo_id: 'devocional_externo', data: dataHoje, fonte_rss: fonte, force_live_refresh: true }
        });
        if (!aoVivo.error) return aoVivo;
        console.warn(`Fonte ${fonte}: refresh ao vivo falhou (${aoVivo.error.message}). Tentando cache do dia...`);
    } else {
        console.warn(`Fonte ${fonte}: orçamento de tempo apertado — usando só o cache do dia.`);
    }
    return await supabase.functions.invoke('execute', {
        body: { modo_id: 'devocional_externo', data: dataHoje, fonte_rss: fonte }
    });
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



// ============================================
// CRON HANDLER
// ============================================
export async function GET(request: Request) {
    // Verificar cron secret (seguranca Vercel)
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
        const dataFormatada = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
        const resultado: Record<string, string> = {};

        // Buscar IDs já enviados (compartilhado entre as 3 fontes).
        // Supabase limita a 1000 linhas por padrão; ordena pelos mais recentes
        // para que o dedupe nunca perca os envios atuais quando a tabela crescer.
        const { data: enviados } = await supabase
            .from('telegram_enviados')
            .select('external_id')
            .order('enviado_em', { ascending: false })
            .limit(3000);
        const idsEnviados = new Set((enviados || []).map(e => e.external_id));

        // Orçamento de tempo: a função morre nos 300s da Vercel. As buscas de
        // Instagram podem levar ~150s cada; sem controle, a 2ª fonte estoura o
        // relógio e o run morre no meio (dia 04/07 nada saiu por isso).
        const inicioRun = Date.now();
        const segundosDecorridos = () => (Date.now() - inicioRun) / 1000;

        // =============================================
        // PARTE 1: BÍBLIA GATEWAY (1 versículo)
        // Roda PRIMEIRO por ser rápido (~2s): mesmo que as fontes de
        // Instagram estourem o tempo, o versículo do dia sempre sai.
        // =============================================
        try {
            const bgExternalId = `bible_gateway_${dataHoje}`;

            // Só busca se não foi enviado hoje
            if (!idsEnviados.has(bgExternalId)) {
                console.log('Buscando Bíblia Gateway...');
                const { data: bgData, error: bgError } = await supabase.functions.invoke('execute', {
                    body: {
                        modo_id: 'devocional_externo',
                        data: dataHoje,
                        fonte_rss: 'bible_gateway'
                    }
                });

                if (bgError) {
                    console.error('Erro ao buscar Bible Gateway:', bgError.message);
                } else if (bgData?.resultado) {
                    // Resultado vem como string: "FONTE: BIBLE_GATEWAY\nTÍTULO: ...\n\n{conteudo}"
                    let textoBG = typeof bgData.resultado === 'string' ? bgData.resultado : '';

                    // Limpar formatação da Edge Function
                    textoBG = textoBG
                        .replace(/^FONTE:\s*BIBLE_GATEWAY\s*/i, '')
                        .replace(/^TÍTULO:\s*/im, '')
                        .replace(/<[^>]+>/g, '') // Remove HTML tags
                        .trim();

                    if (textoBG.length > 10) {
                        const msgBG = `Versículo do Dia\n${dataFormatada}\n\n${textoBG}`;
                        const enviouBG = await enviarTelegram(msgBG);

                        if (enviouBG.ok) {
                            await supabase.from('telegram_enviados').insert({
                                external_id: bgExternalId,
                                data_envio: dataHoje,
                                enviado_em: new Date().toISOString()
                            });

                            await supabase.from('dna_categorizado').insert({
                                texto_msg: textoBG,
                                categoria: 'versiculo',
                                tags: ['bible_gateway', 'versiculo_do_dia']
                            }).then(({ error }) => {
                                if (error) console.error('Erro ao salvar DNA (BG):', error.message);
                                else console.log('DNA alimentado (Bible Gateway)');
                            });

                            resultado.bible_gateway = `enviado(msg_${enviouBG.message_id})`;
                            console.log('Bible Gateway: versículo enviado');
                        }
                    } else {
                        console.log('Bible Gateway: conteúdo muito curto, ignorando');
                        resultado.bible_gateway = 'conteudo_vazio';
                    }
                }
            } else {
                console.log('Bible Gateway: já enviado hoje');
                resultado.bible_gateway = 'ja_enviado';
            }
        } catch (bgErr) {
            const m = bgErr instanceof Error ? bgErr.message : String(bgErr);
            console.error('Erro Bible Gateway:', m);
            resultado.bible_gateway = 'erro: ' + m;
        }

        await new Promise(r => setTimeout(r, 1500));

        // =============================================
        // PARTE 2: EVANGELHOPARATODOS (1 mensagem)
        // =============================================
        try {
            console.log('Buscando evangelhoparatodos...');
            const { data: funcData, error: funcError } = await invocarFonteExterna(supabase, dataHoje, 'instagram');

            if (funcError) {
                console.error('Erro ao buscar evangelhoparatodos:', funcError.message);
                resultado.evangelhoparatodos = 'erro: ' + funcError.message;
            } else {
                // Extrair posts
                let posts: { external_id: string; content: string; published_at: string; author_name: string }[] = [];
                if (funcData?.dados_estruturados && Array.isArray(funcData.dados_estruturados)) {
                    posts = funcData.dados_estruturados;
                } else if (Array.isArray(funcData?.resultado)) {
                    posts = funcData.resultado;
                }

                // Filtrar apenas do evangelhoparatodos
                posts = posts.filter(p =>
                    p.author_name?.toLowerCase().includes('evangelho') ||
                    p.author_name?.toLowerCase().includes('evangelhoparatodos')
                );

                // Filtrar posts nao enviados
                const postsNovos = posts.filter(p => !idsEnviados.has(p.external_id));

                if (postsNovos.length === 0) {
                    console.log('Evangelhoparatodos: nenhum post novo');
                    resultado.evangelhoparatodos = 'sem_posts_novos';
                } else {
                    // Priorizar o "Devocional do Dia"
                    let postEscolhido = null;
                    for (const p of postsNovos) {
                        const ocr = extrairOCR(p.content);
                        if (ocr && ehDevocionalDoDia(ocr)) { postEscolhido = p; break; }
                    }
                    if (!postEscolhido) {
                        for (const p of postsNovos) {
                            const ocr = extrairOCR(p.content);
                            if (ocr) { postEscolhido = p; break; }
                        }
                    }

                    if (postEscolhido) {
                        const textoOCR = extrairOCR(postEscolhido.content);
                        const textoLimpo = limparTexto(textoOCR);
                        const hashConteudo = gerarHashConteudo(textoLimpo);

                        if (idsEnviados.has(hashConteudo)) {
                            console.log('Evangelhoparatodos: conteúdo idêntico já enviado (hash), pulando');
                            resultado.evangelhoparatodos = 'conteudo_repetido';
                        } else {

                        const caption = `Devocional do Dia\n${dataFormatada}\n\n${textoLimpo}`;

                        // Enviar apenas texto
                        const enviou = await enviarTelegram(caption);
                        if (enviou.ok) {
                            await supabase.from('telegram_enviados').insert([
                                {
                                    external_id: postEscolhido.external_id,
                                    data_envio: dataHoje,
                                    enviado_em: new Date().toISOString()
                                },
                                {
                                    external_id: hashConteudo,
                                    data_envio: dataHoje,
                                    enviado_em: new Date().toISOString()
                                }
                            ]);
                            await supabase.from('dna_categorizado').insert({
                                texto_msg: textoLimpo,
                                categoria: 'devocional',
                                tags: ['evangelhoparatodos', 'devocional_diario']
                            }).then(({ error }) => {
                                if (error) console.error('Erro DNA (evangelho):', error.message);
                                else console.log('DNA alimentado (evangelhoparatodos)');
                            });
                            idsEnviados.add(postEscolhido.external_id);
                            idsEnviados.add(hashConteudo);
                            resultado.evangelhoparatodos = `enviado(msg_${enviou.message_id})`;
                        } else {
                            resultado.evangelhoparatodos = 'falha_telegram';
                        }
                        }
                    } else {
                        console.log('Evangelhoparatodos: nenhum post com OCR');
                        resultado.evangelhoparatodos = 'sem_ocr';
                    }
                }
            }
        } catch (evErr) {
            const m = evErr instanceof Error ? evErr.message : String(evErr);
            console.error('Erro evangelhoparatodos:', m);
            resultado.evangelhoparatodos = 'erro: ' + m;
        }

        await new Promise(r => setTimeout(r, 2500));

        // =============================================
        // PARTE 2: TRIBO DE JUDÁ (2 mensagens)
        // =============================================
        try {
            console.log('Buscando Tribo de Judá...');
            // Se a 1ª fonte comeu muito relógio, não arrisca outro live de ~150s:
            // busca só o cache (rápido) — a próxima execução do cron traz o resto.
            const podeAoVivo = segundosDecorridos() < 150;
            const { data: triboData, error: triboError } = await invocarFonteExterna(supabase, dataHoje, 'tribo_juda', podeAoVivo);

            if (triboError) {
                console.error('Erro ao buscar Tribo de Judá:', triboError.message);
            } else {
                let triboPostsRaw: { external_id: string; content: string; published_at: string; author_name: string }[] = [];
                if (triboData?.dados_estruturados && Array.isArray(triboData.dados_estruturados)) {
                    triboPostsRaw = triboData.dados_estruturados;
                } else if (Array.isArray(triboData?.resultado)) {
                    triboPostsRaw = triboData.resultado;
                }

                // Filtrar por author_name tribo
                triboPostsRaw = triboPostsRaw.filter(p =>
                    p.author_name?.toLowerCase().includes('tribo') ||
                    p.author_name?.toLowerCase().includes('juda')
                );

                // Filtrar não enviados
                const triboNovos = triboPostsRaw.filter(p => !idsEnviados.has(p.external_id));

                // Pegar até 2 posts com conteúdo
                let triboEnviados = 0;
                for (const post of triboNovos) {
                    if (triboEnviados >= 2) break;

                    const ocr = extrairOCR(post.content);
                    if (!ocr) continue;

                    const textoTribo = limparTexto(ocr);
                    if (textoTribo.length < 20) continue; // Muito curto, pular

                    // Dedupe por conteúdo: o card de "Bom dia" da tribo muda só o
                    // dia da semana — sem isso ele é reenviado todo dia.
                    const hashTribo = gerarHashConteudo(textoTribo);
                    if (idsEnviados.has(hashTribo)) {
                        console.log('Tribo: conteúdo idêntico já enviado (hash), pulando');
                        continue;
                    }

                    const captionTribo = `Devocional do Dia\n${dataFormatada}\n\n${textoTribo}`;
                    // Enviar texto (sem imagem e sem mencionar "Tribo de Judá")
                    const enviouTribo = await enviarTelegram(captionTribo);

                    if (enviouTribo.ok) {
                        await supabase.from('telegram_enviados').insert([
                            {
                                external_id: post.external_id,
                                data_envio: dataHoje,
                                enviado_em: new Date().toISOString()
                            },
                            {
                                external_id: hashTribo,
                                data_envio: dataHoje,
                                enviado_em: new Date().toISOString()
                            }
                        ]);

                        await supabase.from('dna_categorizado').insert({
                            texto_msg: textoTribo,
                            categoria: 'devocional',
                            tags: ['tribodejuda', 'devocional_diario']
                        }).then(({ error }) => {
                            if (error) console.error('Erro ao salvar DNA (tribo):', error.message);
                            else console.log(`DNA alimentado (tribo #${triboEnviados + 1})`);
                        });

                        triboEnviados++;
                        idsEnviados.add(post.external_id);
                        idsEnviados.add(hashTribo);
                        await new Promise(r => setTimeout(r, 2500));
                    }
                }

                resultado.tribo_juda = `${triboEnviados} msgs enviadas`;
                console.log(`Tribo de Judá: ${triboEnviados} mensagens enviadas`);
            }
        } catch (triboErr) {
            const m = triboErr instanceof Error ? triboErr.message : String(triboErr);
            console.error('Erro Tribo de Judá:', m);
            resultado.tribo_juda = 'erro: ' + m;
        }

        return NextResponse.json({
            ok: true,
            data: dataHoje,
            resultado
        });

    } catch (e) {
        console.error('Erro no cron:', e);
        return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
    }
}
