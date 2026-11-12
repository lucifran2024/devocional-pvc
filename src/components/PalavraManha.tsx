'use client';

import { useState, useEffect } from 'react';
import { Copy, Sun, Check, BookOpen, Heart, Share, WifiOff, RefreshCw } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { getDataHoje, getPalavraManha, gerarPalavraManha, darAmen, type PalavraManhaCache } from '@/lib/supabase';
import { BotaoIcone, PilulaAcao } from '@/components/ui/BotaoIcone';
import { estruturarPalavra, nomeCategoria, separarTitulo } from '@/lib/palavra-apresentacao';
import { compartilharTexto } from '@/lib/transcricao-acoes';

interface PalavraManhaProps {
    passagemDia?: string;
}

// Cache local da última mensagem carregada — garante Palavra da Manhã offline
const PALAVRA_LOCAL_KEY = 'palavra-manha-local';

function salvarPalavraLocal(registro: PalavraManhaCache) {
    try {
        localStorage.setItem(PALAVRA_LOCAL_KEY, JSON.stringify(registro));
    } catch { /* storage cheio/indisponível */ }
}

function lerPalavraLocal(): PalavraManhaCache | null {
    try {
        const raw = localStorage.getItem(PALAVRA_LOCAL_KEY);
        return raw ? (JSON.parse(raw) as PalavraManhaCache) : null;
    } catch {
        return null;
    }
}

export function PalavraManha({ passagemDia }: PalavraManhaProps) {
    const [data, setData] = useState<PalavraManhaCache | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [amei, setAmei] = useState(false); // Estado local do feedback
    const [modoOffline, setModoOffline] = useState(false); // Exibindo cache local sem rede

    async function loadData() {
        const hoje = getDataHoje();
        const local = lerPalavraLocal();

        // ABERTURA RÁPIDA (25/09/2026): a mensagem de HOJE já guardada no
        // aparelho aparece na hora; o banco só confirma/atualiza em seguida.
        // Mensagem de outro dia não é exibida como se fosse de hoje (online).
        const temLocalDeHoje = !!local && local.data === hoje;
        if (temLocalDeHoje) {
            setData(local);
            setModoOffline(false);
            setLoading(false);
        } else {
            setLoading(true);
        }

        // Offline: usa direto a última mensagem salva no aparelho
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
            if (local) {
                setData(local);
                setModoOffline(local.data !== hoje);
                setLoading(false);
                return;
            }
        }

        try {
            // 1. Tenta cache do banco
            const cache = await getPalavraManha(hoje);

            if (cache) {
                setData(cache);
                salvarPalavraLocal(cache);
                setModoOffline(false);
                setLoading(false);
            } else if (!temLocalDeHoje) {
                // 2. Se não tem cache, gera
                console.log('🌅 [PALAVRA] Gerando nova mensagem...');
                await handleGenerate();
            }
        } catch (err) {
            console.error(err);
            if (local) {
                setData(local);
                setModoOffline(local.data !== hoje);
            } else {
                setError('Falha ao carregar Palavra da Manhã.');
            }
            setLoading(false);
        }
    }

    async function handleGenerate() {
        setGenerating(true);
        const hoje = getDataHoje();

        const { data: novo, error: err } = await gerarPalavraManha(hoje);

        if (err || !novo) {
            const local = lerPalavraLocal();
            if (local) {
                setData(local);
                setModoOffline(local.data !== hoje);
            } else {
                setError('Erro ao gerar mensagem. Tente recarregar.');
            }
        } else {
            setData(novo);
            salvarPalavraLocal(novo);
            setModoOffline(false);
        }

        setLoading(false);
        setGenerating(false);
    }

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- leitura síncrona de localStorage/window na montagem (hydration-safe)
        loadData();
    }, []);

    // Formato do texto copiado/compartilhado (o mesmo de sempre)
    const montarTextoShare = (registro: PalavraManhaCache) =>
        `🌅 *PALAVRA DA MANHÃ*\n${registro.dia_semana} • ${new Date().toLocaleDateString('pt-BR')}\n\n${registro.mensagem}\n\n📲 _Bíblia_`;

    const handleCopy = () => {
        if (!data) return;
        navigator.clipboard.writeText(montarTextoShare(data));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Compartilhar (12/11/2026): mesma fileira de botões do Versículo do dia.
    // Sem a folha de compartilhar do aparelho, o texto é copiado.
    const handleShare = async () => {
        if (!data) return;
        const resultado = await compartilharTexto({ titulo: 'Palavra da Manhã', texto: montarTextoShare(data) });
        if (resultado === 'copiado') {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleAmen = async () => {
        if (!data || amei) return;
        setAmei(true); // Feedback instantâneo na UI

        // Envia para o banco
        const sucesso = await darAmen(data.id);
        if (!sucesso) {
            // Se falhar (raro), deveríamos reverter? 
            // Para UX, melhor manter como "feito" visualmente para não frustrar
        }
    };

    // Cartão do início (12/11/2026): o título fica dentro do cartão e aparece
    // já enquanto carrega, para a tela não pular quando a mensagem chega.
    const subtitulo = data ? [data.dia_semana, nomeCategoria(data.categoria)].filter(Boolean).join(' · ') : '';
    // 2º ajuste: o nome do cartão ficou pequeno e âmbar (sem o ícone em
    // quadradinho); quem ganha tamanho é o título da mensagem do dia. A cor
    // vai no <span>: a regra global de h1–h6 em globals.css vence classe de
    // cor posta direto no título.
    const cabecalho = (
        <header className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5">
            <h2 id="titulo-palavra-manha" className="text-sm font-semibold">
                <span className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
                    <Sun className="h-4 w-4 shrink-0" aria-hidden="true" />
                    Palavra da Manhã
                </span>
            </h2>
            {subtitulo && <p className="text-sm text-text-muted">{subtitulo}</p>}
        </header>
    );

    if (loading && !data) {
        return (
            <section aria-labelledby="titulo-palavra-manha" className="cartao p-4 md:p-7">
                {cabecalho}
                <div className="mt-5 space-y-3" aria-hidden="true">
                    <div className="h-4 w-full animate-pulse rounded-lg bg-surface-2" />
                    <div className="h-4 w-11/12 animate-pulse rounded-lg bg-surface-2" />
                    <div className="h-4 w-4/5 animate-pulse rounded-lg bg-surface-2" />
                </div>
                <p className="mt-4 text-sm text-text-muted" role="status">Buscando inspiração matinal...</p>
            </section>
        );
    }

    if (error) {
        return (
            <section aria-labelledby="titulo-palavra-manha" className="cartao p-4 md:p-7">
                {cabecalho}
                <p className="mt-4 text-sm text-text-secondary">{error}</p>
                <button
                    type="button"
                    onClick={loadData}
                    className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl border border-border-subtle bg-surface-2/60 px-4 text-sm font-semibold text-text-primary transition hover:border-amber-500/40"
                >
                    <RefreshCw className="h-4 w-4" aria-hidden="true" /> Tentar novamente
                </button>
            </section>
        );
    }

    if (!data) return null;

    // Título em MAIÚSCULAS da mensagem → manchete. O corpo vira blocos
    // (3º ajuste): versículo, parágrafos e fechamento. A capitular só entra
    // quando o texto abre com uma letra (com o versículo na frente, ela pegava
    // a aspa junto: "L).
    const { titulo, corpo } = separarTitulo(data.mensagem);
    const blocos = estruturarPalavra(corpo);
    const primeiro = blocos[0];
    const capitular = Boolean(titulo) && primeiro?.tipo === 'paragrafo' && /^(?:\*\*|__|\*|_)?\p{L}/u.test(primeiro.texto);
    // Quebra de linha simples vira quebra de verdade (no markdown ela some)
    const comQuebras = (texto: string) => texto.replace(/\n/g, '  \n');

    return (
        <section aria-labelledby="titulo-palavra-manha" className="cartao p-4 md:p-7 animate-[fadeIn_0.35s_ease-out]">
            {/* Aviso: exibindo mensagem salva (sem conexão) */}
            {modoOffline && (
                <div className="mb-4 flex items-center gap-2 rounded-xl border border-orange-500/25 bg-orange-500/10 px-3 py-2 text-sm font-semibold text-orange-700 dark:text-orange-300">
                    <WifiOff className="h-4 w-4 shrink-0" aria-hidden="true" />
                    Sem conexão — mostrando a última mensagem salva ({data.dia_semana}).
                </div>
            )}

            {cabecalho}

            {/* Dia de Passagem do Dia: referência extra */}
            {data.passagem_ref && (
                <p className="mt-3 flex items-center gap-1.5 text-sm font-semibold text-amber-700 dark:text-amber-400">
                    <BookOpen className="h-4 w-4" aria-hidden="true" />
                    {data.passagem_ref}
                </p>
            )}

            {titulo && (
                <h3 className="reading-serif mt-4 text-[1.5rem] font-medium leading-[1.2] tracking-[-0.01em] text-text-primary">
                    {titulo}
                </h3>
            )}

            {/* Texto: à esquerda, com respiro entre parágrafos (.texto-palavra);
                versículo em bloco próprio e fechamento destacado (globals.css) */}
            <div className={`texto-palavra reading-serif ${capitular ? 'com-capitular' : ''} ${titulo ? 'mt-4' : 'mt-5'} text-[1.125rem] leading-[1.7] text-text-primary`}>
                {blocos.map((bloco, i) => {
                    if (bloco.tipo === 'versiculo') {
                        return (
                            <figure key={i} className="versiculo-palavra">
                                <blockquote>{bloco.texto}</blockquote>
                                {bloco.referencia && <figcaption>{bloco.referencia}</figcaption>}
                            </figure>
                        );
                    }
                    if (bloco.tipo === 'fechamento') {
                        return (
                            <div key={i} className="fechamento-palavra">
                                <ReactMarkdown>{comQuebras(bloco.texto)}</ReactMarkdown>
                            </div>
                        );
                    }
                    return <ReactMarkdown key={i}>{comQuebras(bloco.texto)}</ReactMarkdown>;
                })}
            </div>

            {/* Botões compactos (2º ajuste): Amém em pílula; Copiar e
                Compartilhar só com ícone. Mesma fileira do Versículo do dia. */}
            <div className="mt-6 flex items-center justify-between gap-2 border-t border-border-subtle pt-3">
                <PilulaAcao onClick={handleAmen} ativa={amei} pressionada={amei}>
                    <Heart
                        className={`h-[18px] w-[18px] ${amei ? 'fill-current animate-[coracao_0.5s_cubic-bezier(0.2,0.8,0.2,1)]' : ''}`}
                        aria-hidden="true"
                    />
                    {amei ? 'Amém!' : 'Amém'}
                </PilulaAcao>
                <div className="flex items-center gap-1">
                    <BotaoIcone rotulo={copied ? 'Copiado' : 'Copiar'} onClick={handleCopy} feito={copied}>
                        {copied
                            ? <Check className="h-5 w-5 animate-[surgir_0.25s_ease-out]" aria-hidden="true" />
                            : <Copy className="h-5 w-5" aria-hidden="true" />}
                    </BotaoIcone>
                    <BotaoIcone rotulo="Compartilhar" onClick={handleShare}>
                        <Share className="h-5 w-5" aria-hidden="true" />
                    </BotaoIcone>
                </div>
            </div>
        </section>
    );
}
