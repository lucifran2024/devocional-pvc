import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Square, Mic, Youtube, Save, Trash2, Loader2, FileText, Upload } from 'lucide-react';
import { uploadSermonAudio, saveSermon, getSermons, deleteSermon, Sermon, executarModoComFiltros, supabase } from '@/lib/supabase';

export function SermonRecorderCard() {
    const [activeTab, setActiveTab] = useState<'record' | 'youtube' | 'history'>('record');
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [youtubeUrl, setYoutubeUrl] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [history, setHistory] = useState<Sermon[]>([]);
    const [statusMsg, setStatusMsg] = useState('');

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const chunksRef = useRef<BlobPart[]>([]);

    useEffect(() => {
        loadHistory();
    }, []);

    async function loadHistory() {
        const data = await getSermons();
        setHistory(data);
    }

    // ==================== GRAVAÇÃO DE ÁUDIO ====================
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            chunksRef.current = [];

            mediaRecorderRef.current.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };

            mediaRecorderRef.current.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
                setAudioBlob(blob);
                setAudioUrl(URL.createObjectURL(blob));
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorderRef.current.start();
            setIsRecording(true);
            setRecordingTime(0);

            timerRef.current = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);
        } catch (err) {
            console.error('Erro ao acessar microfone:', err);
            setStatusMsg('Erro ao acessar microfone. Verifique as permissões.');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            if (timerRef.current) clearInterval(timerRef.current);
        }
    };

    const cancelRecording = () => {
        stopRecording();
        setAudioBlob(null);
        setAudioUrl(null);
        setRecordingTime(0);
        setStatusMsg('');
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // ==================== PROCESSAMENTO ====================
    const handleTranscribeAudio = async () => {
        if (!audioBlob) return;

        setIsProcessing(true);
        setStatusMsg('Enviando áudio...');

        try {
            // 1. Upload for Storage
            // 1. Upload for Storage
            // MODO SEM LOGIN: Usar ID fictício
            const fakeUserId = 'anon_user';

            const publicUrl = await uploadSermonAudio(audioBlob, fakeUserId);
            if (!publicUrl) throw new Error('Falha no upload do áudio.');

            setStatusMsg('Transcrevendo com IA...');

            // 2. Call Edge Function
            const hoje = new Date().toISOString().split('T')[0];
            const resp = await executarModoComFiltros('transcrever_audio', hoje, {
                tipo: 'arquivo',
                url: publicUrl
            });

            if (!resp.ok) throw new Error(resp.error || 'Erro na transcrição.');

            // 3. Save to DB
            // 3. Save to DB
            const newSermon = await saveSermon({
                // user_id: user.id, // Auth removida
                title: resp.titulo || `Gravação de ${new Date().toLocaleString()}`,
                audio_url: publicUrl,
                youtube_url: null,
                transcription: resp.resultado, // resultado = texto completo
                summary: resp.resumo,
                tag: ['audio', 'app_recorder']
            } as any); // cast any for partial match

            if (newSermon) {
                setHistory([newSermon, ...history]);
                setStatusMsg('Sermão salvo com sucesso!');
                setAudioBlob(null);
                setAudioUrl(null);
            }

        } catch (err: any) {
            console.error(err);
            setStatusMsg(`Erro: ${err.message}`);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleTranscribeYoutube = async () => {
        if (!youtubeUrl) return;

        setIsProcessing(true);
        setStatusMsg('Processando vídeo (pode demorar)...');

        try {
            // MODO SEM LOGIN: Ignorar checagem de user
            // 1. Call Edge Function (Youtube logic)
            const hoje = new Date().toISOString().split('T')[0];
            const resp = await executarModoComFiltros('transcrever_audio', hoje, {
                tipo: 'youtube',
                url: youtubeUrl
            });

            if (!resp.ok) throw new Error(resp.error || 'Erro na transcrição.');

            // 2. Save to DB
            const newSermon = await saveSermon({
                // user_id: user.id,
                title: resp.titulo || `Sermão YouTube ${new Date().toLocaleDateString()}`,
                audio_url: null,
                youtube_url: youtubeUrl,
                transcription: resp.resultado,
                summary: resp.resumo,
                tag: ['youtube']
            } as any);

            if (newSermon) {
                setHistory([newSermon, ...history]);
                setStatusMsg('Sermão do YouTube salvo!');
                setYoutubeUrl('');
            }

        } catch (err: any) {
            console.error(err);
            setStatusMsg(`Erro: ${err.message}`);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir?')) return;
        const success = await deleteSermon(id);
        if (success) {
            setHistory(history.filter(h => h.id !== id));
        }
    };

    return (
        <div className="w-full bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl mb-8">
            {/* Header */}
            <div className="p-4 border-b border-slate-800 bg-slate-950/50 flex items-center gap-3">
                <Mic className="w-5 h-5 text-indigo-400" />
                <h2 className="text-lg font-bold text-white">Gravador de Sermões & YouTube</h2>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-800">
                <button
                    onClick={() => setActiveTab('record')}
                    className={`flex-1 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2
            ${activeTab === 'record' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'}`}
                >
                    <Mic className="w-4 h-4" /> Gravar
                </button>
                <button
                    onClick={() => setActiveTab('youtube')}
                    className={`flex-1 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2
            ${activeTab === 'youtube' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'}`}
                >
                    <Youtube className="w-4 h-4" /> YouTube
                </button>
                <button
                    onClick={() => setActiveTab('history')}
                    className={`flex-1 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2
            ${activeTab === 'history' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'}`}
                >
                    <FileText className="w-4 h-4" /> Histórico
                </button>
            </div>

            <div className="p-6">
                {/* TAB GRAVAR */}
                {activeTab === 'record' && (
                    <div className="flex flex-col items-center gap-6">
                        {!audioBlob ? (
                            <>
                                <div className={`relative w-32 h-32 rounded-full flex items-center justify-center border-4 transition-all duration-300
                  ${isRecording ? 'border-red-500 bg-red-500/10 animate-pulse' : 'border-slate-700 bg-slate-800'}`}>
                                    {isRecording ? (
                                        <span className="text-3xl font-mono text-red-400">{formatTime(recordingTime)}</span>
                                    ) : (
                                        <Mic className="w-12 h-12 text-slate-500" />
                                    )}
                                </div>

                                <div className="flex gap-4">
                                    {!isRecording ? (
                                        <button
                                            onClick={startRecording}
                                            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full font-bold shadow-lg transition-transform hover:scale-105"
                                        >
                                            <Play className="w-5 h-5" /> Iniciar Gravação
                                        </button>
                                    ) : (
                                        <button
                                            onClick={stopRecording}
                                            className="flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-500 text-white rounded-full font-bold shadow-lg transition-transform hover:scale-105"
                                        >
                                            <Square className="w-5 h-5" /> Parar
                                        </button>
                                    )}
                                </div>
                                <p className="text-xs text-slate-500">Grave pregações, insights ou notas de voz.</p>
                            </>
                        ) : (
                            <div className="w-full space-y-4 animate-in fade-in slide-in-from-bottom-4">
                                <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700 flex flex-col gap-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium text-slate-300">Gravação finalizada</span>
                                        <span className="text-xs font-mono text-slate-500">{formatTime(recordingTime)}</span>
                                    </div>
                                    {audioUrl && (
                                        <audio controls src={audioUrl} className="w-full h-10" />
                                    )}
                                    <div className="flex gap-3 justify-end">
                                        <button
                                            onClick={cancelRecording}
                                            className="text-sm text-slate-400 hover:text-white px-3 py-2"
                                        >
                                            Descartar
                                        </button>
                                        <button
                                            onClick={handleTranscribeAudio}
                                            disabled={isProcessing}
                                            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 disabled:bg-slate-700 text-white rounded-lg font-medium transition-colors"
                                        >
                                            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                                            Salvar & Transcrever
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* TAB YOUTUBE */}
                {activeTab === 'youtube' && (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm text-slate-400">Cole o link do vídeo do YouTube:</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={youtubeUrl}
                                    onChange={e => setYoutubeUrl(e.target.value)}
                                    placeholder="https://youtube.com/watch?v=..."
                                    className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                                <button
                                    onClick={handleTranscribeYoutube}
                                    disabled={!youtubeUrl || isProcessing}
                                    className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                                >
                                    {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                                    Processar
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* STATUS MESSAGE */}
                {statusMsg && (
                    <div className="mt-4 p-3 bg-slate-800/80 border border-slate-700 rounded-lg text-center text-sm text-indigo-300">
                        {statusMsg}
                    </div>
                )}

                {/* TAB HISTÓRICO */}
                {activeTab === 'history' && (
                    <div className="animate-in fade-in slide-in-from-bottom-2">
                        {history.length === 0 ? (
                            <div className="text-center py-10 text-slate-500">
                                Nenhum histórico encontrado.
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {history.map(item => (
                                    <div key={item.id} className="p-4 bg-slate-800 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors group">
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <h4 className="font-medium text-white line-clamp-1">{item.title}</h4>
                                                <span className="text-xs text-slate-500">
                                                    {new Date(item.created_at).toLocaleDateString()} • {item.audio_url ? 'Áudio' : 'YouTube'}
                                                </span>
                                            </div>
                                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => handleDelete(item.id)}
                                                    className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-900 rounded-md"
                                                    title="Excluir"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Summary Preview */}
                                        {item.summary && (
                                            <p className="text-sm text-slate-300 mb-3 line-clamp-2">
                                                {item.summary.replace(/^RESUMO:/i, '')}
                                            </p>
                                        )}

                                        {/* Expandable Content */}
                                        <details className="text-xs text-slate-400">
                                            <summary className="cursor-pointer hover:text-indigo-400 transition-colors mb-2">Ver Transcrição Completa</summary>
                                            <div className="p-3 bg-slate-900 rounded border border-slate-800 mt-2 max-h-60 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                                                {item.transcription}
                                            </div>
                                        </details>

                                        {/* Player if audio */}
                                        {item.audio_url && (
                                            <div className="mt-3">
                                                <audio controls src={item.audio_url} className="w-full h-8" />
                                            </div>
                                        )}
                                        {/* Link if YouTube */}
                                        {item.youtube_url && (
                                            <div className="mt-2 text-xs">
                                                <a href={item.youtube_url} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline flex items-center gap-1">
                                                    <Youtube className="w-3 h-3" /> Ver vídeo original
                                                </a>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
