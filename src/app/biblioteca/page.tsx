'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import {
    Book, ChevronLeft, ChevronRight, ArrowLeft, Loader2, X,
    Heart, Copy, Share2, Lightbulb, Palette, StickyNote,
    Search, BookmarkIcon, Trash2, ChevronDown
} from 'lucide-react';
import { CosmicBackground } from '@/components/ui/CosmicBackground';
import { useToast } from '@/hooks/useToast';
import { ToastContainer } from '@/components/ui/ToastContainer';
import {
    salvarInteracaoBiblia,
    removerInteracaoBiblia,
    removerInteracaoPorVersiculoETipo,
    getInteracoesPorCapitulo,
    getAllInteracoesPorTipo,
    atualizarNotaBiblia,
    salvarHistoricoLeitura,
    getUltimaLeitura,
    type BibliaInteracao
} from '@/lib/supabase';

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

const LIVRO_PARA_ID: Record<string, number> = {
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

const CORES_DESTAQUE: { id: string; nome: string; bg: string; border: string }[] = [
    { id: 'yellow', nome: 'Amarelo', bg: 'bg-yellow-500/20', border: 'border-yellow-500/40' },
    { id: 'blue', nome: 'Azul', bg: 'bg-blue-500/20', border: 'border-blue-500/40' },
    { id: 'green', nome: 'Verde', bg: 'bg-green-500/20', border: 'border-green-500/40' },
    { id: 'pink', nome: 'Rosa', bg: 'bg-pink-500/20', border: 'border-pink-500/40' },
];

interface Versiculo {
    verse: number;
    text: string;
}

// Mapa de interações por versículo para acesso rápido
interface InteracoesMap {
    destaques: Record<number, BibliaInteracao>;
    favoritos: Record<number, BibliaInteracao>;
    notas: Record<number, BibliaInteracao>;
}

export default function BibliotecaPage() {
    // Estado principal
    const [livroAtual, setLivroAtual] = useState(LIVROS_BIBLIA[0]);
    const [capituloAtual, setCapituloAtual] = useState(1);
    const [versiculos, setVersiculos] = useState<Versiculo[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [inicializado, setInicializado] = useState(false);

    // Modal de seleção
    const [modalAberto, setModalAberto] = useState(false);
    const [faseSelecao, setFaseSelecao] = useState<'livros' | 'capitulos'>('livros');
    const [livroSelecionadoTemp, setLivroSelecionadoTemp] = useState(LIVROS_BIBLIA[0]);

    // Mini-toolbar
    const [versiculoSelecionado, setVersiculoSelecionado] = useState<number | null>(null);
    const [toolbarPos, setToolbarPos] = useState({ top: 0, left: 0 });
    const [mostrarCores, setMostrarCores] = useState(false);
    const [mostrarNota, setMostrarNota] = useState(false);
    const [textoNota, setTextoNota] = useState('');

    // Interações
    const [interacoesMap, setInteracoesMap] = useState<InteracoesMap>({ destaques: {}, favoritos: {}, notas: {} });

    // Estudo IA
    const [estudoAberto, setEstudoAberto] = useState(false);
    const [estudoTexto, setEstudoTexto] = useState('');
    const [estudoLoading, setEstudoLoading] = useState(false);
    const [estudoVersiculo, setEstudoVersiculo] = useState<Versiculo | null>(null);

    // Busca
    const [buscaAberta, setBuscaAberta] = useState(false);
    const [termoBusca, setTermoBusca] = useState('');
    const [resultadosBusca, setResultadosBusca] = useState<any[]>([]);
    const [buscaLoading, setBuscaLoading] = useState(false);

    // Painel de salvos
    const [painelAberto, setPainelAberto] = useState(false);
    const [painelAba, setPainelAba] = useState<'favoritos' | 'destaques' | 'notas'>('favoritos');
    const [painelItens, setPainelItens] = useState<BibliaInteracao[]>([]);
    const [painelLoading, setPainelLoading] = useState(false);

    const { toasts, removeToast, success, error: toastError } = useToast();
    const toolbarRef = useRef<HTMLDivElement>(null);
    const versiculosRef = useRef<HTMLDivElement>(null);

    // ==========================================
    // INICIALIZAÇÃO: Carregar última leitura
    // ==========================================
    useEffect(() => {
        async function init() {
            const ultima = await getUltimaLeitura();
            if (ultima) {
                const livro = LIVROS_BIBLIA.find(l => l.abrev === ultima.livro_abrev);
                if (livro) {
                    setLivroAtual(livro);
                    setCapituloAtual(ultima.capitulo);
                }
            }
            setInicializado(true);
        }
        init();
    }, []);

    // ==========================================
    // BUSCAR CAPÍTULO
    // ==========================================
    const buscarCapitulo = useCallback(async (livro: string, cap: number) => {
        setLoading(true);
        setError(null);
        setVersiculoSelecionado(null);

        try {
            const bookId = LIVRO_PARA_ID[livro] || 1;
            const response = await fetch(`https://bolls.life/get-chapter/NTLH/${bookId}/${cap}/`);

            if (!response.ok) throw new Error('API não disponível');

            const data = await response.json();
            if (Array.isArray(data)) {
                setVersiculos(data.map((v: { verse: number; text: string }) => ({
                    verse: v.verse,
                    text: v.text.replace(/<[^>]*>/g, '')
                })));
            } else {
                throw new Error('Formato inválido');
            }
        } catch {
            setVersiculos([
                { verse: 1, text: 'No princípio Deus criou os céus e a terra.' },
                { verse: 2, text: 'A terra era sem forma e vazia; e havia trevas sobre a face do abismo.' },
                { verse: 3, text: 'E disse Deus: Haja luz. E houve luz.' },
            ]);
        } finally {
            setLoading(false);
        }
    }, []);

    // Carregar capítulo + interações quando muda
    useEffect(() => {
        if (!inicializado) return;
        buscarCapitulo(livroAtual.abrev, capituloAtual);
        carregarInteracoes();
        salvarHistoricoLeitura(livroAtual.abrev, livroAtual.nome, capituloAtual);
    }, [livroAtual, capituloAtual, inicializado, buscarCapitulo]);

    // ==========================================
    // CARREGAR INTERAÇÕES DO CAPÍTULO
    // ==========================================
    const carregarInteracoes = async () => {
        const dados = await getInteracoesPorCapitulo(livroAtual.abrev, capituloAtual);
        const map: InteracoesMap = { destaques: {}, favoritos: {}, notas: {} };

        dados.forEach((item: BibliaInteracao) => {
            if (item.tipo === 'destaque') map.destaques[item.versiculo] = item;
            else if (item.tipo === 'favorito') map.favoritos[item.versiculo] = item;
            else if (item.tipo === 'nota') map.notas[item.versiculo] = item;
        });

        setInteracoesMap(map);
    };

    // ==========================================
    // NAVEGAÇÃO
    // ==========================================
    const irParaProximo = () => {
        if (capituloAtual < livroAtual.capitulos) setCapituloAtual(c => c + 1);
    };

    const irParaAnterior = () => {
        if (capituloAtual > 1) setCapituloAtual(c => c - 1);
    };

    const navegarPara = (abrev: string, cap: number) => {
        const livro = LIVROS_BIBLIA.find(l => l.abrev === abrev);
        if (livro) {
            setLivroAtual(livro);
            setCapituloAtual(cap);
        }
    };

    // ==========================================
    // MODAL
    // ==========================================
    const abrirModal = () => {
        setLivroSelecionadoTemp(livroAtual);
        setFaseSelecao('livros');
        setModalAberto(true);
    };

    const selecionarLivroTemp = (livro: typeof LIVROS_BIBLIA[0]) => {
        setLivroSelecionadoTemp(livro);
        setFaseSelecao('capitulos');
    };

    const confirmarSelecao = (cap: number) => {
        setLivroAtual(livroSelecionadoTemp);
        setCapituloAtual(cap);
        setModalAberto(false);
    };

    // ==========================================
    // MINI-TOOLBAR: Clicar no versículo
    // ==========================================
    const handleVersiculoClick = (verse: number, event: React.MouseEvent) => {
        event.stopPropagation();
        const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
        const containerRect = versiculosRef.current?.getBoundingClientRect();

        if (versiculoSelecionado === verse) {
            setVersiculoSelecionado(null);
            setMostrarCores(false);
            setMostrarNota(false);
            return;
        }

        setVersiculoSelecionado(verse);
        setMostrarCores(false);
        setMostrarNota(false);

        // Posicionar toolbar acima do versículo
        const top = rect.top - (containerRect?.top || 0) - 60;
        const left = Math.min(rect.width / 2, 200);
        setToolbarPos({ top, left });

        // Se tem nota existente, carregar texto
        const notaExistente = interacoesMap.notas[verse];
        setTextoNota(notaExistente?.nota || '');
    };

    // Fechar toolbar ao clicar fora
    useEffect(() => {
        const handleClickFora = (e: MouseEvent) => {
            if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
                setVersiculoSelecionado(null);
                setMostrarCores(false);
                setMostrarNota(false);
            }
        };
        document.addEventListener('mousedown', handleClickFora);
        return () => document.removeEventListener('mousedown', handleClickFora);
    }, []);

    // ==========================================
    // AÇÕES: Destacar, Favoritar, Copiar, etc.
    // ==========================================
    const getVersiculoObj = (verse: number): Versiculo | undefined => versiculos.find(v => v.verse === verse);

    const handleDestacar = async (cor: string) => {
        if (!versiculoSelecionado) return;
        const v = getVersiculoObj(versiculoSelecionado);
        if (!v) return;

        // Se já tem destaque, remove
        const existente = interacoesMap.destaques[versiculoSelecionado];
        if (existente && existente.cor === cor) {
            await removerInteracaoBiblia(existente.id!);
            success('Destaque removido');
        } else {
            if (existente) await removerInteracaoBiblia(existente.id!);
            await salvarInteracaoBiblia({
                tipo: 'destaque', livro_abrev: livroAtual.abrev, livro_nome: livroAtual.nome,
                capitulo: capituloAtual, versiculo: v.verse, texto_versiculo: v.text, cor
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
                tipo: 'favorito', livro_abrev: livroAtual.abrev, livro_nome: livroAtual.nome,
                capitulo: capituloAtual, versiculo: v.verse, texto_versiculo: v.text
            });
            success('Salvo nos favoritos!');
        }
        await carregarInteracoes();
    };

    const handleCopiar = async () => {
        if (!versiculoSelecionado) return;
        const v = getVersiculoObj(versiculoSelecionado);
        if (!v) return;

        const texto = `"${v.text}" — ${livroAtual.nome} ${capituloAtual}:${v.verse}`;
        await navigator.clipboard.writeText(texto);
        success('Versículo copiado!');
    };

    const handleCompartilhar = async () => {
        if (!versiculoSelecionado) return;
        const v = getVersiculoObj(versiculoSelecionado);
        if (!v) return;

        const texto = `"${v.text}"\n— ${livroAtual.nome} ${capituloAtual}:${v.verse}`;

        if (navigator.share) {
            try {
                await navigator.share({ title: `${livroAtual.nome} ${capituloAtual}:${v.verse}`, text: texto });
            } catch { /* cancelled */ }
        } else {
            await navigator.clipboard.writeText(texto);
            success('Copiado para compartilhar!');
        }
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
                tipo: 'nota', livro_abrev: livroAtual.abrev, livro_nome: livroAtual.nome,
                capitulo: capituloAtual, versiculo: v.verse, texto_versiculo: v.text, nota: textoNota.trim()
            });
        }
        success('Nota salva!');
        setMostrarNota(false);
        await carregarInteracoes();
    };

    // ==========================================
    // ESTUDO IA
    // ==========================================
    const handleEstudar = async () => {
        if (!versiculoSelecionado) return;
        const v = getVersiculoObj(versiculoSelecionado);
        if (!v) return;

        setEstudoVersiculo(v);
        setEstudoAberto(true);
        setEstudoLoading(true);
        setEstudoTexto('');
        setVersiculoSelecionado(null);

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
                    referencia: `${livroAtual.nome} ${capituloAtual}:${v.verse}`,
                    versiculos: `(${v.verse}) ${v.text}`,
                    parte: 1
                })
            });

            const data = await resp.json();
            if (data.ok && data.resultado) {
                setEstudoTexto(data.resultado);
            } else {
                setEstudoTexto('Erro ao gerar explicação. Tente novamente.');
            }
        } catch {
            setEstudoTexto('Erro de conexão. Tente novamente.');
        } finally {
            setEstudoLoading(false);
        }
    };

    // ==========================================
    // BUSCA NA BÍBLIA
    // ==========================================
    const handleBuscar = async () => {
        if (!termoBusca.trim()) return;
        setBuscaLoading(true);
        setResultadosBusca([]);

        try {
            const resp = await fetch(`https://bolls.life/search/NTLH/${encodeURIComponent(termoBusca.trim())}/`);
            if (resp.ok) {
                const data = await resp.json();
                setResultadosBusca(Array.isArray(data) ? data.slice(0, 50) : []);
            }
        } catch {
            toastError('Erro na busca');
        } finally {
            setBuscaLoading(false);
        }
    };

    const getLivroByBookId = (bookId: number) => {
        const entry = Object.entries(LIVRO_PARA_ID).find(([, id]) => id === bookId);
        if (!entry) return null;
        return LIVROS_BIBLIA.find(l => l.abrev === entry[0]);
    };

    // ==========================================
    // PAINEL DE SALVOS
    // ==========================================
    const abrirPainel = async (aba: 'favoritos' | 'destaques' | 'notas') => {
        setPainelAba(aba);
        setPainelAberto(true);
        setPainelLoading(true);

        const tipo = aba === 'favoritos' ? 'favorito' : aba === 'destaques' ? 'destaque' : 'nota';
        const dados = await getAllInteracoesPorTipo(tipo, 200);
        setPainelItens(dados);
        setPainelLoading(false);
    };

    const removerItemPainel = async (id: number) => {
        await removerInteracaoBiblia(id);
        setPainelItens(prev => prev.filter(i => i.id !== id));
        success('Removido!');
        await carregarInteracoes();
    };

    const navegarParaItem = (item: BibliaInteracao) => {
        navegarPara(item.livro_abrev, item.capitulo);
        setPainelAberto(false);
    };

    // ==========================================
    // HELPERS VISUAIS
    // ==========================================
    const getCorClasse = (verse: number): string => {
        const destaque = interacoesMap.destaques[verse];
        if (!destaque) return '';
        const cor = CORES_DESTAQUE.find(c => c.id === destaque.cor);
        return cor ? `${cor.bg} ${cor.border} border-l-2` : '';
    };

    const isFavorito = (verse: number): boolean => !!interacoesMap.favoritos[verse];
    const temNota = (verse: number): boolean => !!interacoesMap.notas[verse];

    return (
        <CosmicBackground className="min-h-screen">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-black/40 backdrop-blur-xl border-b border-white/5">
                <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>

                    <div className="flex items-center gap-2">
                        <Book className="w-5 h-5 text-amber-400" />
                        <span className="text-sm font-bold text-white">Bíblia Sagrada</span>
                    </div>

                    <div className="flex items-center gap-1">
                        <button onClick={() => setBuscaAberta(!buscaAberta)} className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-amber-400 transition-colors" title="Buscar">
                            <Search className="w-5 h-5" />
                        </button>
                        <button onClick={() => abrirPainel('favoritos')} className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-amber-400 transition-colors" title="Salvos">
                            <BookmarkIcon className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Barra de busca expansível */}
                {buscaAberta && (
                    <div className="px-4 pb-3 animate-in slide-in-from-top duration-200">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={termoBusca}
                                onChange={e => setTermoBusca(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleBuscar()}
                                placeholder="Buscar na Bíblia..."
                                className="flex-1 bg-white/10 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50 text-sm"
                                autoFocus
                            />
                            <button onClick={handleBuscar} disabled={buscaLoading} className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl text-sm transition-colors disabled:opacity-50">
                                {buscaLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Buscar'}
                            </button>
                        </div>

                        {/* Resultados de busca */}
                        {resultadosBusca.length > 0 && (
                            <div className="mt-2 max-h-64 overflow-y-auto space-y-1 bg-black/40 rounded-xl p-2">
                                {resultadosBusca.map((r, i) => {
                                    const livro = getLivroByBookId(r.book);
                                    return (
                                        <button
                                            key={i}
                                            onClick={() => {
                                                if (livro) {
                                                    navegarPara(livro.abrev, r.chapter);
                                                    setBuscaAberta(false);
                                                    setResultadosBusca([]);
                                                    setTermoBusca('');
                                                }
                                            }}
                                            className="w-full text-left p-2.5 rounded-lg hover:bg-white/10 transition-colors"
                                        >
                                            <div className="text-amber-400 text-xs font-bold">{livro?.nome || `Livro ${r.book}`} {r.chapter}:{r.verse}</div>
                                            <div className="text-slate-300 text-sm mt-0.5 line-clamp-2">{r.text?.replace(/<[^>]*>/g, '')}</div>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </header>

            {/* Barra de Navegação (Sticky) */}
            <div className="sticky top-[57px] z-40 bg-black/60 backdrop-blur-xl border-b border-white/5">
                <div className="max-w-4xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3">
                    <button onClick={abrirModal} className="flex-1 glass-panel px-4 py-2.5 rounded-xl flex items-center justify-between hover:bg-white/10 transition-colors group">
                        <div className="text-left">
                            <div className="text-[10px] text-slate-500 uppercase tracking-wider">Leitura</div>
                            <div className="text-white font-bold text-base flex items-center gap-1">
                                {livroAtual.nome} {capituloAtual}
                                <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                            </div>
                        </div>
                    </button>

                    <div className="flex items-center gap-1.5">
                        <button onClick={irParaAnterior} disabled={capituloAtual <= 1} className="p-3 glass-panel rounded-xl disabled:opacity-30 hover:bg-white/10 transition-colors">
                            <ChevronLeft className="w-5 h-5 text-white" />
                        </button>
                        <button onClick={irParaProximo} disabled={capituloAtual >= livroAtual.capitulos} className="p-3 glass-panel rounded-xl disabled:opacity-30 hover:bg-white/10 transition-colors">
                            <ChevronRight className="w-5 h-5 text-white" />
                        </button>
                    </div>
                </div>
            </div>

            {/* --- MODAL DE SELEÇÃO --- */}
            {modalAberto && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
                    <div className="glass-panel rounded-2xl max-w-lg w-full max-h-[80vh] flex flex-col overflow-hidden border border-white/10 shadow-2xl">
                        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5">
                            {faseSelecao === 'capitulos' ? (
                                <button onClick={() => setFaseSelecao('livros')} className="flex items-center gap-1 text-amber-400 hover:text-amber-300 text-sm font-medium">
                                    <ArrowLeft className="w-4 h-4" /> Voltar
                                </button>
                            ) : <div className="w-16" />}
                            <h3 className="text-lg font-bold text-white">{faseSelecao === 'livros' ? 'Escolha o Livro' : livroSelecionadoTemp.nome}</h3>
                            <button onClick={() => setModalAberto(false)} className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="overflow-y-auto flex-1 p-2">
                            {faseSelecao === 'livros' && (
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-2">
                                    {LIVROS_BIBLIA.map(livro => (
                                        <button key={livro.abrev} onClick={() => selecionarLivroTemp(livro)}
                                            className={`p-3 rounded-xl text-left transition-all border ${livro.abrev === livroAtual.abrev ? 'bg-amber-500/20 border-amber-500/50 text-amber-400' : 'bg-white/5 border-transparent hover:bg-white/10 text-slate-300'}`}>
                                            <div className="font-bold text-sm truncate">{livro.nome}</div>
                                            <div className="text-xs text-slate-500 mt-1">{livro.capitulos} caps</div>
                                        </button>
                                    ))}
                                </div>
                            )}
                            {faseSelecao === 'capitulos' && (
                                <div className="grid grid-cols-5 sm:grid-cols-6 gap-3 p-2">
                                    {Array.from({ length: livroSelecionadoTemp.capitulos }, (_, i) => i + 1).map(cap => (
                                        <button key={cap} onClick={() => confirmarSelecao(cap)}
                                            className={`aspect-square flex items-center justify-center rounded-xl text-lg font-bold transition-all border ${(livroSelecionadoTemp.abrev === livroAtual.abrev && cap === capituloAtual) ? 'bg-amber-500 text-black border-amber-400' : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/20'}`}>
                                            {cap}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* --- MODAL DE ESTUDO IA --- */}
            {estudoAberto && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
                    <div className="glass-panel rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[85vh] flex flex-col overflow-hidden border border-white/10">
                        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5">
                            <div className="flex items-center gap-2">
                                <Lightbulb className="w-5 h-5 text-amber-400" />
                                <span className="font-bold text-white text-sm">Estudo — {livroAtual.nome} {capituloAtual}:{estudoVersiculo?.verse}</span>
                            </div>
                            <button onClick={() => setEstudoAberto(false)} className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
                        </div>

                        {/* Versículo destacado */}
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

            {/* --- PAINEL DE SALVOS --- */}
            {painelAberto && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
                    <div className="glass-panel rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[85vh] flex flex-col overflow-hidden border border-white/10">
                        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5">
                            <span className="font-bold text-white">Meus Salvos</span>
                            <button onClick={() => setPainelAberto(false)} className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
                        </div>

                        {/* Abas */}
                        <div className="flex border-b border-white/10">
                            {(['favoritos', 'destaques', 'notas'] as const).map(aba => (
                                <button key={aba} onClick={() => abrirPainel(aba)}
                                    className={`flex-1 py-3 text-sm font-medium transition-colors ${painelAba === aba ? 'text-amber-400 border-b-2 border-amber-400 bg-white/5' : 'text-slate-400 hover:text-white'}`}>
                                    {aba === 'favoritos' ? 'Favoritos' : aba === 'destaques' ? 'Destaques' : 'Notas'}
                                </button>
                            ))}
                        </div>

                        <div className="flex-1 overflow-y-auto p-3">
                            {painelLoading ? (
                                <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 text-amber-400 animate-spin" /></div>
                            ) : painelItens.length === 0 ? (
                                <p className="text-center text-slate-500 py-8">Nenhum item salvo</p>
                            ) : (
                                <div className="space-y-2">
                                    {painelItens.map(item => (
                                        <div key={item.id} className="flex items-start gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors group">
                                            <button onClick={() => navegarParaItem(item)} className="flex-1 text-left">
                                                <div className="text-amber-400 text-xs font-bold">{item.livro_nome} {item.capitulo}:{item.versiculo}</div>
                                                <div className="text-slate-300 text-sm mt-1 line-clamp-2">{item.texto_versiculo}</div>
                                                {item.nota && <div className="text-slate-500 text-xs mt-1 italic">{item.nota}</div>}
                                            </button>
                                            <button onClick={() => removerItemPainel(item.id!)} className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-500/20 text-slate-500 hover:text-red-400 transition-all">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Conteúdo Principal */}
            <main className="max-w-4xl mx-auto px-4 py-6">
                <h1 className="text-2xl md:text-3xl font-black text-white mb-6 text-center tracking-tight">
                    {livroAtual.nome} <span className="text-amber-400">{capituloAtual}</span>
                </h1>

                {loading && (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <Loader2 className="w-10 h-10 text-amber-400 animate-spin" />
                        <p className="text-slate-400 animate-pulse">Carregando escrituras...</p>
                    </div>
                )}

                {error && !loading && (
                    <div className="glass-panel rounded-xl p-8 text-center max-w-md mx-auto border border-red-500/30 bg-red-500/10">
                        <p className="text-red-300 mb-6">{error}</p>
                        <button onClick={() => buscarCapitulo(livroAtual.abrev, capituloAtual)} className="px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold">Tentar Novamente</button>
                    </div>
                )}

                {!loading && !error && versiculos.length > 0 && (
                    <div className="glass-panel rounded-2xl p-5 md:p-8 relative overflow-visible" ref={versiculosRef}>
                        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

                        <div className="space-y-1 text-lg md:text-xl leading-relaxed text-slate-200 font-serif relative">
                            {versiculos.map(v => (
                                <div
                                    key={v.verse}
                                    onClick={(e) => handleVersiculoClick(v.verse, e)}
                                    className={`relative pl-3 rounded-lg p-2 -ml-3 transition-all cursor-pointer select-none
                                        ${getCorClasse(v.verse)}
                                        ${versiculoSelecionado === v.verse ? 'bg-white/10 ring-1 ring-amber-500/30' : 'hover:bg-white/5'}
                                    `}
                                >
                                    <p className="inline">
                                        <sup className="text-xs text-amber-400 font-bold mr-1.5 select-none opacity-60">{v.verse}</sup>
                                        {v.text}
                                    </p>

                                    {/* Indicadores visuais */}
                                    <span className="inline-flex items-center gap-1 ml-1.5">
                                        {isFavorito(v.verse) && <Heart className="w-3 h-3 text-red-400 fill-red-400 inline" />}
                                        {temNota(v.verse) && <StickyNote className="w-3 h-3 text-blue-400 inline" />}
                                    </span>

                                    {/* MINI-TOOLBAR */}
                                    {versiculoSelecionado === v.verse && (
                                        <div ref={toolbarRef} className="absolute -top-14 left-1/2 -translate-x-1/2 z-30 animate-in fade-in slide-in-from-bottom-2 duration-150" onClick={e => e.stopPropagation()}>
                                            <div className="flex items-center gap-0.5 bg-slate-900/95 border border-white/15 rounded-xl p-1 shadow-2xl backdrop-blur-xl">
                                                {/* Cores */}
                                                <button onClick={() => setMostrarCores(!mostrarCores)} className="p-2 rounded-lg hover:bg-white/10 text-slate-300 hover:text-amber-400 transition-colors" title="Destacar">
                                                    <Palette className="w-4 h-4" />
                                                </button>
                                                {/* Favoritar */}
                                                <button onClick={handleFavoritar} className={`p-2 rounded-lg hover:bg-white/10 transition-colors ${isFavorito(v.verse) ? 'text-red-400' : 'text-slate-300 hover:text-red-400'}`} title="Favoritar">
                                                    <Heart className={`w-4 h-4 ${isFavorito(v.verse) ? 'fill-red-400' : ''}`} />
                                                </button>
                                                {/* Copiar */}
                                                <button onClick={handleCopiar} className="p-2 rounded-lg hover:bg-white/10 text-slate-300 hover:text-green-400 transition-colors" title="Copiar">
                                                    <Copy className="w-4 h-4" />
                                                </button>
                                                {/* Compartilhar */}
                                                <button onClick={handleCompartilhar} className="p-2 rounded-lg hover:bg-white/10 text-slate-300 hover:text-blue-400 transition-colors" title="Compartilhar">
                                                    <Share2 className="w-4 h-4" />
                                                </button>
                                                {/* Estudar */}
                                                <button onClick={handleEstudar} className="p-2 rounded-lg hover:bg-white/10 text-slate-300 hover:text-amber-400 transition-colors" title="Estudar">
                                                    <Lightbulb className="w-4 h-4" />
                                                </button>
                                                {/* Nota */}
                                                <button onClick={() => setMostrarNota(!mostrarNota)} className={`p-2 rounded-lg hover:bg-white/10 transition-colors ${temNota(v.verse) ? 'text-blue-400' : 'text-slate-300 hover:text-blue-400'}`} title="Nota">
                                                    <StickyNote className="w-4 h-4" />
                                                </button>
                                            </div>

                                            {/* Seletor de cores expandido */}
                                            {mostrarCores && (
                                                <div className="mt-1 flex items-center gap-1 bg-slate-900/95 border border-white/15 rounded-xl p-1.5 justify-center animate-in fade-in duration-100">
                                                    {CORES_DESTAQUE.map(cor => (
                                                        <button key={cor.id} onClick={() => handleDestacar(cor.id)}
                                                            className={`w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 ${cor.bg} ${cor.border} ${interacoesMap.destaques[v.verse]?.cor === cor.id ? 'ring-2 ring-white scale-110' : ''}`}
                                                            title={cor.nome} />
                                                    ))}
                                                    {interacoesMap.destaques[v.verse] && (
                                                        <button onClick={() => handleDestacar(interacoesMap.destaques[v.verse].cor || 'yellow')}
                                                            className="p-1 rounded-lg hover:bg-red-500/20 text-slate-500 hover:text-red-400" title="Remover destaque">
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            )}

                                            {/* Campo de nota expandido */}
                                            {mostrarNota && (
                                                <div className="mt-1 bg-slate-900/95 border border-white/15 rounded-xl p-2 animate-in fade-in duration-100">
                                                    <textarea
                                                        value={textoNota}
                                                        onChange={e => setTextoNota(e.target.value)}
                                                        placeholder="Escreva sua anotação..."
                                                        className="w-full bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-amber-500/50 resize-none"
                                                        rows={3}
                                                        autoFocus
                                                    />
                                                    <div className="flex justify-end gap-2 mt-1.5">
                                                        {interacoesMap.notas[v.verse] && (
                                                            <button onClick={async () => {
                                                                await removerInteracaoPorVersiculoETipo('nota', livroAtual.abrev, capituloAtual, v.verse);
                                                                success('Nota removida');
                                                                setMostrarNota(false);
                                                                await carregarInteracoes();
                                                            }} className="px-3 py-1.5 text-xs rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30">
                                                                Apagar
                                                            </button>
                                                        )}
                                                        <button onClick={handleSalvarNota} disabled={!textoNota.trim()} className="px-3 py-1.5 text-xs rounded-lg bg-amber-500 text-black font-bold hover:bg-amber-400 disabled:opacity-50">
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
                    </div>
                )}

                {/* Navegação Inferior */}
                <div className="flex justify-between items-center mt-8 gap-4">
                    <button onClick={irParaAnterior} disabled={capituloAtual <= 1} className="flex items-center gap-2 px-5 py-3 glass-panel rounded-xl disabled:opacity-30 hover:bg-white/10 transition-colors group">
                        <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                        <span className="font-medium text-sm">Anterior</span>
                    </button>
                    <button onClick={irParaProximo} disabled={capituloAtual >= livroAtual.capitulos} className="flex items-center gap-2 px-5 py-3 glass-panel rounded-xl disabled:opacity-30 hover:bg-white/10 transition-colors group">
                        <span className="font-medium text-sm">Próximo</span>
                        <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>
            </main>

            <ToastContainer toasts={toasts} removeToast={removeToast} />
        </CosmicBackground>
    );
}
