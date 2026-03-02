'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import {
    Book, Sparkles, Calendar, ArrowLeft, Send, Loader2,
    ChevronRight, RotateCcw, GraduationCap, Search,
    Rocket, Zap, MessageSquare, ClipboardList, ArrowRight,
    Heart, Copy, Share2, Lightbulb, Palette, StickyNote, X
} from 'lucide-react';
import {
    getDataHoje,
    salvarInteracaoBiblia,
    removerInteracaoBiblia,
    removerInteracaoPorVersiculoETipo,
    getInteracoesPorCapitulo,
    atualizarNotaBiblia,
    type BibliaInteracao
} from '@/lib/supabase';
import { getPassagemDoDia, getTeseCentral, type PassagemSecao6 } from '@/lib/secao6';
import { CosmicHeader } from '@/components/ui/CosmicHeader';
import { CosmicBackground } from '@/components/ui/CosmicBackground';
import { useToast } from '@/hooks/useToast';
import { ToastContainer } from '@/components/ui/ToastContainer';
import ReactMarkdown from 'react-markdown';
import { useSearchParams } from 'next/navigation'; // Added imports
import { Suspense } from 'react'; // Added Suspense
import { buscarPassagem, formatarVersiculosParte, parseReferencia, getAbrevFromId, type Versiculo } from '@/lib/bible-api';
import { getDiaDoPlano, getPrimeiroDiaDoPlano, concluirDiaLeitura, getMinhasInscricoes } from '@/lib/plans'; // Added plans lib
import type { InscricaoPlano, Plano } from '@/lib/types/plans';

// Cores para destacar versículos
const CORES_DESTAQUE_PLANO: { id: string; nome: string; bg: string; border: string }[] = [
    { id: 'yellow', nome: 'Amarelo', bg: 'bg-yellow-500/20', border: 'border-yellow-500/40' },
    { id: 'blue', nome: 'Azul', bg: 'bg-blue-500/20', border: 'border-blue-500/40' },
    { id: 'green', nome: 'Verde', bg: 'bg-green-500/20', border: 'border-green-500/40' },
    { id: 'pink', nome: 'Rosa', bg: 'bg-pink-500/20', border: 'border-pink-500/40' },
];

// Mapa de interações por versículo
interface InteracoesMapPlano {
    destaques: Record<number, BibliaInteracao>;
    favoritos: Record<number, BibliaInteracao>;
    notas: Record<number, BibliaInteracao>;
}

// Componente de versículos interativos para o Plano de Leitura
function VersiculosInterativos({
    versiculos,
    referencia,
    livroAbrev,
    livroNome,
    capitulo,
}: {
    versiculos: Versiculo[];
    referencia: string;
    livroAbrev: string;
    livroNome: string;
    capitulo: number;
}) {
    const [versiculoSelecionado, setVersiculoSelecionado] = useState<number | null>(null);
    const [mostrarCores, setMostrarCores] = useState(false);
    const [mostrarNota, setMostrarNota] = useState(false);
    const [textoNota, setTextoNota] = useState('');
    const [interacoesMap, setInteracoesMap] = useState<InteracoesMapPlano>({ destaques: {}, favoritos: {}, notas: {} });
    const [estudoAberto, setEstudoAberto] = useState(false);
    const [estudoTexto, setEstudoTexto] = useState('');
    const [estudoLoading, setEstudoLoading] = useState(false);
    const [estudoVersiculo, setEstudoVersiculo] = useState<Versiculo | null>(null);
    const toolbarRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const versiculoAnteriorRef = useRef<number | null>(null);
    const { toasts, removeToast, success } = useToast();

    // Carregar interações do capítulo
    const carregarInteracoes = useCallback(async () => {
        const dados = await getInteracoesPorCapitulo(livroAbrev, capitulo);
        const map: InteracoesMapPlano = { destaques: {}, favoritos: {}, notas: {} };
        dados.forEach((item: BibliaInteracao) => {
            if (item.tipo === 'destaque') map.destaques[item.versiculo] = item;
            else if (item.tipo === 'favorito') map.favoritos[item.versiculo] = item;
            else if (item.tipo === 'nota') map.notas[item.versiculo] = item;
        });
        setInteracoesMap(map);
    }, [livroAbrev, capitulo]);

    useEffect(() => { carregarInteracoes(); }, [carregarInteracoes]);

    // Fechar toolbar ao clicar fora
    useEffect(() => {
        const handleClickFora = (e: MouseEvent) => {
            if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
                const target = e.target as HTMLElement;
                const versiculoDiv = target.closest('[id^="plano-verse-"]');
                if (!versiculoDiv) {
                    setVersiculoSelecionado(null);
                    setMostrarCores(false);
                    setMostrarNota(false);
                    versiculoAnteriorRef.current = null;
                }
            }
        };
        document.addEventListener('mousedown', handleClickFora);
        return () => document.removeEventListener('mousedown', handleClickFora);
    }, []);

    const handleVersiculoClick = (verse: number) => {
        if (versiculoAnteriorRef.current === verse) {
            setVersiculoSelecionado(null);
            setMostrarCores(false);
            setMostrarNota(false);
            versiculoAnteriorRef.current = null;
            return;
        }
        setVersiculoSelecionado(verse);
        versiculoAnteriorRef.current = verse;
        setMostrarCores(false);
        setMostrarNota(false);
        const notaExistente = interacoesMap.notas[verse];
        setTextoNota(notaExistente?.nota || '');
    };

    const getVersiculoObj = (verse: number) => versiculos.find(v => v.verse === verse);
    const getCorClasse = (verse: number): string => {
        const destaque = interacoesMap.destaques[verse];
        if (!destaque) return '';
        const cor = CORES_DESTAQUE_PLANO.find(c => c.id === destaque.cor);
        return cor ? `${cor.bg} ${cor.border} border-l-2` : '';
    };
    const isFavorito = (verse: number) => !!interacoesMap.favoritos[verse];
    const temNota = (verse: number) => !!interacoesMap.notas[verse];

    const handleDestacar = async (cor: string) => {
        if (!versiculoSelecionado) return;
        const v = getVersiculoObj(versiculoSelecionado);
        if (!v) return;
        const existente = interacoesMap.destaques[versiculoSelecionado];
        if (existente && existente.cor === cor) {
            await removerInteracaoBiblia(existente.id!);
            success('Destaque removido');
        } else {
            if (existente) await removerInteracaoBiblia(existente.id!);
            await salvarInteracaoBiblia({
                tipo: 'destaque', livro_abrev: livroAbrev, livro_nome: livroNome,
                capitulo, versiculo: v.verse, texto_versiculo: v.text, cor
            });
            success('Versículo destacado!');
        }
        await carregarInteracoes();
        setMostrarCores(false);
    };

    const handleFavoritar = async () => {
        if (!versiculoSelecionado) return;
        const v = getVersiculoObj(versiculoSelecionado);
        if (!v) return;
        const existente = interacoesMap.favoritos[versiculoSelecionado];
        if (existente) {
            await removerInteracaoBiblia(existente.id!);
            success('Removido dos favoritos');
        } else {
            await salvarInteracaoBiblia({
                tipo: 'favorito', livro_abrev: livroAbrev, livro_nome: livroNome,
                capitulo, versiculo: v.verse, texto_versiculo: v.text
            });
            success('Salvo nos favoritos!');
        }
        await carregarInteracoes();
    };

    const handleCopiar = async () => {
        if (!versiculoSelecionado) return;
        const v = getVersiculoObj(versiculoSelecionado);
        if (!v) return;
        const texto = `"${v.text}" — ${livroNome} ${capitulo}:${v.verse}`;
        await navigator.clipboard.writeText(texto);
        success('Versículo copiado!');
    };

    const handleCompartilhar = async () => {
        if (!versiculoSelecionado) return;
        const v = getVersiculoObj(versiculoSelecionado);
        if (!v) return;
        const texto = `"${v.text}"\n— ${livroNome} ${capitulo}:${v.verse}`;
        if (navigator.share) {
            try { await navigator.share({ title: `${livroNome} ${capitulo}:${v.verse}`, text: texto }); } catch { /* cancelled */ }
        } else {
            await navigator.clipboard.writeText(texto);
            success('Copiado para compartilhar!');
        }
    };

    const handleEstudar = async () => {
        if (!versiculoSelecionado) return;
        const v = getVersiculoObj(versiculoSelecionado);
        if (!v) return;
        setEstudoVersiculo(v);
        setEstudoAberto(true);
        setEstudoLoading(true);
        setEstudoTexto('');
        setVersiculoSelecionado(null);
        versiculoAnteriorRef.current = null;
        try {
            const resp = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/execute`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
                },
                body: JSON.stringify({
                    modo_id: 'explicar_passagem',
                    data: new Date().toISOString().split('T')[0],
                    referencia: `${livroNome} ${capitulo}:${v.verse}`,
                    versiculos: `(${v.verse}) ${v.text}`,
                    parte: 1
                })
            });
            const data = await resp.json();
            if (data.ok && data.resultado) setEstudoTexto(data.resultado);
            else setEstudoTexto('Erro ao gerar explicação. Tente novamente.');
        } catch { setEstudoTexto('Erro de conexão. Tente novamente.'); }
        finally { setEstudoLoading(false); }
    };

    const handleSalvarNota = async () => {
        if (!versiculoSelecionado || !textoNota.trim()) return;
        const v = getVersiculoObj(versiculoSelecionado);
        if (!v) return;
        const existente = interacoesMap.notas[versiculoSelecionado];
        if (existente) {
            await atualizarNotaBiblia(existente.id!, textoNota.trim());
        } else {
            await salvarInteracaoBiblia({
                tipo: 'nota', livro_abrev: livroAbrev, livro_nome: livroNome,
                capitulo, versiculo: v.verse, texto_versiculo: v.text, nota: textoNota.trim()
            });
        }
        success('Nota salva!');
        setMostrarNota(false);
        await carregarInteracoes();
    };

    return (
        <>
            <div className="space-y-1 relative" ref={containerRef}>
                {versiculos.map(v => (
                    <div
                        key={v.verse}
                        id={`plano-verse-${v.verse}`}
                        onClick={() => handleVersiculoClick(v.verse)}
                        className={`relative pl-3 rounded-lg p-2 -ml-3 transition-all cursor-pointer select-none
                            ${getCorClasse(v.verse)}
                            ${versiculoSelecionado === v.verse ? 'bg-surface-2 ring-1 ring-amber-500/30' : 'hover:bg-surface-2'}
                        `}
                    >
                        <p className="inline text-lg md:text-xl leading-relaxed text-text-primary font-serif">
                            <sup className="text-xs text-amber-400 font-bold mr-1.5 select-none opacity-60">{v.verse}</sup>
                            {v.text}
                        </p>
                        <span className="inline-flex items-center gap-1 ml-1.5">
                            {isFavorito(v.verse) && <Heart className="w-3.5 h-3.5 text-red-400 fill-red-400 inline" />}
                            {temNota(v.verse) && <StickyNote className="w-3.5 h-3.5 text-blue-400 inline" />}
                        </span>

                        {/* MINI-TOOLBAR */}
                        {versiculoSelecionado === v.verse && (
                            <div ref={toolbarRef} className="absolute -top-16 left-1/2 -translate-x-1/2 z-30 animate-in fade-in slide-in-from-bottom-2 duration-150" onClick={e => e.stopPropagation()}>
                                <div className="flex items-center gap-1 bg-surface-2/95 border border-border-subtle rounded-2xl p-1.5 shadow-2xl backdrop-blur-xl">
                                    <button onClick={() => setMostrarCores(!mostrarCores)} className="p-3 rounded-xl hover:bg-surface-2 text-text-secondary hover:text-amber-400 transition-colors" title="Destacar">
                                        <Palette className="w-5 h-5" />
                                    </button>
                                    <button onClick={handleFavoritar} className={`p-3 rounded-xl hover:bg-surface-2 transition-colors ${isFavorito(v.verse) ? 'text-red-400' : 'text-text-secondary hover:text-red-400'}`} title="Favoritar">
                                        <Heart className={`w-5 h-5 ${isFavorito(v.verse) ? 'fill-red-400' : ''}`} />
                                    </button>
                                    <button onClick={handleCopiar} className="p-3 rounded-xl hover:bg-surface-2 text-text-secondary hover:text-green-400 transition-colors" title="Copiar">
                                        <Copy className="w-5 h-5" />
                                    </button>
                                    <button onClick={handleCompartilhar} className="p-3 rounded-xl hover:bg-surface-2 text-text-secondary hover:text-blue-400 transition-colors" title="Compartilhar">
                                        <Share2 className="w-5 h-5" />
                                    </button>
                                    <button onClick={handleEstudar} className="p-3 rounded-xl hover:bg-surface-2 text-text-secondary hover:text-amber-400 transition-colors" title="Estudar">
                                        <Lightbulb className="w-5 h-5" />
                                    </button>
                                    <button onClick={() => setMostrarNota(!mostrarNota)} className={`p-3 rounded-xl hover:bg-surface-2 transition-colors ${temNota(v.verse) ? 'text-blue-400' : 'text-text-secondary hover:text-blue-400'}`} title="Nota">
                                        <StickyNote className="w-5 h-5" />
                                    </button>
                                </div>

                                {mostrarCores && (
                                    <div className="mt-1.5 flex items-center gap-1.5 bg-surface-2/95 border border-border-subtle rounded-2xl p-2 justify-center animate-in fade-in duration-100">
                                        {CORES_DESTAQUE_PLANO.map(cor => (
                                            <button key={cor.id} onClick={() => handleDestacar(cor.id)}
                                                className={`w-9 h-9 rounded-full border-2 transition-transform hover:scale-110 ${cor.bg} ${cor.border} ${interacoesMap.destaques[v.verse]?.cor === cor.id ? 'ring-2 ring-white scale-110' : ''}`}
                                                title={cor.nome} />
                                        ))}
                                        {interacoesMap.destaques[v.verse] && (
                                            <button onClick={() => handleDestacar(interacoesMap.destaques[v.verse].cor || 'yellow')}
                                                className="p-1.5 rounded-lg hover:bg-red-500/20 text-text-muted hover:text-red-400" title="Remover destaque">
                                                <X className="w-5 h-5" />
                                            </button>
                                        )}
                                    </div>
                                )}

                                {mostrarNota && (
                                    <div className="mt-1.5 bg-surface-2/95 border border-border-subtle rounded-2xl p-3 animate-in fade-in duration-100 min-w-[280px]">
                                        <textarea value={textoNota} onChange={e => setTextoNota(e.target.value)}
                                            placeholder="Escreva sua anotação..."
                                            className="w-full bg-surface-1 border border-border-strong rounded-xl px-4 py-3 text-text-primary text-base placeholder-text-muted focus:outline-none focus:border-amber-500/50 resize-none"
                                            rows={3} autoFocus />
                                        <div className="flex justify-end gap-2 mt-2">
                                            {interacoesMap.notas[v.verse] && (
                                                <button onClick={async () => {
                                                    await removerInteracaoPorVersiculoETipo('nota', livroAbrev, capitulo, v.verse);
                                                    success('Nota removida');
                                                    setMostrarNota(false);
                                                    await carregarInteracoes();
                                                }} className="px-4 py-2 text-sm rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/30 font-medium">
                                                    Apagar
                                                </button>
                                            )}
                                            <button onClick={handleSalvarNota} disabled={!textoNota.trim()}
                                                className="px-4 py-2 text-sm rounded-xl bg-amber-500 text-black font-bold hover:bg-amber-400 disabled:opacity-50">
                                                Salvar
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Modal de Estudo IA */}
            {estudoAberto && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-surface-0 backdrop-blur-md animate-in fade-in duration-200">
                    <div className="glass-panel rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[85vh] flex flex-col overflow-hidden border border-border-subtle">
                        <div className="p-4 border-b border-border-subtle flex items-center justify-between bg-surface-2">
                            <div className="flex items-center gap-2">
                                <Lightbulb className="w-5 h-5 text-amber-400" />
                                <span className="font-bold text-text-primary text-base">Estudo — {livroNome} {capitulo}:{estudoVersiculo?.verse}</span>
                            </div>
                            <button onClick={() => setEstudoAberto(false)} className="p-2 rounded-lg hover:bg-surface-2 text-text-muted hover:text-text-primary"><X className="w-5 h-5" /></button>
                        </div>
                        {estudoVersiculo && (
                            <div className="px-4 py-3 bg-amber-500/10 border-b border-amber-500/20">
                                <p className="text-amber-200 text-base italic">&ldquo;{estudoVersiculo.text}&rdquo;</p>
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
    { id: '2', icon: Search, label: 'Estudo Profundo', desc: 'Teologia, palavras-chave e simbolismos.' },
    { id: '3', icon: Rocket, label: 'Aplicação Prática', desc: 'Como viver isso nas próximas 24–48h.' },
    { id: '4', icon: Zap, label: 'Síntese Rápida', desc: 'Visão panorâmica e resumo executivo.' },
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
            className="group relative w-full text-left p-6 rounded-2xl glass-card hover:bg-white/[0.02] disabled:opacity-50 disabled:cursor-not-allowed flex flex-col gap-4 overflow-hidden"
        >
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Icon className="w-24 h-24 -mr-8 -mt-8 text-text-primary rotate-12" />
            </div>

            <div className="flex items-center justify-between z-10">
                <div className="p-3 rounded-xl bg-surface-2 border border-border-subtle text-[#FCD34D] group-hover:scale-110 transition-transform duration-300">
                    <Icon className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-bold tracking-widest text-text-muted uppercase">OPÇÃO {option.id}</span>
            </div>

            <div className="z-10">
                <h3 className="font-bold text-text-primary text-lg mb-1 group-hover:text-[#FCD34D] transition-colors">{option.label}</h3>
                <p className="text-sm text-text-muted group-hover:text-text-secondary leading-relaxed">{option.desc}</p>
            </div>
        </button>
    );
}

function ChatBubble({ message, versiculosInterativos, livroInfo }: {
    message: ChatMessage;
    versiculosInterativos?: Versiculo[];
    livroInfo?: { abrev: string; nome: string; capitulo: number };
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
                        <div className="text-base md:text-lg whitespace-pre-wrap leading-relaxed prose dark:prose-invert prose-p:my-2 prose-strong:text-amber-300 prose-headings:text-amber-200 prose-headings:font-bold max-w-none mb-3">
                            <ReactMarkdown>{partes[0]}</ReactMarkdown>
                        </div>
                    )}

                    {/* Versículos interativos - sem container extra */}
                    <VersiculosInterativos
                        versiculos={versiculosInterativos!}
                        referencia={`${livroInfo!.nome} ${livroInfo!.capitulo}`}
                        livroAbrev={livroInfo!.abrev}
                        livroNome={livroInfo!.nome}
                        capitulo={livroInfo!.capitulo}
                    />

                    {/* Texto depois dos versículos */}
                    {partes[1] && (
                        <div className="text-base md:text-lg whitespace-pre-wrap leading-relaxed prose dark:prose-invert prose-p:my-2 prose-strong:text-amber-300 prose-headings:text-amber-200 prose-headings:font-bold max-w-none mt-3">
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
                <div className="text-base md:text-lg whitespace-pre-wrap leading-relaxed prose dark:prose-invert prose-p:my-2 prose-strong:text-amber-300 prose-headings:text-amber-200 prose-headings:font-bold max-w-none">
                    <ReactMarkdown>{conteudoLimpo}</ReactMarkdown>
                </div>
            </div>
        );
    }

    // Mensagens do usuário mantêm o estilo de bolha (compactas)
    return (
        <div className="flex justify-end animate-enter mb-3">
            <div className="max-w-[70%] rounded-2xl px-4 py-2.5 bg-gradient-to-br from-amber-600 to-amber-700 text-text-primary rounded-br-none shadow-lg shadow-amber-900/20">
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
    const isPlanoMode = Boolean(planoId);

    const [passagem, setPassagem] = useState<PassagemSecao6 | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeOption, setActiveOption] = useState<MenuOption>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);  // Track reading progress
    const currentPageRef = useRef(1);  // Ref for immediate access
    const [bibleData, setBibleData] = useState<{ textoFormatado: string; versiculos: Versiculo[]; capitulosCarregados: number[] } | null>(null);
    const [versiculosPaginaAtual, setVersiculosPaginaAtual] = useState<Versiculo[]>([]);
    const [livroInfoAtual, setLivroInfoAtual] = useState<{ abrev: string; nome: string; capitulo: number }>({ abrev: '', nome: '', capitulo: 0 });
    const [inscricaoAtiva, setInscricaoAtiva] = useState<(InscricaoPlano & { plano: Plano }) | null>(null);
    const [diaExibido, setDiaExibido] = useState<number>(1);
    const [leituraDiaConcluida, setLeituraDiaConcluida] = useState(false);
    const [isLoadingExplicacao, setIsLoadingExplicacao] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);

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
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

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

    const getPlanoCompletedKey = () => {
        if (!planoId) return null;
        return `plano-completed:${planoId}:${diaExibido}:${dataHoje}`;
    };

    const getTotalPartesLeitura = () => {
        const totalVersiculos = bibleData?.versiculos.length || 30;
        return Math.max(1, Math.ceil(totalVersiculos / 10));
    };

    const atualizarContextoVersiculos = (parte: number) => {
        if (!bibleData || !passagem) return;

        // No modo plano, mostra TODOS os versículos desde o início até a parte atual
        // para que o que já foi lido continue visível
        if (isPlanoMode) {
            const endIndex = parte * 10;
            const slice = bibleData.versiculos.slice(0, endIndex);
            setVersiculosPaginaAtual(slice);
        } else {
            const startIndex = (parte - 1) * 10;
            const slice = bibleData.versiculos.slice(startIndex, startIndex + 10);
            setVersiculosPaginaAtual(slice);
        }

        const primeiraParte = passagem.referencia.split(';')[0].trim();
        const parsed = parseReferencia(primeiraParte);
        if (parsed) {
            const abrev = getAbrevFromId(parsed.livroId);
            const refParts = primeiraParte.match(/^(.+?)\s+\d/);
            const nomeOriginal = refParts ? refParts[1] : parsed.livro;
            setLivroInfoAtual({
                abrev,
                nome: nomeOriginal,
                capitulo: parsed.capituloInicio
            });
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
            const parsed = JSON.parse(raw) as { data?: string; parte?: number };
            if (parsed?.data !== dataHoje) {
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
        }

        const linhaPersistencia = isPlanoMode
            ? '\nSeu progresso desta leitura fica salvo até o fim do dia.'
            : '';

        return `📖 **${passagem.referencia}**
📍 *Parte ${parteAtual} de ${totalPartes}*

---

%%VERSICULOS_INTERATIVOS%%

---

%%EXPLICACAO_SLOT%%${ehUltimaParte
                ? 'Digite **CONTINUAR** para finalizar a leitura.'
                : 'Digite **CONTINUAR** para os próximos versículos.'}
Ou **MENU** para voltar.${linhaPersistencia}`;
    };

    // Gerar resposta do menu inicial
    const gerarRespostaMenuInicial = (): string => {
        if (!passagem) return 'Preparando ambiente de estudo...';

        return `Olá! Sou seu Mentor Bíblico. 🌌
        
Como você deseja mergulhar na passagem de hoje (**${passagem.referencia}**)?

---

Escolha uma das opções abaixo:

1. 📖 **Ler Passagem** — Texto bíblico puro
2. 🔍 **Estudo Profundo** — Teologia e simbolismos
3. 🚀 **Aplicação Prática** — Como viver isso hoje
4. ⚡ **Síntese Rápida** — Resumo executivo

Estou pronto para guiá-lo nesta jornada espiritual.`;
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
                return 'Neste plano, use **CONTINUAR** para seguir a leitura do dia.';
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
                return '🔍 Gerando explicação... Aguarde um momento.';
            }
            return 'O comando **EXPLICAR** só funciona na opção 1 (Ler Passagem).';
        }

        // Comando não reconhecido
        if (isPlanoMode) {
            return 'Comando não reconhecido. Use **CONTINUAR** para avançar na leitura.';
        }
        return `Não entendi o comando. Digite um número de **1 a 4** ou **MENU** para ver as opções.`;
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
        const parteInicial = isPlanoMode ? lerProgressoPlanoLocal() : 1;
        return gerarLeituraParte(parteInicial);
    };

    // Gerar explicação sob demanda via IA (comando EXPLICAR)
    const gerarExplicacaoAtual = async (): Promise<string> => {
        if (!passagem) return '';

        const page = currentPageRef.current;

        // Pegar versículos da parte atual
        const startIndex = (page - 1) * 10;
        const versiculosAtual = bibleData
            ? formatarVersiculosParte(bibleData.versiculos, startIndex, 10)
            : '';

        try {
            console.log('🔍 Chamando Edge Function explicar_passagem...');

            const resp = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/execute`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
                },
                body: JSON.stringify({
                    modo_id: 'explicar_passagem',
                    data: new Date().toISOString().split('T')[0],
                    referencia: passagem.referencia,
                    versiculos: versiculosAtual,
                    parte: page
                })
            });

            if (!resp.ok) {
                throw new Error(`Erro ${resp.status}`);
            }

            const data = await resp.json();

            if (data.ok && data.resultado) {
                return `🔍 **EXPLICAÇÃO GERADA POR IA**
📍 *Parte ${page} de ${passagem.referencia}*

---

${data.resultado}

---
Digite **CONTINUAR** para os próximos versículos.
Ou **MENU** para voltar.`;
            } else {
                throw new Error(data.error || 'Erro ao gerar explicação');
            }
        } catch (error) {
            console.error('Erro ao gerar explicação:', error);
            return `❌ **Erro ao gerar explicação**

Não foi possível gerar a explicação no momento. Tente novamente.

---
Digite **CONTINUAR** para os próximos versículos.
Ou **MENU** para voltar.`;
        }
    };

    // Gerar APENAS o conteúdo da explicação (sem header/footer) para embutir na mensagem da Parte
    const gerarExplicacaoConteudo = async (): Promise<string> => {
        if (!passagem) return '';

        const page = currentPageRef.current;
        const startIndex = (page - 1) * 10;
        const versiculosAtual = bibleData
            ? formatarVersiculosParte(bibleData.versiculos, startIndex, 10)
            : '';

        try {
            const resp = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/execute`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
                },
                body: JSON.stringify({
                    modo_id: 'explicar_passagem',
                    data: new Date().toISOString().split('T')[0],
                    referencia: passagem.referencia,
                    versiculos: versiculosAtual,
                    parte: page
                })
            });

            if (!resp.ok) throw new Error(`Erro ${resp.status}`);
            const data = await resp.json();

            if (data.ok && data.resultado) {
                return data.resultado;
            }
            throw new Error(data.error || 'Erro ao gerar explicação');
        } catch (error) {
            console.error('Erro ao gerar explicação (conteúdo):', error);
            return '❌ Não foi possível gerar a explicação no momento.';
        }
    };

    // Gerar estudo via IA (Edge Function)
    const gerarEstudoIA = async (tipoEstudo: string): Promise<string> => {
        if (!passagem) return 'Passagem não carregada.';

        // Pegar todos os versículos disponíveis como texto
        const versiculosTexto = bibleData
            ? bibleData.versiculos.map(v => `${v.verse}. ${v.text?.replace(/<[^>]*>/g, '') || ''}`).join('\n')
            : '';

        if (!versiculosTexto) {
            return '⏳ Aguarde o carregamento dos versículos e tente novamente.';
        }

        try {
            const resp = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/execute`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
                },
                body: JSON.stringify({
                    modo_id: 'estudo_biblico',
                    data: new Date().toISOString().split('T')[0],
                    referencia: passagem.referencia,
                    versiculos: versiculosTexto,
                    tipo_estudo: tipoEstudo
                })
            });

            if (!resp.ok) {
                throw new Error(`Erro ${resp.status}`);
            }

            const data = await resp.json();

            if (data.ok && data.resultado) {
                return `${data.resultado}\n\n---\nDigite outro **NÚMERO** para explorar outra opção ou **MENU** para voltar.`;
            } else {
                throw new Error(data.error || 'Erro ao gerar estudo');
            }
        } catch (error) {
            console.error('Erro ao gerar estudo IA:', error);
            return `❌ **Erro ao gerar estudo**\n\nNão foi possível gerar o conteúdo no momento. Tente novamente.\n\n---\nDigite **MENU** para voltar.`;
        }
    };


    // Processar comando CONTINUAR
    const processarContinuar = async (): Promise<string> => {
        if (!passagem) return 'Passagem não carregada.';

        const page = currentPageRef.current;  // Use ref for immediate value
        console.log('🔄 processarContinuar - activeOption:', activeOption, 'currentPage (ref):', page);

        // OPÇÃO 1: LEITURA GUIADA (Paginação Dinâmica)
        if (activeOption === '1' || isPlanoMode) {
            const totalVersiculos = bibleData?.versiculos.length || 30;
            const totalPartes = Math.ceil(totalVersiculos / 10);

            console.log('📖 Opção 1 - Página atual:', page, 'Total partes:', totalPartes);

            // Se já estamos na última página ou além, mostra conclusão
            if (page >= totalPartes) {
                // LOGICA DE CONCLUSÃO DO PLANO
                if (isPlanoMode && !leituraDiaConcluida) {
                    setLeituraDiaConcluida(true);
                    salvarLeituraConcluidaLocal();

                    if (planoId && inscricaoAtiva) {
                        // Salvar progresso do dia no banco uma única vez.
                        concluirDiaLeitura(inscricaoAtiva.id, inscricaoAtiva.user_id, diaExibido + 1)
                            .then(() => {
                                console.log('✅ Progresso salvo no banco');
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
                    ? `\n\n👉 **[Clique aqui para o Próximo Dia](/plano-de-leitura?plano_id=${planoId}&dia=${diaExibido + 1})**`
                    : '';

                return `✅ **LEITURA CONCLUÍDA!**
 
 ---
 
 📖 **Você completou a leitura de ${passagem.referencia}!**
 
 💎 **Resumo:** Medite sobre o que leu e deixe a Palavra transformar seu coração.
 
 🙏 **Sugestão de Oração:**
 
 *"Senhor, obrigado por Tua Palavra. Que ela habite ricamente em mim e guie meus passos hoje. Em nome de Jesus. Amém."*
 
 ---
 ${proximoDiaMsg}
 
 Digite **MENU** para voltar e explorar outras opções.`;
            }

            // Avança para próxima página
            const nextPage = page + 1;
            return gerarLeituraParte(nextPage);
        }

        // Para outras opções (2-4 = IA), não tem paginação
        return `O conteúdo da opção atual já foi gerado por IA.\n\nDigite outro **NÚMERO** para explorar outra opção ou **MENU** para voltar.`;
    };

    // Gerar explicação sob demanda (botão Explicar) - embute na última mensagem da Parte
    const handleExplicar = async () => {
        if (isLoadingExplicacao) return;
        setIsLoadingExplicacao(true);
        try {
            const conteudo = await gerarExplicacaoConteudo();
            const page = currentPageRef.current;

            const explicacaoFormatada = `🔍 **EXPLICAÇÃO GERADA POR IA**
📍 *Parte ${page} de ${passagem?.referencia}*

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
                            content: updated[i].content.replace('%%EXPLICACAO_SLOT%%', '❌ *Não foi possível gerar a explicação.*\n\n---\n\n')
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
                const parteSalva = lerProgressoPlanoLocal();
                const primeiraMensagemPlano: ChatMessage = {
                    role: 'assistant',
                    content: gerarLeituraParte(parteSalva),
                    timestamp: new Date()
                };
                setMessages([primeiraMensagemPlano]);
                return;
            }

            const welcomeMessage: ChatMessage = {
                role: 'assistant',
                content: gerarRespostaMenuInicial(),
                timestamp: new Date()
            };
            setMessages([welcomeMessage]);
        }
    }, [loading, passagem, messages.length, isPlanoMode, bibleData]);

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
                        <h1 className="text-2xl md:text-3xl font-bold text-white mb-3">Plano sem leitura cadastrada</h1>
                        <p className="text-slate-300 leading-relaxed">
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
            <div className="max-w-7xl mx-auto pt-8 px-6 mb-8 flex justify-between items-center z-10 relative">
                <Link href={planoId ? "/planos" : "/"} className="btn-glass px-4 py-2 rounded-full flex items-center gap-2 text-sm font-medium group">
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    {planoId ? "Voltar aos Planos" : "Voltar ao Dashboard"}
                </Link>
                <div className="flex gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                    <span className="text-xs text-slate-400 font-mono tracking-widest">ONLINE</span>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 z-10 relative">

                {/* Header Section - compacto no modo plano */}
                {isPlanoMode ? (
                    <div className="text-center mb-6 animate-enter">
                        <h1 className="text-2xl md:text-3xl font-bold text-white mb-1 tracking-tight">
                            {inscricaoAtiva?.plano?.titulo || 'Plano de Leitura'}
                        </h1>
                        <p className="text-slate-400 text-sm">
                            {inscricaoAtiva
                                ? `Dia ${diaExibido} de ${inscricaoAtiva.plano.duracao_dias}`
                                : "Mergulhe nas Escrituras"}
                        </p>
                    </div>
                ) : (
                    <div className="text-center mb-16 animate-enter">
                        <span className="inline-block px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold tracking-[0.2em] mb-4">
                            MODO MENTOR
                        </span>
                        <h1 className="text-4xl md:text-6xl font-bold text-white mb-4 tracking-tight">
                            {inscricaoAtiva?.plano ? (
                                inscricaoAtiva.plano.titulo
                            ) : (
                                <>Plano de <span className="text-gradient-gold">Leitura</span></>
                            )}
                        </h1>
                        <p className="text-slate-400 text-lg max-w-2xl mx-auto">
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
                                <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">
                                    {inscricaoAtiva ? `LEITURA DO DIA ${diaExibido}` : `PASSAGEM DE HOJE (${formatarDataExtenso(dataHoje)})`}
                                </h2>

                                {loading ? (
                                    <div className="h-12 w-64 bg-white/5 rounded animate-pulse"></div>
                                ) : passagem ? (
                                    <div className="space-y-2">
                                        <h3 className="text-4xl md:text-5xl font-black text-white tracking-tight">{passagem.referencia}</h3>
                                        <div className="flex flex-wrap gap-2 justify-center md:justify-start mt-3">
                                            <span className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-xs text-slate-300">
                                                Arquétipo: <span className="text-amber-400 font-bold">{passagem.arquetipo_maestro}</span>
                                            </span>
                                            <span className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-xs text-slate-300">
                                                Tema: {passagem.insights_pre_minerados[0]?.tese.substring(0, 40)}...
                                            </span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-red-400 bg-red-500/10 px-4 py-2 rounded-lg border border-red-500/20 inline-block">
                                        Passagem não encontrada para hoje. Verifique o Storage.
                                    </div>
                                )}
                            </div>

                            <div className="z-10">
                                <button className="btn-premium px-8 py-4 rounded-xl flex items-center gap-3 shadow-amber-500/20 text-lg">
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
                                    onClick={() => {
                                        if (passagem) {
                                            setActiveOption(option.id as MenuOption);
                                            // Adiciona mensagem inicial do usuário (simulada) e resposta do sistema
                                            const opcaoTexto = option.label;
                                            setMessages([
                                                { role: 'user', content: `Quero ver: ${opcaoTexto}`, timestamp: new Date() },
                                                // A resposta virá via useEffect ou chamada direta?
                                                // Na lógica original, chamávamos gerarRespostaOpcao
                                            ]);

                                            // Pequeno delay para efeito "pensando"
                                            setIsProcessing(true);
                                            setTimeout(async () => {
                                                const resp = await gerarRespostaOpcao(option.id as MenuOption);
                                                setMessages(prev => [...prev, { role: 'assistant', content: resp, timestamp: new Date() }]);
                                                setIsProcessing(false);
                                            }, 600);
                                        }
                                    }}
                                />
                            ))}
                        </div>
                    </div>
                ) : (
                    // -------------------------------------------
                    // VISTA CHAT (INTERATIVA) - Sem bolha externa para maximizar leitura
                    // -------------------------------------------
                    <div className="max-w-4xl mx-auto animate-enter flex flex-col min-h-[70vh]">

                        {/* Chat Header - compacto e sticky */}
                        <div className="px-4 py-3 border-b border-border-subtle/50 flex items-center justify-between sticky top-0 z-20 bg-surface-0/60 backdrop-blur-md rounded-t-xl">
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setActiveOption(null)}
                                    className="p-1.5 hover:bg-white/10 rounded-full transition-colors text-slate-400 hover:text-white"
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                </button>
                                <div>
                                    <h2 className="font-bold text-white text-base">
                                        {isPlanoMode
                                            ? 'Leitura do Plano'
                                            : MENU_OPTIONS.find(o => o.id === activeOption)?.label}
                                    </h2>
                                    <p className="text-[11px] text-slate-400">
                                        {passagem?.referencia}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Messages Area - sem padding extra, direto no conteúdo */}
                        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                            {messages.map((msg, idx) => {
                                const isLastMsg = idx === messages.length - 1;
                                const temPlaceholder = msg.content.includes('%%VERSICULOS_INTERATIVOS%%');
                                return (
                                    <ChatBubble
                                        key={idx}
                                        message={msg}
                                        versiculosInterativos={isLastMsg && temPlaceholder ? versiculosPaginaAtual : undefined}
                                        livroInfo={isLastMsg && temPlaceholder ? livroInfoAtual : undefined}
                                    />
                                );
                            })}

                            {isProcessing && (
                                <div className="flex justify-start animate-pulse">
                                    <div className="px-4 py-2 rounded-xl flex items-center gap-2 bg-white/5">
                                        <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
                                        <span className="text-sm text-slate-400">Carregando...</span>
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
                                    className="flex-1 btn-premium py-3.5 rounded-xl flex items-center justify-center gap-2"
                                    disabled={isProcessing || isLoadingExplicacao}
                                >
                                    <ArrowRight className="w-5 h-5" />
                                    Continuar
                                </button>

                                <button
                                    type="button"
                                    onClick={handleExplicar}
                                    className="flex-1 bg-white/5 border border-white/10 hover:bg-white/10 text-white py-3.5 rounded-xl flex items-center justify-center gap-2 transition-colors"
                                    disabled={isProcessing || isLoadingExplicacao}
                                >
                                    {isLoadingExplicacao ? (
                                        <Loader2 className="w-5 h-5 text-amber-400 animate-spin" />
                                    ) : (
                                        <Sparkles className="w-5 h-5 text-amber-400" />
                                    )}
                                    {isLoadingExplicacao ? 'Gerando...' : 'Explicar'}
                                </button>
                            </div>
                        </div>

                    </div>
                )}
            </div>
        </CosmicBackground>
    );
}
