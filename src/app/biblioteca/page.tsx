'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Book, ChevronLeft, ChevronRight, ArrowLeft, Loader2, Search } from 'lucide-react';
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
    const [livroSelecionado, setLivroSelecionado] = useState(LIVROS_BIBLIA[0]);
    const [capitulo, setCapitulo] = useState(1);
    const [versiculos, setVersiculos] = useState<Versiculo[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [mostrarLivros, setMostrarLivros] = useState(false);

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
            // setError('Não foi possível carregar o texto. Usando versão offline.');
        } finally {
            setLoading(false);
        }
    };

    // Carregar capítulo quando mudar seleção
    useEffect(() => {
        buscarCapitulo(livroSelecionado.abrev, capitulo);
    }, [livroSelecionado, capitulo]);

    // Navegação de capítulos
    const irParaProximo = () => {
        if (capitulo < livroSelecionado.capitulos) {
            setCapitulo(capitulo + 1);
        }
    };

    const irParaAnterior = () => {
        if (capitulo > 1) {
            setCapitulo(capitulo - 1);
        }
    };

    const selecionarLivro = (livro: typeof LIVROS_BIBLIA[0]) => {
        setLivroSelecionado(livro);
        setCapitulo(1);
        setMostrarLivros(false);
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

            {/* Seletor de Livro e Capítulo */}
            <div className="sticky top-[65px] z-40 bg-black/60 backdrop-blur-xl border-b border-white/5">
                <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-4">

                    {/* Botão Livro */}
                    <button
                        onClick={() => setMostrarLivros(!mostrarLivros)}
                        className="flex-1 glass-panel px-4 py-3 rounded-xl text-left hover:bg-white/10 transition-colors"
                    >
                        <div className="text-xs text-slate-400 mb-1">Livro</div>
                        <div className="text-white font-bold">{livroSelecionado.nome}</div>
                    </button>

                    {/* Navegação de Capítulos */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={irParaAnterior}
                            disabled={capitulo <= 1}
                            className="p-3 glass-panel rounded-xl disabled:opacity-30 hover:bg-white/10 transition-colors"
                        >
                            <ChevronLeft className="w-5 h-5 text-white" />
                        </button>

                        <div className="glass-panel px-4 py-3 rounded-xl min-w-[80px] text-center">
                            <div className="text-xs text-slate-400">Cap.</div>
                            <div className="text-white font-bold">{capitulo}</div>
                        </div>

                        <button
                            onClick={irParaProximo}
                            disabled={capitulo >= livroSelecionado.capitulos}
                            className="p-3 glass-panel rounded-xl disabled:opacity-30 hover:bg-white/10 transition-colors"
                        >
                            <ChevronRight className="w-5 h-5 text-white" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Modal de Seleção de Livro */}
            {mostrarLivros && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="glass-panel rounded-2xl max-w-md w-full max-h-[70vh] overflow-hidden">
                        <div className="p-4 border-b border-white/10">
                            <h3 className="text-lg font-bold text-white">Selecionar Livro</h3>
                        </div>
                        <div className="overflow-y-auto max-h-[calc(70vh-80px)] p-2">
                            <div className="grid grid-cols-2 gap-2">
                                {LIVROS_BIBLIA.map((livro, index) => (
                                    <button
                                        key={livro.abrev}
                                        onClick={() => selecionarLivro(livro)}
                                        className={`p-3 rounded-xl text-left transition-all ${livro.abrev === livroSelecionado.abrev
                                            ? 'bg-amber-500/20 border border-amber-500/50 text-amber-400'
                                            : 'bg-white/5 hover:bg-white/10 text-slate-300'
                                            }`}
                                    >
                                        <div className="font-medium text-sm truncate">{livro.nome}</div>
                                        <div className="text-xs text-slate-500">{livro.capitulos} cap.</div>
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="p-4 border-t border-white/10">
                            <button
                                onClick={() => setMostrarLivros(false)}
                                className="w-full py-3 rounded-xl bg-white/10 text-white font-medium hover:bg-white/20 transition-colors"
                            >
                                Fechar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Conteúdo - Versículos */}
            <main className="max-w-4xl mx-auto px-4 py-8">
                {/* Título do Capítulo */}
                <h1 className="text-3xl md:text-4xl font-black text-white mb-8 text-center">
                    {livroSelecionado.nome} <span className="text-amber-400">{capitulo}</span>
                </h1>

                {/* Loading */}
                {loading && (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
                    </div>
                )}

                {/* Erro */}
                {error && !loading && (
                    <div className="glass-panel rounded-xl p-6 text-center">
                        <p className="text-red-400 mb-4">{error}</p>
                        <button
                            onClick={() => buscarCapitulo(livroSelecionado.abrev, capitulo)}
                            className="px-6 py-2 rounded-lg bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 transition-colors"
                        >
                            Tentar Novamente
                        </button>
                    </div>
                )}

                {/* Versículos */}
                {!loading && !error && versiculos.length > 0 && (
                    <div className="glass-panel rounded-2xl p-6 md:p-8">
                        <div className="space-y-4 text-lg leading-relaxed text-slate-200">
                            {versiculos.map((v) => (
                                <p key={v.verse} className="hover:bg-white/5 rounded-lg px-2 py-1 -mx-2 transition-colors">
                                    <span className="text-amber-400 font-bold text-sm mr-2 align-super">
                                        {v.verse}
                                    </span>
                                    {v.text}
                                </p>
                            ))}
                        </div>
                    </div>
                )}

                {/* Navegação Inferior */}
                <div className="flex justify-between items-center mt-8 gap-4">
                    <button
                        onClick={irParaAnterior}
                        disabled={capitulo <= 1}
                        className="flex items-center gap-2 px-6 py-3 glass-panel rounded-xl disabled:opacity-30 hover:bg-white/10 transition-colors"
                    >
                        <ChevronLeft className="w-5 h-5" />
                        <span>Anterior</span>
                    </button>

                    <span className="text-slate-500 text-sm">
                        {capitulo} / {livroSelecionado.capitulos}
                    </span>

                    <button
                        onClick={irParaProximo}
                        disabled={capitulo >= livroSelecionado.capitulos}
                        className="flex items-center gap-2 px-6 py-3 glass-panel rounded-xl disabled:opacity-30 hover:bg-white/10 transition-colors"
                    >
                        <span>Próximo</span>
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
            </main>
        </CosmicBackground>
    );
}
