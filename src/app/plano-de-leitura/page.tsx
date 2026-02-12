'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import {
    Book, Sparkles, Calendar, ArrowLeft, Send, Loader2,
    ChevronRight, RotateCcw, GraduationCap, Clock, Search,
    Globe, Rocket, Zap, Building, MessageSquare, ClipboardList, ArrowRight,
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
import { buscarPassagem, formatarVersiculosParte, parseReferencia, getAbrevFromId, type Versiculo } from '@/lib/bible-api';

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
                            ${versiculoSelecionado === v.verse ? 'bg-white/10 ring-1 ring-amber-500/30' : 'hover:bg-white/5'}
                        `}
                    >
                        <p className="inline text-lg md:text-xl leading-relaxed text-slate-200 font-serif">
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
                                <div className="flex items-center gap-1 bg-slate-900/95 border border-white/15 rounded-2xl p-1.5 shadow-2xl backdrop-blur-xl">
                                    <button onClick={() => setMostrarCores(!mostrarCores)} className="p-3 rounded-xl hover:bg-white/10 text-slate-300 hover:text-amber-400 transition-colors" title="Destacar">
                                        <Palette className="w-5 h-5" />
                                    </button>
                                    <button onClick={handleFavoritar} className={`p-3 rounded-xl hover:bg-white/10 transition-colors ${isFavorito(v.verse) ? 'text-red-400' : 'text-slate-300 hover:text-red-400'}`} title="Favoritar">
                                        <Heart className={`w-5 h-5 ${isFavorito(v.verse) ? 'fill-red-400' : ''}`} />
                                    </button>
                                    <button onClick={handleCopiar} className="p-3 rounded-xl hover:bg-white/10 text-slate-300 hover:text-green-400 transition-colors" title="Copiar">
                                        <Copy className="w-5 h-5" />
                                    </button>
                                    <button onClick={handleCompartilhar} className="p-3 rounded-xl hover:bg-white/10 text-slate-300 hover:text-blue-400 transition-colors" title="Compartilhar">
                                        <Share2 className="w-5 h-5" />
                                    </button>
                                    <button onClick={handleEstudar} className="p-3 rounded-xl hover:bg-white/10 text-slate-300 hover:text-amber-400 transition-colors" title="Estudar">
                                        <Lightbulb className="w-5 h-5" />
                                    </button>
                                    <button onClick={() => setMostrarNota(!mostrarNota)} className={`p-3 rounded-xl hover:bg-white/10 transition-colors ${temNota(v.verse) ? 'text-blue-400' : 'text-slate-300 hover:text-blue-400'}`} title="Nota">
                                        <StickyNote className="w-5 h-5" />
                                    </button>
                                </div>

                                {mostrarCores && (
                                    <div className="mt-1.5 flex items-center gap-1.5 bg-slate-900/95 border border-white/15 rounded-2xl p-2 justify-center animate-in fade-in duration-100">
                                        {CORES_DESTAQUE_PLANO.map(cor => (
                                            <button key={cor.id} onClick={() => handleDestacar(cor.id)}
                                                className={`w-9 h-9 rounded-full border-2 transition-transform hover:scale-110 ${cor.bg} ${cor.border} ${interacoesMap.destaques[v.verse]?.cor === cor.id ? 'ring-2 ring-white scale-110' : ''}`}
                                                title={cor.nome} />
                                        ))}
                                        {interacoesMap.destaques[v.verse] && (
                                            <button onClick={() => handleDestacar(interacoesMap.destaques[v.verse].cor || 'yellow')}
                                                className="p-1.5 rounded-lg hover:bg-red-500/20 text-slate-500 hover:text-red-400" title="Remover destaque">
                                                <X className="w-5 h-5" />
                                            </button>
                                        )}
                                    </div>
                                )}

                                {mostrarNota && (
                                    <div className="mt-1.5 bg-slate-900/95 border border-white/15 rounded-2xl p-3 animate-in fade-in duration-100 min-w-[280px]">
                                        <textarea value={textoNota} onChange={e => setTextoNota(e.target.value)}
                                            placeholder="Escreva sua anotação..."
                                            className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white text-base placeholder-slate-500 focus:outline-none focus:border-amber-500/50 resize-none"
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
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
                    <div className="glass-panel rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[85vh] flex flex-col overflow-hidden border border-white/10">
                        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5">
                            <div className="flex items-center gap-2">
                                <Lightbulb className="w-5 h-5 text-amber-400" />
                                <span className="font-bold text-white text-sm">Estudo — {livroNome} {capitulo}:{estudoVersiculo?.verse}</span>
                            </div>
                            <button onClick={() => setEstudoAberto(false)} className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
                        </div>
                        {estudoVersiculo && (
                            <div className="px-4 py-3 bg-amber-500/10 border-b border-amber-500/20">
                                <p className="text-amber-200 text-sm italic">&ldquo;{estudoVersiculo.text}&rdquo;</p>
                            </div>
                        )}
                        <div className="flex-1 overflow-y-auto p-4">
                            {estudoLoading ? (
                                <div className="flex flex-col items-center justify-center py-12 gap-3">
                                    <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
                                    <p className="text-slate-400 text-sm">Gerando explicação...</p>
                                </div>
                            ) : (
                                <div className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">{estudoTexto}</div>
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

type MenuOption = '1' | '2' | '3' | '4' | '5' | '6' | '7' | null;

// ===========================================
// MENU OPTIONS CONFIG
// ===========================================

const MENU_OPTIONS = [
    { id: '1', icon: Book, label: 'Ler Passagem', desc: 'Texto bíblico puro, leitura rápida.' },
    { id: '2', icon: Clock, label: 'Linha do Tempo', desc: 'Personagens, cenário e sequência dos fatos.' },
    { id: '3', icon: Search, label: 'Estudo Profundo', desc: 'Teologia, palavras-chave e simbolismos.' },
    { id: '4', icon: Globe, label: 'Contexto Histórico', desc: 'Cultura, geografia e costumes.' },
    { id: '5', icon: Rocket, label: 'Aplicação Prática', desc: 'Como viver isso nas próximas 24–48h.' },
    { id: '6', icon: Zap, label: 'Síntese Completa', desc: 'Visão panorâmica e resumo executivo.' },
    { id: '7', icon: Building, label: 'Exposição Detalhada', desc: 'Análise verso a verso com profundidade.' },
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
                <Icon className="w-24 h-24 -mr-8 -mt-8 text-white rotate-12" />
            </div>

            <div className="flex items-center justify-between z-10">
                <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-[#FCD34D] group-hover:scale-110 transition-transform duration-300">
                    <Icon className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-bold tracking-widest text-slate-500 uppercase">OPÇÃO {option.id}</span>
            </div>

            <div className="z-10">
                <h3 className="font-bold text-white text-lg mb-1 group-hover:text-[#FCD34D] transition-colors">{option.label}</h3>
                <p className="text-sm text-slate-400 group-hover:text-slate-300 leading-relaxed">{option.desc}</p>
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

    // Mensagens do assistente ocupam a tela toda (como a Biblioteca)
    if (!isUser) {
        if (temVersiculosInterativos) {
            // Renderiza com versículos interativos
            const partes = message.content.split('%%VERSICULOS_INTERATIVOS%%');
            return (
                <div className="animate-enter mb-6">
                    <div className="glass-panel rounded-2xl p-6 md:p-8 relative overflow-visible">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

                        <div className="relative z-10">
                            {/* Texto antes dos versículos */}
                            {partes[0] && (
                                <div className="text-base md:text-lg whitespace-pre-wrap leading-relaxed prose prose-invert prose-p:my-3 prose-strong:text-amber-300 prose-headings:text-amber-200 prose-headings:font-bold max-w-none mb-4">
                                    <ReactMarkdown>{partes[0]}</ReactMarkdown>
                                </div>
                            )}

                            {/* Versículos interativos */}
                            <VersiculosInterativos
                                versiculos={versiculosInterativos!}
                                referencia={`${livroInfo!.nome} ${livroInfo!.capitulo}`}
                                livroAbrev={livroInfo!.abrev}
                                livroNome={livroInfo!.nome}
                                capitulo={livroInfo!.capitulo}
                            />

                            {/* Texto depois dos versículos */}
                            {partes[1] && (
                                <div className="text-base md:text-lg whitespace-pre-wrap leading-relaxed prose prose-invert prose-p:my-3 prose-strong:text-amber-300 prose-headings:text-amber-200 prose-headings:font-bold max-w-none mt-4">
                                    <ReactMarkdown>{partes[1]}</ReactMarkdown>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            );
        }

        return (
            <div className="animate-enter mb-6">
                <div className="glass-panel rounded-2xl p-6 md:p-8 relative overflow-hidden">
                    {/* Glow effect */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

                    <div className="text-base md:text-lg whitespace-pre-wrap leading-relaxed prose prose-invert prose-p:my-3 prose-strong:text-amber-300 prose-headings:text-amber-200 prose-headings:font-bold max-w-none relative z-10">
                        <ReactMarkdown>{message.content}</ReactMarkdown>
                    </div>
                </div>
            </div>
        );
    }

    // Mensagens do usuário mantêm o estilo de bolha
    return (
        <div className="flex justify-end animate-enter mb-6">
            <div className="max-w-[85%] rounded-2xl px-6 py-4 bg-gradient-to-br from-amber-600 to-amber-700 text-white rounded-br-none shadow-lg shadow-amber-900/20">
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

export default function PlanoLeituraPage() {
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
    const chatEndRef = useRef<HTMLDivElement>(null);

    const dataHoje = getDataHoje();

    // Carregar passagem do dia
    useEffect(() => {
        async function loadPassagem() {
            setLoading(true);
            try {
                // Busca unificada (Storage -> DB -> Local)
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
    }, [dataHoje]);

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

    // Gerar resposta do menu inicial
    const gerarRespostaMenuInicial = (): string => {
        if (!passagem) return 'Preparando ambiente de estudo...';

        return `Olá! Sou seu Mentor Bíblico. 🌌
        
Como você deseja mergulhar na passagem de hoje (**${passagem.referencia}**)?

---

Escolha uma das opções abaixo:

1. 📖 **Ler Passagem** — Texto bíblico puro
2. 🧭 **Linha do Tempo** — Personagens e cenário
3. 🔍 **Estudo Profundo** — Teologia e simbolismos
4. 🌍 **Contexto Histórico** — Cultura e costumes
5. 🚀 **Aplicação Prática** — Como viver isso hoje
6. ⚡ **Síntese Completa** — Resumo executivo
7. 🏛️ **Exposição Detalhada** — Análise verso a verso

Estou pronto para guiá-lo nesta jornada espiritual.`;
    };

    // Processar comando do usuário
    const processarComando = async (comando: string) => {
        const cmdLower = comando.toLowerCase().trim();

        // Comandos de navegação
        if (['menu', 'voltar', 'voltar ao menu'].includes(cmdLower)) {
            setActiveOption(null);
            setCurrentPage(1);
            currentPageRef.current = 1;
            setVersiculosPaginaAtual([]);
            return gerarRespostaMenuInicial();
        }

        // Números do menu
        const numMatch = cmdLower.match(/^[1-9]$/);
        if (numMatch) {
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

        // Comando EXPLICAR (só funciona na Opção 1)
        if (['explicar', 'explicação', 'explicacao', 'contexto'].includes(cmdLower)) {
            if (activeOption === '1') {
                return gerarExplicacaoAtual();
            }
            return 'O comando **EXPLICAR** só funciona na opção 1 (Ler Passagem).';
        }

        // Comando não reconhecido
        return `Não entendi o comando. Digite um número de **1 a 7** ou **MENU** para ver as opções.`;
    };

    // Gerar resposta para cada opção
    const gerarRespostaOpcao = async (opcao: MenuOption): Promise<string> => {
        if (!passagem) return 'Passagem não carregada.';

        switch (opcao) {
            case '1':
                return gerarLeituraGuiada();
            case '2':
                return gerarLinhaTempo();
            case '3':
                return gerarEstudoProfundo();
            case '4':
                return gerarContextoHistorico();
            case '5':
                return gerarAplicacaoPratica();
            case '6':
                return gerarSinteseCompleta();
            case '7':
                return gerarExposicaoDetalhada();
            default:
                return 'Opção não reconhecida.';
        }
    };

    // Opção 1: Leitura Pura (Sem Explicação)
    const gerarLeituraGuiada = (): string => {
        if (!passagem) return '';

        const totalPartes = bibleData ? Math.ceil(bibleData.versiculos.length / 10) : 3;

        // Salvar versículos da página atual para renderização interativa
        if (bibleData) {
            const slice = bibleData.versiculos.slice(0, 10);
            setVersiculosPaginaAtual(slice);
            // Extrair info do livro (usa primeira parte da referência para multi-livro)
            const primeiraParte = passagem.referencia.split(';')[0].trim();
            const parsed = parseReferencia(primeiraParte);
            if (parsed) {
                const abrev = getAbrevFromId(parsed.livroId);
                // Pegar nome do livro da referência original (ex: "Isaías 16-18" → "Isaías")
                const refParts = primeiraParte.match(/^(.+?)\s+\d/);
                const nomeOriginal = refParts ? refParts[1] : parsed.livro;
                setLivroInfoAtual({
                    abrev,
                    nome: nomeOriginal,
                    capitulo: parsed.capituloInicio
                });
            }
        }

        return `📖 **${passagem.referencia}**
📍 *Parte 1 de ${totalPartes}*

---

%%VERSICULOS_INTERATIVOS%%

---

Digite **CONTINUAR** para os próximos versículos.
Digite **EXPLICAR** para gerar contexto e explicação desta parte.
Ou **MENU** para voltar.`;
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

    // Opção 2: Linha do Tempo
    const gerarLinhaTempo = (): string => {
        if (!passagem) return '';

        return `🧭 **LINHA DO TEMPO: ${passagem.referencia}**

---

**📍 PERSONAGENS PRINCIPAIS**

• **Isaías** — O profeta, porta-voz de Deus, filho de Amoz
• **Babilônia** — A nação poderosa e orgulhosa (representação do mal)
• **Moabe** — Reino vizinho de Israel, também sob juízo
• **O Senhor dos Exércitos** — Deus como comandante supremo

---

**🏛️ CENÁRIO**

• **Época:** ~740-700 a.C., durante o reinado de reis de Judá
• **Local:** Profecia dada em Judá, sobre nações vizinhas
• **Clima emocional:** Tensão apocalíptica, juízo iminente, advertência severa

---

**📜 SEQUÊNCIA DOS FATOS**

1. **Cap. 13:** Anúncio do Dia do Senhor contra Babilônia
2. **Cap. 14:1-23:** Queda do rei da Babilônia (o "astro brilhante")
3. **Cap. 14:24-27:** Juízo contra a Assíria
4. **Cap. 14:28-32:** Profecia contra os filisteus
5. **Cap. 15:** Lamento sobre a destruição de Moabe

---

**⚔️ CONFLITO E RESOLUÇÃO**

• **Conflito:** O orgulho das nações desafia a soberania de Deus
• **Tensão:** Como o mal pode prosperar enquanto os justos sofrem?
• **Resolução:** O Dia do Senhor trará justiça — nenhum poder humano permanece

---

**✝️ ONDE CRISTO APARECE?**

A queda do "astro brilhante" (Is 14:12) prefigura a vitória de Cristo sobre Satanás. Jesus é o verdadeiro Rei que derrota todo orgulho e estabelece Seu reino eterno.

---
Digite outro **NÚMERO** para explorar outra opção ou **MENU** para voltar.`;
    };

    // Opção 3: Estudo Profundo
    const gerarEstudoProfundo = (): string => {
        if (!passagem) return '';

        return `🔍 **ESTUDO PROFUNDO: ${passagem.referencia}**

---

**📚 PALAVRAS-CHAVE**

${passagem.lexico_do_dia.map(p => `• **${p}**`).join('\n')}

---

**🎓 TERMOS TEOLÓGICOS**

**1. "O Dia do Senhor" (Yom YHWH)**
Expressão profética para o momento em que Deus intervém diretamente na história para julgar o mal e salvar seu povo. Não é um dia de 24 horas, mas um período de juízo divino.

**2. "Babilônia"**
Mais que uma cidade, representa o sistema mundial em oposição a Deus. No Apocalipse, "Babilônia" simboliza toda forma de idolatria e orgulho humano (Ap 17-18).

---

**🔗 PARALELOS BÍBLICOS**

• **Is 13:10** → **Mt 24:29** — Jesus cita Isaías ao falar do fim dos tempos
• **Is 14:12-15** → **Lc 10:18** — "Vi Satanás caindo do céu como um relâmpago"

---

**❓ PERGUNTAS TEOLÓGICAS**

**1. O que isso revela sobre Deus?**
Deus é soberano sobre todas as nações. Nenhum poder humano, por maior que seja, escapa do seu juízo. Ele é justo e não deixa o mal impune.

**2. O que revela sobre o coração humano?**
O orgulho é a raiz de todo pecado. Babilônia queria "subir acima das estrelas" — a ambição de ser Deus. Este é o pecado original repetido.

---

**⚠️ O QUE NÃO SIGNIFICA**

• ❌ Não é uma previsão literal sobre o atual país do Iraque
• ❌ Não significa que Deus é cruel — o juízo é consequência do pecado
• ❌ Não quer dizer que devemos temer o fim do mundo constantemente

---
Digite outro **NÚMERO** ou **MENU** para voltar.`;
    };

    // Opção 4: Contexto Histórico
    const gerarContextoHistorico = (): string => {
        if (!passagem) return '';

        return `🌍 **CONTEXTO HISTÓRICO: ${passagem.referencia}**

---

**🗺️ GEOGRAFIA**

• **Babilônia:** Localizada na Mesopotâmia (atual Iraque), entre os rios Tigre e Eufrates
• **Moabe:** A leste do Mar Morto, região montanhosa
• **Distância de Jerusalém:** ~900km até Babilônia, ~80km até Moabe

---

**👑 CENÁRIO POLÍTICO**

• **Época:** Século VIII a.C.
• **Judá:** Reino do sul, ainda independente mas sob ameaça
• **Assíria:** Superpotência dominante na época de Isaías
• **Babilônia:** Ainda subordinada à Assíria, mas profetizada como futura conquistadora

---

**🏛️ ESTRUTURA SOCIAL**

• **Profecias contra nações:** Prática comum dos profetas (também em Amós, Ezequiel)
• **Função:** Mostrar que Deus é Senhor de TODAS as nações, não só de Israel
• **Audiência:** Os israelitas, para ensinar sobre a soberania divina

---

**📿 COSTUMES E RELIGIÃO**

• **Babilônia:** Famosa pelos zigurates e adoração a Marduk
• **Moabe:** Adoravam Quemós, com sacrifícios de crianças
• **Israel:** Chamado a ser separado dessas práticas pagãs

---

**💡 POR QUE FAZ SENTIDO PARA OS PRIMEIROS LEITORES?**

Os israelitas viviam sob constante ameaça de impérios maiores. Ouvir que Deus julgaria até a poderosa Babilônia trazia:
1. **Consolo:** Deus vê a injustiça e agirá
2. **Advertência:** Israel também será julgado se pecar
3. **Esperança:** O Senhor está no controle da história

---

**🔄 CONEXÃO COM HOJE**

Assim como Babilônia representava o poder mundano, hoje enfrentamos "babilônias" modernas: sistemas de orgulho, consumismo, e ideologias que desafiam Deus. A mensagem permanece: nenhum poder humano prevalece contra o Senhor.

---
Digite outro **NÚMERO** ou **MENU** para voltar.`;
    };

    // Opção 5: Aplicação Prática
    const gerarAplicacaoPratica = (): string => {
        if (!passagem) return '';

        return `🚀 **APLICAÇÃO PRÁTICA: ${passagem.referencia}**

---

**O que posso viver nas próximas 24–48h?**

---

**1. 🏠 EM CASA: Examinar meu orgulho**

O rei de Babilônia caiu por querer "subir acima das estrelas". 

**Ação concreta:** Hoje, identifique uma área onde você se sente "superior" a alguém (família, cônjuge, filhos). Peça perdão internamente e demonstre humildade com um ato de serviço (lavar a louça, ouvir sem interromper).

---

**2. 💼 NO TRABALHO: Confiar na soberania de Deus**

Isaías mostra que até impérios caem quando Deus decide. Nenhum chefe, empresa ou crise econômica está acima do Senhor.

**Ação concreta:** Se você está ansioso com o trabalho, ore especificamente: "Senhor, Tu és o Senhor dos Exércitos, também sobre minha carreira. Ajuda-me a confiar."

---

**3. 💭 NO CORAÇÃO: Abandonar o "astro brilhante" interno**

Todos temos a tentação de querer brilhar mais que os outros. 

**Ação concreta:** Quando receber um elogio hoje, mentalmente redirecione a glória a Deus. Diga internamente: "Obrigado, Senhor, por usar alguém tão falho quanto eu."

---

**⚠️ O QUE EVITAR**

• ❌ Não use o texto para julgar outras nações ou pessoas
• ❌ Não tenha medo paralisante do juízo — a graça de Cristo nos cobre
• ❌ Não leia como curiosidade apocalíptica, mas como convite à humildade

---

**🙏 ORAÇÃO SUGERIDA**

*"Senhor, Tu resististe ao orgulho de Babilônia. Resiste também ao meu. Mostra-me onde estou querendo 'subir acima das estrelas' e me dá a graça de descer como Jesus desceu. Amém."*

---
Digite outro **NÚMERO** ou **MENU** para voltar.`;
    };

    // Opção 6: Síntese Completa
    const gerarSinteseCompleta = (): string => {
        if (!passagem) return '';

        const insights = passagem.insights_pre_minerados;

        return `⚡ **SÍNTESE COMPLETA: ${passagem.referencia}**

---

**🎯 A GRANDE IDEIA**

> **${insights[0]?.tese || 'O Dia do Senhor revela que nenhum poder humano permanece diante da soberania divina.'}**

---

**📋 PONTOS-CHAVE**

${insights.map((i, idx) => `${idx + 1}. **${i.familia}:** ${i.tese} *(${i.verso_suporte})*`).join('\n')}

---

**🔚 DESFECHO**

A tensão entre o orgulho humano e a soberania de Deus se resolve no **Dia do Senhor**:
- Babilônia cai — o orgulho é humilhado
- Moabe lamenta — o juízo é inevitável
- Mas há esperança implícita — quem se humilha diante de Deus encontra graça

---

**💎 RESUMO EXECUTIVO (para quem tem 30 segundos)**

Isaías 13-15 profetiza contra nações orgulhosas. **Babilônia**, símbolo do poder humano, cairá no "Dia do Senhor". **Moabe** também será destruída. A mensagem central: **nenhum império resiste a Deus**. Para nós hoje: humildade diante do Senhor é o único caminho seguro.

---

**✝️ CONEXÃO COM O EVANGELHO**

Cristo tomou sobre si o juízo que merecíamos. O "Dia do Senhor" que seria nossa condenação tornou-se, pela cruz, nosso dia de salvação.

---
Digite outro **NÚMERO** ou **MENU** para voltar.`;
    };

    // Opção 7: Exposição Detalhada
    const gerarExposicaoDetalhada = (): string => {
        if (!passagem) return '';

        return `🏛️ **EXPOSIÇÃO DETALHADA: ${passagem.referencia}**
📍 *Bloco 1 de 3: Isaías 13 — O Dia do Senhor contra Babilônia*

---

**VERSÍCULOS 1-5: O Exército Divino**

> "Sentença contra Babilônia, que Isaías, filho de Amoz, recebeu em visão."

**Sentido original:** A palavra "sentença" (hebr. *massa*) significa "peso/fardo". Isaías carrega uma mensagem pesada de juízo. Babilônia, embora ainda não seja a superpotência que será em 586 a.C., já representa o orgulho humano.

**Conexão bíblica:** Este padrão de "sentença contra nações" aparece em Amós 1-2 e Ezequiel 25-32. Deus julga todas as nações, não apenas Israel.

**Apontando para Cristo:** Jesus é o verdadeiro "Senhor dos Exércitos" (Mt 26:53). Ele poderia convocar legiões de anjos, mas escolheu a cruz.

---

**VERSÍCULOS 6-9: O Dia Terrível**

> "Gemam, pois o dia do Senhor está perto; ele vem como uma destruição do Todo-Poderoso."

**Sentido original:** O "Dia do Senhor" (Yom YHWH) é o motivo central dos profetas. É quando Deus invade a história para acertar as contas.

**Conexão bíblica:** Joel 2:1, Amós 5:18, Sofonias 1:14 — todos ecoam este tema. O NT o conecta à volta de Cristo (1 Ts 5:2).

**Apontando para Cristo:** Na cruz, Jesus enfrentou o "Dia do Senhor" em nosso lugar. O terror que deveria nos destruir caiu sobre Ele.

---

**VERSÍCULOS 10-16: Sinais Cósmicos**

> "As estrelas e constelações dos céus não darão sua luz."

**Sentido original:** Linguagem apocalíptica para descrever a magnitude do juízo. Não é literal, mas poética — o universo reage diante de Deus.

**Conexão bíblica:** Jesus usa estas imagens em Mateus 24:29 ao falar do fim dos tempos.

---

Digite **CONTINUAR** para o próximo bloco (Is 14: A Queda do Rei).
Ou **MENU** para voltar.`;
    };

    // Opção 9: Quiz
    const gerarQuiz = (): string => {
        if (!passagem) return '';

        return `📝 **REVISÃO & QUIZ: ${passagem.referencia}**

---

Agora é você que fala! Responda por escrito aqui ou pense/responda em voz alta. Se você escrever, eu consigo te dar feedback.

---

**PERGUNTA 1 — Compreensão**

> Qual nação é o principal alvo da profecia em Isaías 13?

*(Pense antes de responder...)*

---

**PERGUNTA 2 — Interpretação**

> O que o "Dia do Senhor" ensina sobre o caráter de Deus?

*Dica: pense em justiça, soberania, santidade...*

---

**PERGUNTA 3 — Aplicação Pessoal**

> Em que área da sua vida você pode estar agindo como "Babilônia" — com orgulho ou auto-suficiência?

*Seja honesto consigo mesmo...*

---

**PERGUNTA 4 — Conexão Bíblica**

> Isaías 14:12 fala de alguém que queria "subir acima das estrelas". Jesus disse algo parecido sobre Satanás. Você lembra onde?

*Dica: Lucas 10...*

---

**PERGUNTA 5 — Síntese**

> Se você tivesse que resumir Isaías 13-15 em UMA frase para um amigo, o que diria?

---

📬 **Escreva suas respostas abaixo!**
Eu te darei feedback. Ou digite **MENU** para voltar às opções.`;
    };

    // Processar pergunta do chat pastoral
    const processarChatPastoral = async (pergunta: string): Promise<string> => {
        if (!passagem) return 'Passagem não carregada.';

        // Simulação de resposta pastoral inteligente baseada no contexto
        // Em produção, isso seria uma chamada para a Edge Function com IA

        const perguntaLower = pergunta.toLowerCase();

        if (perguntaLower.includes('por que') || perguntaLower.includes('porque')) {
            return `Ótima pergunta! 

Baseado em **${passagem.referencia}**, posso te ajudar a entender...

${passagem.insights_pre_minerados.slice(0, 2).map(i => `• **${i.verso_suporte}:** ${i.tese}`).join('\n')}

O texto nos ensina que Deus é soberano sobre todas as nações. A Babilônia, por mais poderosa que fosse, não estava fora do alcance do juízo divino.

---

Faz sentido para você? Quer que aprofunde mais algum ponto?`;
        }

        if (perguntaLower.includes('como aplicar') || perguntaLower.includes('como viver')) {
            return `Essa é uma pergunta muito prática!

De **${passagem.referencia}**, podemos extrair aplicações diretas:

1. **Humildade:** O orgulho de Babilônia foi sua ruína. Onde você pode praticar humildade hoje?

2. **Confiança:** Deus está no controle — mesmo quando nações parecem invencíveis. Você pode descansar nisso.

3. **Vigilância:** O "Dia do Senhor" veio para Babilônia. Estamos vivendo de forma que nos preparamos para encontrar nosso Senhor?

---

Qual dessas aplicações ressoa mais com você hoje?`;
        }

        // Resposta genérica
        return `Obrigado por compartilhar essa reflexão sobre **${passagem.referencia}**!

Deixa eu te ajudar a pensar nisso à luz do texto...

O profeta Isaías nos mostra que:
${passagem.insights_pre_minerados[0] ? `• ${passagem.insights_pre_minerados[0].tese}` : ''}

A passagem de hoje nos confronta com a soberania de Deus sobre TODAS as nações e circunstâncias.

---

Quer explorar mais algum aspecto específico? Ou posso te sugerir reler os versículos ${passagem.insights_pre_minerados[0]?.verso_suporte || '13:1-9'}.`;
    };

    // Processar comando CONTINUAR
    const processarContinuar = async (): Promise<string> => {
        if (!passagem) return 'Passagem não carregada.';

        const page = currentPageRef.current;  // Use ref for immediate value
        console.log('🔄 processarContinuar - activeOption:', activeOption, 'currentPage (ref):', page);

        // OPÇÃO 1: LEITURA GUIADA (Paginação Dinâmica)
        if (activeOption === '1') {
            const totalVersiculos = bibleData?.versiculos.length || 30;
            const totalPartes = Math.ceil(totalVersiculos / 10);

            console.log('📖 Opção 1 - Página atual:', page, 'Total partes:', totalPartes);

            // Se já estamos na última página ou além, mostra conclusão
            if (page >= totalPartes) {
                return `✅ **LEITURA CONCLUÍDA!**

---

📖 **Você completou a leitura de ${passagem.referencia}!**

💎 **Resumo:** Medite sobre o que leu e deixe a Palavra transformar seu coração.

🙏 **Sugestão de Oração:**

*"Senhor, obrigado por Tua Palavra. Que ela habite ricamente em mim e guie meus passos hoje. Em nome de Jesus. Amém."*

---
Digite **MENU** para voltar e explorar outras opções.`;
            }

            // Avança para próxima página
            const nextPage = page + 1;
            currentPageRef.current = nextPage;
            setCurrentPage(nextPage);

            const startIndex = page * 10;  // page=1 -> start=10, page=2 -> start=20, etc.

            // Atualizar versículos interativos da página
            if (bibleData) {
                const slice = bibleData.versiculos.slice(startIndex, startIndex + 10);
                setVersiculosPaginaAtual(slice);
            }

            const ehUltimaParte = nextPage >= totalPartes;

            return `📖 **${passagem.referencia}**
📍 *Parte ${nextPage} de ${totalPartes}*

---

%%VERSICULOS_INTERATIVOS%%

---

${ehUltimaParte
                    ? 'Digite **CONTINUAR** para finalizar a leitura.'
                    : 'Digite **CONTINUAR** para os próximos versículos.'}
Digite **EXPLICAR** para gerar contexto e explicação desta parte.
Ou **MENU** para voltar.`;
        }

        // OPÇÃO 7: EXPOSIÇÃO DETALHADA
        if (activeOption === '7') {
            if (page === 1) {
                currentPageRef.current = 2;
                setCurrentPage(2);
                return `🏛️ **EXPOSIÇÃO DETALHADA: ${passagem.referencia}**
📍 *Bloco 2 de 3: Isaías 14 — A Queda do "Astro Brilhante"*

---

**VERSÍCULOS 12-15: O Orgulho Fatal**

> "Como você caiu dos céus, ó estrela da manhã, filho da alvorada!"

**Sentido original:** O "astro brilhante" (hebr. *helel*) refere-se ao rei de Babilônia. A imagem é de alguém que queria ser como Deus e caiu.

**Conexão bíblica:** Jesus em Lucas 10:18: "Eu vi Satanás caindo do céu como um relâmpago." A queda do rei babilônico prefigura a queda do próprio inimigo.

**Apontando para Cristo:** Enquanto Lúcifer/Babilônia subiu e caiu, Cristo desceu e foi exaltado (Fp 2:5-11). O caminho de Deus é a humildade.

---

**OS "CINCO EU VOU" (v.13-14)**

1. "Subirei aos céus"
2. "Erguerei meu trono acima das estrelas"
3. "Sentarei no monte da assembleia"
4. "Subirei acima das nuvens"
5. "Serei como o Altíssimo"

**Significado:** Cada "eu vou" representa um degrau de orgulho. O pecado original foi querer "ser como Deus" (Gn 3:5).

---

Digite **CONTINUAR** para o bloco final (Isaías 15: Moabe).
Ou **MENU** para voltar.`;
            }

            if (page === 2) {
                currentPageRef.current = 3;
                setCurrentPage(3);
                return `🏛️ **EXPOSIÇÃO DETALHADA: ${passagem.referencia}**
📍 *Bloco 3 de 3: Isaías 15 — O Lamento sobre Moabe*

---

**VERSÍCULOS 1-5: A Destruição de Moabe**

> "Sentença contra Moabe: Numa noite Ar de Moabe foi arrasada, foi destruída!"

**Sentido original:** Moabe era uma nação vizinha de Israel, descendente de Ló. Apesar do parentesco, Moabe frequentemente se opunha a Israel.

**Conexão bíblica:** Rute era moabita — do povo que agora recebe juízo. Deus age em justiça, mas também em graça individual.

**Apontando para Cristo:** Assim como Rute encontrou graça em Israel, nós, sendo "estrangeiros", encontramos graça em Cristo.

---

**O LAMENTO (v.5)**

> "O meu coração clama por Moabe..."

Isaías não celebra a destruição — ele lamenta. O profeta tem compaixão mesmo pelo inimigo.

**Aplicação:** Deus julga, mas não se alegra na destruição do ímpio (Ez 33:11). Devemos ter a mesma postura.

---

Digite **CONTINUAR** para finalizar.
Ou **MENU** para voltar.`;
            }

            // Bloco final
            return `✅ **EXPOSIÇÃO CONCLUÍDA!**

---

📖 **Você completou a exposição detalhada de ${passagem.referencia}!**

💎 **Resumo de Ouro:** Os capítulos 13-15 de Isaías mostram Deus como Juiz de todas as nações. Babilônia e Moabe representam todo poder humano que desafia a Deus.

🙏 **Sugestão de Oração:**

*"Senhor, que eu nunca me esqueça de que Tu estás no trono. Dá-me um coração humilde e compassivo, mesmo diante dos que me perseguem. Em nome de Jesus. Amém."*

---
Digite **MENU** para continuar estudando.`;
        }

        // Para outras opções, mostra mensagem de conclusão
        return `✅ **LEITURA CONCLUÍDA!**

---

💎 **Resumo de Ouro:** Deus é soberano sobre todas as nações. O orgulho humano sempre será humilhado, mas há graça para os humildes.

🙏 **Sugestão de Oração:**

*"Senhor, obrigado por me lembrar que Tu estás no controle. Que eu não seja como Babilônia, buscando minha própria glória. Ajuda-me a viver com humildade, confiando na Tua soberania. Em nome de Jesus. Amém."*

---
Digite **MENU** para continuar estudando.`;
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
            const welcomeMessage: ChatMessage = {
                role: 'assistant',
                content: gerarRespostaMenuInicial(),
                timestamp: new Date()
            };
            setMessages([welcomeMessage]);
        }
    }, [loading, passagem]);

    // ===========================================
    // RENDER
    // ===========================================

    return (
        <CosmicBackground className="min-h-screen pb-20 overflow-x-hidden selection:bg-amber-500/30">

            {/* Navbar Placeholder (or Back Button) */}
            <div className="max-w-7xl mx-auto pt-8 px-6 mb-8 flex justify-between items-center z-10 relative">
                <Link href="/" className="btn-glass px-4 py-2 rounded-full flex items-center gap-2 text-sm font-medium group">
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    Voltar ao Dashboard
                </Link>
                <div className="flex gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                    <span className="text-xs text-slate-400 font-mono tracking-widest">ONLINE</span>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 z-10 relative">

                {/* Header Section */}
                <div className="text-center mb-16 animate-enter">
                    <span className="inline-block px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold tracking-[0.2em] mb-4">
                        MODO MENTOR
                    </span>
                    <h1 className="text-4xl md:text-6xl font-bold text-white mb-4 tracking-tight">
                        Plano de <span className="text-gradient-gold">Leitura</span>
                    </h1>
                    <p className="text-slate-400 text-lg max-w-2xl mx-auto">
                        Mergulhe nas Escrituras com profundidade, contexto e aplicação prática.
                    </p>
                </div>

                {!activeOption ? (
                    // -------------------------------------------
                    // VISTA INICIAL (MENU GRID)
                    // -------------------------------------------
                    <div className="animate-enter" style={{ animationDelay: '0.1s' }}>

                        {/* Daily Passage Card (Hero) */}
                        <div className="glass-panel rounded-3xl p-8 mb-12 flex flex-col md:flex-row items-center justify-between gap-8 border-amber-500/20 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 blur-[100px] rounded-full -mr-32 -mt-32 pointer-events-none"></div>

                            <div className="flex-1 text-center md:text-left z-10">
                                <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">PASSAGEM DE HOJE ({formatarDataExtenso(dataHoje)})</h2>

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
                    // VISTA CHAT (INTERATIVA)
                    // -------------------------------------------
                    <div className="max-w-4xl mx-auto animate-enter">
                        <div className="glass-panel rounded-3xl min-h-[70vh] flex flex-col relative overflow-hidden border-amber-500/20">

                            {/* Chat Header */}
                            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-black/20 backdrop-blur-md sticky top-0 z-20">
                                <div className="flex items-center gap-4">
                                    <button
                                        onClick={() => setActiveOption(null)}
                                        className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-400 hover:text-white"
                                    >
                                        <ArrowLeft className="w-5 h-5" />
                                    </button>
                                    <div>
                                        <h2 className="font-bold text-white text-lg">
                                            {MENU_OPTIONS.find(o => o.id === activeOption)?.label}
                                        </h2>
                                        <p className="text-xs text-slate-400">
                                            {passagem?.referencia} • {passagem?.arquetipo_maestro}
                                        </p>
                                    </div>
                                </div>
                                <div className="p-2 bg-amber-500/10 rounded-full">
                                    <Sparkles className="w-5 h-5 text-amber-400" />
                                </div>
                            </div>

                            {/* Messages Area */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                                {messages.map((msg, idx) => {
                                    // Passa versículos interativos para a última mensagem com placeholder
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
                                        <div className="glass-panel px-6 py-4 rounded-2xl rounded-bl-none flex items-center gap-3">
                                            <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
                                            <span className="text-sm text-slate-400">O Mentor está escrevendo...</span>
                                        </div>
                                    </div>
                                )}
                                <div ref={chatEndRef} />
                            </div>

                            {/* Input Area - Botões de ação */}
                            <div className="p-4 border-t border-white/5 bg-black/20 backdrop-blur-md">
                                <div className="flex gap-3">
                                    {/* Botão Continuar */}
                                    <button
                                        type="button"
                                        onClick={() => submitMessage('Continuar')}
                                        className="flex-1 btn-premium py-4 rounded-xl flex items-center justify-center gap-2"
                                        disabled={isProcessing}
                                    >
                                        <ArrowRight className="w-5 h-5" />
                                        Continuar
                                    </button>

                                    {/* Botão Explicar (só na Opção 1) */}
                                    {activeOption === '1' && (
                                        <button
                                            type="button"
                                            onClick={() => submitMessage('Explicar')}
                                            className="flex-1 bg-white/5 border border-white/10 hover:bg-white/10 text-white py-4 rounded-xl flex items-center justify-center gap-2 transition-colors"
                                            disabled={isProcessing}
                                        >
                                            <Sparkles className="w-5 h-5 text-amber-400" />
                                            Explicar
                                        </button>
                                    )}
                                </div>
                            </div>

                        </div>
                    </div>
                )}
            </div>
        </CosmicBackground>
    );
}
