'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { BookOpen } from 'lucide-react';
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

// GRACE OFFLINE: sem internet, o token expirado não renova e o
// getSession() pode voltar vazio — sem isto o app expulsava o usuário
// para o /login (que não funciona offline). Lemos a sessão crua que o
// supabase-js guarda no localStorage e confiamos nela enquanto offline.
function lerUsuarioLocal(): User | null {
    try {
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && k.startsWith('sb-') && k.endsWith('-auth-token')) {
                const raw = JSON.parse(localStorage.getItem(k) || 'null');
                return (raw?.user ?? raw?.currentSession?.user ?? null) as User | null;
            }
        }
    } catch { /* storage indisponível/corrompido */ }
    return null;
}

const estaOffline = () => typeof navigator !== 'undefined' && !navigator.onLine;

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const pathname = usePathname();
    const router = useRouter();

    const isAdmin = Boolean(
        user?.email && getAdminEmails().includes(user.email.toLowerCase())
    );

    useEffect(() => {
        let ativo = true;

        // ABERTURA RÁPIDA (25/09/2026): com sessão guardada no aparelho, o app
        // abre na hora. Antes ele esperava o getSession(), que renova o token
        // pela rede quando a sessão venceu (toda abertura após ~1h parado).
        // A validação abaixo continua valendo: se a sessão cair, volta ao login.
        const guardado = lerUsuarioLocal();
        if (guardado) {
            // eslint-disable-next-line react-hooks/set-state-in-effect -- leitura síncrona de localStorage na montagem (hydration-safe)
            setUser(guardado);
            setLoading(false);
        }

        // Validação real (localStorage + renovação do token quando preciso)
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (!ativo) return;
            let u = session?.user ?? null;
            if (!u && estaOffline()) u = lerUsuarioLocal();
            setUser(u);
            setLoading(false);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            // Offline, um "SIGNED_OUT" por falha de refresh não é logout real:
            // mantém o usuário do cache até a rede voltar.
            let u = session?.user ?? null;
            if (!u && estaOffline()) u = lerUsuarioLocal();
            setUser(u);
            setLoading(false);
        });

        return () => {
            ativo = false;
            subscription.unsubscribe();
        };
    }, []);

    // Gate de navegação
    useEffect(() => {
        if (loading) return;

        const rotaPublica = ROTAS_PUBLICAS.some(r => pathname.startsWith(r));

        if (!user && !rotaPublica) {
            // Offline não redireciona para o login (que não funciona sem rede)
            if (!estaOffline()) router.replace('/login');
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
    // (offline nunca bloqueia: melhor mostrar o app com dados em cache
    // do que uma tela de carregamento eterna)
    const rotaPublica = ROTAS_PUBLICAS.some(r => pathname.startsWith(r));
    const bloqueado = !loading && !user && !rotaPublica && !estaOffline();

    return (
        <AuthContext.Provider value={{ user, isAdmin, loading, signOut }}>
            {loading || bloqueado ? (
                // Abertura da marca: é a primeira pintura (vem pronta no HTML) e
                // só fica na tela enquanto a sessão é conferida.
                <div role="status" aria-label="Abrindo a Bíblia" className="min-h-screen flex items-center justify-center bg-surface-0">
                    <div className="flex flex-col items-center gap-5">
                        <div className="w-16 h-16 rounded-3xl bg-amber-500 flex items-center justify-center shadow-xl animate-pulse">
                            <BookOpen className="w-8 h-8 text-amber-950" strokeWidth={2.2} />
                        </div>
                        <div className="text-center">
                            <p className="reading-serif text-2xl font-semibold text-text-primary">Bíblia</p>
                            <p className="text-xs text-text-muted mt-1">Sua jornada espiritual diária</p>
                        </div>
                    </div>
                </div>
            ) : (
                children
            )}
        </AuthContext.Provider>
    );
}
