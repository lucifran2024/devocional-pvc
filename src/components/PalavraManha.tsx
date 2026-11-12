'use client';

import { useState, useEffect } from 'react';
import { Copy, Sun, Check, BookOpen, Heart, Share2, WifiOff, RefreshCw } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { getDataHoje, getPalavraManha, gerarPalavraManha, darAmen, type PalavraManhaCache } from '@/lib/supabase';
import { BotaoAcao } from '@/components/transcricao/BotaoAcao';
import { nomeCategoria } from '@/lib/palavra-apresentacao';
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
    const cabecalho = (
        <header className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-400" aria-hidden="true">
                <Sun className="h-5 w-5" />
            </span>
            <div className="min-w-0">
                <h2 id="titulo-palavra-manha" className="reading-serif text-xl font-semibold leading-tight text-text-primary">
                    Palavra da Manhã
                </h2>
                {subtitulo && <p className="mt-0.5 text-[13px] text-text-muted">{subtitulo}</p>}
            </div>
        </header>
    );

    if (loading && !data) {
        return (
            <section aria-labelledby="titulo-palavra-manha" className="cartao p-5 md:p-7">
                {cabecalho}
                <div className="mt-5 space-y-3" aria-hidden="true">
                    <div className="h-4 w-full animate-pulse rounded-lg bg-surface-2" />
                    <div className="h-4 w-11/12 animate-pulse rounded-lg bg-surface-2" />
                    <div className="h-4 w-4/5 animate-pulse rounded-lg bg-surface-2" />
                </div>
                <p className="mt-4 text-[13px] text-text-muted" role="status">Buscando inspiração matinal...</p>
            </section>
        );
    }

    if (error) {
        return (
            <section aria-labelledby="titulo-palavra-manha" className="cartao p-5 md:p-7">
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

    return (
        <section aria-labelledby="titulo-palavra-manha" className="cartao p-5 md:p-7 animate-enter">
            {/* Aviso: exibindo mensagem salva (sem conexão) */}
            {modoOffline && (
                <div className="mb-4 flex items-center gap-2 rounded-xl border border-orange-500/25 bg-orange-500/10 px-3 py-2 text-[13px] font-semibold text-orange-700 dark:text-orange-300">
                    <WifiOff className="h-4 w-4 shrink-0" aria-hidden="true" />
                    Sem conexão — mostrando a última mensagem salva ({data.dia_semana}).
                </div>
            )}

            {cabecalho}

            {/* Dia de Passagem do Dia: referência extra */}
            {data.passagem_ref && (
                <p className="mt-3 flex items-center gap-1.5 text-[13px] font-semibold text-amber-700 dark:text-amber-400">
                    <BookOpen className="h-4 w-4" aria-hidden="true" />
                    {data.passagem_ref}
                </p>
            )}

            {/* Texto: à esquerda, com respiro entre parágrafos (.texto-palavra) */}
            <div className="texto-palavra reading-serif mt-5 text-[1.0625rem] leading-[1.75] text-text-primary">
                <ReactMarkdown>{data.mensagem}</ReactMarkdown>
            </div>

            {/* Mesma fileira de botões do Versículo do dia */}
            <div className="mt-6 grid grid-cols-3 gap-2">
                <BotaoAcao
                    icone={Heart}
                    rotulo={amei ? 'Amém!' : 'Amém'}
                    variante={amei ? 'primario' : 'padrao'}
                    onClick={handleAmen}
                />
                <BotaoAcao
                    icone={copied ? Check : Copy}
                    rotulo={copied ? 'Copiado' : 'Copiar'}
                    variante={copied ? 'feito' : 'padrao'}
                    onClick={handleCopy}
                />
                <BotaoAcao icone={Share2} rotulo="Compartilhar" onClick={handleShare} />
            </div>
        </section>
    );
}
