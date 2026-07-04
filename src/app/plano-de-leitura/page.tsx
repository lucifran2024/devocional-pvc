'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import {
    Book, Calendar, ArrowLeft, Loader2,
    ChevronRight, ChevronLeft, RotateCcw, GraduationCap, Search,
    Rocket, Zap, MessageSquare, ClipboardList, ArrowRight,
    Heart, Copy, Share2, Lightbulb, Palette, StickyNote, X,
    ZoomIn, ZoomOut, BookOpen, ListChecks, Check, SlidersHorizontal, AlignLeft, AlignCenter, AlignRight,
    Info, ChevronDown
} from 'lucide-react';
import {
    supabase,
    getDataHoje,
    salvarInteracaoBiblia,
    removerInteracaoBiblia,
    removerInteracaoPorVersiculoETipo,
    getInteracoesPorCapitulo,
    atualizarNotaBiblia,
    type BibliaInteracao
} from '@/lib/supabase';
import { getPassagemDoDia, getTeseCentral, type PassagemSecao6 } from '@/lib/secao6';
import { CosmicBackground } from '@/components/ui/CosmicBackground';
import { BackButton } from '@/components/ui/BackButton';
import { useToast } from '@/hooks/useToast';
import { ToastContainer } from '@/components/ui/ToastContainer';
import ReactMarkdown from 'react-markdown';
import { useSearchParams } from 'next/navigation'; // Added imports
import { Suspense } from 'react'; // Added Suspense
import { buscarPassagem, formatarVersiculosParte, parseReferencia, getAbrevFromId, type Versiculo } from '@/lib/bible-api';
import { getPericopes } from '@/lib/bible-pericopes';
import { getIntroducaoLivro } from '@/lib/bible-introducoes';
import { BibleAudioPlayer } from '@/components/BibleAudioPlayer';
import { getDiaDoPlano, getPrimeiroDiaDoPlano, concluirDiaLeitura, getMinhasInscricoes, marcarDiaConcluido } from '@/lib/plans'; // Added plans lib
import type { InscricaoPlano, Plano } from '@/lib/types/plans';

// Cores para destacar versículos
const CORES_DESTAQUE_PLANO: { id: string; nome: string; bg: string; border: string }[] = [
    { id: 'yellow', nome: 'Amarelo', bg: 'bg-yellow-500/20', border: 'border-yellow-500/40' },
    { id: 'blue', nome: 'Azul', bg: 'bg-blue-500/20', border: 'border-blue-500/40' },
    { id: 'green', nome: 'Verde', bg: 'bg-green-500/20', border: 'border-green-500/40' },
    { id: 'pink', nome: 'Rosa', bg: 'bg-pink-500/20', border: 'border-pink-500/40' },
];

const DEFAULT_READING_FONT_SIZE = 20;
const MIN_READING_FONT_SIZE = 16;
const MAX_READING_FONT_SIZE = 30;
const READING_FONT_SIZE_KEY = 'plano-reading-font-size';
const DEFAULT_READING_LINE_HEIGHT = 1.85;
const MIN_READING_LINE_HEIGHT = 1.4;
const MAX_READING_LINE_HEIGHT = 2.6;
const READING_LINE_HEIGHT_KEY = 'plano-reading-line-height';
const READING_ALIGN_KEY = 'plano-reading-align';
type ReadingAlign = 'left' | 'center' | 'right';
const NOVO_TESTAMENTO_ANCHOR_ID = 'plano-novo-testamento';

function limitarFonteLeitura(size: number) {
    return Math.min(MAX_READING_FONT_SIZE, Math.max(MIN_READING_FONT_SIZE, size));
}

// Mapa de interações por versículo
interface InteracoesMapPlano {
    destaques: Record<number, BibliaInteracao>;
    favoritos: Record<number, BibliaInteracao>;
    notas: Record<number, BibliaInteracao>;
}

// Capitaliza nomes de livros vindos em minúsculo da API (ex.: "deuteronômio" -> "Deuteronômio")
function capitalizarLivro(nome: string): string {
    if (!nome) return nome;
    return nome.split(' ').map(p => (p ? p.charAt(0).toUpperCase() + p.slice(1) : p)).join(' ');
}

// Componente de versículos interativos para o Plano de Leitura
// Destaca as palavras-chave do dia (lexico_do_dia) dentro do texto do versículo.
// Retorna nós React, marcando cada ocorrência com a classe keyword-highlight.
function destacarLexico(texto: string, lexico?: string[]): React.ReactNode {
    if (!lexico || lexico.length === 0) return texto;
    const termos = lexico
        .map(t => t.trim())
        .filter(t => t.length >= 3)
        .map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    if (termos.length === 0) return texto;
    try {
        const re = new RegExp(`(${termos.join('|')})`, 'gi');
        const partes = texto.split(re);
        return partes.map((parte, i) =>
            re.test(parte)
                ? <mark key={i} className="keyword-highlight">{parte}</mark>
                : <span key={i}>{parte}</span>
        );
    } catch {
        return texto;
    }
}

function VersiculosInterativos({
    versiculos,
    referencia,
    livroAbrev,
    livroNome,
    capitulo,
    livroId,
    readingFontSize,
    readingLineHeight,
    readingAlign,
    lexico,
}: {
    versiculos: Versiculo[];
    referencia: string;
    livroAbrev: string;
    livroNome: string;
    capitulo: number;
    livroId?: number;
    readingFontSize: number;
    readingLineHeight: number;
    readingAlign: ReadingAlign;
    lexico?: string[];
}) {
    // Índice no array de versículos (único mesmo com capítulos repetidos)
    const [versiculoSelecionadoIdx, setVersiculoSelecionadoIdx] = useState<number | null>(null);
    // Seleção múltipla para copiar/compartilhar vários versículos de uma vez
    const [selecaoCopia, setSelecaoCopia] = useState<Set<number>>(new Set());
    const [modoCopiaMultipla, setModoCopiaMultipla] = useState(false);
    const [ultimoTapIdx, setUltimoTapIdx] = useState<number | null>(null);
    const [mostrarCores, setMostrarCores] = useState(false);
    const [mostrarNota, setMostrarNota] = useState(false);
    const [textoNota, setTextoNota] = useState('');
    const [interacoesMap, setInteracoesMap] = useState<Record<string, InteracoesMapPlano>>({});
    const [estudoAberto, setEstudoAberto] = useState(false);
    const [estudoTexto, setEstudoTexto] = useState('');
    const [estudoLoading, setEstudoLoading] = useState(false);
    const [estudoVersiculo, setEstudoVersiculo] = useState<Versiculo | null>(null);
    // Versículo atualmente narrado pelo player de áudio (destaque tipo legenda)
    const [audioVerse, setAudioVerse] = useState<{ verse: number; chapter: number } | null>(null);
    const toolbarRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const versiculoAnteriorRef = useRef<number | null>(null);
    const { toasts, removeToast, success } = useToast();

    // Helper: capítulo real de um versículo (usa v.chapter ou fallback para prop)
    const getCapitulo = (v: Versiculo) => v.chapter ?? capitulo;

    // Helper para acessar interações de um versículo
    const getInteracoesDoVersiculo = (v: Versiculo) => {
        const cap = getCapitulo(v);
        const capMap = interacoesMap[String(cap)] || { destaques: {}, favoritos: {}, notas: {} };
        return capMap;
    };

    // Carregar interações de todos os capítulos presentes nos versículos
    const carregarInteracoes = useCallback(async () => {
        const caps = [...new Set(versiculos.map(v => v.chapter ?? capitulo))];
        const novoMap: Record<string, InteracoesMapPlano> = {};
        for (const cap of caps) {
            const dados = await getInteracoesPorCapitulo(livroAbrev, cap);
            const map: InteracoesMapPlano = { destaques: {}, favoritos: {}, notas: {} };
            dados.forEach((item: BibliaInteracao) => {
                if (item.tipo === 'destaque') map.destaques[item.versiculo] = item;
                else if (item.tipo === 'favorito') map.favoritos[item.versiculo] = item;
                else if (item.tipo === 'nota') map.notas[item.versiculo] = item;
            });
            novoMap[String(cap)] = map;
        }
        setInteracoesMap(novoMap);
    }, [livroAbrev, capitulo, versiculos]);

    useEffect(() => { carregarInteracoes(); }, [carregarInteracoes]);

    // Acompanha a narração: rola suavemente até o versículo sendo lido
    useEffect(() => {
        if (audioVerse == null) return;
        const el = document.getElementById(`plano-verse-${audioVerse.chapter}-${audioVerse.verse}`);
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, [audioVerse]);

    // Fechar toolbar ao clicar fora
    useEffect(() => {
        const handleClickFora = (e: MouseEvent) => {
            if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
                const target = e.target as HTMLElement;
                const versiculoDiv = target.closest('[id^="plano-verse-"]');
                if (!versiculoDiv) {
                    setVersiculoSelecionadoIdx(null);
                    setMostrarCores(false);
                    setMostrarNota(false);
                    versiculoAnteriorRef.current = null;
                }
            }
        };
        document.addEventListener('mousedown', handleClickFora);
        return () => document.removeEventListener('mousedown', handleClickFora);
    }, []);

    const handleVersiculoClick = (idx: number) => {
        if (modoCopiaMultipla) {
            toggleSelecaoCopia(idx);
            return;
        }
        // Tocar em OUTRO versículo (com um já selecionado) entra direto no modo "copiar vários"
        if (versiculoSelecionadoIdx != null && versiculoSelecionadoIdx !== idx) {
            setModoCopiaMultipla(true);
            setSelecaoCopia(new Set([versiculoSelecionadoIdx, idx]));
            setUltimoTapIdx(idx);
            setVersiculoSelecionadoIdx(null);
            setMostrarCores(false);
            setMostrarNota(false);
            versiculoAnteriorRef.current = null;
            return;
        }
        if (versiculoAnteriorRef.current === idx) {
            setVersiculoSelecionadoIdx(null);
            setMostrarCores(false);
            setMostrarNota(false);
            versiculoAnteriorRef.current = null;
            return;
        }
        setVersiculoSelecionadoIdx(idx);
        versiculoAnteriorRef.current = idx;
        setMostrarCores(false);
        setMostrarNota(false);
        const v = versiculos[idx];
        if (v) {
            const capMap = getInteracoesDoVersiculo(v);
            const notaExistente = capMap.notas[v.verse];
            setTextoNota(notaExistente?.nota || '');
        }
    };

    const getCorClasse = (v: Versiculo): string => {
        const capMap = getInteracoesDoVersiculo(v);
        const destaque = capMap.destaques[v.verse];
        if (!destaque) return '';
        const cor = CORES_DESTAQUE_PLANO.find(c => c.id === destaque.cor);
        return cor ? `${cor.bg} ${cor.border} border-l-2` : '';
    };
    const isFavorito = (v: Versiculo) => !!getInteracoesDoVersiculo(v).favoritos[v.verse];
    const temNota = (v: Versiculo) => !!getInteracoesDoVersiculo(v).notas[v.verse];

    const handleDestacar = async (cor: string) => {
        if (versiculoSelecionadoIdx == null) return;
        const v = versiculos[versiculoSelecionadoIdx];
        if (!v) return;
        const cap = getCapitulo(v);
        const capMap = getInteracoesDoVersiculo(v);
        const existente = capMap.destaques[v.verse];
        if (existente && existente.cor === cor) {
            await removerInteracaoBiblia(existente.id!);
            success('Destaque removido');
        } else {
            if (existente) await removerInteracaoBiblia(existente.id!);
            await salvarInteracaoBiblia({
                tipo: 'destaque', livro_abrev: livroAbrev, livro_nome: livroNome,
                capitulo: cap, versiculo: v.verse, texto_versiculo: v.text, cor
            });
            success('Versículo destacado!');
        }
        await carregarInteracoes();
        setMostrarCores(false);
    };

    const handleFavoritar = async () => {
        if (versiculoSelecionadoIdx == null) return;
        const v = versiculos[versiculoSelecionadoIdx];
        if (!v) return;
        const cap = getCapitulo(v);
        const capMap = getInteracoesDoVersiculo(v);
        const existente = capMap.favoritos[v.verse];
        if (existente) {
            await removerInteracaoBiblia(existente.id!);
            success('Removido dos favoritos');
        } else {
            await salvarInteracaoBiblia({
                tipo: 'favorito', livro_abrev: livroAbrev, livro_nome: livroNome,
                capitulo: cap, versiculo: v.verse, texto_versiculo: v.text
            });
            success('Salvo nos favoritos!');
        }
        await carregarInteracoes();
    };

    const handleCopiar = async () => {
        if (versiculoSelecionadoIdx == null) return;
        const v = versiculos[versiculoSelecionadoIdx];
        if (!v) return;
        const cap = getCapitulo(v);
        const texto = `"${v.text}" — ${livroNome} ${cap}:${v.verse}`;
        await navigator.clipboard.writeText(texto);
        success('Versículo copiado!');
    };

    // ===== Seleção múltipla (copiar/compartilhar vários de uma vez) =====
    const toggleSelecaoCopia = (idx: number) => {
        setUltimoTapIdx(idx);
        setSelecaoCopia(prev => {
            const next = new Set(prev);
            if (next.has(idx)) next.delete(idx); else next.add(idx);
            return next;
        });
    };

    const entrarModoCopiaMultipla = () => {
        const inicial = versiculoSelecionadoIdx;
        setModoCopiaMultipla(true);
        setSelecaoCopia(inicial == null ? new Set() : new Set([inicial]));
        setUltimoTapIdx(inicial);
        setVersiculoSelecionadoIdx(null);
        setMostrarCores(false);
        setMostrarNota(false);
        versiculoAnteriorRef.current = null;
    };

    const sairModoCopiaMultipla = () => {
        setModoCopiaMultipla(false);
        setSelecaoCopia(new Set());
        setUltimoTapIdx(null);
    };

    // Referência compacta agrupando por capítulo e juntando faixas contíguas.
    // Ex.: "Gênesis 1:3-5; 2:1,4"
    const montarReferenciaSelecao = (vs: Versiculo[]): string => {
        const porCapitulo = new Map<number, number[]>();
        for (const v of vs) {
            const c = getCapitulo(v);
            if (!porCapitulo.has(c)) porCapitulo.set(c, []);
            porCapitulo.get(c)!.push(v.verse);
        }
        const blocos = [...porCapitulo.keys()].sort((a, b) => a - b).map(c => {
            const versos = [...new Set(porCapitulo.get(c)!)].sort((a, b) => a - b);
            const faixas: string[] = [];
            let ini = versos[0];
            let fim = versos[0];
            for (let i = 1; i < versos.length; i++) {
                if (versos[i] === fim + 1) {
                    fim = versos[i];
                } else {
                    faixas.push(ini === fim ? `${ini}` : `${ini}-${fim}`);
                    ini = fim = versos[i];
                }
            }
            faixas.push(ini === fim ? `${ini}` : `${ini}-${fim}`);
            return `${c}:${faixas.join(',')}`;
        });
        return `${livroNome} ${blocos.join('; ')}`;
    };

    const montarTextoSelecao = (): string => {
        const vs = [...selecaoCopia].sort((a, b) => a - b).map(i => versiculos[i]).filter(Boolean);
        const corpo = vs.map(v => `${v.verse} ${v.text}`).join('\n');
        return `${montarReferenciaSelecao(vs)}\n\n${corpo}`;
    };

    const handleCopiarSelecao = async () => {
        const n = selecaoCopia.size;
        if (n === 0) return;
        await navigator.clipboard.writeText(montarTextoSelecao());
        success(`${n} versículo${n === 1 ? '' : 's'} copiado${n === 1 ? '' : 's'}!`);
        sairModoCopiaMultipla();
    };

    const handleCompartilharSelecao = async () => {
        if (selecaoCopia.size === 0) return;
        const texto = montarTextoSelecao();
        const vs = [...selecaoCopia].sort((a, b) => a - b).map(i => versiculos[i]).filter(Boolean);
        if (navigator.share) {
            try { await navigator.share({ title: montarReferenciaSelecao(vs), text: texto }); } catch { /* cancelado */ }
        } else {
            await navigator.clipboard.writeText(texto);
            success('Copiado para compartilhar!');
        }
        sairModoCopiaMultipla();
    };

    const handleCompartilhar = async () => {
        if (versiculoSelecionadoIdx == null) return;
        const v = versiculos[versiculoSelecionadoIdx];
        if (!v) return;
        const cap = getCapitulo(v);
        const texto = `"${v.text}"\n— ${livroNome} ${cap}:${v.verse}`;
        if (navigator.share) {
            try { await navigator.share({ title: `${livroNome} ${cap}:${v.verse}`, text: texto }); } catch { /* cancelled */ }
        } else {
            await navigator.clipboard.writeText(texto);
            success('Copiado para compartilhar!');
        }
    };

    const handleEstudar = async () => {
        if (versiculoSelecionadoIdx == null) return;
        const v = versiculos[versiculoSelecionadoIdx];
        if (!v) return;
        const cap = getCapitulo(v);
        setEstudoVersiculo(v);
        setEstudoAberto(true);
        setEstudoLoading(true);
        setEstudoTexto('');
        setVersiculoSelecionadoIdx(null);
        versiculoAnteriorRef.current = null;
        try {
            const { data, error: invokeError } = await supabase.functions.invoke('execute', {
                body: {
                    modo_id: 'explicar_passagem',
                    data: new Date().toISOString().split('T')[0],
                    referencia: `${livroNome} ${cap}:${v.verse}`,
                    versiculos: `(${v.verse}) ${v.text}`,
                    parte: 1
                }
            });
            if (invokeError) throw new Error(invokeError.context?.message || invokeError.message || 'Erro ao invocar função');
            if (data.ok && data.resultado) setEstudoTexto(data.resultado);
            else setEstudoTexto('Erro ao gerar explicação. Tente novamente.');
        } catch { setEstudoTexto('Erro de conexão. Tente novamente.'); }
        finally { setEstudoLoading(false); }
    };

    const handleRemoverNota = async () => {
        if (versiculoSelecionadoIdx == null) return;
        const v = versiculos[versiculoSelecionadoIdx];
        const cap = getCapitulo(v);
        await removerInteracaoPorVersiculoETipo('nota', livroAbrev, cap, v.verse);
        success('Nota removida');
        setMostrarNota(false);
        await carregarInteracoes();
    };

    const handleSalvarNota = async () => {
        if (versiculoSelecionadoIdx == null || !textoNota.trim()) return;
        const v = versiculos[versiculoSelecionadoIdx];
        if (!v) return;
        const cap = getCapitulo(v);
        const capMap = getInteracoesDoVersiculo(v);
        const existente = capMap.notas[v.verse];
        if (existente) {
            await atualizarNotaBiblia(existente.id!, textoNota.trim());
        } else {
            await salvarInteracaoBiblia({
                tipo: 'nota', livro_abrev: livroAbrev, livro_nome: livroNome,
                capitulo: cap, versiculo: v.verse, texto_versiculo: v.text, nota: textoNota.trim()
            });
        }
        success('Nota salva!');
        setMostrarNota(false);
        await carregarInteracoes();
    };

    return (
        <>
            {/* Player de áudio opcional — narração profissional da parte atual */}
            {livroId ? (
                <div className="mb-4">
                    <BibleAudioPlayer
                        key={`${livroId}-${capitulo}`}
                        versiculos={versiculos}
                        capitulo={capitulo}
                        livroId={livroId}
                        onVerseChange={(verse, chapter) =>
                            setAudioVerse(verse == null ? null : { verse, chapter: chapter ?? capitulo })
                        }
                        className="w-full max-w-md"
                    />
                </div>
            ) : null}
            <div className="space-y-1 relative" ref={containerRef}>
                {versiculos.map((v, idx) => {
                    const cap = getCapitulo(v);
                    const prevCap = idx > 0 ? getCapitulo(versiculos[idx - 1]) : cap;
                    const mostrarHeaderCapitulo = idx === 0 || cap !== prevCap;
                    const capMap = getInteracoesDoVersiculo(v);
                    const primeiroVersiculoNovoTestamento = Boolean(v.livroId && v.livroId >= 40)
                        && !versiculos.slice(0, idx).some(vv => vv.livroId && vv.livroId >= 40);

                    // Pericope header check
                    const pericopes = livroId ? getPericopes(livroId, cap) : [];
                    const pericope = pericopes.find(p => p.verse === v.verse);

                    return (
                        <div key={`${cap}-${v.verse}`} id={primeiroVersiculoNovoTestamento ? NOVO_TESTAMENTO_ANCHOR_ID : undefined}>
                            {/* Separador de capítulo - só mostra quando há múltiplos capítulos */}
                            {mostrarHeaderCapitulo && new Set(versiculos.map(vv => getCapitulo(vv))).size > 1 && (
                                <div className="flex items-center gap-3 py-4 mt-3 mb-1">
                                    <div className="flex-1 h-px bg-amber-500/25"></div>
                                    <span
                                        className="reading-serif font-semibold text-amber-700 dark:text-amber-400 tracking-wide"
                                        style={{ fontSize: `${Math.max(14, readingFontSize - 5)}px` }}
                                    >
                                        {livroNome} {cap}
                                    </span>
                                    <div className="flex-1 h-px bg-amber-500/25"></div>
                                </div>
                            )}
                            {/* Perícope - cabeçalho do acontecimento (escala com a fonte de leitura) */}
                            {pericope && (
                                <div className="mt-5 mb-2.5 first:mt-0">
                                    <h4
                                        className="reading-serif font-semibold text-amber-700 dark:text-amber-300 tracking-tight border-l-[3px] border-amber-500/50 pl-3"
                                        style={{ fontSize: `${Math.max(16, readingFontSize - 2)}px` }}
                                    >
                                        {pericope.title}
                                    </h4>
                                </div>
                            )}
                            <div
                                id={`plano-verse-${cap}-${v.verse}`}
                                onClick={() => handleVersiculoClick(idx)}
                                className={`relative pl-3 rounded-lg p-2 -ml-3 transition-all cursor-pointer select-none break-words
                                    ${getCorClasse(v)}
                                    ${audioVerse && audioVerse.chapter === cap && audioVerse.verse === v.verse ? 'bg-amber-500/15 ring-1 ring-amber-400/60' : ''}
                                    ${selecaoCopia.has(idx) ? 'bg-amber-500/15 ring-1 ring-amber-500/50' : versiculoSelecionadoIdx === idx ? 'bg-surface-2 ring-1 ring-amber-500/30' : 'hover:bg-surface-2'}
                                `}
                                style={{ textAlign: readingAlign }}
                            >
                                <p className="inline text-text-primary reading-serif break-words" style={{ fontSize: `${readingFontSize}px`, lineHeight: readingLineHeight }}>
                                    <span className="verse-num select-none">{v.verse}</span>
                                    {destacarLexico(v.text, lexico)}
                                </p>
                                <span className="inline-flex items-center gap-1 ml-1.5">
                                    {modoCopiaMultipla && selecaoCopia.has(idx) && <Check className="w-3.5 h-3.5 text-amber-500 inline" />}
                                    {isFavorito(v) && <Heart className="w-3.5 h-3.5 text-red-400 fill-red-400 inline" />}
                                    {temNota(v) && <StickyNote className="w-3.5 h-3.5 text-amber-500 inline" />}
                                </span>

                                {/* Barra de copiar vários — flutua acima do versículo que você está tocando */}
                                {modoCopiaMultipla && ultimoTapIdx === idx && (
                                    <div className="absolute -top-16 left-1/2 -translate-x-1/2 z-40 animate-in fade-in slide-in-from-bottom-2 duration-150" onClick={e => e.stopPropagation()}>
                                        <div className="flex items-center gap-1.5 bg-surface-2/95 border border-amber-500/50 rounded-2xl p-1.5 px-2 shadow-2xl backdrop-blur-xl">
                                            <span className="text-xs text-text-secondary px-1 whitespace-nowrap">{selecaoCopia.size} marcado{selecaoCopia.size === 1 ? '' : 's'}</span>
                                            <button onClick={handleCopiarSelecao} disabled={selecaoCopia.size === 0} className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 hover:bg-amber-500/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-xs font-semibold">
                                                <Copy className="w-3.5 h-3.5" /> Copiar
                                            </button>
                                            <button onClick={handleCompartilharSelecao} disabled={selecaoCopia.size === 0} className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 hover:bg-amber-500/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-xs font-semibold">
                                                <Share2 className="w-3.5 h-3.5" /> Enviar
                                            </button>
                                            <button onClick={sairModoCopiaMultipla} title="Cancelar" className="p-1.5 rounded-xl hover:bg-surface-2 text-text-muted hover:text-red-400 transition-colors">
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                )}
                                {/* MINI-TOOLBAR */}
                                {versiculoSelecionadoIdx === idx && (
                                    <div ref={toolbarRef} className="absolute -top-16 left-1/2 -translate-x-1/2 z-30 animate-in fade-in slide-in-from-bottom-2 duration-150" onClick={e => e.stopPropagation()}>
                                        <div className="flex items-center gap-1 bg-surface-2/95 border border-border-subtle rounded-2xl p-1.5 shadow-2xl backdrop-blur-xl">
                                            <button onClick={() => setMostrarCores(!mostrarCores)} className="p-3 rounded-xl hover:bg-surface-2 text-text-secondary hover:text-amber-600 dark:hover:text-amber-400 transition-colors" title="Destacar">
                                                <Palette className="w-5 h-5" />
                                            </button>
                                            <button onClick={handleFavoritar} className={`p-3 rounded-xl hover:bg-surface-2 transition-colors ${isFavorito(v) ? 'text-red-400' : 'text-text-secondary hover:text-red-400'}`} title="Favoritar">
                                                <Heart className={`w-5 h-5 ${isFavorito(v) ? 'fill-red-400' : ''}`} />
                                            </button>
                                            <button onClick={handleCopiar} className="p-3 rounded-xl hover:bg-surface-2 text-text-secondary hover:text-amber-600 dark:hover:text-amber-400 transition-colors" title="Copiar">
                                                <Copy className="w-5 h-5" />
                                            </button>
                                            <button onClick={entrarModoCopiaMultipla} className="p-3 rounded-xl hover:bg-surface-2 text-text-secondary hover:text-amber-600 dark:hover:text-amber-400 transition-colors" title="Selecionar vários para copiar">
                                                <ListChecks className="w-5 h-5" />
                                            </button>
                                            <button onClick={handleCompartilhar} className="p-3 rounded-xl hover:bg-surface-2 text-text-secondary hover:text-amber-600 dark:hover:text-amber-400 transition-colors" title="Compartilhar">
                                                <Share2 className="w-5 h-5" />
                                            </button>
                                            <button onClick={handleEstudar} className="p-3 rounded-xl hover:bg-surface-2 text-text-secondary hover:text-amber-600 dark:hover:text-amber-400 transition-colors" title="Estudar">
                                                <Lightbulb className="w-5 h-5" />
                                            </button>
                                            <button onClick={() => setMostrarNota(!mostrarNota)} className={`p-3 rounded-xl hover:bg-surface-2 transition-colors ${temNota(v) ? 'text-amber-500' : 'text-text-secondary hover:text-amber-600 dark:hover:text-amber-400'}`} title="Nota">
                                                <StickyNote className="w-5 h-5" />
                                            </button>
                                        </div>

                                        {mostrarCores && (
                                            <div className="mt-1.5 flex items-center gap-1.5 bg-surface-2/95 border border-border-subtle rounded-2xl p-2 justify-center animate-in fade-in duration-100">
                                                {CORES_DESTAQUE_PLANO.map(cor => (
                                                    <button key={cor.id} onClick={() => handleDestacar(cor.id)}
                                                        className={`w-9 h-9 rounded-full border-2 transition-all hover:border-amber-400 ${cor.bg} ${cor.border} ${capMap.destaques[v.verse]?.cor === cor.id ? 'ring-2 ring-amber-500 dark:ring-white scale-110' : ''}`}
                                                        title={cor.nome} />
                                                ))}
                                                {capMap.destaques[v.verse] && (
                                                    <button onClick={() => handleDestacar(capMap.destaques[v.verse].cor || 'yellow')}
                                                        className="p-1.5 rounded-lg hover:bg-red-500/20 text-text-muted hover:text-red-400" title="Remover destaque">
                                                        <X className="w-5 h-5" />
                                                    </button>
                                                )}
                                            </div>
                                        )}

                                        {/* A anotação agora abre num painel grande (modal) — ver "Modal de Anotação" abaixo */}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Modal de Estudo IA */}
            {estudoAberto && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-surface-0/90 backdrop-blur-md animate-in fade-in duration-200" onClick={() => setEstudoAberto(false)}>
                    <div className="glass-panel rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[85vh] flex flex-col overflow-hidden border border-border-subtle">
                        <div className="p-4 border-b border-border-subtle flex items-center justify-between bg-surface-2">
                            <div className="flex items-center gap-2">
                                <Lightbulb className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                                <span className="font-bold text-text-primary text-base">Estudo — {livroNome} {estudoVersiculo ? getCapitulo(estudoVersiculo) : capitulo}:{estudoVersiculo?.verse}</span>
                            </div>
                            <button onClick={() => setEstudoAberto(false)} className="p-2 rounded-lg hover:bg-surface-2 text-text-muted hover:text-text-primary"><X className="w-5 h-5" /></button>
                        </div>
                        {estudoVersiculo && (
                            <div className="px-4 py-3 bg-amber-500/10 border-b border-amber-500/20">
                                <p className="text-amber-800 dark:text-amber-200 text-base italic">&ldquo;{estudoVersiculo.text}&rdquo;</p>
                            </div>
                        )}
                        <div className="flex-1 overflow-y-auto p-4">
                            {estudoLoading ? (
                                <div className="flex flex-col items-center justify-center py-12 gap-3">
                                    <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
                                    <p className="text-text-muted text-sm">Gerando explicação...</p>
                                </div>
                            ) : (
                                <div className="text-text-primary text-base leading-relaxed whitespace-pre-wrap">{estudoTexto}</div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Anotação — painel grande, fácil de escrever */}
            {mostrarNota && versiculoSelecionadoIdx != null && (() => {
                const vNota = versiculos[versiculoSelecionadoIdx];
                if (!vNota) return null;
                const capNota = getCapitulo(vNota);
                const notaExistente = getInteracoesDoVersiculo(vNota).notas[vNota.verse];
                return (
                    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-surface-0/90 backdrop-blur-md animate-in fade-in duration-200" onClick={() => setMostrarNota(false)}>
                        <div className="glass-panel rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[88vh] flex flex-col overflow-hidden border border-border-subtle" onClick={e => e.stopPropagation()}>
                            <div className="p-4 border-b border-border-subtle flex items-center justify-between bg-surface-2">
                                <div className="flex items-center gap-2 min-w-0">
                                    <StickyNote className="w-5 h-5 text-amber-500 dark:text-amber-400 shrink-0" />
                                    <span className="font-bold text-text-primary text-base truncate">Anotação — {livroNome} {capNota}:{vNota.verse}</span>
                                </div>
                                <button onClick={() => setMostrarNota(false)} className="p-2 rounded-lg hover:bg-surface-2 text-text-muted hover:text-text-primary shrink-0"><X className="w-5 h-5" /></button>
                            </div>
                            <div className="px-4 py-3 bg-amber-500/10 border-b border-amber-500/20">
                                <p className="text-text-secondary text-sm italic">&ldquo;{vNota.text}&rdquo;</p>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4">
                                <textarea value={textoNota} onChange={e => setTextoNota(e.target.value)}
                                    placeholder="Escreva sua anotação..."
                                    className="w-full min-h-[180px] bg-surface-1 border border-border-strong rounded-xl px-4 py-3 text-text-primary text-base placeholder-text-muted focus:outline-none focus:border-amber-500/50 resize-none"
                                    rows={8} autoFocus />
                            </div>
                            <div className="p-4 border-t border-border-subtle flex justify-end gap-2 bg-surface-2/50">
                                {notaExistente && (
                                    <button onClick={handleRemoverNota} className="px-4 py-2.5 text-sm rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/30 font-medium">
                                        Apagar
                                    </button>
                                )}
                                <button onClick={handleSalvarNota} disabled={!textoNota.trim()}
                                    className="px-5 py-2.5 text-sm rounded-xl bg-amber-500 text-amber-950 font-bold hover:bg-amber-400 disabled:opacity-50">
                                    Salvar
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })()}

            <ToastContainer toasts={toasts} removeToast={removeToast} />
        </>
    );
}

// ===========================================
// TIPOS
// ===========================================

interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

type MenuOption = '1' | '2' | '3' | '4' | null;

// ===========================================
// MENU OPTIONS CONFIG
// ===========================================

const MENU_OPTIONS = [
    { id: '1', icon: Book, label: 'Ler Passagem', desc: 'Texto bíblico puro, leitura rápida.' },
    { id: '2', icon: Search, label: 'Entender a Passagem', desc: 'Contexto e explicação simples, bloco a bloco.' },
    { id: '3', icon: Rocket, label: 'Meditar e Viver', desc: 'Verso-chave, perguntas e um desafio para hoje.' },
    { id: '4', icon: Zap, label: 'Fixar em 1 Minuto', desc: 'Resumo, 3 pontos e teste rápido para lembrar.' },
] as const;

// ===========================================
// COMPONENTES PREMIUM
// ===========================================

function PremiumOptionCard({ option, onClick, disabled }: {
    option: typeof MENU_OPTIONS[number];
    onClick: () => void;
    disabled: boolean;
}) {
    const Icon = option.icon;
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className="group relative w-full text-left p-6 rounded-2xl glass-card disabled:opacity-50 disabled:cursor-not-allowed flex flex-col gap-4 overflow-hidden"
        >
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Icon className="w-24 h-24 -mr-8 -mt-8 text-text-primary rotate-12" />
            </div>

            <div className="flex items-center justify-between z-10">
                <div className="p-3 rounded-xl bg-surface-2 border border-border-subtle text-amber-600 dark:text-amber-300 transition-colors duration-300">
                    <Icon className="w-6 h-6" />
                </div>
                
            </div>

            <div className="z-10">
                <h3 className="reading-serif font-semibold text-text-primary text-lg mb-1 group-hover:text-amber-600 dark:group-hover:text-amber-300 transition-colors">{option.label}</h3>
                <p className="text-sm text-text-muted group-hover:text-text-secondary leading-relaxed">{option.desc}</p>
            </div>
        </button>
    );
}

// ===========================================
// CONTEXTO DA PARTE (sem IA) — introdução do livro + seções do capítulo.
// Aparece ao carregar cada parte (capítulo) da leitura pessoal.
// ===========================================
function ContextoDaParte({ livroId, capitulo, livroNome }: {
    livroId?: number;
    capitulo: number;
    livroNome: string;
}) {
    const [aberto, setAberto] = useState(false);

    if (!livroId) return null;
    const intro = getIntroducaoLivro(livroId);
    const secoes = getPericopes(livroId, capitulo);
    if (!intro && secoes.length === 0) return null;

    const nome = livroNome
        ? livroNome.charAt(0).toUpperCase() + livroNome.slice(1).toLowerCase()
        : '';

    return (
        <div className="mb-4 rounded-2xl border border-amber-500/25 bg-amber-500/[0.06] dark:bg-amber-500/[0.05] overflow-hidden">
            {/* Cabeçalho: livro + tema (clicável abre a introdução) */}
            <button
                type="button"
                onClick={() => intro && setAberto((v) => !v)}
                className={`w-full flex items-center gap-2.5 px-4 py-3 text-left ${intro ? 'hover:bg-amber-500/[0.08] transition-colors' : 'cursor-default'}`}
            >
                <span className="shrink-0 p-1.5 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400">
                    <Info className="w-4 h-4" />
                </span>
                <span className="min-w-0 flex-1">
                    <span className="block text-[11px] uppercase tracking-wider text-amber-700/70 dark:text-amber-400/60 font-semibold">
                        Contexto da leitura
                    </span>
                    <span className="block text-sm font-semibold text-text-primary truncate">
                        {nome} {capitulo}
                        {intro && <span className="text-text-muted font-normal"> · {intro.tema}</span>}
                    </span>
                </span>
                {intro && (
                    <ChevronDown className={`w-4 h-4 shrink-0 text-amber-600/60 dark:text-amber-400/60 transition-transform ${aberto ? 'rotate-180' : ''}`} />
                )}
            </button>

            {/* Introdução do livro (expansível) */}
            {intro && aberto && (
                <div className="px-4 pb-3 -mt-0.5 space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-text-muted">
                        <span><span className="font-semibold text-text-secondary">Categoria:</span> {intro.categoria}</span>
                        <span><span className="font-semibold text-text-secondary">Autor:</span> {intro.autor}</span>
                        <span><span className="font-semibold text-text-secondary">Época:</span> {intro.epoca}</span>
                    </div>
                    <p className="reading-serif text-sm leading-relaxed text-text-secondary">
                        {intro.resumo}
                    </p>
                </div>
            )}

            {/* Seções deste capítulo (quando houver) */}
            {secoes.length > 0 && (
                <div className={`px-4 py-3 border-t border-amber-500/15 ${intro ? '' : 'border-t-0'}`}>
                    <p className="text-[11px] uppercase tracking-wider text-amber-700/70 dark:text-amber-400/60 font-semibold mb-1.5">
                        Neste capítulo
                    </p>
                    <ul className="flex flex-wrap gap-1.5">
                        {secoes.map((s, i) => (
                            <li
                                key={i}
                                className="text-xs px-2.5 py-1 rounded-full bg-surface-1 dark:bg-surface-2 border border-border-subtle text-text-secondary"
                            >
                                {s.title}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}

function ChatBubble({ message, versiculosInterativos, livroInfo, readingFontSize, readingLineHeight, readingAlign, lexico, mostrarContexto }: {
    message: ChatMessage;
    versiculosInterativos?: Versiculo[];
    livroInfo?: { abrev: string; nome: string; capitulo: number; livroId?: number };
    readingFontSize: number;
    readingLineHeight: number;
    readingAlign: ReadingAlign;
    lexico?: string[];
    mostrarContexto?: boolean;
}) {
    const isUser = message.role === 'user';
    const temVersiculosInterativos = message.content.includes('%%VERSICULOS_INTERATIVOS%%') && versiculosInterativos && versiculosInterativos.length > 0 && livroInfo;

    // Mensagens do assistente - sem bolha, tela toda para leitura
    if (!isUser) {
        if (temVersiculosInterativos) {
            const partes = message.content.split('%%VERSICULOS_INTERATIVOS%%');
            return (
                <div className="animate-enter mb-4">
                    {/* Texto antes dos versículos */}
                    {partes[0] && (
                        <div className="whitespace-pre-wrap leading-relaxed prose dark:prose-invert prose-p:my-2 prose-strong:text-amber-700 dark:prose-strong:text-amber-300 prose-headings:text-amber-800 dark:prose-headings:text-amber-200 prose-headings:font-bold max-w-none break-words mb-3" style={{ fontSize: `${Math.max(16, readingFontSize - 2)}px` }}>
                            <ReactMarkdown>{partes[0]}</ReactMarkdown>
                        </div>
                    )}

                    {/* Contexto da parte (sem IA) — só na leitura pessoal */}
                    {mostrarContexto && (
                        <ContextoDaParte
                            livroId={livroInfo!.livroId}
                            capitulo={livroInfo!.capitulo}
                            livroNome={livroInfo!.nome}
                        />
                    )}

                    {/* Versículos interativos - sem container extra */}
                    <VersiculosInterativos
                        versiculos={versiculosInterativos!}
                        referencia={`${livroInfo!.nome} ${livroInfo!.capitulo}`}
                        livroAbrev={livroInfo!.abrev}
                        livroNome={livroInfo!.nome}
                        capitulo={livroInfo!.capitulo}
                        livroId={livroInfo!.livroId}
                        readingFontSize={readingFontSize}
                        readingLineHeight={readingLineHeight}
                        readingAlign={readingAlign}
                        lexico={lexico}
                    />

                    {/* Texto depois dos versículos */}
                    {partes[1] && (
                        <div className="whitespace-pre-wrap leading-relaxed prose dark:prose-invert prose-p:my-2 prose-strong:text-amber-700 dark:prose-strong:text-amber-300 prose-headings:text-amber-800 dark:prose-headings:text-amber-200 prose-headings:font-bold max-w-none break-words mt-3" style={{ fontSize: `${Math.max(16, readingFontSize - 2)}px` }}>
                            <ReactMarkdown>{partes[1].replace('%%EXPLICACAO_SLOT%%', '')}</ReactMarkdown>
                        </div>
                    )}
                </div>
            );
        }

        // Remove placeholders que não foram renderizados
        const conteudoLimpo = message.content.replace('%%VERSICULOS_INTERATIVOS%%', '').replace('%%EXPLICACAO_SLOT%%', '');

        return (
            <div className="animate-enter mb-4">
                <div className="whitespace-pre-wrap leading-relaxed prose dark:prose-invert prose-p:my-2 prose-strong:text-amber-700 dark:prose-strong:text-amber-300 prose-headings:text-amber-800 dark:prose-headings:text-amber-200 prose-headings:font-bold max-w-none break-words" style={{ fontSize: `${Math.max(16, readingFontSize - 2)}px` }}>
                    <ReactMarkdown>{conteudoLimpo}</ReactMarkdown>
                </div>
            </div>
        );
    }

    // Mensagens do usuário mantêm o estilo de bolha (compactas)
    return (
        <div className="flex justify-end animate-enter mb-3">
            <div className="max-w-[70%] rounded-2xl px-4 py-2.5 bg-amber-600 text-amber-50 rounded-br-none shadow-lg shadow-amber-900/20">
                <div className="text-sm md:text-base whitespace-pre-wrap leading-relaxed">
                    <ReactMarkdown>{message.content}</ReactMarkdown>
                </div>
            </div>
        </div>
    );
}

// ===========================================
// PÁGINA PRINCIPAL
// ===========================================

// ===========================================
// PÁGINA PRINCIPAL (WRAPPER)
// ===========================================

export default function PlanoLeituraPage() {
    return (
        <Suspense fallback={
            <CosmicBackground className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
            </CosmicBackground>
        }>
            <PlanoLeituraContent />
        </Suspense>
    );
}

function PlanoLeituraContent() {
    const searchParams = useSearchParams();
    const planoId = searchParams.get('plano_id');
    const diaQuery = searchParams.get('dia');
    const lerDirect = searchParams.get('ler') === '1'; // ?ler=1 -> abre direto "Ler Passagem"
    const isPlanoMode = Boolean(planoId);

    const [passagem, setPassagem] = useState<PassagemSecao6 | null>(null);
    const [loading, setLoading] = useState(true);
    // Se ?ler=1, já começa no modo "Ler Passagem" (1) para pular o menu
    const [activeOption, setActiveOption] = useState<MenuOption>(lerDirect ? '1' : null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);  // Track reading progress
    const currentPageRef = useRef(1);  // Ref for immediate access
    const [bibleData, setBibleData] = useState<{ textoFormatado: string; versiculos: Versiculo[]; capitulosCarregados: number[] } | null>(null);
    const [versiculosPaginaAtual, setVersiculosPaginaAtual] = useState<Versiculo[]>([]);
    const [livroInfoAtual, setLivroInfoAtual] = useState<{ abrev: string; nome: string; capitulo: number; livroId?: number }>({ abrev: '', nome: '', capitulo: 0 });
    const [inscricaoAtiva, setInscricaoAtiva] = useState<(InscricaoPlano & { plano: Plano }) | null>(null);
    const [diaExibido, setDiaExibido] = useState<number>(1);
    const [leituraDiaConcluida, setLeituraDiaConcluida] = useState(false);
    const [isLoadingExplicacao, setIsLoadingExplicacao] = useState(false);
    const [readingFontSize, setReadingFontSize] = useState(DEFAULT_READING_FONT_SIZE);
    const [readingLineHeight, setReadingLineHeight] = useState(DEFAULT_READING_LINE_HEIGHT);
    const [readingAlign, setReadingAlign] = useState<ReadingAlign>('left');
    const [mostrarAjustesLeitura, setMostrarAjustesLeitura] = useState(false);
    // Capítulo em foco na rolagem (etiqueta discreta fixa que acompanha a leitura)
    const [capituloFoco, setCapituloFoco] = useState<number | null>(null);
    const [montado, setMontado] = useState(false);
    const [cabecalhoVisivel, setCabecalhoVisivel] = useState(true);
    const cabecalhoRef = useRef<HTMLDivElement>(null);
    const chatEndRef = useRef<HTMLDivElement>(null);
    const chatStartRef = useRef<HTMLDivElement>(null);
    const pendingScrollRef = useRef<'top' | 'bottom' | 'restore' | 'novo-testamento' | 'inicio-ultima' | null>(null);
    const isRestoringScrollRef = useRef(false);

    const dataHoje = getDataHoje();

    // Carregar passagem (Do dia ou do Plano)
    useEffect(() => {
        async function loadPassagem() {
            setLoading(true);
            try {
                if (planoId) {
                    // MODO PLANO ESPECÍFICO
                    const inscricoes = await getMinhasInscricoes();
                    const inscricao = inscricoes.find(i => i.plano_id === planoId) || null;
                    setInscricaoAtiva(inscricao);

                    const parsedDia = diaQuery ? Number.parseInt(diaQuery, 10) : NaN;
                    const diaPreferido = Number.isFinite(parsedDia) && parsedDia > 0
                        ? parsedDia
                        : (inscricao?.dia_atual ?? 1);

                    let diaData = await getDiaDoPlano(planoId, diaPreferido);
                    let diaCarregado = diaPreferido;

                    if (!diaData) {
                        const primeiroDia = await getPrimeiroDiaDoPlano(planoId);
                        if (primeiroDia) {
                            diaData = primeiroDia;
                            diaCarregado = primeiroDia.dia_numero;
                        }
                    }

                    if (diaData) {
                        setDiaExibido(diaCarregado);

                        // Adaptar para PassagemSecao6
                        const passagemAdaptada: PassagemSecao6 = {
                            data: dataHoje,
                            referencia: diaData.referencia,
                            arquetipo_maestro: 'Leitura do Plano',
                            lexico_do_dia: [],
                            estrutura_dinamica: [],
                            insights_pre_minerados: [{
                                familia: 'Contexto',
                                tese: diaData.titulo_dia || 'Leitura Diaria',
                                verso_suporte: '',
                                voz_performance: 'Mentor'
                            }],
                        };
                        setPassagem(passagemAdaptada);
                        console.log('[PLANO] Carregado dia', diaCarregado, ':', diaData.referencia);
                    } else {
                        console.warn('[PLANO] Nenhum dia disponivel para o plano:', planoId);
                        setPassagem(null);
                    }
                } else {
                    // MODO DIÁRIO (Original)
                    setInscricaoAtiva(null);
                    setDiaExibido(1);
                    const { getPassagemUnificada } = await import('@/lib/supabase');
                    const dados = await getPassagemUnificada(dataHoje);

                    if (dados) {
                        console.log('✅ [PLANO] Passagem carregada com sucesso:', dados.referencia);
                        setPassagem(dados);
                    } else {
                        console.error('❌ [PLANO] Falha total: getPassagemUnificada retornou null para', dataHoje);

                        // Tentativa de auto-reparo: buscar explicitamente 2026-02-04 se for a data de hoje
                        if (dataHoje === '2026-02-04') {
                            console.log('🔄 [PLANO] Tentando forçar recarga...');
                        }
                    }
                }
            } catch (error) {
                console.error('Erro ao carregar passagem:', error);
                // Último recurso
                const dataLocal = getPassagemDoDia(dataHoje);
                setPassagem(dataLocal);
            } finally {
                setLoading(false);
            }
        }
        loadPassagem();
    }, [dataHoje, planoId, diaQuery]);

    useEffect(() => {
        if (!isPlanoMode) {
            setLeituraDiaConcluida(false);
            return;
        }
        setLeituraDiaConcluida(lerLeituraConcluidaLocal());
    }, [isPlanoMode, planoId, diaExibido, dataHoje]);

    useEffect(() => {
        if (!isPlanoMode) return;
        setMessages([]);
        setVersiculosPaginaAtual([]);
        setActiveOption(null);
        setCurrentPage(1);
        currentPageRef.current = 1;
        setLivroInfoAtual({ abrev: '', nome: '', capitulo: 0 });
    }, [isPlanoMode, planoId, diaExibido]);

    // Carregar texto bíblico da API quando a passagem estiver disponível
    useEffect(() => {
        async function loadBibleText() {
            if (passagem?.referencia) {
                console.log('📖 Carregando texto bíblico para:', passagem.referencia);
                const data = await buscarPassagem(passagem.referencia);
                if (data) {
                    setBibleData(data);
                    console.log('✅ Carregados', data.versiculos.length, 'versículos');
                }
            }
        }
        loadBibleText();
    }, [passagem?.referencia]);


    // Re-sync versículos quando bibleData carrega (corrige race condition)
    useEffect(() => {
        if (bibleData && (activeOption === '1' || isPlanoMode) && currentPage > 0) {
            atualizarContextoVersiculos(currentPage);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [bibleData]);

    // Scroll automático no chat
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const saved = Number(localStorage.getItem(READING_FONT_SIZE_KEY));
        if (Number.isFinite(saved)) {
            setReadingFontSize(limitarFonteLeitura(saved));
        }
        const savedLh = Number(localStorage.getItem(READING_LINE_HEIGHT_KEY));
        if (Number.isFinite(savedLh) && savedLh > 0) {
            setReadingLineHeight(Math.min(MAX_READING_LINE_HEIGHT, Math.max(MIN_READING_LINE_HEIGHT, savedLh)));
        }
        const savedAlign = localStorage.getItem(READING_ALIGN_KEY);
        if (savedAlign === 'left' || savedAlign === 'center' || savedAlign === 'right') {
            setReadingAlign(savedAlign);
        }
    }, []);

    const alterarFonteLeitura = (delta: number) => {
        setReadingFontSize(prev => {
            const next = limitarFonteLeitura(prev + delta);
            if (typeof window !== 'undefined') {
                localStorage.setItem(READING_FONT_SIZE_KEY, String(next));
            }
            return next;
        });
    };

    const resetarFonteLeitura = () => {
        setReadingFontSize(DEFAULT_READING_FONT_SIZE);
        if (typeof window !== 'undefined') {
            localStorage.setItem(READING_FONT_SIZE_KEY, String(DEFAULT_READING_FONT_SIZE));
        }
    };

    const alterarEspacamento = (delta: number) => {
        setReadingLineHeight(prev => {
            const next = Math.min(MAX_READING_LINE_HEIGHT, Math.max(MIN_READING_LINE_HEIGHT, Math.round((prev + delta) * 100) / 100));
            if (typeof window !== 'undefined') {
                localStorage.setItem(READING_LINE_HEIGHT_KEY, String(next));
            }
            return next;
        });
    };

    const definirAlinhamento = (align: ReadingAlign) => {
        setReadingAlign(align);
        if (typeof window !== 'undefined') {
            localStorage.setItem(READING_ALIGN_KEY, align);
        }
    };

    // Acompanha a rolagem e descobre o capítulo do versículo perto do topo da tela
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const alvos = Array.from(document.querySelectorAll<HTMLElement>('[id^="plano-verse-"]'));
        if (alvos.length === 0) { setCapituloFoco(null); return; }

        const tops = new Map<Element, number>();
        const obs = new IntersectionObserver((entries) => {
            for (const e of entries) {
                if (e.isIntersecting) tops.set(e.target, e.boundingClientRect.top);
                else tops.delete(e.target);
            }
            let melhorEl: HTMLElement | null = null;
            let menorTop = Infinity;
            tops.forEach((top, el) => {
                if (top < menorTop) { menorTop = top; melhorEl = el as HTMLElement; }
            });
            const m = melhorEl ? (melhorEl as HTMLElement).id.match(/^plano-verse-(\d+)-/) : null;
            if (m) {
                const cap = parseInt(m[1], 10);
                setCapituloFoco(prev => (prev === cap ? prev : cap));
            }
        }, { rootMargin: '-100px 0px -70% 0px', threshold: 0 });

        alvos.forEach(a => obs.observe(a));
        return () => obs.disconnect();
    }, [versiculosPaginaAtual, messages.length]);

    // Habilita o portal (so no cliente, apos montar)
    useEffect(() => { setMontado(true); }, []);

    // Observa o cabecalho: quando ele sai da tela ao rolar, mostramos a etiqueta de capitulo
    useEffect(() => {
        const el = cabecalhoRef.current;
        if (!el) return;
        const obs = new IntersectionObserver(
            ([entry]) => setCabecalhoVisivel(entry.isIntersecting),
            { threshold: 0 }
        );
        obs.observe(el);
        return () => obs.disconnect();
    }, [messages.length]);

    // Formatar data
    const formatarDataExtenso = (dataStr: string) => {
        return new Date(dataStr + 'T12:00:00').toLocaleDateString('pt-BR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    };

    const getPlanoProgressKey = () => {
        if (!planoId) return null;
        return `plano-progress:${planoId}:${diaExibido}`;
    };

    const getPlanoScrollKey = () => {
        if (!planoId) return null;
        return `plano-scroll:${planoId}:${diaExibido}`;
    };

    const getPlanoCompletedKey = () => {
        if (!planoId) return null;
        return `plano-completed:${planoId}:${diaExibido}`;
    };

    const getLeituraDiariaProgressKey = () => {
        if (isPlanoMode || !passagem?.referencia) return null;
        return `daily-reading-progress:${passagem.referencia}`;
    };

    const getLeituraDiariaScrollKey = () => {
        if (isPlanoMode || !passagem?.referencia) return null;
        return `daily-reading-scroll:${passagem.referencia}`;
    };

    // Chave permanente para salvar lista de dias concluídos no localStorage
    const getDiasConcluidosLocalKey = () => {
        if (!planoId) return null;
        return `plano-dias-concluidos:${planoId}`;
    };

    const salvarDiaConcluidoLocal = (dia: number) => {
        const key = getDiasConcluidosLocalKey();
        if (!key || typeof window === 'undefined') return;
        const raw = localStorage.getItem(key);
        const dias: number[] = raw ? JSON.parse(raw) : [];
        if (!dias.includes(dia)) {
            dias.push(dia);
            localStorage.setItem(key, JSON.stringify(dias));
        }
    };

    // Agrupa versículos por capítulo: [[cap14 versos], [cap15 versos], ...]
    const getCapitulosAgrupados = (): Versiculo[][] => {
        if (!bibleData) return [];
        const grupos: Versiculo[][] = [];
        let grupoAtual: Versiculo[] = [];
        let capAtual: number | undefined;
        let livroAtual: number | undefined;
        for (const v of bibleData.versiculos) {
            const cap = v.chapter ?? 0;
            const livro = v.livroId ?? 0;
            if ((cap !== capAtual || livro !== livroAtual) && grupoAtual.length > 0) {
                grupos.push(grupoAtual);
                grupoAtual = [];
            }
            capAtual = cap;
            livroAtual = livro;
            grupoAtual.push(v);
        }
        if (grupoAtual.length > 0) grupos.push(grupoAtual);
        return grupos;
    };

    const getTotalPartesLeitura = () => {
        const grupos = getCapitulosAgrupados();
        return Math.max(1, grupos.length);
    };

    // Retorna os versículos da parte (capítulo) indicada
    const getVersiculosDaParte = (parte: number): Versiculo[] => {
        const grupos = getCapitulosAgrupados();
        if (grupos.length === 0) return [];
        const idx = Math.min(Math.max(parte - 1, 0), grupos.length - 1);
        return grupos[idx];
    };

    const atualizarContextoVersiculos = (parte: number) => {
        if (!bibleData || !passagem) return;

        // No modo plano, mostra TODOS os capítulos desde o início até a parte atual
        if (isPlanoMode) {
            const grupos = getCapitulosAgrupados();
            const endIdx = Math.min(parte, grupos.length);
            const slice = grupos.slice(0, endIdx).flat();
            setVersiculosPaginaAtual(slice);
        } else {
            const slice = getVersiculosDaParte(parte);
            setVersiculosPaginaAtual(slice);
        }

        const versiculosDaParte = getVersiculosDaParte(parte);
        const primeiroVersiculoDaParte = versiculosDaParte[0];

        if (primeiroVersiculoDaParte?.livroId) {
            const livroIdParte = primeiroVersiculoDaParte.livroId;
            setLivroInfoAtual({
                abrev: getAbrevFromId(livroIdParte),
                nome: primeiroVersiculoDaParte.livro || passagem.referencia,
                capitulo: primeiroVersiculoDaParte.chapter ?? 0,
                livroId: livroIdParte
            });
            return;
        }

        const primeiraParte = passagem.referencia.split(';')[0].trim();
        const parsed = parseReferencia(primeiraParte);
        if (parsed) {
            const abrev = getAbrevFromId(parsed.livroId);
            const refParts = primeiraParte.match(/^(.+?)\s+\d/);
            const nomeOriginal = refParts ? refParts[1] : parsed.livro;
            setLivroInfoAtual({ abrev, nome: nomeOriginal, capitulo: parsed.capituloInicio, livroId: parsed.livroId });
        }
    };

    const salvarProgressoPlanoLocal = (parte: number) => {
        const progressKey = getPlanoProgressKey();
        if (!isPlanoMode || !progressKey || typeof window === 'undefined') return;

        const payload = {
            data: dataHoje,
            parte: Math.max(1, parte)
        };
        localStorage.setItem(progressKey, JSON.stringify(payload));
    };

    const salvarProgressoLeituraDiariaLocal = (parte: number) => {
        const progressKey = getLeituraDiariaProgressKey();
        if (!progressKey || typeof window === 'undefined') return;

        localStorage.setItem(progressKey, JSON.stringify({
            referencia: passagem?.referencia,
            parte: Math.max(1, parte)
        }));
    };

    const salvarLeituraConcluidaLocal = () => {
        const completedKey = getPlanoCompletedKey();
        if (!isPlanoMode || !completedKey || typeof window === 'undefined') return;
        localStorage.setItem(completedKey, '1');
    };

    const lerLeituraConcluidaLocal = () => {
        const completedKey = getPlanoCompletedKey();
        if (!isPlanoMode || !completedKey || typeof window === 'undefined') return false;
        return localStorage.getItem(completedKey) === '1';
    };

    const lerProgressoPlanoLocal = () => {
        const progressKey = getPlanoProgressKey();
        if (!isPlanoMode || !progressKey || typeof window === 'undefined') return 1;

        const raw = localStorage.getItem(progressKey);
        if (!raw) return 1;

        try {
            // A chave já identifica plano+dia, então o progresso não expira à
            // meia-noite — quem parou na parte 3 ontem continua da parte 3.
            const parsed = JSON.parse(raw) as { data?: string; parte?: number };
            const parte = Number(parsed?.parte ?? 1);
            if (!Number.isFinite(parte) || parte < 1) return 1;

            return Math.min(parte, getTotalPartesLeitura());
        } catch {
            return 1;
        }
    };

    const lerProgressoLeituraDiariaLocal = () => {
        const progressKey = getLeituraDiariaProgressKey();
        if (!progressKey || typeof window === 'undefined') return 1;

        const raw = localStorage.getItem(progressKey);
        if (!raw) return 1;

        try {
            const parsed = JSON.parse(raw) as { referencia?: string; parte?: number };
            if (!parsed?.referencia || parsed.referencia !== passagem?.referencia) {
                localStorage.removeItem(progressKey);
                return 1;
            }

            const parte = Number(parsed?.parte ?? 1);
            if (!Number.isFinite(parte) || parte < 1) return 1;

            return Math.min(parte, getTotalPartesLeitura());
        } catch {
            return 1;
        }
    };

    const salvarScrollPlanoLocal = (y: number) => {
        const scrollKey = getPlanoScrollKey();
        if (!isPlanoMode || !scrollKey || typeof window === 'undefined') return;
        localStorage.setItem(scrollKey, JSON.stringify({
            data: dataHoje,
            y: Math.max(0, Math.round(y)),
            parte: currentPageRef.current
        }));
    };

    const salvarScrollLeituraDiariaLocal = (y: number) => {
        const scrollKey = getLeituraDiariaScrollKey();
        if (!scrollKey || typeof window === 'undefined') return;

        localStorage.setItem(scrollKey, JSON.stringify({
            referencia: passagem?.referencia,
            y: Math.max(0, Math.round(y)),
            parte: currentPageRef.current
        }));
    };

    const lerScrollPlanoLocal = () => {
        const scrollKey = getPlanoScrollKey();
        if (!isPlanoMode || !scrollKey || typeof window === 'undefined') return 0;

        const raw = localStorage.getItem(scrollKey);
        if (!raw) return 0;

        try {
            const parsed = JSON.parse(raw) as { data?: string; y?: number };
            if (parsed?.data !== dataHoje) {
                localStorage.removeItem(scrollKey);
                return 0;
            }

            const y = Number(parsed?.y ?? 0);
            return Number.isFinite(y) && y > 0 ? y : 0;
        } catch {
            return 0;
        }
    };

    const lerScrollLeituraDiariaLocal = () => {
        const scrollKey = getLeituraDiariaScrollKey();
        if (!scrollKey || typeof window === 'undefined') return 0;

        const raw = localStorage.getItem(scrollKey);
        if (!raw) return 0;

        try {
            const parsed = JSON.parse(raw) as { referencia?: string; y?: number };
            if (!parsed?.referencia || parsed.referencia !== passagem?.referencia) {
                localStorage.removeItem(scrollKey);
                return 0;
            }

            const y = Number(parsed?.y ?? 0);
            return Number.isFinite(y) && y > 0 ? y : 0;
        } catch {
            return 0;
        }
    };

    const getParteNovoTestamento = () => {
        if (!bibleData) return null;
        const grupos = getCapitulosAgrupados();
        const idx = grupos.findIndex(grupo => grupo.some(v => v.livroId && v.livroId >= 40));
        return idx >= 0 ? idx + 1 : null;
    };

    const temNovoTestamento = Boolean(getParteNovoTestamento());

    const getParteVelhoTestamento = () => {
        if (!bibleData) return null;
        const grupos = getCapitulosAgrupados();
        const idx = grupos.findIndex(grupo => grupo.some(v => !v.livroId || v.livroId < 40));
        return idx >= 0 ? idx + 1 : null;
    };

    const temVelhoTestamento = Boolean(getParteVelhoTestamento());

    useEffect(() => {
        const action = pendingScrollRef.current;
        if (!action || typeof window === 'undefined') return;
        pendingScrollRef.current = null;

        window.requestAnimationFrame(() => {
            if (action === 'bottom') {
                chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
                return;
            }

            // Início da última mensagem: ao CONTINUAR (ou gerar estudo), o leitor
            // deve aterrissar no COMEÇO da nova parte — não no fim dela.
            if (action === 'inicio-ultima') {
                window.setTimeout(() => {
                    document.getElementById('msg-ultima')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 50);
                return;
            }

            if (action === 'novo-testamento') {
                window.setTimeout(() => {
                    const target = document.getElementById(NOVO_TESTAMENTO_ANCHOR_ID);
                    target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 50);
                return;
            }

            if (action === 'restore') {
                const y = isPlanoMode ? lerScrollPlanoLocal() : lerScrollLeituraDiariaLocal();
                isRestoringScrollRef.current = true;
                if (y > 0) {
                    window.scrollTo({ top: y, behavior: 'auto' });
                } else {
                    chatStartRef.current?.scrollIntoView({ behavior: 'auto', block: 'start' });
                }
                window.setTimeout(() => {
                    isRestoringScrollRef.current = false;
                }, 500);
                return;
            }

            chatStartRef.current?.scrollIntoView({ behavior: 'auto', block: 'start' });
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [messages, versiculosPaginaAtual]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (isPlanoMode) {
            let timer: number | null = null;
            const handleScroll = () => {
                if (isRestoringScrollRef.current) return;
                if (timer) window.clearTimeout(timer);
                timer = window.setTimeout(() => {
                    salvarScrollPlanoLocal(window.scrollY);
                }, 200);
            };

            window.addEventListener('scroll', handleScroll, { passive: true });
            return () => {
                if (timer) window.clearTimeout(timer);
                window.removeEventListener('scroll', handleScroll);
            };
        }

        if (activeOption !== '1') return;

        let timer: number | null = null;
        const handleScroll = () => {
            if (isRestoringScrollRef.current) return;
            if (timer) window.clearTimeout(timer);
            timer = window.setTimeout(() => {
                salvarScrollLeituraDiariaLocal(window.scrollY);
            }, 200);
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => {
            if (timer) window.clearTimeout(timer);
            window.removeEventListener('scroll', handleScroll);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isPlanoMode, planoId, diaExibido, dataHoje, activeOption, passagem?.referencia]);

    const gerarLeituraParte = (parteDesejada: number): string => {
        if (!passagem) return '';

        const totalPartes = getTotalPartesLeitura();
        const parteAtual = Math.min(Math.max(parteDesejada, 1), totalPartes);
        const ehUltimaParte = parteAtual >= totalPartes;

        currentPageRef.current = parteAtual;
        setCurrentPage(parteAtual);
        atualizarContextoVersiculos(parteAtual);
        if (isPlanoMode) {
            salvarProgressoPlanoLocal(parteAtual);
        } else {
            salvarProgressoLeituraDiariaLocal(parteAtual);
        }

        const linhaPersistencia = isPlanoMode
            ? '\n\n*Seu progresso fica salvo até o fim do dia.*'
            : '\n\n*Seu progresso fica salvo até você trocar de passagem.*';

        const versiculosDaParte = getVersiculosDaParte(parteAtual);
        const primeiroVersiculoDaParte = versiculosDaParte[0];
        const capDaParte = primeiroVersiculoDaParte?.chapter ?? null;
        const nomeLivroDaParte = capitalizarLivro(primeiroVersiculoDaParte?.livro || livroInfoAtual.nome || passagem.referencia);
        const tituloCapitulo = capDaParte ? `${nomeLivroDaParte} ${capDaParte}` : passagem.referencia;

        const rodapeAcao = ehUltimaParte
            ? `**Você concluiu ${tituloCapitulo}.** Essa era a última parte.\nToque em **Concluir leitura** abaixo para finalizar.`
            : 'Toque em **Continuar** abaixo para ler a próxima parte.';

        return `**${tituloCapitulo}**
*Parte ${parteAtual} de ${totalPartes} · ${passagem.referencia}*

---

%%VERSICULOS_INTERATIVOS%%

---

%%EXPLICACAO_SLOT%%**Você acabou de ler a Parte ${parteAtual} de ${totalPartes}** — ${tituloCapitulo}

${rodapeAcao}${linhaPersistencia}`;
    };

    // Gerar resposta do menu inicial
    const gerarRespostaMenuInicial = (): string => {
        if (!passagem) return 'Preparando ambiente de estudo...';

        return `Que bom ter você aqui.

Como você deseja mergulhar na passagem de hoje (**${passagem.referencia}**)?

---

Escolha uma das opções abaixo:

1. **Ler Passagem** — Texto bíblico puro
2. **Entender a Passagem** — Contexto e explicação simples
3. **Meditar e Viver** — Perguntas e desafio para hoje
4. **Fixar em 1 Minuto** — Resumo e teste rápido

Escolha o caminho e comece quando quiser.`;
    };

    // Processar comando do usuário
    const processarComando = async (comando: string) => {
        const cmdLower = comando.toLowerCase().trim();

        // Comandos de navegação
        if (['menu', 'voltar', 'voltar ao menu'].includes(cmdLower)) {
            if (isPlanoMode) {
                setActiveOption('1');
                return gerarLeituraParte(lerProgressoPlanoLocal());
            }
            setActiveOption(null);
            setCurrentPage(1);
            currentPageRef.current = 1;
            setVersiculosPaginaAtual([]);
            return gerarRespostaMenuInicial();
        }

        // Números do menu
        const numMatch = cmdLower.match(/^[1-4]$/);
        if (numMatch) {
            if (isPlanoMode) {
                return 'Neste plano, toque no botão **Continuar** abaixo para seguir a leitura do dia.';
            }
            const optionId = numMatch[0] as MenuOption;
            setActiveOption(optionId);
            setCurrentPage(1);
            currentPageRef.current = 1;  // Reset ref too
            return await gerarRespostaOpcao(optionId);
        }


        // Comando continuar
        if (['continuar', 'próximo', 'proximo', 'seguir', 'leia mais'].includes(cmdLower)) {
            return await processarContinuar();
        }

        // Comando EXPLICAR (funciona na leitura e no plano)
        if (['explicar', 'explicação', 'explicacao', 'contexto'].includes(cmdLower)) {
            if (isPlanoMode || activeOption === '1') {
                // Disparar explicação sob demanda (embute na mensagem da Parte)
                handleExplicar();
                return 'Gerando explicação... aguarde um momento.';
            }
            return 'O comando **EXPLICAR** só funciona na opção 1 (Ler Passagem).';
        }

        // Comando não reconhecido
        if (isPlanoMode) {
            return 'Toque no botão **Continuar** abaixo para avançar na leitura.';
        }
        return `Não entendi. Use os botões abaixo para navegar.`;
    };

    // Gerar resposta para cada opção
    const gerarRespostaOpcao = async (opcao: MenuOption): Promise<string> => {
        if (!passagem) return 'Passagem não carregada.';

        switch (opcao) {
            case '1':
                return gerarLeituraGuiada();
            case '2':
                return await gerarEstudoIA('estudo_profundo');
            case '3':
                return await gerarEstudoIA('aplicacao_pratica');
            case '4':
                return await gerarEstudoIA('sintese_rapida');
            default:
                return 'Opção não reconhecida.';
        }
    };

    // Opção 1: Leitura Pura (Sem Explicação)
    const gerarLeituraGuiada = (): string => {
        const parteInicial = isPlanoMode ? lerProgressoPlanoLocal() : lerProgressoLeituraDiariaLocal();
        return gerarLeituraParte(parteInicial);
    };

    // Gerar explicação sob demanda via IA (comando EXPLICAR)
    const gerarExplicacaoAtual = async (): Promise<string> => {
        if (!passagem) return '';

        const page = currentPageRef.current;

        // Pegar versículos do capítulo atual
        const versiculosDaParte = getVersiculosDaParte(page);
        const versiculosAtual = versiculosDaParte
            .map(v => `**${v.verse}.** ${v.text}`)
            .join('\n');

        try {
            console.log('🔍 Chamando Edge Function explicar_passagem...');

            const { data, error: invokeError } = await supabase.functions.invoke('execute', {
                body: {
                    modo_id: 'explicar_passagem',
                    data: new Date().toISOString().split('T')[0],
                    referencia: passagem.referencia,
                    versiculos: versiculosAtual,
                    parte: page
                }
            });

            if (invokeError) {
                throw new Error(invokeError.context?.message || invokeError.message || 'Erro ao invocar função');
            }

            if (data.ok && data.resultado) {
                return `**Entenda a passagem**
*Parte ${page} de ${passagem.referencia}*

---

${data.resultado}

---
Toque em **Continuar** abaixo para os próximos versículos.`;
            } else {
                throw new Error(data.error || 'Erro ao gerar explicação');
            }
        } catch (error) {
            console.error('Erro ao gerar explicação:', error);
            return `**Não foi possível gerar a explicação**

Não foi possível gerar a explicação no momento. Tente novamente.

---
Toque em **Continuar** abaixo para os próximos versículos.`;
        }
    };

    // Gerar APENAS o conteúdo da explicação (sem header/footer) para embutir na mensagem da Parte
    const gerarExplicacaoConteudo = async (): Promise<string> => {
        if (!passagem) return '';

        const page = currentPageRef.current;
        const versiculosDaParte = getVersiculosDaParte(page);
        const versiculosAtual = versiculosDaParte
            .map(v => `**${v.verse}.** ${v.text}`)
            .join('\n');

        try {
            const { data, error: invokeError } = await supabase.functions.invoke('execute', {
                body: {
                    modo_id: 'explicar_passagem',
                    data: new Date().toISOString().split('T')[0],
                    referencia: passagem.referencia,
                    versiculos: versiculosAtual,
                    parte: page
                }
            });

            if (invokeError) throw new Error(invokeError.context?.message || invokeError.message || 'Erro ao invocar função');

            if (data.ok && data.resultado) {
                return data.resultado;
            }
            throw new Error(data.error || 'Erro ao gerar explicação');
        } catch (error) {
            console.error('Erro ao gerar explicação (conteúdo):', error);
            return 'Não foi possível gerar a explicação no momento.';
        }
    };

    // Gerar estudo via IA (Edge Function)
    // Busca o estudo (cache de sessão → servidor). Usado tanto pela ação do
    // usuário quanto pelo prefetch silencioso em background.
    const buscarEstudo = async (tipoEstudo: string): Promise<string | null> => {
        if (!passagem) return null;
        const versiculosTexto = bibleData
            ? bibleData.versiculos.map(v => `${v.verse}. ${v.text?.replace(/<[^>]*>/g, '') || ''}`).join('\n')
            : '';
        if (!versiculosTexto) return null;

        // Cache de sessão (instantâneo na 2ª vez no mesmo aparelho)
        const cacheKey = `estudo:${passagem.referencia}:${tipoEstudo}`;
        if (typeof window !== 'undefined') {
            const local = sessionStorage.getItem(cacheKey);
            if (local) return local;
        }

        const { data, error: invokeError } = await supabase.functions.invoke('execute', {
            body: {
                modo_id: 'estudo_biblico',
                data: new Date().toISOString().split('T')[0],
                referencia: passagem.referencia,
                versiculos: versiculosTexto,
                tipo_estudo: tipoEstudo
            }
        });
        if (invokeError) throw new Error(invokeError.context?.message || invokeError.message || 'Erro ao invocar função');
        if (!data.ok || !data.resultado) throw new Error(data.error || 'Erro ao gerar estudo');

        if (typeof window !== 'undefined') {
            try { sessionStorage.setItem(cacheKey, data.resultado); } catch { /* quota */ }
        }
        return data.resultado;
    };

    const gerarEstudoIA = async (tipoEstudo: string): Promise<string> => {
        if (!passagem) return 'Passagem não carregada.';
        if (!bibleData) return 'Os versículos ainda estão carregando. Tente novamente em instantes.';

        try {
            const resultado = await buscarEstudo(tipoEstudo);
            if (!resultado) return 'Os versículos ainda estão carregando. Tente novamente em instantes.';
            return resultado;
        } catch (error) {
            console.error('Erro ao gerar estudo IA:', error);
            return `**Não foi possível gerar o estudo**\n\nVerifique sua conexão e tente novamente.`;
        }
    };

    // PREFETCH: quando a passagem e os versículos estão prontos, aquece as 3
    // opções em background (sequencial, sem travar a UI). A 1ª também popula o
    // cache do servidor — então a opção que o usuário clicar já volta pronta.
    const prefetchDispARadoRef = useRef<string | null>(null);
    useEffect(() => {
        if (!passagem?.referencia || !bibleData) return;
        if (prefetchDispARadoRef.current === passagem.referencia) return;
        prefetchDispARadoRef.current = passagem.referencia;

        let cancelado = false;
        (async () => {
            for (const tipo of ['estudo_profundo', 'aplicacao_pratica', 'sintese_rapida']) {
                if (cancelado) return;
                try { await buscarEstudo(tipo); } catch { /* silencioso */ }
            }
        })();
        return () => { cancelado = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [passagem?.referencia, bibleData]);


    // Processar comando CONTINUAR
    const processarContinuar = async (): Promise<string> => {
        if (!passagem) return 'Passagem não carregada.';

        const page = currentPageRef.current;  // Use ref for immediate value

        // Sem os versículos carregados, o total de partes seria 1 e o dia
        // poderia ser concluído por engano — espera o carregamento.
        if ((isPlanoMode || activeOption === '1') && !bibleData) {
            return 'A leitura ainda está carregando. Tente novamente em instantes.';
        }

        // OPÇÃO 1: LEITURA GUIADA (Paginação Dinâmica)
        if (activeOption === '1' || isPlanoMode) {
            const totalPartes = getTotalPartesLeitura();

            console.log('📖 Opção 1 - Página atual:', page, 'Total partes:', totalPartes);

            // Se já estamos na última página ou além, mostra conclusão
            if (page >= totalPartes) {
                // LOGICA DE CONCLUSÃO DO PLANO
                if (isPlanoMode && !leituraDiaConcluida) {
                    setLeituraDiaConcluida(true);
                    salvarLeituraConcluidaLocal();
                    salvarDiaConcluidoLocal(diaExibido);

                    if (planoId) {
                        // Tentar salvar no banco (funciona se logado)
                        marcarDiaConcluido(planoId, diaExibido)
                            .then(ok => {
                                if (ok) console.log('✅ Dia concluído salvo no banco');
                                else console.log('⚠️ Dia concluído salvo apenas localmente (sem login)');
                            })
                            .catch(() => console.log('⚠️ Dia concluído salvo apenas localmente'));
                    }

                    if (planoId && inscricaoAtiva) {
                        // Atualizar dia_atual da inscrição
                        concluirDiaLeitura(inscricaoAtiva.id, inscricaoAtiva.user_id, diaExibido + 1, planoId, diaExibido)
                            .then(() => {
                                console.log('✅ Progresso da inscrição atualizado');
                                setInscricaoAtiva(prev => {
                                    if (!prev) return prev;
                                    return {
                                        ...prev,
                                        dia_atual: Math.max(prev.dia_atual, diaExibido + 1)
                                    };
                                });
                            })
                            .catch(e => console.error('❌ Erro ao salvar progresso', e));
                    }
                }

                const proximoDiaMsg = planoId
                    ? `\n\n**[Ver todos os dias](/plano-detalhes?plano_id=${planoId})**\n\n**[Ir para o próximo dia →](/plano-de-leitura?plano_id=${planoId}&dia=${diaExibido + 1})**`
                    : '';

                return `**Leitura concluída**

---

Você completou a leitura de **${passagem.referencia}**. Medite sobre o que leu e deixe a Palavra transformar o seu coração.

**Sugestão de oração:**

*"Senhor, obrigado por Tua Palavra. Que ela habite ricamente em mim e guie meus passos hoje. Em nome de Jesus. Amém."*${proximoDiaMsg}`;
            }

            // Avança para próxima página
            const nextPage = page + 1;
            return gerarLeituraParte(nextPage);
        }

        // Para outras opções (2-4 = IA), não tem paginação
        return `Este estudo já está completo. Volte ao menu para explorar outra opção.`;
    };

    // Gerar explicação sob demanda (botão Explicar) - embute na última mensagem da Parte
    const handleExplicar = async () => {
        if (isLoadingExplicacao) return;
        setIsLoadingExplicacao(true);
        try {
            const conteudo = await gerarExplicacaoConteudo();
            const page = currentPageRef.current;

            const explicacaoFormatada = `**Entenda a passagem**
*Parte ${page} de ${passagem?.referencia}*

${conteudo}

---

`;

            setMessages(prev => {
                const updated = [...prev];
                // Encontra a última mensagem da Parte (com versículos)
                for (let i = updated.length - 1; i >= 0; i--) {
                    if (updated[i].role === 'assistant' && updated[i].content.includes('%%VERSICULOS_INTERATIVOS%%')) {
                        if (updated[i].content.includes('%%EXPLICACAO_SLOT%%')) {
                            // Substituir o slot pela explicação
                            updated[i] = {
                                ...updated[i],
                                content: updated[i].content.replace('%%EXPLICACAO_SLOT%%', explicacaoFormatada)
                            };
                        }
                        break;
                    }
                }
                return updated;
            });
        } catch {
            setMessages(prev => {
                const updated = [...prev];
                for (let i = updated.length - 1; i >= 0; i--) {
                    if (updated[i].role === 'assistant' && updated[i].content.includes('%%EXPLICACAO_SLOT%%')) {
                        updated[i] = {
                            ...updated[i],
                            content: updated[i].content.replace('%%EXPLICACAO_SLOT%%', '*Não foi possível gerar a explicação.*\n\n---\n\n')
                        };
                        break;
                    }
                }
                return updated;
            });
        } finally {
            setIsLoadingExplicacao(false);
        }
    };

    // Última parte da leitura? Muda o rótulo do botão fixo para "Concluir leitura"
    const naUltimaParte = (isPlanoMode || activeOption === '1') && !!bibleData && currentPage >= getTotalPartesLeitura();

    // Inicia uma opção do menu (usada pelo CTA do hero e pelos cards)
    const iniciarOpcao = (optionId: MenuOption) => {
        if (!passagem || isProcessing) return;
        const option = MENU_OPTIONS.find(o => o.id === optionId);
        if (!option) return;
        setActiveOption(optionId);
        const parteSalva = optionId === '1' ? lerProgressoLeituraDiariaLocal() : 1;
        setMessages([{ role: 'user', content: `Quero ver: ${option.label}`, timestamp: new Date() }]);
        setIsProcessing(true);
        (async () => {
            const resp = await gerarRespostaOpcao(optionId);
            pendingScrollRef.current = optionId === '1'
                ? (parteSalva > 1 ? 'restore' : 'top')
                : 'bottom';
            setMessages(prev => [...prev, { role: 'assistant', content: resp, timestamp: new Date() }]);
            setIsProcessing(false);
        })();
    };

    // Enviar mensagem (Lógica central)
    const submitMessage = async (text: string) => {
        if (!text.trim() || isProcessing) return;

        const userMessage: ChatMessage = {
            role: 'user',
            content: text.trim(),
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        setInputValue('');
        setIsProcessing(true);

        try {
            const resposta = await processarComando(userMessage.content);

            const assistantMessage: ChatMessage = {
                role: 'assistant',
                content: resposta,
                timestamp: new Date()
            };

            // Conteúdo longo (leitura/estudo) → começa do início; resto → fim
            pendingScrollRef.current = resposta.includes('%%VERSICULOS_INTERATIVOS%%') || resposta.length > 600
                ? 'inicio-ultima'
                : 'bottom';
            setMessages(prev => [...prev, assistantMessage]);
        } catch (error) {
            const errorMessage: ChatMessage = {
                role: 'assistant',
                content: 'Desculpe, ocorreu um erro. Tente novamente.',
                timestamp: new Date()
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsProcessing(false);
        }
    };

    // Handler do Input de Texto
    const handleSend = () => {
        submitMessage(inputValue);
    };

    // Handler dos Botões de Ação Rápida
    const handleIrParaNovoTestamento = () => {
        const parteNovoTestamento = getParteNovoTestamento();
        if (!parteNovoTestamento || !passagem) return;

        setActiveOption('1');
        const content = gerarLeituraParte(parteNovoTestamento);
        pendingScrollRef.current = 'novo-testamento';
        setMessages(prev => {
            const updated = [...prev];
            for (let i = updated.length - 1; i >= 0; i--) {
                if (updated[i].role === 'assistant' && updated[i].content.includes('%%VERSICULOS_INTERATIVOS%%')) {
                    updated[i] = { ...updated[i], content, timestamp: new Date() };
                    return updated;
                }
            }
            return [...updated, { role: 'assistant', content, timestamp: new Date() }];
        });
    };

    const handleIrParaVelhoTestamento = () => {
        const parteVelhoTestamento = getParteVelhoTestamento();
        if (!parteVelhoTestamento || !passagem) return;

        setActiveOption('1');
        const content = gerarLeituraParte(parteVelhoTestamento);
        pendingScrollRef.current = 'inicio-ultima';
        setMessages(prev => {
            const updated = [...prev];
            for (let i = updated.length - 1; i >= 0; i--) {
                if (updated[i].role === 'assistant' && updated[i].content.includes('%%VERSICULOS_INTERATIVOS%%')) {
                    updated[i] = { ...updated[i], content, timestamp: new Date() };
                    return updated;
                }
            }
            return [...updated, { role: 'assistant', content, timestamp: new Date() }];
        });
    };

    const handleQuickAction = (action: string) => {
        submitMessage(action);
    };

    // Selecionar opção do menu visual
    const handleMenuClick = async (optionId: string) => {
        const userMessage: ChatMessage = {
            role: 'user',
            content: optionId,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        setIsProcessing(true);

        try {
            const resposta = await processarComando(optionId);

            const assistantMessage: ChatMessage = {
                role: 'assistant',
                content: resposta,
                timestamp: new Date()
            };

            pendingScrollRef.current = resposta.includes('%%VERSICULOS_INTERATIVOS%%') || resposta.length > 600
                ? 'inicio-ultima'
                : 'bottom';
            setMessages(prev => [...prev, assistantMessage]);
        } finally {
            setIsProcessing(false);
        }
    };

    // Iniciar com mensagem de boas-vindas
    useEffect(() => {
        if (!loading && passagem && messages.length === 0) {
            if (isPlanoMode) {
                if (!bibleData) return;
                setActiveOption('1');
                const parteSalva = isPlanoMode ? lerProgressoPlanoLocal() : lerProgressoLeituraDiariaLocal();
                const primeiraMensagemPlano: ChatMessage = {
                    role: 'assistant',
                    content: gerarLeituraParte(parteSalva),
                    timestamp: new Date()
                };
                pendingScrollRef.current = 'restore';
                setMessages([primeiraMensagemPlano]);
                return;
            }

            // Se vier ?ler=1, pulamos a mensagem de boas-vindas — o useEffect dedicado
            // abaixo trata do fluxo direto para "Ler Passagem".
            if (lerDirect) return;

            const welcomeMessage: ChatMessage = {
                role: 'assistant',
                content: gerarRespostaMenuInicial(),
                timestamp: new Date()
            };
            setMessages([welcomeMessage]);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loading, passagem, messages.length, isPlanoMode, bibleData, lerDirect]);

    // Modo direto ?ler=1: abre imediatamente "Ler Passagem" sem passar pelo menu.
    // Espera passagem + bibleData carregarem para que os versículos apareçam
    // corretamente na primeira renderização.
    useEffect(() => {
        if (!lerDirect) return;
        if (isPlanoMode) return;
        if (loading || !passagem || !bibleData) return;
        if (messages.length > 0) return;

        setActiveOption('1');
        const parteSalva = lerProgressoLeituraDiariaLocal();
        pendingScrollRef.current = parteSalva > 1 ? 'restore' : 'top';
        setMessages([
            { role: 'user', content: 'Quero ver: Ler Passagem', timestamp: new Date() },
        ]);
        setIsProcessing(true);
        (async () => {
            const resp = await gerarRespostaOpcao('1');
            pendingScrollRef.current = parteSalva > 1 ? 'restore' : 'top';
            setMessages(prev => [...prev, { role: 'assistant', content: resp, timestamp: new Date() }]);
            setIsProcessing(false);
        })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [lerDirect, isPlanoMode, loading, passagem, bibleData, messages.length]);

    // ===========================================
    // RENDER
    // ===========================================

    if (!loading && isPlanoMode && !passagem) {
        return (
            <CosmicBackground className="min-h-screen px-6 py-10">
                <div className="max-w-3xl mx-auto space-y-6">
                    <Link href="/planos" className="btn-glass px-4 py-2 rounded-full inline-flex items-center gap-2 text-sm font-medium">
                        <ArrowLeft className="w-4 h-4" />
                        Voltar aos Planos
                    </Link>
                    <div className="glass-panel rounded-3xl p-8 border border-amber-500/20">
                        <h1 className="reading-serif text-2xl md:text-3xl font-semibold text-text-primary mb-3">Plano sem leitura cadastrada</h1>
                        <p className="text-text-secondary leading-relaxed">
                            Este plano ainda não possui conteúdo do dia para abrir.
                            Assim que os dias forem cadastrados, ele passa a funcionar normalmente.
                        </p>
                    </div>
                </div>
            </CosmicBackground>
        );
    }

    return (
        <CosmicBackground className="min-h-screen pb-20 overflow-x-hidden selection:bg-amber-500/30">

            {/* Navbar Placeholder (or Back Button) */}
            <div className="w-full max-w-7xl mx-auto pt-8 px-6 mb-8 flex justify-between items-center z-10 relative">
                <BackButton href={planoId ? "/planos" : "/"} label={planoId ? "Planos" : "Início"} />
                {planoId && (
                    <Link href={`/plano-detalhes?plano_id=${planoId}`} className="btn-glass px-4 py-2 rounded-full flex items-center gap-2 text-sm font-medium group">
                        <Calendar className="w-4 h-4" />
                        Ver Todos os Dias
                    </Link>
                )}
            </div>

            {/* w-full é ESSENCIAL: sem ele, mx-auto num pai flex-col vira fit-content e
                conteúdo sem quebra (ex.: referência longa com truncate) infla a página
                inteira além da tela no celular, cortando o fim das linhas. */}
            <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 z-10 relative">

                {/* Header Section - compacto no modo plano */}
                {isPlanoMode ? (
                    <div className="text-center mb-6 animate-enter">
                        <h1 className="reading-serif text-2xl md:text-3xl font-semibold text-text-primary mb-1 tracking-tight">
                            {inscricaoAtiva?.plano?.titulo || 'Plano de Leitura'}
                        </h1>
                        <p className="text-text-secondary text-sm">
                            {inscricaoAtiva
                                ? `Dia ${diaExibido} de ${inscricaoAtiva.plano.duracao_dias}`
                                : "Mergulhe nas Escrituras"}
                        </p>
                    </div>
                ) : (
                    <div className="text-center mb-16 animate-enter">
                        <h1 className="reading-serif text-4xl md:text-6xl font-semibold text-text-primary mb-4 tracking-tight">
                            {inscricaoAtiva?.plano ? (
                                inscricaoAtiva.plano.titulo
                            ) : (
                                <>Plano de <span className="text-gradient-gold">Leitura</span></>
                            )}
                        </h1>
                        <p className="text-text-secondary text-lg max-w-2xl mx-auto">
                            {inscricaoAtiva
                                ? `Dia ${diaExibido} de ${inscricaoAtiva.plano.duracao_dias} • ${inscricaoAtiva.plano.descricao}`
                                : "Mergulhe nas Escrituras com profundidade, contexto e aplicação prática."
                            }
                        </p>
                    </div>
                )}

                {!activeOption && !isPlanoMode ? (
                    // -------------------------------------------
                    // VISTA INICIAL (MENU GRID)
                    // -------------------------------------------
                    <div className="animate-enter" style={{ animationDelay: '0.1s' }}>

                        {/* Daily Passage Card (Hero) */}
                        <div className="glass-panel rounded-3xl p-8 mb-12 flex flex-col md:flex-row items-center justify-between gap-8 border-amber-500/20 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 blur-[100px] rounded-full -mr-32 -mt-32 pointer-events-none"></div>

                            <div className="flex-1 text-center md:text-left z-10">
                                <h2 className="text-sm font-medium text-text-muted tracking-wide mb-2">
                                    {inscricaoAtiva ? `Leitura do dia ${diaExibido}` : `Passagem de hoje · ${formatarDataExtenso(dataHoje)}`}
                                </h2>

                                {loading ? (
                                    <div className="h-12 w-64 skeleton-shimmer"></div>
                                ) : passagem ? (
                                    <div className="space-y-2">
                                        <h3 className="reading-serif text-4xl md:text-5xl font-semibold text-text-primary tracking-tight">{passagem.referencia}</h3>
                                        <div className="flex flex-wrap gap-2 justify-center md:justify-start mt-3">
                                            <span className="px-3 py-1 rounded-lg bg-surface-2 border border-border-subtle text-xs text-text-secondary">
                                                Arquétipo: <span className="text-amber-600 dark:text-amber-400 font-bold">{passagem.arquetipo_maestro}</span>
                                            </span>
                                            <span className="px-3 py-1 rounded-lg bg-surface-2 border border-border-subtle text-xs text-text-secondary">
                                                Tema: {passagem.insights_pre_minerados[0]?.tese.substring(0, 40)}...
                                            </span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-red-400 bg-red-500/10 px-4 py-2 rounded-lg border border-red-500/20 inline-block">
                                        A leitura de hoje ainda não está disponível. Verifique sua conexão e tente novamente em instantes.
                                    </div>
                                )}
                            </div>

                            <div className="z-10">
                                <button
                                    onClick={() => iniciarOpcao('1')}
                                    disabled={loading || !passagem}
                                    className="btn-premium px-8 py-4 rounded-xl flex items-center gap-3 shadow-amber-500/20 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Book className="w-5 h-5" />
                                    Começar Leitura
                                </button>
                            </div>
                        </div>

                        {/* Options Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {MENU_OPTIONS.map((option) => (
                                <PremiumOptionCard
                                    key={option.id}
                                    option={option}
                                    disabled={loading || !passagem}
                                    onClick={() => iniciarOpcao(option.id as MenuOption)}
                                />
                            ))}
                        </div>
                    </div>
                ) : (
                    // -------------------------------------------
                    // VISTA CHAT (INTERATIVA) - Sem bolha externa para maximizar leitura
                    // -------------------------------------------
                    <div className="w-full max-w-4xl mx-auto animate-enter flex flex-col min-h-[70vh]">

                        {/* Chat Header - compacto e sticky */}
                        <div ref={cabecalhoRef} className="px-4 py-3 border-b border-border-subtle/50 flex flex-col gap-3 sticky top-0 z-20 bg-surface-0/60 backdrop-blur-md rounded-t-xl">
                            {/* Barra fina de progresso da leitura */}
                            {(isPlanoMode || activeOption === '1') && getTotalPartesLeitura() > 1 && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-border-subtle/60 overflow-hidden">
                                    <div
                                        className="h-full bg-amber-500 transition-all duration-300"
                                        style={{ width: `${Math.min(100, Math.round((currentPage / getTotalPartesLeitura()) * 100))}%` }}
                                    />
                                </div>
                            )}
                            <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-3 min-w-0">
                                    <button
                                        onClick={() => setActiveOption(null)}
                                        aria-label="Voltar ao menu"
                                        className="p-2.5 -ml-1 hover:bg-surface-2 rounded-full transition-colors text-text-muted hover:text-text-primary"
                                    >
                                        <ArrowLeft className="w-5 h-5" />
                                    </button>
                                    <div className="min-w-0">
                                        {(isPlanoMode || activeOption === '1') && livroInfoAtual.nome && (
                                            <p className="text-[10px] uppercase tracking-[0.18em] text-text-muted font-semibold truncate">
                                                Você está lendo agora
                                            </p>
                                        )}
                                        <h2 className="font-bold text-text-primary text-base truncate">
                                            {(isPlanoMode || activeOption === '1') && livroInfoAtual.nome
                                                ? `${capitalizarLivro(livroInfoAtual.nome)} ${capituloFoco ?? livroInfoAtual.capitulo}`
                                                : isPlanoMode
                                                    ? 'Leitura do Plano'
                                                    : MENU_OPTIONS.find(o => o.id === activeOption)?.label}
                                        </h2>
                                        <p className="text-[11px] text-amber-700 dark:text-amber-400/80 truncate font-semibold">
                                            {(isPlanoMode || activeOption === '1') && getTotalPartesLeitura() > 1
                                                ? `Parte ${currentPage} de ${getTotalPartesLeitura()} · ${passagem?.referencia}`
                                                : passagem?.referencia}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-1 shrink-0">
                                    <button
                                        type="button"
                                        onClick={() => alterarFonteLeitura(-2)}
                                        className="p-2 hover:bg-surface-2 rounded-lg transition-colors text-text-secondary hover:text-text-primary disabled:opacity-40"
                                        title="Diminuir fonte"
                                        disabled={readingFontSize <= MIN_READING_FONT_SIZE}
                                    >
                                        <ZoomOut className="w-4 h-4" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={resetarFonteLeitura}
                                        className="px-2.5 py-1.5 hover:bg-white/10 rounded-lg transition-colors text-xs font-bold text-slate-300 hover:text-white"
                                        title="Restaurar fonte"
                                    >
                                        A
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => alterarFonteLeitura(2)}
                                        className="p-2 hover:bg-surface-2 rounded-lg transition-colors text-text-secondary hover:text-text-primary disabled:opacity-40"
                                        title="Aumentar fonte"
                                        disabled={readingFontSize >= MAX_READING_FONT_SIZE}
                                    >
                                        <ZoomIn className="w-4 h-4" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setMostrarAjustesLeitura(v => !v)}
                                        className={`p-2 rounded-lg transition-colors ${mostrarAjustesLeitura ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400' : 'hover:bg-surface-2 text-text-secondary hover:text-text-primary'}`}
                                        title="Espaçamento e alinhamento"
                                    >
                                        <SlidersHorizontal className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            {mostrarAjustesLeitura && (
                                <div className="flex flex-col gap-2.5 pt-2 border-t border-border-subtle/40 animate-in fade-in slide-in-from-top-1 duration-150">
                                    <div className="flex items-center justify-between gap-3">
                                        <span className="text-xs font-semibold text-text-secondary">Espaçamento</span>
                                        <div className="flex items-center gap-1.5">
                                            <button type="button" onClick={() => alterarEspacamento(-0.15)} disabled={readingLineHeight <= MIN_READING_LINE_HEIGHT} className="w-8 h-8 rounded-lg hover:bg-surface-2 text-text-secondary hover:text-text-primary disabled:opacity-40 text-lg font-bold leading-none">−</button>
                                            <span className="text-xs text-text-secondary w-9 text-center tabular-nums">{readingLineHeight.toFixed(2)}</span>
                                            <button type="button" onClick={() => alterarEspacamento(0.15)} disabled={readingLineHeight >= MAX_READING_LINE_HEIGHT} className="w-8 h-8 rounded-lg hover:bg-surface-2 text-text-secondary hover:text-text-primary disabled:opacity-40 text-lg font-bold leading-none">+</button>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between gap-3">
                                        <span className="text-xs font-semibold text-text-secondary">Alinhamento</span>
                                        <div className="flex items-center gap-1.5">
                                            <button type="button" onClick={() => definirAlinhamento('left')} className={`p-2 rounded-lg transition-colors ${readingAlign === 'left' ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400' : 'hover:bg-surface-2 text-text-secondary'}`} title="Esquerda"><AlignLeft className="w-4 h-4" /></button>
                                            <button type="button" onClick={() => definirAlinhamento('center')} className={`p-2 rounded-lg transition-colors ${readingAlign === 'center' ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400' : 'hover:bg-surface-2 text-text-secondary'}`} title="Centro"><AlignCenter className="w-4 h-4" /></button>
                                            <button type="button" onClick={() => definirAlinhamento('right')} className={`p-2 rounded-lg transition-colors ${readingAlign === 'right' ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400' : 'hover:bg-surface-2 text-text-secondary'}`} title="Direita"><AlignRight className="w-4 h-4" /></button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {temNovoTestamento && (
                                <div className="grid grid-cols-2 gap-2 w-full">
                                    {temVelhoTestamento && (
                                        <button
                                            type="button"
                                            onClick={handleIrParaVelhoTestamento}
                                            className="group flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 hover:border-amber-400/60 hover:bg-amber-500/20 transition-all active:scale-[0.97] shadow-sm shadow-amber-900/20"
                                        >
                                            <ChevronLeft className="w-4 h-4 shrink-0 text-amber-600/60 dark:text-amber-500/60 group-hover:text-amber-500 dark:group-hover:text-amber-400 group-hover:-translate-x-0.5 transition-all" />
                                            <span className="flex flex-col items-start leading-tight min-w-0">
                                                <span className="text-[12px] font-bold text-amber-700 dark:text-amber-300 group-hover:text-amber-800 dark:group-hover:text-amber-200 transition-colors whitespace-nowrap">Antigo Testamento</span>
                                                <span className="text-[10px] text-amber-600/70 dark:text-amber-500/70 font-medium whitespace-nowrap">Voltar ao começo</span>
                                            </span>
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={handleIrParaNovoTestamento}
                                        className={`group flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 hover:border-amber-400/60 hover:bg-amber-500/20 transition-all active:scale-[0.97] shadow-sm shadow-amber-900/20 ${temVelhoTestamento ? '' : 'col-span-2'}`}
                                    >
                                        <span className="flex flex-col items-start leading-tight min-w-0">
                                            <span className="text-[12px] font-bold text-amber-700 dark:text-amber-300 group-hover:text-amber-800 dark:group-hover:text-amber-200 transition-colors whitespace-nowrap">Novo Testamento</span>
                                            <span className="text-[10px] text-amber-600/70 dark:text-amber-500/70 font-medium whitespace-nowrap">Pular direto</span>
                                        </span>
                                        <ChevronRight className="w-4 h-4 shrink-0 text-amber-600/60 dark:text-amber-500/60 group-hover:text-amber-500 dark:group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" />
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Etiqueta de capitulo via portal (escapa do transform do animate-enter); aparece ao rolar, quando o cabecalho sai da tela */}
                        {montado && !cabecalhoVisivel && capituloFoco != null && livroInfoAtual.nome && createPortal(
                            <div className="fixed top-2 left-1/2 -translate-x-1/2 z-[60] pointer-events-none animate-in fade-in slide-in-from-top-1 duration-200">
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-1/90 backdrop-blur-md border border-amber-500/30 text-[11px] font-bold uppercase tracking-wide text-amber-700 dark:text-amber-400 shadow-lg">
                                    <BookOpen className="w-3 h-3" />
                                    {capitalizarLivro(livroInfoAtual.nome)} {capituloFoco}
                                </span>
                            </div>,
                            document.body
                        )}
                        {/* Messages Area - sem padding extra, direto no conteúdo */}
                        <div className="flex-1 min-w-0 w-full max-w-3xl mx-auto overflow-y-auto overflow-x-hidden px-3 sm:px-4 py-4 space-y-3">
                            <div ref={chatStartRef} />
                            {messages.map((msg, idx) => {
                                const temPlaceholder = msg.content.includes('%%VERSICULOS_INTERATIVOS%%');
                                const ehUltima = idx === messages.length - 1 && msg.role === 'assistant';
                                return (
                                    <div key={idx} id={ehUltima ? 'msg-ultima' : undefined} className="scroll-mt-28">
                                        <ChatBubble
                                            message={msg}
                                            versiculosInterativos={temPlaceholder ? versiculosPaginaAtual : undefined}
                                            livroInfo={temPlaceholder ? livroInfoAtual : undefined}
                                            readingFontSize={readingFontSize}
                                            readingLineHeight={readingLineHeight}
                                            readingAlign={readingAlign}
                                            lexico={passagem?.lexico_do_dia}
                                            mostrarContexto={!isPlanoMode}
                                        />
                                    </div>
                                );
                            })}

                            {isProcessing && (
                                <div className="flex justify-start animate-pulse">
                                    <div className="px-4 py-2 rounded-xl flex items-center gap-2 bg-surface-2">
                                        <Loader2 className="w-4 h-4 text-amber-500 animate-spin" />
                                        <span className="text-sm text-text-muted">Carregando...</span>
                                    </div>
                                </div>
                            )}
                            <div ref={chatEndRef} />
                        </div>

                        {/* Input Area - botão fixo no fundo */}
                        <div className="sticky bottom-0 px-4 py-3 bg-surface-0/80 backdrop-blur-md border-t border-border-subtle/30">
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => submitMessage('Continuar')}
                                    className="flex-1 btn-premium py-3.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
                                    disabled={isProcessing || isLoadingExplicacao}
                                >
                                    {naUltimaParte ? <Check className="w-5 h-5" /> : <ArrowRight className="w-5 h-5" />}
                                    {naUltimaParte ? 'Concluir leitura' : 'Continuar'}
                                </button>

                                {(isPlanoMode || activeOption === '1') && <button
                                    type="button"
                                    onClick={handleExplicar}
                                    className="flex-1 bg-surface-2 border border-border-subtle hover:bg-surface-2/70 hover:border-amber-500/30 text-text-primary py-3.5 rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                                    disabled={isProcessing || isLoadingExplicacao}
                                >
                                    {isLoadingExplicacao ? (
                                        <Loader2 className="w-5 h-5 text-amber-400 animate-spin" />
                                    ) : (
                                        <Lightbulb className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                                    )}
                                    {isLoadingExplicacao ? 'Gerando...' : 'Explicar'}
                                </button>}
                            </div>
                        </div>

                    </div>
                )}
            </div>
        </CosmicBackground>
    );
}
