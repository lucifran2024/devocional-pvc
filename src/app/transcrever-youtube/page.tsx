'use client';

import { useState, useEffect, useCallback } from 'react';
import { Youtube, Loader2, Copy, Check, Save, Trash2, AlertTriangle } from 'lucide-react';
import { CosmicBackground } from '@/components/ui/CosmicBackground';
import { BackButton } from '@/components/ui/BackButton';
import { SavedTranscriptEditor } from '@/components/SavedTranscriptEditor';
import { getTranscricoes, salvarTranscricao, removerTranscricao, type Transcricao } from '@/lib/transcricoes';

export default function TranscreverYoutubePage() {
    const [url, setUrl] = useState('');
    const [carregando, setCarregando] = useState(false);
    const [erro, setErro] = useState<string | null>(null);
    const [resultado, setResultado] = useState<{ titulo: string; texto: string; idioma: string } | null>(null);
    const [copiado, setCopiado] = useState(false);
    const [salvo, setSalvo] = useState(false);
    const [historico, setHistorico] = useState<Transcricao[]>([]);

    const carregar = useCallback(async () => {
        setHistorico(await getTranscricoes('youtube'));
    }, []);
    useEffect(() => { carregar(); }, [carregar]);

    const transcrever = async () => {
        if (!url.trim() || carregando) return;
        setCarregando(true);
        setErro(null);
        setResultado(null);
        setSalvo(false);
        try {
            const resp = await fetch('/api/transcrever-youtube', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: url.trim() }),
            });
            const data = await resp.json();
            if (data.ok) {
                setResultado({ titulo: data.titulo, texto: data.texto, idioma: data.idioma });
            } else {
                setErro(data.message || 'Não consegui transcrever este vídeo. Verifique o link ou tente outro.');
            }
        } catch {
            setErro('Erro de conexão. Tente novamente.');
        } finally {
            setCarregando(false);
        }
    };

    const copiar = () => {
        if (!resultado) return;
        navigator.clipboard.writeText(resultado.texto);
        setCopiado(true);
        setTimeout(() => setCopiado(false), 2000);
    };

    const salvar = async () => {
        if (!resultado) return;
        await salvarTranscricao({ tipo: 'youtube', titulo: resultado.titulo, fonte_url: url.trim(), texto: resultado.texto });
        setSalvo(true);
        carregar();
    };

    const excluir = async (id: string) => {
        setHistorico((prev) => prev.filter((t) => t.id !== id));
        await removerTranscricao(id);
    };

    return (
        <CosmicBackground className="flex flex-col min-h-screen px-4 sm:px-6 py-8 selection:bg-amber-500/30">
            <div className="max-w-3xl mx-auto w-full space-y-6">
                <BackButton href="/" label="Início" />

                <div className="text-center space-y-2">
                    <div className="inline-flex p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400">
                        <Youtube className="w-6 h-6" />
                    </div>
                    <h1 className="reading-serif text-3xl md:text-4xl font-semibold text-text-primary">Transcrever do YouTube</h1>
                    <p className="text-text-muted text-sm">Cole o link de uma pregação e receba a transcrição. Vídeos longos podem demorar alguns minutos.</p>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                    <input
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && transcrever()}
                        placeholder="https://youtube.com/watch?v=..."
                        className="flex-1 px-4 py-3 rounded-xl bg-surface-2 border border-border-subtle text-text-primary text-sm focus:outline-none focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20"
                    />
                    <button onClick={transcrever} disabled={!url.trim() || carregando}
                        className="px-6 py-3 rounded-xl bg-amber-500 text-amber-950 font-bold hover:bg-amber-400 disabled:opacity-50 flex items-center justify-center gap-2">
                        {carregando ? <Loader2 className="w-5 h-5 animate-spin" /> : <Youtube className="w-5 h-5" />}
                        {carregando ? 'Transcrevendo…' : 'Transcrever'}
                    </button>
                </div>

                {erro && (
                    <div className="flex items-start gap-2 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 text-sm">
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> <span>{erro}</span>
                    </div>
                )}

                {resultado && (
                    <div className="rounded-2xl border border-amber-500/25 bg-surface-1 p-5 space-y-3">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <h2 className="reading-serif font-semibold text-text-primary">{resultado.titulo}</h2>
                                <span className="text-[11px] text-text-muted uppercase tracking-wider">Legenda {resultado.idioma}</span>
                            </div>
                            <div className="flex gap-1.5 shrink-0">
                                <button onClick={copiar} className="p-2 rounded-lg text-text-muted hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-500/10" title="Copiar">
                                    {copiado ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                                </button>
                                <button onClick={salvar} disabled={salvo} className="p-2 rounded-lg text-text-muted hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-500/10 disabled:opacity-50" title="Salvar">
                                    {salvo ? <Check className="w-4 h-4 text-emerald-500" /> : <Save className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>
                        <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap max-h-[50vh] overflow-y-auto">{resultado.texto}</p>
                    </div>
                )}

                {historico.length > 0 && (
                    <section className="space-y-3 pt-2">
                        <h2 className="text-sm font-bold text-text-primary">Salvos</h2>
                        {historico.map((t) => (
                            <details key={t.id} className="rounded-2xl border border-border-subtle bg-surface-1 p-4 group">
                                <summary className="flex items-center justify-between gap-2 cursor-pointer list-none">
                                    <span className="reading-serif font-semibold text-text-primary text-sm truncate">{t.titulo || 'Sem título'}</span>
                                    <button onClick={(e) => { e.preventDefault(); excluir(t.id); }} className="p-1.5 rounded-lg text-text-muted hover:text-red-500 hover:bg-red-500/10 shrink-0">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </summary>
                                <div className="mt-3">
                                    <SavedTranscriptEditor
                                        id={t.id}
                                        texto={t.texto}
                                        onSaved={(texto) => setHistorico(prev => prev.map(item => item.id === t.id ? { ...item, texto } : item))}
                                    />
                                </div>
                            </details>
                        ))}
                    </section>
                )}
            </div>
        </CosmicBackground>
    );
}
