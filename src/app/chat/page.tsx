'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Send, Loader2, MessageSquare, Sparkles, RefreshCw } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { executarModo, getDataHoje } from '@/lib/supabase';
import { CosmicHeader } from '@/components/ui/CosmicHeader';
import { CosmicBackground } from '@/components/ui/CosmicBackground';

// ===========================================
// TIPOS
// ===========================================

interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

// ===========================================
// COMPONENTE DE MENSAGEM
// ===========================================

function ChatBubble({ message }: { message: ChatMessage }) {
    const isUser = message.role === 'user';

    return (
        <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4 animate-in fade-in slide-in-from-bottom-2 duration-300`}>
            <div className={`
                max-w-[85%] md:max-w-[70%] p-5 rounded-3xl 
                ${isUser
                    ? 'bg-indigo-600 text-white rounded-br-lg'
                    : 'stellar-card border border-white/10 text-slate-200 rounded-bl-lg'
                }
            `}>
                {isUser ? (
                    <p className="text-sm leading-relaxed">{message.content}</p>
                ) : (
                    <div className="prose prose-sm prose-invert max-w-none prose-p:mb-3 prose-p:leading-relaxed prose-strong:text-indigo-300">
                        <ReactMarkdown>{message.content}</ReactMarkdown>
                    </div>
                )}
                <div className={`text-[10px] mt-3 ${isUser ? 'text-indigo-200' : 'text-slate-500'}`}>
                    {message.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </div>
            </div>
        </div>
    );
}

// ===========================================
// PÁGINA PRINCIPAL
// ===========================================

export default function ChatPastoralPage() {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const chatEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Scroll automático para a última mensagem
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Mensagem inicial de boas-vindas
    useEffect(() => {
        if (messages.length === 0) {
            setMessages([{
                role: 'assistant',
                content: `Olá! 👋 Sou seu **Mentor Pastoral Virtual**.

Estou aqui para conversar sobre suas dúvidas, reflexões e caminhada espiritual. 

**Como posso te ajudar hoje?**

Alguns exemplos do que podemos explorar:
- "Estou passando por um momento difícil..."
- "Como orar quando não tenho palavras?"
- "O que a Bíblia diz sobre ansiedade?"
- "Como entender melhor [passagem bíblica]?"

Fique à vontade para perguntar qualquer coisa! 🙏`,
                timestamp: new Date()
            }]);
        }
    }, []);

    // Enviar mensagem
    const handleSend = async () => {
        if (!inputValue.trim() || isLoading) return;

        const userMessage: ChatMessage = {
            role: 'user',
            content: inputValue.trim(),
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        setInputValue('');
        setIsLoading(true);
        setError(null);

        try {
            // Chama a Edge Function com o modo chat_pastoral
            const response = await executarModo('chat_pastoral', getDataHoje());

            if (!response.ok) {
                throw new Error(response.error || 'Erro ao processar resposta');
            }

            const assistantMessage: ChatMessage = {
                role: 'assistant',
                content: response.resultado,
                timestamp: new Date()
            };

            setMessages(prev => [...prev, assistantMessage]);
        } catch (err) {
            console.error('Erro no chat:', err);
            setError(err instanceof Error ? err.message : 'Erro desconhecido');

            // Mensagem de fallback
            const fallbackMessage: ChatMessage = {
                role: 'assistant',
                content: `Desculpe, encontrei um problema ao processar sua mensagem. 😔

**Possíveis causas:**
- O modo "chat_pastoral" pode não estar configurado no banco
- Verifique se o arquivo MODO_CHAT.txt está no Storage

Por favor, tente novamente em alguns instantes.`,
                timestamp: new Date()
            };
            setMessages(prev => [...prev, fallbackMessage]);
        } finally {
            setIsLoading(false);
            inputRef.current?.focus();
        }
    };

    // Handler do Enter
    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    // Reiniciar conversa
    const handleReset = () => {
        setMessages([{
            role: 'assistant',
            content: `Conversa reiniciada! 🔄

Como posso te ajudar agora?`,
            timestamp: new Date()
        }]);
        setError(null);
    };

    return (
        <CosmicBackground className="font-sans text-slate-100 selection:bg-indigo-500/30 selection:text-indigo-200">

            {/* THE GIANT WRAPPER */}
            <div className="w-full flex flex-col min-h-screen relative z-10">

                {/* HEADER */}
                <div className="w-full max-w-4xl mx-auto">
                    <CosmicHeader className="pb-8 md:pb-12">
                        <div className="w-full px-4 sm:px-6 lg:px-8 pt-8 md:pt-12">
                            <div className="flex items-center gap-4 mb-6 animate-divine">
                                <Link href="/" className="group p-3 bg-white/[0.03] hover:bg-white/[0.08] rounded-2xl transition-all border border-white/5 hover:border-white/10 active:scale-95">
                                    <ArrowLeft className="w-5 h-5 text-slate-400 group-hover:text-white" />
                                </Link>
                                <div className="inline-flex items-center gap-2.5 px-4 py-1.5 bg-indigo-500/10 border border-indigo-400/20 rounded-full text-indigo-300 text-[10px] font-black uppercase tracking-[0.2em] shadow-inner">
                                    <MessageSquare className="w-3.5 h-3.5" />
                                    Mentor Virtual
                                </div>
                            </div>

                            <div className="flex items-center justify-between">
                                <h1 className="text-3xl md:text-5xl font-black tracking-divine text-white divine-halo animate-divine">
                                    Chat Pastoral
                                </h1>
                                <button
                                    onClick={handleReset}
                                    className="p-3 bg-white/[0.03] hover:bg-white/[0.08] rounded-2xl transition-all border border-white/5 hover:border-white/10 active:scale-95"
                                    title="Reiniciar conversa"
                                >
                                    <RefreshCw className="w-5 h-5 text-slate-400 hover:text-white" />
                                </button>
                            </div>
                        </div>
                    </CosmicHeader>
                </div>

                {/* CHAT AREA */}
                <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-32 overflow-y-auto custom-scrollbar">
                    <div className="space-y-2 py-6">
                        {messages.map((msg, idx) => (
                            <ChatBubble key={idx} message={msg} />
                        ))}

                        {/* Loading indicator */}
                        {isLoading && (
                            <div className="flex justify-start mb-4">
                                <div className="stellar-card border border-white/10 p-5 rounded-3xl rounded-bl-lg flex items-center gap-3">
                                    <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
                                    <span className="text-slate-400 text-sm">Pensando...</span>
                                </div>
                            </div>
                        )}

                        <div ref={chatEndRef} />
                    </div>
                </main>

                {/* INPUT AREA (Fixed at bottom) */}
                <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-[#020617] via-[#020617] to-transparent pt-8 pb-6 px-4">
                    <div className="w-full max-w-4xl mx-auto">
                        <div className="stellar-card border border-white/10 rounded-[2rem] p-2 flex items-center gap-3">
                            <input
                                ref={inputRef}
                                type="text"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyPress={handleKeyPress}
                                placeholder="Digite sua mensagem..."
                                disabled={isLoading}
                                className="flex-1 bg-transparent border-none outline-none text-white placeholder:text-slate-500 px-4 py-3 text-sm disabled:opacity-50"
                            />
                            <button
                                onClick={handleSend}
                                disabled={isLoading || !inputValue.trim()}
                                className="p-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:cursor-not-allowed rounded-2xl transition-all active:scale-95 shadow-lg shadow-indigo-900/40"
                            >
                                {isLoading ? (
                                    <Loader2 className="w-5 h-5 text-white animate-spin" />
                                ) : (
                                    <Send className="w-5 h-5 text-white" />
                                )}
                            </button>
                        </div>

                        {/* Quick suggestions */}
                        <div className="flex flex-wrap gap-2 mt-4 justify-center">
                            {['Como orar?', 'Estou ansioso', 'Preciso de conforto'].map((suggestion) => (
                                <button
                                    key={suggestion}
                                    onClick={() => {
                                        setInputValue(suggestion);
                                        inputRef.current?.focus();
                                    }}
                                    disabled={isLoading}
                                    className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-xs text-slate-400 hover:text-white transition-all disabled:opacity-50"
                                >
                                    {suggestion}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

            </div>
        </CosmicBackground>
    );
}
