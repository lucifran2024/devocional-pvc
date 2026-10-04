'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    AlertTriangle, BookOpen, Check, CircleCheck, Copy, Library, Loader2, Mic, RotateCw,
    Save, Search, Share2, Square, Trash2, Upload,
} from 'lucide-react';
import { CosmicBackground } from '@/components/ui/CosmicBackground';
import { BackButton } from '@/components/ui/BackButton';
import { ToastContainer } from '@/components/ui/ToastContainer';
import { BotaoAcao } from '@/components/transcricao/BotaoAcao';
import { CartaoTranscricao } from '@/components/transcricao/CartaoTranscricao';
import { LeitorTranscricao } from '@/components/transcricao/LeitorTranscricao';
import { useToast } from '@/hooks/useToast';
import { useAcoesTranscricao, type Avisar } from '@/hooks/useAcoesTranscricao';
import { supabase } from '@/lib/supabase';
import {
    getTranscricoes, salvarTranscricao, removerTranscricao, atualizarNotasTranscricao,
    atualizarTituloTranscricao, uploadAudioCulto, type Transcricao,
} from '@/lib/transcricoes';
import {
    chaveBusca, contarPalavras, descreverPalavras, filtrarTranscricoes, formatarDuracao,
    paragrafosParaLeitura, tempoLeitura,
} from '@/lib/transcricao-apresentacao';
import {
    apagarGravacao, gravacoesGuardadas, guardarPedaco, juntarGravacao, minutosAproximados,
    type GravacaoGuardada,
} from '@/lib/gravacao-segura';

// ============================================
// TRANSCREVER ÁUDIO — grava a pregação ao vivo ou recebe um áudio do
// celular, sobe para a pasta da conta e transcreve pelo Azure.
// Nada se perde no caminho: a gravação fica guardada no aparelho até o
// envio terminar, e o áudio enviado que não virou texto pode ser
// transcrito de novo sem enviar outra vez.
// ============================================

type Etapa = 'idle' | 'gravando' | 'enviando' | 'transcrevendo';

interface Resultado {
    texto: string;
    duracaoSeg: number;
    tituloSugerido: string;
}

interface Pendente {
    path: string;
    criadoEm: number;
    tituloSugerido: string;
}

const CHAVE_PENDENTE = 'culto-transcricao-pendente';
const ID_LISTA = 'minhas-transcricoes-audio';
const LIMITE_ARQUIVO = 100 * 1024 * 1024; // limite do bucket
const EXTENSOES = ['mp3', 'm4a', 'mp4', 'aac', 'wav', 'ogg', 'opus', 'oga', 'webm', 'flac', 'amr', 'wma', '3gp'];
const DIAS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

function escolherMime(): { mime: string; ext: string } {
    const candidatos = [
        { mime: 'audio/mp4', ext: 'mp4' },
        { mime: 'audio/webm;codecs=opus', ext: 'webm' },
        { mime: 'audio/webm', ext: 'webm' },
        { mime: 'audio/ogg', ext: 'ogg' },
    ];
    for (const c of candidatos) {
        if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(c.mime)) return c;
    }
    return { mime: '', ext: 'webm' };
}

function tituloDoDia(quando: number): string {
    const d = new Date(quando);
    return `Culto de ${DIAS[d.getDay()]}, ${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function quandoFoi(quando: number): string {
    const d = new Date(quando);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')} às ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function lerPendente(): Pendente | null {
    try {
        const p = JSON.parse(window.localStorage.getItem(CHAVE_PENDENTE) || 'null');
        return p && typeof p.path === 'string' ? p : null;
    } catch {
        return null;
    }
}

function gravarPendente(p: Pendente | null) {
    try {
        if (p) window.localStorage.setItem(CHAVE_PENDENTE, JSON.stringify(p));
        else window.localStorage.removeItem(CHAVE_PENDENTE);
    } catch {
        // sem armazenamento: o aviso some ao fechar o app
    }
}

function etapaAudio(segundos: number): string {
    if (segundos < 20) return 'Transcrevendo o áudio…';
    if (segundos < 90) return 'Organizando o texto em parágrafos…';
    return 'Ainda trabalhando… pregações longas levam alguns minutos.';
}

export default function TranscreverAudioPage() {
    const { toasts, removeToast, addToast } = useToast();
    const avisar = useCallback<Avisar>((tipo, mensagem) => addToast(tipo, mensagem), [addToast]);

    const [etapa, setEtapa] = useState<Etapa>('idle');
    const [tempo, setTempo] = useState(0);
    const [segundos, setSegundos] = useState(0);
    const [erro, setErro] = useState<string | null>(null);
    const [aviso, setAviso] = useState<string | null>(null);
    const [pedindoMicrofone, setPedindoMicrofone] = useState(false);
    const [pendente, setPendente] = useState<Pendente | null>(null);
    const [guardada, setGuardada] = useState<GravacaoGuardada | null>(null);
    const [descartando, setDescartando] = useState<'pendente' | 'guardada' | null>(null);
    const [resultado, setResultado] = useState<Resultado | null>(null);
    const [titulo, setTitulo] = useState('');
    const [notas, setNotas] = useState('');
    const [salvoId, setSalvoId] = useState<string | null>(null);
    const [salvando, setSalvando] = useState(false);
    const [historico, setHistorico] = useState<Transcricao[]>([]);
    const [historicoPronto, setHistoricoPronto] = useState(false);
    const [busca, setBusca] = useState('');
    const [leitor, setLeitor] = useState<string | null>(null);
    const [destaqueId, setDestaqueId] = useState<string | null>(null);

    const recorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const streamRef = useRef<MediaStream | null>(null);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const extRef = useRef('webm');
    const mimeRef = useRef('');
    const sessaoRef = useRef('');
    const seqRef = useRef(0);
    const inicioGravacaoRef = useRef(0);
    const wakeLockRef = useRef<WakeLockSentinel | null>(null);
    const processandoRef = useRef(false); // evita processar o mesmo áudio 2x
    const etapaRef = useRef<Etapa>('idle');
    const arquivoRef = useRef<HTMLInputElement>(null);
    useEffect(() => { etapaRef.current = etapa; }, [etapa]);

    const carregar = useCallback(async () => {
        setHistorico(await getTranscricoes('culto'));
        setHistoricoPronto(true);
    }, []);

    const verificarGuardadas = useCallback(async () => {
        if (etapaRef.current === 'gravando') return;
        const [primeira] = await gravacoesGuardadas();
        setGuardada(primeira ?? null);
    }, []);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- carga assíncrona (setState após await)
        carregar();
        verificarGuardadas();
        setPendente(lerPendente());
    }, [carregar, verificarGuardadas]);

    // Cronômetro do envio + transcrição
    useEffect(() => {
        if (etapa !== 'enviando' && etapa !== 'transcrevendo') return;
        const inicio = Date.now();
        const timer = setInterval(() => setSegundos(Math.floor((Date.now() - inicio) / 1000)), 1000);
        return () => clearInterval(timer);
    }, [etapa]);

    useEffect(() => {
        if (!destaqueId) return;
        const timer = setTimeout(() => setDestaqueId(null), 6000);
        return () => clearTimeout(timer);
    }, [destaqueId]);

    // ==========================================
    // WAKE LOCK: mantém a tela acesa durante a gravação.
    // O navegador SOLTA o wake lock quando a aba fica oculta —
    // ao voltar, readquirimos se ainda estiver gravando.
    // ==========================================
    const pedirWakeLock = useCallback(async () => {
        try {
            if ('wakeLock' in navigator) wakeLockRef.current = await navigator.wakeLock.request('screen');
        } catch { /* sem suporte ou negado — segue sem */ }
    }, []);

    const soltarWakeLock = useCallback(() => {
        wakeLockRef.current?.release().catch(() => { });
        wakeLockRef.current = null;
    }, []);

    useEffect(() => {
        const aoVoltarVisivel = () => {
            if (document.visibilityState === 'visible' && etapaRef.current === 'gravando') pedirWakeLock();
        };
        document.addEventListener('visibilitychange', aoVoltarVisivel);
        return () => document.removeEventListener('visibilitychange', aoVoltarVisivel);
    }, [pedirWakeLock]);

    useEffect(() => () => {
        if (timerRef.current) clearInterval(timerRef.current);
        streamRef.current?.getTracks().forEach((t) => t.stop());
        wakeLockRef.current?.release().catch(() => { });
    }, []);

    const chaves = useMemo(() => historico.map(chaveBusca), [historico]);
    const filtrados = useMemo(() => filtrarTranscricoes(historico, busca, chaves), [historico, busca, chaves]);

    // ---------- Transcrever um áudio que já está no servidor ----------
    const transcreverPath = async (p: Pendente) => {
        setEtapa('transcrevendo');
        setSegundos(0);
        setErro(null);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const resp = await fetch('/api/transcrever-audio', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
                },
                body: JSON.stringify({ path: p.path }),
            });
            const data = await resp.json().catch(() => null);
            if (data?.ok) {
                setResultado({ texto: data.texto, duracaoSeg: Number(data.duracaoSeg) || 0, tituloSugerido: p.tituloSugerido });
                setTitulo(p.tituloSugerido);
                setNotas('');
                setSalvoId(null);
                gravarPendente(null);
                setPendente(null);
            } else {
                setErro(data?.message || (resp.status === 504
                    ? 'A transcrição demorou demais. O áudio está guardado: toque em Tentar de novo.'
                    : 'Não consegui transcrever agora. O áudio está guardado: toque em Tentar de novo.'));
                setPendente(p);
            }
        } catch {
            setErro('Sem conexão. O áudio está guardado: toque em Tentar de novo quando a internet voltar.');
            setPendente(p);
        } finally {
            setEtapa('idle');
        }
    };

    // ---------- Enviar um áudio (gravado ou escolhido) e transcrever ----------
    const enviarETranscrever = async (blob: Blob, ext: string, quando: number, sessao?: string) => {
        setEtapa('enviando');
        setSegundos(0);
        setErro(null);
        setResultado(null);
        let path = await uploadAudioCulto(blob, ext);
        if (!path) path = await uploadAudioCulto(blob, ext); // uma segunda tentativa
        if (!path) {
            setEtapa('idle');
            setErro(sessao
                ? 'Não consegui enviar o áudio. A gravação ficou guardada neste aparelho: toque em Transcrever quando a internet melhorar.'
                : 'Não consegui enviar o áudio. Verifique a internet e tente de novo.');
            if (sessao) verificarGuardadas();
            return;
        }
        if (sessao) {
            await apagarGravacao(sessao); // chegou inteiro ao servidor
            setGuardada(null);
        }
        const p: Pendente = { path, criadoEm: quando, tituloSugerido: tituloDoDia(quando) };
        gravarPendente(p);
        setPendente(p);
        await transcreverPath(p);
    };

    // ---------- Gravação ao vivo ----------
    const parar = () => {
        if (timerRef.current) clearInterval(timerRef.current);
        soltarWakeLock();
        try {
            if (recorderRef.current && recorderRef.current.state !== 'inactive') {
                recorderRef.current.stop(); // dispara onstop → processar
            } else if (!processandoRef.current && chunksRef.current.length > 0) {
                processarGravacao(); // gravador já morto, mas há áudio captado
            }
        } catch { /* stop em recorder inativo */ }
        streamRef.current?.getTracks().forEach((t) => t.stop());
    };

    const processarGravacao = async () => {
        if (processandoRef.current) return; // onstop + onended podem disparar juntos
        processandoRef.current = true;
        const blob = new Blob(chunksRef.current, { type: recorderRef.current?.mimeType || mimeRef.current || `audio/${extRef.current}` });
        if (blob.size === 0) {
            setErro('Nenhum áudio foi captado. Tente novamente.');
            setEtapa('idle');
            await apagarGravacao(sessaoRef.current);
            return;
        }
        await enviarETranscrever(blob, extRef.current, inicioGravacaoRef.current, sessaoRef.current);
    };

    const iniciar = async () => {
        setErro(null);
        setAviso(null);
        setResultado(null);
        setSalvoId(null);
        setPedindoMicrofone(true);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            setPedindoMicrofone(false);
            streamRef.current = stream;
            const { mime, ext } = escolherMime();
            extRef.current = ext;
            mimeRef.current = mime;
            // 48 kbps: qualidade suficiente para voz e arquivo leve (1h ≈ 21 MB)
            const opcoes: MediaRecorderOptions = { audioBitsPerSecond: 48000 };
            if (mime) opcoes.mimeType = mime;
            const rec = new MediaRecorder(stream, opcoes);
            chunksRef.current = [];
            processandoRef.current = false;
            sessaoRef.current = crypto.randomUUID();
            seqRef.current = 0;
            inicioGravacaoRef.current = Date.now();
            const tipo = rec.mimeType || mime;
            rec.ondataavailable = (e) => {
                if (e.data.size === 0) return;
                chunksRef.current.push(e.data);
                guardarPedaco(sessaoRef.current, seqRef.current++, e.data, tipo, ext);
            };
            rec.onstop = processarGravacao;
            // Se o sistema matar a gravação, transcreve o que já foi captado.
            rec.onerror = () => {
                setAviso('A gravação foi interrompida pelo sistema — transcrevendo o que já foi gravado.');
                parar();
            };
            stream.getAudioTracks().forEach((track) => {
                track.onended = () => {
                    if (etapaRef.current === 'gravando') {
                        setAviso('O microfone foi encerrado pelo sistema — transcrevendo o que já foi gravado.');
                        parar();
                    }
                };
            });
            // timeslice 5 s: cada pedaço já fica guardado no aparelho
            rec.start(5000);
            recorderRef.current = rec;
            setTempo(0);
            setEtapa('gravando');
            timerRef.current = setInterval(() => setTempo((t) => t + 1), 1000);
            pedirWakeLock();
        } catch {
            setPedindoMicrofone(false);
            setErro('Não consegui acessar o microfone. Permita o acesso e tente de novo.');
        }
    };

    // ---------- Áudio escolhido do celular ----------
    const aoEscolherArquivo = async (arquivo: File | undefined) => {
        if (arquivoRef.current) arquivoRef.current.value = '';
        if (!arquivo) return;
        const ext = (arquivo.name.split('.').pop() || '').toLowerCase();
        const pareceAudio = arquivo.type.startsWith('audio/') || EXTENSOES.includes(ext);
        if (!pareceAudio) {
            setErro('Esse arquivo não parece ser um áudio. Escolha MP3, M4A, WAV, OGG ou um áudio do WhatsApp.');
            return;
        }
        if (arquivo.size > LIMITE_ARQUIVO) {
            setErro('O áudio passa de 100 MB. Escolha um arquivo menor ou corte o áudio em partes.');
            return;
        }
        setAviso(null);
        await enviarETranscrever(arquivo, EXTENSOES.includes(ext) ? ext : 'mp3', arquivo.lastModified || Date.now());
    };

    const transcreverGuardada = async () => {
        if (!guardada) return;
        const blob = await juntarGravacao(guardada.sessao);
        if (!blob || blob.size === 0) {
            await apagarGravacao(guardada.sessao);
            setGuardada(null);
            setErro('A gravação guardada estava vazia.');
            return;
        }
        await enviarETranscrever(blob, guardada.ext, guardada.criadoEm, guardada.sessao);
    };

    const descartar = async () => {
        if (descartando === 'guardada' && guardada) {
            await apagarGravacao(guardada.sessao);
            setGuardada(null);
        }
        if (descartando === 'pendente') {
            gravarPendente(null);
            setPendente(null);
            setErro(null);
        }
        setDescartando(null);
    };

    // ---------- Salvar e cuidar das salvas ----------
    const salvar = async () => {
        if (!resultado || salvoId || salvando) return;
        setSalvando(true);
        const nova = await salvarTranscricao({
            tipo: 'culto',
            titulo: titulo.trim() || resultado.tituloSugerido,
            texto: resultado.texto,
            notas,
        });
        setSalvando(false);
        if (!nova) {
            avisar('error', 'Não foi possível salvar. Verifique a internet e tente de novo.');
            return;
        }
        setSalvoId(nova.id);
        setHistorico((prev) => [nova, ...prev.filter((t) => t.id !== nova.id)]);
        setHistoricoPronto(true);
        setDestaqueId(nova.id);
        avisar('success', 'Salva em Minhas transcrições.');
    };

    const aoSalvarTexto = (id: string, texto: string) => {
        setHistorico((prev) => prev.map((t) => (t.id === id ? { ...t, texto } : t)));
        if (id === salvoId) setResultado((atual) => (atual ? { ...atual, texto } : atual));
    };

    const excluir = async (id: string) => {
        const ok = await removerTranscricao(id);
        if (!ok) {
            avisar('error', 'Não foi possível excluir. Verifique a internet e tente de novo.');
            return false;
        }
        setHistorico((prev) => prev.filter((t) => t.id !== id));
        if (id === salvoId) setSalvoId(null);
        setLeitor(null);
        avisar('success', 'Transcrição excluída.');
        return true;
    };

    const salvarTituloDe = async (id: string, novo: string) => {
        const limpo = novo.trim() || 'Culto';
        setHistorico((prev) => prev.map((t) => (t.id === id ? { ...t, titulo: limpo } : t)));
        if (!(await atualizarTituloTranscricao(id, limpo))) avisar('error', 'Não consegui salvar o título.');
    };

    const salvarNotasDe = async (id: string, nova: string) => {
        setHistorico((prev) => prev.map((t) => (t.id === id ? { ...t, notas: nova } : t)));
        if (!(await atualizarNotasTranscricao(id, nova))) avisar('error', 'Não consegui salvar as notas.');
    };

    const irParaLista = () => document.getElementById(ID_LISTA)?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });

    const ocupado = etapa !== 'idle';
    const aberta = leitor && leitor !== 'resultado' ? historico.find((t) => t.id === leitor) ?? null : null;

    return (
        <CosmicBackground className="flex min-h-screen flex-col px-4 py-8 selection:bg-amber-500/30 sm:px-6">
            <div className="mx-auto w-full max-w-3xl space-y-6">
                <BackButton href="/" label="Início" />

                <header className="space-y-2 text-center">
                    <div className="inline-flex rounded-2xl border border-amber-500/20 bg-amber-500/10 p-3 text-amber-600 dark:text-amber-400">
                        <Mic className="h-6 w-6" aria-hidden="true" />
                    </div>
                    <h1 className="reading-serif text-3xl font-semibold text-text-primary md:text-4xl">Transcrever áudio</h1>
                    <p className="text-sm text-text-muted">Grave a pregação ao vivo ou escolha um áudio do celular. O texto fica para ler, copiar, compartilhar ou guardar.</p>
                    {historico.length > 0 && (
                        <button
                            type="button"
                            onClick={irParaLista}
                            className="mt-1 inline-flex items-center gap-2 rounded-full border border-border-subtle bg-surface-1/80 px-4 py-2 text-sm font-semibold text-text-secondary transition-colors hover:border-amber-500/40 hover:text-text-primary"
                        >
                            <Library className="h-4 w-4 text-amber-600 dark:text-amber-400" aria-hidden="true" />
                            Minhas transcrições · {historico.length}
                        </button>
                    )}
                </header>

                {/* Gravar ou escolher */}
                <div className="rounded-3xl border border-border-subtle bg-surface-1 p-5 shadow-sm">
                    {etapa === 'gravando' ? (
                        <div className="flex flex-col items-center gap-4">
                            <div className="flex items-center gap-2 text-text-primary" role="status">
                                <span className="h-3 w-3 animate-pulse rounded-full bg-red-500" aria-hidden="true" />
                                <span className="text-2xl font-bold tabular-nums">{formatarDuracao(tempo)}</span>
                                <span className="sr-only">gravando</span>
                            </div>
                            <button
                                type="button"
                                onClick={parar}
                                className="flex items-center gap-2 rounded-2xl bg-red-500 px-8 py-3.5 font-bold text-white transition hover:bg-red-400 active:scale-[0.99]"
                            >
                                <Square className="h-5 w-5 fill-current" aria-hidden="true" /> Parar e transcrever
                            </button>
                            <p className="max-w-xs text-center text-xs leading-relaxed text-text-muted">
                                A tela fica acesa e a gravação vai sendo guardada neste aparelho. Mantenha o app aberto: trocar de app ou bloquear o celular pode parar o microfone.
                            </p>
                        </div>
                    ) : ocupado ? (
                        <div className="flex items-center gap-4">
                            <Loader2 className="h-8 w-8 shrink-0 animate-spin text-amber-500" aria-hidden="true" />
                            <div className="min-w-0 flex-1 space-y-1">
                                <p role="status" className="text-sm font-semibold text-text-primary">
                                    {etapa === 'enviando' ? 'Enviando o áudio…' : etapaAudio(segundos)}
                                </p>
                                <p className="text-xs text-text-muted">
                                    <span className="tabular-nums" aria-hidden="true">{formatarDuracao(segundos)} · </span>
                                    Mantenha o app aberto até terminar.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <button
                                type="button"
                                onClick={iniciar}
                                disabled={pedindoMicrofone}
                                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-amber-500 py-4 font-bold text-amber-950 transition hover:bg-amber-400 active:scale-[0.99] disabled:opacity-70"
                            >
                                {pedindoMicrofone ? <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" /> : <Mic className="h-6 w-6" aria-hidden="true" />}
                                {pedindoMicrofone ? 'Aguardando o microfone…' : 'Começar a gravar'}
                            </button>
                            {pedindoMicrofone && (
                                <p role="status" className="text-center text-xs text-text-secondary">Se aparecer um aviso do celular, toque em Permitir para usar o microfone.</p>
                            )}
                            <div className="flex items-center gap-3 text-xs text-text-muted" aria-hidden="true">
                                <span className="h-px flex-1 bg-border-subtle" /> ou <span className="h-px flex-1 bg-border-subtle" />
                            </div>
                            <button
                                type="button"
                                onClick={() => arquivoRef.current?.click()}
                                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border-subtle bg-surface-2 py-3.5 font-semibold text-text-primary transition hover:border-amber-500/40"
                            >
                                <Upload className="h-5 w-5" aria-hidden="true" /> Escolher um áudio do celular
                            </button>
                            <p className="text-center text-xs text-text-muted">MP3, M4A, WAV, áudio do WhatsApp… até 100 MB.</p>
                            <input
                                ref={arquivoRef}
                                type="file"
                                accept="audio/*,.m4a,.mp3,.ogg,.opus,.wav,.aac,.amr,.webm,.flac"
                                className="hidden"
                                aria-label="Escolher um áudio do celular"
                                onChange={(e) => aoEscolherArquivo(e.target.files?.[0])}
                            />
                        </div>
                    )}
                </div>

                {/* Gravação que ficou no aparelho (app fechou ou o envio falhou) */}
                {guardada && !ocupado && (
                    <AvisoRecuperar
                        titulo={`Gravação de ${quandoFoi(guardada.criadoEm)} · cerca de ${minutosAproximados(guardada.bytes)} min`}
                        texto="Ela foi interrompida antes de virar texto e ficou guardada neste aparelho."
                        acao="Transcrever agora"
                        onAcao={transcreverGuardada}
                        confirmando={descartando === 'guardada'}
                        onDescartar={() => setDescartando('guardada')}
                        onConfirmar={descartar}
                        onCancelar={() => setDescartando(null)}
                        textoDescartar="A gravação será apagada deste aparelho. Não dá para desfazer."
                    />
                )}

                {/* Áudio já enviado que ainda não virou texto */}
                {pendente && !ocupado && !resultado && (
                    <AvisoRecuperar
                        titulo={`Áudio de ${quandoFoi(pendente.criadoEm)}`}
                        texto={erro || 'Ele já foi enviado, mas ainda não virou texto.'}
                        acao="Tentar de novo"
                        onAcao={() => transcreverPath(pendente)}
                        confirmando={descartando === 'pendente'}
                        onDescartar={() => setDescartando('pendente')}
                        onConfirmar={descartar}
                        onCancelar={() => setDescartando(null)}
                        textoDescartar="O aviso some e esse áudio não será transcrito."
                        erro={!!erro}
                    />
                )}

                {erro && !pendente && (
                    <div role="alert" className="flex items-start gap-2 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-600 dark:text-red-300">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> <span>{erro}</span>
                    </div>
                )}

                {aviso && !erro && (
                    <div className="flex items-start gap-2 rounded-2xl border border-orange-500/30 bg-orange-500/10 p-4 text-sm text-orange-700 dark:text-orange-300">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> <span>{aviso}</span>
                    </div>
                )}

                {resultado && !ocupado && (
                    <CartaoResultado
                        resultado={resultado}
                        titulo={titulo}
                        onTitulo={setTitulo}
                        notas={notas}
                        onNotas={setNotas}
                        salvoId={salvoId}
                        salvando={salvando}
                        onSalvar={salvar}
                        onLer={() => setLeitor('resultado')}
                        avisar={avisar}
                    />
                )}

                {/* Onde as transcrições ficam guardadas */}
                <section id={ID_LISTA} aria-labelledby="titulo-minhas-transcricoes-audio" className="scroll-mt-6 space-y-3 pt-2">
                    <div>
                        <h2 id="titulo-minhas-transcricoes-audio" className="reading-serif flex items-center gap-2 text-xl font-semibold text-text-primary">
                            <Library className="h-5 w-5 text-amber-600 dark:text-amber-400" aria-hidden="true" />
                            Minhas transcrições
                            {historico.length > 0 && (
                                <span className="rounded-full bg-amber-500/15 px-2 py-0.5 font-sans text-xs font-bold text-amber-700 dark:text-amber-300">{historico.length}</span>
                            )}
                        </h2>
                        <p className="mt-1 text-xs text-text-muted">Áudios gravados ou enviados. Toque em um para ler, copiar, compartilhar, editar ou anotar.</p>
                    </div>

                    {historico.length >= 4 && (
                        <div className="relative">
                            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" aria-hidden="true" />
                            <input
                                type="search"
                                value={busca}
                                onChange={(e) => setBusca(e.target.value)}
                                placeholder="Buscar por título ou palavra"
                                aria-label="Buscar nas transcrições"
                                className="w-full rounded-2xl border border-border-subtle bg-surface-1 py-3 pl-10 pr-4 text-base text-text-primary placeholder:text-text-muted focus:border-amber-500/50 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                            />
                        </div>
                    )}

                    {!historicoPronto ? (
                        <div className="space-y-2" aria-hidden="true">
                            {[0, 1].map((i) => (
                                <div key={i} className="h-[88px] animate-pulse rounded-2xl border border-border-subtle bg-surface-1" />
                            ))}
                        </div>
                    ) : historico.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-border-strong bg-surface-1/60 p-6 text-center">
                            <p className="font-semibold text-text-primary">Nenhuma transcrição de áudio salva ainda</p>
                            <p className="mt-1 text-sm text-text-muted">
                                Depois de transcrever, toque em <strong className="text-text-secondary">Salvar em Minhas transcrições</strong>. Ela fica guardada aqui, na sua conta.
                            </p>
                        </div>
                    ) : filtrados.length === 0 ? (
                        <p className="rounded-2xl bg-surface-1/60 p-4 text-center text-sm text-text-muted">Nada encontrado para “{busca.trim()}”.</p>
                    ) : (
                        <ul className="space-y-2">
                            {filtrados.map((t) => (
                                <li key={t.id}>
                                    <CartaoTranscricao transcricao={t} destaque={t.id === destaqueId} onAbrir={() => setLeitor(t.id)} />
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
            </div>

            {leitor === 'resultado' && resultado && (
                <LeitorTranscricao
                    key="resultado"
                    titulo={titulo.trim() || resultado.tituloSugerido}
                    texto={resultado.texto}
                    criadoEm={salvoId ? historico.find((t) => t.id === salvoId)?.created_at : null}
                    origem={resultado.duracaoSeg ? `Áudio de ${formatarDuracao(resultado.duracaoSeg)}` : null}
                    salvoId={salvoId}
                    salvando={salvando}
                    onSalvar={salvar}
                    onFechar={() => setLeitor(null)}
                    onTextoSalvo={aoSalvarTexto}
                    onExcluir={excluir}
                    avisar={avisar}
                />
            )}
            {aberta && (
                <LeitorTranscricao
                    key={aberta.id}
                    titulo={aberta.titulo?.trim() || 'Culto'}
                    texto={aberta.texto}
                    criadoEm={aberta.created_at}
                    salvoId={aberta.id}
                    onFechar={() => setLeitor(null)}
                    onTextoSalvo={aoSalvarTexto}
                    onExcluir={excluir}
                    avisar={avisar}
                    extra={(
                        <TituloENotas
                            titulo={aberta.titulo || ''}
                            notas={aberta.notas || ''}
                            onTitulo={(novo) => salvarTituloDe(aberta.id, novo)}
                            onNotas={(nova) => salvarNotasDe(aberta.id, nova)}
                        />
                    )}
                />
            )}

            <ToastContainer toasts={toasts} removeToast={removeToast} />
        </CosmicBackground>
    );
}

// Aviso de algo que pode ser recuperado (gravação guardada ou áudio sem texto).
function AvisoRecuperar({ titulo, texto, acao, onAcao, confirmando, onDescartar, onConfirmar, onCancelar, textoDescartar, erro = false }: {
    titulo: string;
    texto: string;
    acao: string;
    onAcao: () => void;
    confirmando: boolean;
    onDescartar: () => void;
    onConfirmar: () => void;
    onCancelar: () => void;
    textoDescartar: string;
    erro?: boolean;
}) {
    return (
        <div role={erro ? 'alert' : 'status'} className={`space-y-3 rounded-2xl border p-4 ${erro ? 'border-red-500/30 bg-red-500/10' : 'border-amber-500/30 bg-amber-500/10'}`}>
            <div className="flex items-start gap-2">
                <AlertTriangle className={`mt-0.5 h-4 w-4 shrink-0 ${erro ? 'text-red-500' : 'text-amber-600 dark:text-amber-400'}`} aria-hidden="true" />
                <div className="min-w-0">
                    <p className="text-sm font-semibold text-text-primary">{titulo}</p>
                    <p className="mt-0.5 text-sm text-text-secondary">{texto}</p>
                </div>
            </div>
            {confirmando ? (
                <div className="space-y-2">
                    <p className="text-xs text-text-secondary">{textoDescartar}</p>
                    <div className="flex gap-2">
                        <button type="button" onClick={onCancelar} className="min-h-[44px] flex-1 rounded-xl border border-border-subtle bg-surface-1 text-sm font-semibold text-text-secondary">
                            Cancelar
                        </button>
                        <button type="button" onClick={onConfirmar} className="flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-xl bg-red-500 text-sm font-bold text-white">
                            <Trash2 className="h-4 w-4" aria-hidden="true" /> Sim, descartar
                        </button>
                    </div>
                </div>
            ) : (
                <div className="flex gap-2">
                    <button type="button" onClick={onAcao} className="flex min-h-[44px] flex-[2] items-center justify-center gap-1.5 rounded-xl bg-amber-500 text-sm font-bold text-amber-950">
                        <RotateCw className="h-4 w-4" aria-hidden="true" /> {acao}
                    </button>
                    <button type="button" onClick={onDescartar} className="min-h-[44px] flex-1 rounded-xl border border-border-subtle bg-surface-1 text-sm font-semibold text-text-secondary">
                        Descartar
                    </button>
                </div>
            )}
        </div>
    );
}

// Resultado novo: título, começo do texto, Salvar em destaque e notas.
function CartaoResultado({ resultado, titulo, onTitulo, notas, onNotas, salvoId, salvando, onSalvar, onLer, avisar }: {
    resultado: Resultado;
    titulo: string;
    onTitulo: (t: string) => void;
    notas: string;
    onNotas: (n: string) => void;
    salvoId: string | null;
    salvando: boolean;
    onSalvar: () => void;
    onLer: () => void;
    avisar: Avisar;
}) {
    const nome = titulo.trim() || resultado.tituloSugerido;
    const { copiado, copiar, compartilhar } = useAcoesTranscricao({ titulo: nome, texto: resultado.texto, avisar });
    const palavras = useMemo(() => contarPalavras(resultado.texto), [resultado.texto]);
    const previa = useMemo(() => paragrafosParaLeitura(resultado.texto).slice(0, 2), [resultado.texto]);
    const detalhes = [
        resultado.duracaoSeg ? `Áudio de ${formatarDuracao(resultado.duracaoSeg)}` : null,
        descreverPalavras(palavras),
        tempoLeitura(palavras),
    ].filter(Boolean).join(' · ');

    return (
        <section aria-label="Transcrição pronta" className="space-y-4 overflow-hidden rounded-3xl border border-amber-500/25 bg-surface-1 p-4 shadow-sm">
            <div className="space-y-1">
                <p className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                    <CircleCheck className="h-4 w-4" aria-hidden="true" /> Pronto
                </p>
                <label htmlFor="titulo-audio" className="sr-only">Título</label>
                <input
                    id="titulo-audio"
                    value={titulo}
                    onChange={(e) => onTitulo(e.target.value)}
                    disabled={!!salvoId}
                    placeholder={resultado.tituloSugerido}
                    className="reading-serif w-full rounded-xl border border-transparent bg-transparent px-1 py-1 text-xl font-semibold text-text-primary placeholder:text-text-primary/60 hover:border-border-subtle focus:border-amber-500/50 focus:outline-none focus:ring-2 focus:ring-amber-500/20 disabled:opacity-100"
                />
                <p className="px-1 text-xs text-text-muted">{detalhes}</p>
            </div>

            <div className="reading-serif space-y-3 px-1 text-[15px] leading-relaxed text-text-secondary">
                {previa.map((p, i) => <p key={i} className="line-clamp-4">{p}</p>)}
            </div>

            <button
                type="button"
                onClick={onSalvar}
                disabled={!!salvoId || salvando}
                className={`flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 font-bold transition active:scale-[0.99]
                    ${salvoId ? 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : 'bg-amber-500 text-amber-950 hover:bg-amber-400'} disabled:cursor-default`}
            >
                {salvando ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : salvoId ? <Check className="h-5 w-5" aria-hidden="true" /> : <Save className="h-5 w-5" aria-hidden="true" />}
                {salvando ? 'Salvando…' : salvoId ? 'Salva em Minhas transcrições' : 'Salvar em Minhas transcrições'}
            </button>

            <div className="grid grid-cols-3 gap-2">
                <BotaoAcao variante="padrao" icone={BookOpen} rotulo="Ler tudo" onClick={onLer} />
                <BotaoAcao variante={copiado ? 'feito' : 'padrao'} icone={copiado ? Check : Copy} rotulo={copiado ? 'Copiado' : 'Copiar'} onClick={copiar} />
                <BotaoAcao variante="padrao" icone={Share2} rotulo="Compartilhar" onClick={compartilhar} />
            </div>

            <div>
                <label htmlFor="notas-audio" className="text-xs font-semibold text-text-secondary">Suas notas (opcional)</label>
                <textarea
                    id="notas-audio"
                    value={notas}
                    onChange={(e) => onNotas(e.target.value)}
                    disabled={!!salvoId}
                    rows={3}
                    placeholder="Pontos principais, aplicações…"
                    className="mt-1 w-full resize-y rounded-xl border border-border-subtle bg-surface-2 px-3 py-2 text-sm leading-relaxed text-text-primary placeholder:text-text-muted focus:border-amber-500/50 focus:outline-none focus:ring-2 focus:ring-amber-500/20 disabled:opacity-70"
                />
            </div>
        </section>
    );
}

// Título e notas de uma transcrição salva (gravam ao sair do campo).
function TituloENotas({ titulo, notas, onTitulo, onNotas }: {
    titulo: string;
    notas: string;
    onTitulo: (t: string) => void;
    onNotas: (n: string) => void;
}) {
    return (
        <div className="space-y-4">
            <div>
                <label htmlFor="titulo-salvo" className="text-xs font-semibold text-text-secondary">Título</label>
                <input
                    id="titulo-salvo"
                    defaultValue={titulo}
                    onBlur={(e) => { if (e.target.value.trim() !== titulo.trim()) onTitulo(e.target.value); }}
                    placeholder="Ex.: Culto de domingo"
                    className="mt-1 w-full rounded-xl border border-border-subtle bg-surface-1 px-3 py-2.5 text-base font-semibold text-text-primary focus:border-amber-500/50 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                />
            </div>
            <div>
                <label htmlFor="notas-salvas" className="text-xs font-semibold text-text-secondary">Suas notas</label>
                <textarea
                    id="notas-salvas"
                    defaultValue={notas}
                    onBlur={(e) => { if (e.target.value !== notas) onNotas(e.target.value); }}
                    rows={4}
                    placeholder="Pontos principais, aplicações…"
                    className="mt-1 w-full resize-y rounded-xl border border-border-subtle bg-surface-1 px-3 py-2 text-base leading-relaxed text-text-primary focus:border-amber-500/50 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                />
                <p className="mt-1 text-xs text-text-muted">Salva sozinho quando você sai do campo.</p>
            </div>
        </div>
    );
}
