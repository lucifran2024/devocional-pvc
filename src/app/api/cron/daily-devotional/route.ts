import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// ============================================
// CONFIG
// ============================================
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8785996157:AAHaRBPg7wKFZ6aTgesRAR9CaCwDU1C3_00';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '8239043013';



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
    
    if (content.includes('[LEGENDA]:')) {
        return content.substring(0, content.indexOf('[LEGENDA]:')).trim();
    }
    
    return content.trim();
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

    // 4. Remove hashtags (#devocional, #deus, etc)
    limpo = limpo.replace(/#[\w]+/g, '');

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

    try {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        const dataHoje = getDataHoje();
        const dataFormatada = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
        const resultado: Record<string, string> = {};

        // Buscar todos os IDs já enviados (compartilhado entre as 3 fontes)
        const { data: enviados } = await supabase
            .from('telegram_enviados')
            .select('external_id');
        const idsEnviados = new Set((enviados || []).map(e => e.external_id));

        // =============================================
        // PARTE 1: EVANGELHOPARATODOS (1 mensagem)
        // =============================================
        try {
            console.log('Buscando evangelhoparatodos...');
            const { data: funcData, error: funcError } = await supabase.functions.invoke('execute', {
                body: {
                    modo_id: 'devocional_externo',
                    data: dataHoje,
                    fonte_rss: 'instagram',
                    force_live_refresh: true
                }
            });

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
                        const caption = `Devocional do Dia\n${dataFormatada}\n\n${textoLimpo}`;

                        // Enviar apenas texto
                        const enviou = await enviarTelegram(caption);
                        if (enviou) {
                            await supabase.from('telegram_enviados').insert({
                                external_id: postEscolhido.external_id,
                                data_envio: dataHoje,
                                enviado_em: new Date().toISOString()
                            });
                            await supabase.from('dna_categorizado').insert({
                                texto_msg: textoLimpo,
                                categoria: 'devocional',
                                tags: ['evangelhoparatodos', 'devocional_diario']
                            }).then(({ error }) => {
                                if (error) console.error('Erro DNA (evangelho):', error.message);
                                else console.log('DNA alimentado (evangelhoparatodos)');
                            });
                            idsEnviados.add(postEscolhido.external_id);
                            resultado.evangelhoparatodos = 'enviado';
                        } else {
                            resultado.evangelhoparatodos = 'falha_telegram';
                        }
                    } else {
                        console.log('Evangelhoparatodos: nenhum post com OCR');
                        resultado.evangelhoparatodos = 'sem_ocr';
                    }
                }
            }
        } catch (evErr: any) {
            console.error('Erro evangelhoparatodos:', evErr.message);
            resultado.evangelhoparatodos = 'erro: ' + evErr.message;
        }

        await new Promise(r => setTimeout(r, 500));

        // =============================================
        // PARTE 2: TRIBO DE JUDÁ (2 mensagens)
        // =============================================
        try {
            console.log('Buscando Tribo de Judá...');
            const { data: triboData, error: triboError } = await supabase.functions.invoke('execute', {
                body: {
                    modo_id: 'devocional_externo',
                    data: dataHoje,
                    fonte_rss: 'tribo_juda',
                    force_live_refresh: true
                }
            });

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

                    const captionTribo = `Devocional do Dia\n${dataFormatada}\n\n${textoTribo}`;
                    // Enviar texto (sem imagem e sem mencionar "Tribo de Judá")
                    const enviouTribo = await enviarTelegram(captionTribo);

                    if (enviouTribo) {
                        await supabase.from('telegram_enviados').insert({
                            external_id: post.external_id,
                            data_envio: dataHoje,
                            enviado_em: new Date().toISOString()
                        });

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
                        await new Promise(r => setTimeout(r, 500));
                    }
                }

                resultado.tribo_juda = `${triboEnviados} msgs enviadas`;
                console.log(`Tribo de Judá: ${triboEnviados} mensagens enviadas`);
            }
        } catch (triboErr: any) {
            console.error('Erro Tribo de Judá:', triboErr.message);
            resultado.tribo_juda = 'erro: ' + triboErr.message;
        }

        // =============================================
        // PARTE 3: BÍBLIA GATEWAY (1 versículo)
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

                        if (enviouBG) {
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

                            resultado.bible_gateway = 'enviado';
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
        } catch (bgErr: any) {
            console.error('Erro Bible Gateway:', bgErr.message);
            resultado.bible_gateway = 'erro: ' + bgErr.message;
        }

        return NextResponse.json({
            ok: true,
            data: dataHoje,
            resultado
        });

    } catch (e: any) {
        console.error('Erro no cron:', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
