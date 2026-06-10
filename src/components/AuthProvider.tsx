'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

// ===============================================
// AUTH PROVIDER — login obrigatório + perfil admin
//
// Admin (dono): vê o app completo, exatamente como sempre foi.
// Usuário comum (público): Palavra do Dia, Versículo, Bíblia e
// Plano de Leitura — sem DNA Categorizado e sem Devocional Externo.
// ===============================================

// Emails com acesso à versão completa. Pode ser sobrescrito pela env
// NEXT_PUBLIC_ADMIN_EMAILS (separados por vírgula) sem mudar código.
const ADMIN_EMAILS_PADRAO = ['dj_lucifran@hotmail.com'];

function getAdminEmails(): string[] {
    const fromEnv = process.env.NEXT_PUBLIC_ADMIN_EMAILS;
    if (fromEnv && fromEnv.trim()) {
        return fromEnv.split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
    }
    return ADMIN_EMAILS_PADRAO;
}

interface AuthContextValue {
    user: User | null;
    isAdmin: boolean;
    loading: boolean;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
    user: null,
    isAdmin: false,
    loading: true,
    signOut: async () => { },
});

export function useAuth() {
    return useContext(AuthContext);
}

// Rotas acessíveis sem login
const ROTAS_PUBLICAS = ['/login'];

// Rotas exclusivas do admin (versão completa)
const ROTAS_ADMIN = ['/dna-categorizado', '/devocional-externo', '/favoritos'];

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const pathname = usePathname();
    const router = useRouter();

    const isAdmin = Boolean(
        user?.email && getAdminEmails().includes(user.email.toLowerCase())
    );

    useEffect(() => {
        // Sessão inicial (localStorage — funciona offline)
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null);
            setLoading(false);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
            setLoading(false);
        });

        return () => subscription.unsubscribe();
    }, []);

    // Gate de navegação
    useEffect(() => {
        if (loading) return;

        const rotaPublica = ROTAS_PUBLICAS.some(r => pathname.startsWith(r));

        if (!user && !rotaPublica) {
            router.replace('/login');
            return;
        }
        if (user && pathname.startsWith('/login')) {
            router.replace('/');
            return;
        }
        // Usuário comum tentando rota de admin → volta para a home
        if (user && !isAdmin && ROTAS_ADMIN.some(r => pathname.startsWith(r))) {
            router.replace('/');
        }
    }, [loading, user, isAdmin, pathname, router]);

    const signOut = useCallback(async () => {
        await supabase.auth.signOut();
        router.replace('/login');
    }, [router]);

    // Evita flash de conteúdo protegido antes do redirect
    const rotaPublica = ROTAS_PUBLICAS.some(r => pathname.startsWith(r));
    const bloqueado = !loading && !user && !rotaPublica;

    return (
        <AuthContext.Provider value={{ user, isAdmin, loading, signOut }}>
            {loading || bloqueado ? (
                <div className="min-h-screen flex items-center justify-center bg-surface-0">
                    <div className="flex flex-col items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center animate-pulse">
                            <span className="text-amber-400 font-black text-sm">PVC</span>
                        </div>
                        <span className="text-xs text-text-muted tracking-widest uppercase">Carregando…</span>
                    </div>
                </div>
            ) : (
                children
            )}
        </AuthContext.Provider>
    );
}
