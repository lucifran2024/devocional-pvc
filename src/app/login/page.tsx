'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2, Mail, Lock, Eye, EyeOff, BookOpen } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { CosmicBackground } from '@/components/ui/CosmicBackground';

// ===============================================
// LOGIN / CADASTRO — Devocional PVC
// ===============================================

const MENSAGENS_ERRO: Record<string, string> = {
    'Invalid login credentials': 'Email ou senha incorretos.',
    'Email not confirmed': 'Confirme seu email antes de entrar (verifique a caixa de entrada).',
    'User already registered': 'Este email já está cadastrado. Use a aba Entrar.',
    'Password should be at least 6 characters': 'A senha precisa ter pelo menos 6 caracteres.',
    'Signup requires a valid password': 'Digite uma senha válida.',
    'Unable to validate email address: invalid format': 'Email inválido.',
};

function traduzirErro(msg: string): string {
    for (const [en, pt] of Object.entries(MENSAGENS_ERRO)) {
        if (msg.includes(en)) return pt;
    }
    return msg;
}

export default function LoginPage() {
    const router = useRouter();
    const [modo, setModo] = useState<'entrar' | 'cadastrar'>('entrar');
    const [email, setEmail] = useState('');
    const [senha, setSenha] = useState('');
    const [mostrarSenha, setMostrarSenha] = useState(false);
    const [enviando, setEnviando] = useState(false);
    const [erro, setErro] = useState<string | null>(null);
    const [aviso, setAviso] = useState<string | null>(null);
    // 15/11/2026: o login virou opção. Quem chega aqui vindo de uma área que
    // guarda dados (Caderno, Oração…) vê por que a conta é pedida.
    const [veioDeArea, setVeioDeArea] = useState(false);
    useEffect(() => {
        setVeioDeArea(new URLSearchParams(window.location.search).has('voltar'));
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (enviando) return;
        setErro(null);
        setAviso(null);
        setEnviando(true);

        try {
            if (modo === 'entrar') {
                const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
                if (error) throw error;
                router.replace('/');
            } else {
                const { data, error } = await supabase.auth.signUp({ email, password: senha });
                if (error) throw error;
                // Se a confirmação de email estiver ativa no Supabase, não há sessão ainda
                if (data.session) {
                    router.replace('/');
                } else {
                    setAviso('Conta criada! Verifique seu email para confirmar o cadastro e depois entre.');
                    setModo('entrar');
                }
            }
        } catch (err) {
            setErro(traduzirErro(err instanceof Error ? err.message : 'Erro inesperado. Tente novamente.'));
        } finally {
            setEnviando(false);
        }
    };

    return (
        <CosmicBackground className="min-h-screen flex items-center justify-center px-6 py-12">
            <header className="absolute right-4 top-4"><ThemeToggle /></header>
            <div className="w-full max-w-sm mx-auto">
                {/* Logo */}
                <div className="flex flex-col items-center mb-8">
                    <div className="w-16 h-16 rounded-3xl bg-amber-500 flex items-center justify-center mb-4">
                        <BookOpen className="w-8 h-8 text-amber-950" />
                    </div>
                    <h1 className="reading-serif text-[1.7rem] font-semibold text-text-primary tracking-tight">Bíblia</h1>
                    <p className="mt-2 max-w-[18rem] text-center text-sm leading-snug text-text-secondary">
                        {veioDeArea
                            ? 'Esta parte guarda coisas suas (anotações, pedidos, estudos). Entre ou crie uma conta para usar.'
                            : 'Com uma conta, suas marcações, anotações e o progresso da leitura ficam guardados e vão com você para outro aparelho.'}
                    </p>
                </div>

                {/* Card */}
                <div className="glass-card rounded-3xl p-6 border border-border-subtle">
                    {/* Abas */}
                    <div className="flex bg-surface-2 rounded-xl p-1 mb-6">
                        {(['entrar', 'cadastrar'] as const).map(m => (
                            <button
                                key={m}
                                onClick={() => { setModo(m); setErro(null); setAviso(null); }}
                                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${modo === m
                                    ? 'bg-amber-500 text-amber-950 shadow-md'
                                    : 'text-text-muted hover:text-text-primary'
                                    }`}
                            >
                                {m === 'entrar' ? 'Entrar' : 'Criar conta'}
                            </button>
                        ))}
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="relative">
                            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
                            <input
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="Seu email"
                                required
                                autoComplete="email"
                                className="w-full pl-10 pr-4 py-3 rounded-xl bg-surface-2 border border-border-subtle text-text-primary placeholder:text-text-muted text-sm focus:outline-none focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 transition"
                            />
                        </div>

                        <div className="relative">
                            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
                            <input
                                type={mostrarSenha ? 'text' : 'password'}
                                value={senha}
                                onChange={e => setSenha(e.target.value)}
                                placeholder={modo === 'cadastrar' ? 'Crie uma senha (mín. 6 caracteres)' : 'Sua senha'}
                                required
                                minLength={6}
                                autoComplete={modo === 'entrar' ? 'current-password' : 'new-password'}
                                className="w-full pl-10 pr-11 py-3 rounded-xl bg-surface-2 border border-border-subtle text-text-primary placeholder:text-text-muted text-sm focus:outline-none focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 transition"
                            />
                            <button
                                type="button"
                                onClick={() => setMostrarSenha(!mostrarSenha)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-text-muted hover:text-text-primary transition-colors"
                                tabIndex={-1}
                            >
                                {mostrarSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>

                        {erro && (
                            <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium animate-in fade-in duration-150">
                                {erro}
                            </div>
                        )}
                        {aviso && (
                            <div className="px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium animate-in fade-in duration-150">
                                {aviso}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={enviando || !email || senha.length < 6}
                            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-campo text-sm font-semibold text-campo-texto transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            {enviando && <Loader2 className="w-4 h-4 animate-spin" />}
                            {modo === 'entrar' ? 'Entrar' : 'Criar minha conta'}
                        </button>
                    </form>
                </div>

                <Link
                    href="/"
                    className="mt-4 flex min-h-12 w-full items-center justify-center rounded-full bg-surface-2 text-sm font-semibold text-text-primary transition-colors hover:bg-border-strong/50"
                >
                    Continuar sem conta
                </Link>
                <p className="text-center text-xs text-text-muted mt-4 leading-relaxed">
                    A Bíblia, a leitura do dia e a Palavra da Manhã abrem sem conta.
                </p>
            </div>
        </CosmicBackground>
    );
}
