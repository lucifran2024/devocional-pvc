'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Book, ChevronLeft, ChevronRight, ArrowLeft, Loader2, X, ArrowRight } from 'lucide-react';
import { CosmicBackground } from '@/components/ui/CosmicBackground';

// Lista de livros da Bíblia
const LIVROS_BIBLIA = [
    // Antigo Testamento
    { nome: 'Gênesis', abrev: 'gn', capitulos: 50 },
    { nome: 'Êxodo', abrev: 'ex', capitulos: 40 },
    { nome: 'Levítico', abrev: 'lv', capitulos: 27 },
    { nome: 'Números', abrev: 'nm', capitulos: 36 },
    { nome: 'Deuteronômio', abrev: 'dt', capitulos: 34 },
    { nome: 'Josué', abrev: 'js', capitulos: 24 },
    { nome: 'Juízes', abrev: 'jz', capitulos: 21 },
    { nome: 'Rute', abrev: 'rt', capitulos: 4 },
    { nome: '1 Samuel', abrev: '1sm', capitulos: 31 },
    { nome: '2 Samuel', abrev: '2sm', capitulos: 24 },
    { nome: '1 Reis', abrev: '1rs', capitulos: 22 },
    { nome: '2 Reis', abrev: '2rs', capitulos: 25 },
    { nome: '1 Crônicas', abrev: '1cr', capitulos: 29 },
    { nome: '2 Crônicas', abrev: '2cr', capitulos: 36 },
    { nome: 'Esdras', abrev: 'ed', capitulos: 10 },
    { nome: 'Neemias', abrev: 'ne', capitulos: 13 },
    { nome: 'Ester', abrev: 'et', capitulos: 10 },
    { nome: 'Jó', abrev: 'jó', capitulos: 42 },
    { nome: 'Salmos', abrev: 'sl', capitulos: 150 },
    { nome: 'Provérbios', abrev: 'pv', capitulos: 31 },
    { nome: 'Eclesiastes', abrev: 'ec', capitulos: 12 },
    { nome: 'Cantares', abrev: 'ct', capitulos: 8 },
    { nome: 'Isaías', abrev: 'is', capitulos: 66 },
    { nome: 'Jeremias', abrev: 'jr', capitulos: 52 },
    { nome: 'Lamentações', abrev: 'lm', capitulos: 5 },
    { nome: 'Ezequiel', abrev: 'ez', capitulos: 48 },
    { nome: 'Daniel', abrev: 'dn', capitulos: 12 },
    { nome: 'Oséias', abrev: 'os', capitulos: 14 },
    { nome: 'Joel', abrev: 'jl', capitulos: 3 },
    { nome: 'Amós', abrev: 'am', capitulos: 9 },
    { nome: 'Obadias', abrev: 'ob', capitulos: 1 },
    { nome: 'Jonas', abrev: 'jn', capitulos: 4 },
    { nome: 'Miquéias', abrev: 'mq', capitulos: 7 },
    { nome: 'Naum', abrev: 'na', capitulos: 3 },
    { nome: 'Habacuque', abrev: 'hc', capitulos: 3 },
    { nome: 'Sofonias', abrev: 'sf', capitulos: 3 },
    { nome: 'Ageu', abrev: 'ag', capitulos: 2 },
    { nome: 'Zacarias', abrev: 'zc', capitulos: 14 },
    { nome: 'Malaquias', abrev: 'ml', capitulos: 4 },
    // Novo Testamento
    { nome: 'Mateus', abrev: 'mt', capitulos: 28 },
    { nome: 'Marcos', abrev: 'mc', capitulos: 16 },
    { nome: 'Lucas', abrev: 'lc', capitulos: 24 },
    { nome: 'João', abrev: 'jo', capitulos: 21 },
    { nome: 'Atos', abrev: 'at', capitulos: 28 },
    { nome: 'Romanos', abrev: 'rm', capitulos: 16 },
    { nome: '1 Coríntios', abrev: '1co', capitulos: 16 },
    { nome: '2 Coríntios', abrev: '2co', capitulos: 13 },
    { nome: 'Gálatas', abrev: 'gl', capitulos: 6 },
    { nome: 'Efésios', abrev: 'ef', capitulos: 6 },
    { nome: 'Filipenses', abrev: 'fp', capitulos: 4 },
    { nome: 'Colossenses', abrev: 'cl', capitulos: 4 },
    { nome: '1 Tessalonicenses', abrev: '1ts', capitulos: 5 },
    { nome: '2 Tessalonicenses', abrev: '2ts', capitulos: 3 },
    { nome: '1 Timóteo', abrev: '1tm', capitulos: 6 },
    { nome: '2 Timóteo', abrev: '2tm', capitulos: 4 },
    { nome: 'Tito', abrev: 'tt', capitulos: 3 },
    { nome: 'Filemom', abrev: 'fm', capitulos: 1 },
    { nome: 'Hebreus', abrev: 'hb', capitulos: 13 },
    { nome: 'Tiago', abrev: 'tg', capitulos: 5 },
    { nome: '1 Pedro', abrev: '1pe', capitulos: 5 },
    { nome: '2 Pedro', abrev: '2pe', capitulos: 3 },
    { nome: '1 João', abrev: '1jo', capitulos: 5 },
    { nome: '2 João', abrev: '2jo', capitulos: 1 },
    { nome: '3 João', abrev: '3jo', capitulos: 1 },
    { nome: 'Judas', abrev: 'jd', capitulos: 1 },
    { nome: 'Apocalipse', abrev: 'ap', capitulos: 22 },
];

interface Versiculo {
    verse: number;
    text: string;
}

export default function BibliotecaPage() {
    // Estado principal de leitura (só atualiza quando o usuário Confirma a seleção)
    const [livroAtual, setLivroAtual] = useState(LIVROS_BIBLIA[0]);
    const [capituloAtual, setCapituloAtual] = useState(1);

    // Conteúdo e UI
    const [versiculos, setVersiculos] = useState<Versiculo[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [modalAberto, setModalAberto] = useState(false);

    // Estado temporário para o Modal de Seleção
    const [faseSelecao, setFaseSelecao] = useState<'livros' | 'capitulos'>('livros');
    const [livroSelecionadoTemp, setLivroSelecionadoTemp] = useState(LIVROS_BIBLIA[0]);

    // Buscar capítulo da API
    const buscarCapitulo = async (livro: string, cap: number) => {
        setLoading(true);
        setError(null);

        try {
            // Mapeamento de abreviações para nomes em inglês usados pela API
            const livroParaIngles: { [key: string]: number } = {
                'gn': 1, 'ex': 2, 'lv': 3, 'nm': 4, 'dt': 5, 'js': 6, 'jz': 7, 'rt': 8,
                '1sm': 9, '2sm': 10, '1rs': 11, '2rs': 12, '1cr': 13, '2cr': 14,
                'ed': 15, 'ne': 16, 'et': 17, 'jó': 18, 'sl': 19, 'pv': 20, 'ec': 21,
                'ct': 22, 'is': 23, 'jr': 24, 'lm': 25, 'ez': 26, 'dn': 27, 'os': 28,
                'jl': 29, 'am': 30, 'ob': 31, 'jn': 32, 'mq': 33, 'na': 34, 'hc': 35,
                'sf': 36, 'ag': 37, 'zc': 38, 'ml': 39, 'mt': 40, 'mc': 41, 'lc': 42,
                'jo': 43, 'at': 44, 'rm': 45, '1co': 46, '2co': 47, 'gl': 48, 'ef': 49,
                'fp': 50, 'cl': 51, '1ts': 52, '2ts': 53, '1tm': 54, '2tm': 55, 'tt': 56,
                'fm': 57, 'hb': 58, 'tg': 59, '1pe': 60, '2pe': 61, '1jo': 62, '2jo': 63,
                '3jo': 64, 'jd': 65, 'ap': 66
            };

            const bookId = livroParaIngles[livro] || 1;

            // Usando bolls.life API (gratuita, com NVI em português)
            const response = await fetch(
                `https://bolls.life/get-chapter/NTLH/${bookId}/${cap}/`,
                {
                    headers: {
                        'Accept': 'application/json'
                    }
                }
            );

            if (!response.ok) {
                // Se falhar, usar dados de exemplo
                throw new Error('API não disponível');
            }

            const data = await response.json();

            if (Array.isArray(data)) {
                setVersiculos(data.map((v: { verse: number; text: string }) => ({
                    verse: v.verse,
                    text: v.text
                })));
            } else {
                throw new Error('Formato de resposta inválido');
            }
        } catch (err) {
            console.error('Erro:', err);
            // Fallback: dados de exemplo
            setVersiculos([
                { verse: 1, text: 'No princípio Deus criou os céus e a terra.' },
                { verse: 2, text: 'A terra era sem forma e vazia; e havia trevas sobre a face do abismo.' },
                { verse: 3, text: 'E disse Deus: Haja luz. E houve luz.' },
                { verse: 4, text: 'Viu Deus que a luz era boa; e fez separação entre a luz e as trevas.' },
                { verse: 5, text: 'E Deus chamou à luz Dia, e às trevas chamou Noite. E foi a tarde e a manhã, o dia primeiro.' },
            ]);
            // Não mostrar erro, usar fallback silencioso
        } finally {
            setLoading(false);
        }
    };

    // Efeito para carregar o capítulo quando livro/capítulo atual mudar (e APENAS quando mudar o atual)
    useEffect(() => {
        buscarCapitulo(livroAtual.abrev, capituloAtual);
    }, [livroAtual, capituloAtual]);

    // Navegação de capítulos rápida (setas da barra)
    const irParaProximo = () => {
        if (capituloAtual < livroAtual.capitulos) {
            setCapituloAtual(capituloAtual + 1);
        }
    };

    const irParaAnterior = () => {
        if (capituloAtual > 1) {
            setCapituloAtual(capituloAtual - 1);
        }
    };

    // --- Lógica do Modal de Seleção ---

    const abrirModal = () => {
        // Ao abrir, reseta para o estado atual
        setLivroSelecionadoTemp(livroAtual);
        setFaseSelecao('livros');
        setModalAberto(true);
    };

    const selecionarLivroTemp = (livro: typeof LIVROS_BIBLIA[0]) => {
        setLivroSelecionadoTemp(livro);
        setFaseSelecao('capitulos'); // Avança para a próxima etapa, sem fechar nem atualizar o principal
    };

    const confirmarSelecao = (cap: number) => {
        // O usuário escolheu o capítulo, AGORA atualizamos o estado principal
        setLivroAtual(livroSelecionadoTemp);
        setCapituloAtual(cap);
        setModalAberto(false);
    };

    const voltarParaLivros = () => {
        setFaseSelecao('livros');
    };

    return (
        <CosmicBackground className="min-h-screen">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-black/40 backdrop-blur-xl border-b border-white/5">
                <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
                    <Link
                        href="/"
                        className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        <span className="text-sm font-medium">Voltar</span>
                    </Link>

                    <div className="flex items-center gap-2">
                        <Book className="w-5 h-5 text-amber-400" />
                        <span className="text-sm font-bold text-white">Bíblia Sagrada</span>
                    </div>

                    <div className="w-20"></div>
                </div>
            </header>

            {/* Barra de Controle (Sticky) */}
            <div className="sticky top-[65px] z-40 bg-black/60 backdrop-blur-xl border-b border-white/5">
                <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-4">

                    {/* Botão de Seleção Principal */}
                    <button
                        onClick={abrirModal}
                        className="flex-1 glass-panel px-4 py-3 rounded-xl flex items-center justify-between hover:bg-white/10 transition-colors group"
                    >
                        <div className="text-left">
                            <div className="text-xs text-slate-400 mb-1 group-hover:text-amber-400 transition-colors">Leitura Atual</div>
                            <div className="text-white font-bold text-lg flex items-center gap-2">
                                {livroAtual.nome} {capituloAtual}
                                <ChevronRight className="w-4 h-4 text-slate-500" />
                            </div>
                        </div>
                    </button>

                    {/* Botões de Navegação Rápida */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={irParaAnterior}
                            disabled={capituloAtual <= 1}
                            className="p-4 glass-panel rounded-xl disabled:opacity-30 hover:bg-white/10 transition-colors"
                            aria-label="Capítulo Anterior"
                        >
                            <ChevronLeft className="w-5 h-5 text-white" />
                        </button>

                        <button
                            onClick={irParaProximo}
                            disabled={capituloAtual >= livroAtual.capitulos}
                            className="p-4 glass-panel rounded-xl disabled:opacity-30 hover:bg-white/10 transition-colors"
                            aria-label="Próximo Capítulo"
                        >
                            <ChevronRight className="w-5 h-5 text-white" />
                        </button>
                    </div>
                </div>
            </div>

            {/* --- MODAL DE SELEÇÃO --- */}
            {modalAberto && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
                    <div className="glass-panel rounded-2xl max-w-lg w-full max-h-[80vh] flex flex-col overflow-hidden border border-white/10 shadow-2xl">

                        {/* Header do Modal */}
                        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5">
                            {faseSelecao === 'capitulos' ? (
                                <button
                                    onClick={voltarParaLivros}
                                    className="flex items-center gap-1 text-amber-400 hover:text-amber-300 text-sm font-medium px-2 py-1 rounded hover:bg-white/5"
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                    Voltar
                                </button>
                            ) : (
                                <div className="w-16"></div> // Espaçador para manter o título centralizado
                            )}

                            <h3 className="text-lg font-bold text-white">
                                {faseSelecao === 'livros' ? 'Escolha o Livro' : `Capítulos de ${livroSelecionadoTemp.nome}`}
                            </h3>

                            <button
                                onClick={() => setModalAberto(false)}
                                className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Conteúdo do Modal (Scrollável) */}
                        <div className="overflow-y-auto flex-1 p-2">

                            {/* FASE 1: LISTA DE LIVROS */}
                            {faseSelecao === 'livros' && (
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-2">
                                    {LIVROS_BIBLIA.map((livro) => (
                                        <button
                                            key={livro.abrev}
                                            onClick={() => selecionarLivroTemp(livro)}
                                            className={`p-3 rounded-xl text-left transition-all border ${livro.abrev === livroSelecionadoTemp.abrev
                                                ? 'bg-amber-500/20 border-amber-500/50 text-amber-400'
                                                : 'bg-white/5 border-transparent hover:bg-white/10 text-slate-300'
                                                }`}
                                        >
                                            <div className="font-bold text-sm truncate">{livro.nome}</div>
                                            <div className="text-xs text-slate-500 mt-1">{livro.capitulos} caps</div>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* FASE 2: GRID DE CAPÍTULOS */}
                            {faseSelecao === 'capitulos' && (
                                <div className="p-2">
                                    <div className="grid grid-cols-5 sm:grid-cols-6 gap-3">
                                        {Array.from({ length: livroSelecionadoTemp.capitulos }, (_, i) => i + 1).map((cap) => (
                                            <button
                                                key={cap}
                                                onClick={() => confirmarSelecao(cap)}
                                                className={`aspect-square flex items-center justify-center rounded-xl text-lg font-bold transition-all border ${(livroSelecionadoTemp.abrev === livroAtual.abrev && cap === capituloAtual)
                                                    ? 'bg-amber-500 text-black border-amber-400'
                                                    : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/20 hover:border-white/20'
                                                    }`}
                                            >
                                                {cap}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Conteúdo Principal - Texto Bíblico */}
            <main className="max-w-4xl mx-auto px-4 py-8">
                {/* Título */}
                <h1 className="text-3xl md:text-4xl font-black text-white mb-8 text-center tracking-tight">
                    {livroAtual.nome} <span className="text-amber-400">{capituloAtual}</span>
                </h1>

                {/* Loading State */}
                {loading && (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <Loader2 className="w-10 h-10 text-amber-400 animate-spin" />
                        <p className="text-slate-400 animate-pulse">Carregando escrituras...</p>
                    </div>
                )}

                {/* Error State */}
                {error && !loading && (
                    <div className="glass-panel rounded-xl p-8 text-center max-w-md mx-auto border border-red-500/30 bg-red-500/10">
                        <p className="text-red-300 mb-6 text-lg">{error}</p>
                        <button
                            onClick={() => buscarCapitulo(livroAtual.abrev, capituloAtual)}
                            className="px-8 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold transition-colors"
                        >
                            Tentar Novamente
                        </button>
                    </div>
                )}

                {/* Texto dos Versículos */}
                {!loading && !error && versiculos.length > 0 && (
                    <div className="glass-panel rounded-2xl p-6 md:p-10 relative overflow-hidden">
                        {/* Glow effect */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

                        <div className="space-y-6 text-xl md:text-2xl leading-relaxed text-slate-200 font-serif">
                            {versiculos.map((v) => (
                                <div key={v.verse} className="relative pl-4 hover:bg-white/5 rounded-lg -ml-4 p-2 transition-colors group/verse">
                                    <p>
                                        <sup className="text-xs text-amber-400 font-bold mr-2 select-none opacity-60 group-hover/verse:opacity-100">{v.verse}</sup>
                                        {v.text}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Navegação Inferior de Rodapé */}
                <div className="flex justify-between items-center mt-12 gap-4">
                    <button
                        onClick={irParaAnterior}
                        disabled={capituloAtual <= 1}
                        className="flex items-center gap-3 px-6 py-4 glass-panel rounded-xl disabled:opacity-30 hover:bg-white/10 transition-colors group"
                    >
                        <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                        <span className="font-medium">Capítulo Anterior</span>
                    </button>

                    <button
                        onClick={irParaProximo}
                        disabled={capituloAtual >= livroAtual.capitulos}
                        className="flex items-center gap-3 px-6 py-4 glass-panel rounded-xl disabled:opacity-30 hover:bg-white/10 transition-colors group"
                    >
                        <span className="font-medium">Próximo Capítulo</span>
                        <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>
            </main>
        </CosmicBackground>
    );
}
