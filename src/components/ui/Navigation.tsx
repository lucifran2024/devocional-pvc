'use client';

import Link from 'next/link';
import { Suspense, useEffect, useRef, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import {
    Home, BookOpen, Bookmark, Calendar, LogOut, LayoutGrid, X,
    BookMarked, NotebookPen, HeartHandshake, Youtube, Mic,
    GraduationCap,
} from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

// useSearchParams exige um limite de Suspense quando usado em componente do
// layout raiz (senão o build reclama de "missing-suspense-with-csr-bailout").
export function Navigation() {
    return (
        <Suspense fallback={null}>
            <NavigationInner />
        </Suspense>
    );
}

// Menu "Mais" (25/09/2026): as áreas que antes só abriam pelos cartões da tela
// inicial ficam a um toque de qualquer tela. Mesma lista dos cartões da home;
// Memorização continua fora, como o dono pediu em 16/07/2026.
const MAIS_ITENS = [
    // 03/10/2026: "Leitura" na barra abre direto a leitura de hoje (ele quer assim);
    // a página do Plano de Leitura (Entender, Meditar, Fixar) ganha atalho aqui.
    { name: 'Estudar a leitura do dia', desc: 'Entender, meditar e fixar', href: '/plano-de-leitura', icon: GraduationCap },
    { name: 'Planos de leitura', desc: 'Estudo guiado', href: '/planos', icon: BookMarked },
    { name: 'Caderno', desc: 'Anotações, versículos e vídeos', href: '/anotacoes', icon: NotebookPen },
    { name: 'Diário de Oração', desc: 'Pedidos e respostas', href: '/oracao', icon: HeartHandshake },
    { name: 'Transcrever do YouTube', desc: 'Texto da pregação', href: '/transcrever-youtube', icon: Youtube },
    { name: 'Transcrever áudio', desc: 'Gravar ou enviar do celular', href: '/transcrever-culto', icon: Mic },
];

function NavigationInner() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { user, signOut } = useAuth();
    const [maisAberto, setMaisAberto] = useState(false);
    const fecharRef = useRef<HTMLButtonElement>(null);
    const navInferiorRef = useRef<HTMLElement>(null);
    const navVisivel = !!user && !pathname?.startsWith('/login');

    // Informa a altura real da barra inferior (--altura-nav-inferior) para que
    // painéis de tela cheia, como o de Salvos, terminem logo acima dela.
    useEffect(() => {
        const nav = navInferiorRef.current;
        const raiz = document.documentElement;
        if (!navVisivel || !nav) return;
        const atualizar = () => raiz.style.setProperty('--altura-nav-inferior', `${nav.offsetHeight}px`);
        atualizar();
        if (typeof ResizeObserver === 'undefined') return () => raiz.style.removeProperty('--altura-nav-inferior');
        const observador = new ResizeObserver(atualizar);
        observador.observe(nav);
        return () => {
            observador.disconnect();
            raiz.style.removeProperty('--altura-nav-inferior');
        };
    }, [navVisivel]);

    // Menu aberto: foco no Fechar, Esc fecha e a página de trás não rola
    useEffect(() => {
        if (!maisAberto) return;
        fecharRef.current?.focus();
        const aoTeclar = (e: KeyboardEvent) => { if (e.key === 'Escape') setMaisAberto(false); };
        const overflowAntes = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        window.addEventListener('keydown', aoTeclar);
        return () => {
            window.removeEventListener('keydown', aoTeclar);
            document.body.style.overflow = overflowAntes;
        };
    }, [maisAberto]);

    // Sem navegação na tela de login (ou antes de logar)
    if (!navVisivel) return null;

    const navItems = [
        { name: 'Hoje', href: '/', icon: Home },
        { name: 'Bíblia', href: '/biblioteca', icon: BookOpen },
        { name: 'Salvos', href: '/biblioteca?salvos=1', icon: Bookmark },
        { name: 'Leitura', href: '/plano-de-leitura?ler=1', icon: Calendar },
    ];

    // "Bíblia" (/biblioteca) e "Salvos" (/biblioteca?salvos=1) compartilham a
    // mesma rota — só o parâmetro ?salvos=1 os diferencia. Como usePathname()
    // ignora a query, comparar só o caminho acende os dois juntos. Por isso o
    // destaque também leva o ?salvos em conta.
    const isSalvos = searchParams.get('salvos') === '1';
    const isItemActive = (href: string): boolean => {
        const [path, query] = href.split('?');
        if (path === '/biblioteca') {
            const querySalvos = new URLSearchParams(query || '').get('salvos') === '1';
            const naBiblioteca = pathname === '/biblioteca' || !!pathname?.startsWith('/biblioteca/');
            return naBiblioteca && querySalvos === isSalvos;
        }
        if (path === '/') return pathname === '/';
        return pathname === path || !!pathname?.startsWith(path);
    };
    // A página do plano e a leitura direta (?ler=1) têm o mesmo caminho: o item
    // "Estudar a leitura do dia" só conta como aberto no menu da página, e não
    // acende o "Mais" (quem acende é "Leitura").
    const naLeituraDireta = searchParams.get('ler') === '1';
    const itemMaisAtivo = (href: string): boolean => href === '/plano-de-leitura'
        ? pathname === href && !naLeituraDireta
        : pathname === href || !!pathname?.startsWith(`${href}/`);
    const maisAtivo = MAIS_ITENS.some(item => item.href !== '/plano-de-leitura' && itemMaisAtivo(item.href));
    const fecharMais = () => setMaisAberto(false);

    return (
        <>
            {/* Mobile Bottom Bar */}
            <nav ref={navInferiorRef} aria-label="Navegação principal" className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-surface-1/95 backdrop-blur-xl border-t border-slate-200/80 dark:border-border-subtle md:hidden shadow-[0_-1px_0_0_rgba(0,0,0,0.06)] dark:shadow-[0_-1px_0_0_rgba(255,255,255,0.04)]">
                <ul className="flex items-stretch justify-around px-1 pt-1.5 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                    {navItems.map((item) => {
                        const isActive = isItemActive(item.href);
                        return (
                            <li key={item.name} className="flex-1">
                                <Link
                                    href={item.href}
                                    aria-current={isActive ? "page" : undefined}
                                    className={`flex flex-col items-center justify-center w-full py-1.5 gap-1 rounded-xl transition-all duration-200
                                        ${isActive
                                            ? 'text-amber-600 dark:text-amber-400'
                                            : 'text-slate-600 dark:text-text-muted hover:text-slate-700 dark:hover:text-slate-300'
                                        }`}
                                >
                                    <div className={`relative p-1.5 rounded-xl transition-all duration-200
                                        ${isActive ? 'bg-amber-500/12 dark:bg-amber-500/15' : 'bg-transparent'}`}>
                                        <item.icon className={`w-5 h-5 transition-all duration-200 ${isActive ? 'stroke-[2.2]' : 'stroke-[1.8]'}`} />
                                        {isActive && (
                                            <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-amber-500 dark:bg-amber-400" />
                                        )}
                                    </div>
                                    <span className={`text-[11px] transition-all duration-200 ${isActive ? 'font-bold' : 'font-medium'}`}>
                                        {item.name}
                                    </span>
                                </Link>
                            </li>
                        );
                    })}
                    <li className="flex-1">
                        <button
                            type="button"
                            onClick={() => setMaisAberto(true)}
                            aria-label="Mais opções"
                            aria-haspopup="dialog"
                            aria-expanded={maisAberto}
                            className={`flex flex-col items-center justify-center w-full py-1.5 gap-1 rounded-xl transition-all duration-200
                                ${maisAtivo || maisAberto
                                    ? 'text-amber-600 dark:text-amber-400'
                                    : 'text-slate-600 dark:text-text-muted hover:text-slate-700 dark:hover:text-slate-300'
                                }`}
                        >
                            <div className={`relative p-1.5 rounded-xl transition-all duration-200 ${maisAtivo ? 'bg-amber-500/12 dark:bg-amber-500/15' : 'bg-transparent'}`}>
                                <LayoutGrid className={`w-5 h-5 ${maisAtivo ? 'stroke-[2.2]' : 'stroke-[1.8]'}`} />
                                {maisAtivo && (
                                    <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-amber-500 dark:bg-amber-400" />
                                )}
                            </div>
                            <span className={`text-[11px] ${maisAtivo ? 'font-bold' : 'font-medium'}`}>Mais</span>
                        </button>
                    </li>
                </ul>
            </nav>

            {/* Desktop Sidebar */}
            <nav aria-label="Navegação lateral" className="hidden md:flex flex-col fixed left-0 top-0 bottom-0 w-[88px] bg-white/95 dark:bg-surface-1/90 backdrop-blur-xl border-r border-slate-200/80 dark:border-border-subtle z-50 items-center py-7">
                {/* Logo */}
                <div className="w-11 h-11 rounded-2xl bg-amber-500 flex items-center justify-center text-amber-950 mb-10 select-none">
                    <BookOpen className="w-5 h-5" />
                </div>
                <ul className="flex flex-col gap-1 w-full px-3">
                    {navItems.map((item) => {
                        const isActive = isItemActive(item.href);
                        return (
                            <li key={item.name} className="w-full">
                                <Link
                                    href={item.href}
                                    aria-current={isActive ? "page" : undefined}
                                    className={`relative flex flex-col items-center justify-center w-full py-3.5 gap-1.5 rounded-2xl transition-all duration-200
                                        ${isActive
                                            ? 'text-amber-600 dark:text-amber-400 bg-amber-500/10 dark:bg-amber-500/12'
                                            : 'text-slate-600 dark:text-text-muted hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5'
                                        }`}
                                >
                                    {isActive && (
                                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-amber-500 dark:bg-amber-400" />
                                    )}
                                    <item.icon className={`w-5 h-5 transition-all duration-200 ${isActive ? 'stroke-[2.2]' : 'stroke-[1.8]'}`} />
                                    <span className={`text-[11px] transition-all duration-200 ${isActive ? 'font-bold' : 'font-medium'}`}>
                                        {item.name}
                                    </span>
                                </Link>
                            </li>
                        );
                    })}
                    <li className="w-full">
                        <button
                            type="button"
                            onClick={() => setMaisAberto(true)}
                            aria-label="Mais opções"
                            aria-haspopup="dialog"
                            aria-expanded={maisAberto}
                            className={`relative flex flex-col items-center justify-center w-full py-3.5 gap-1.5 rounded-2xl transition-all duration-200
                                ${maisAtivo
                                    ? 'text-amber-600 dark:text-amber-400 bg-amber-500/10 dark:bg-amber-500/12'
                                    : 'text-slate-600 dark:text-text-muted hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5'
                                }`}
                        >
                            {maisAtivo && (
                                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-amber-500 dark:bg-amber-400" />
                            )}
                            <LayoutGrid className={`w-5 h-5 ${maisAtivo ? 'stroke-[2.2]' : 'stroke-[1.8]'}`} />
                            <span className={`text-[11px] ${maisAtivo ? 'font-bold' : 'font-medium'}`}>Mais</span>
                        </button>
                    </li>
                </ul>

                {/* Sair (desktop) */}
                <button
                    onClick={signOut}
                    className="mt-auto flex flex-col items-center gap-1.5 py-3.5 px-3 rounded-2xl text-slate-600 dark:text-text-muted hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all duration-200 w-full"
                    title="Sair da conta"
                >
                    <LogOut className="w-5 h-5 stroke-[1.8]" />
                    <span className="text-[11px] font-medium">Sair</span>
                </button>
            </nav>

            {/* Painel "Mais" — folha inferior no celular, janela no computador */}
            {maisAberto && (
                <div className="fixed inset-0 z-[80] flex items-end md:items-center justify-center md:p-4">
                    <div className="absolute inset-0 bg-black/45 backdrop-blur-sm animate-in fade-in duration-150" onClick={fecharMais} aria-hidden="true" />
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-label="Mais opções"
                        className="relative w-full md:max-w-md bg-white dark:bg-surface-1 border-t md:border border-slate-200 dark:border-border-subtle rounded-t-3xl md:rounded-3xl shadow-2xl px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] animate-in slide-in-from-bottom-4 duration-200"
                    >
                        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-300 dark:bg-white/15 md:hidden" aria-hidden="true" />
                        <div className="flex items-center justify-between mb-3 px-1">
                            <p className="reading-serif text-lg font-semibold text-text-primary">Mais opções</p>
                            <button
                                ref={fecharRef}
                                type="button"
                                onClick={fecharMais}
                                aria-label="Fechar menu"
                                className="p-2 rounded-xl text-text-muted hover:text-text-primary hover:bg-slate-100 dark:hover:bg-surface-2 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <ul className="grid grid-cols-2 gap-2.5">
                            {MAIS_ITENS.map((item) => {
                                const ativo = itemMaisAtivo(item.href);
                                return (
                                    <li key={item.href}>
                                        <Link
                                            href={item.href}
                                            onClick={fecharMais}
                                            aria-current={ativo ? 'page' : undefined}
                                            className={`flex h-full min-h-[76px] flex-col justify-between gap-2 rounded-2xl border p-3 transition-colors active:scale-[0.98]
                                                ${ativo
                                                    ? 'border-amber-500/50 bg-amber-500/10'
                                                    : 'border-slate-200 dark:border-border-subtle bg-slate-50 dark:bg-surface-2/60 hover:border-amber-500/40'
                                                }`}
                                        >
                                            <item.icon className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                                            <span className="flex flex-col">
                                                <span className="text-sm font-semibold leading-tight text-text-primary">{item.name}</span>
                                                <span className="text-xs text-text-muted">{item.desc}</span>
                                            </span>
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>

                        <div className="mt-3 flex items-center gap-2.5">
                            <div className="flex flex-1 items-center justify-between rounded-2xl border border-slate-200 dark:border-border-subtle px-3 py-1.5">
                                <span className="text-sm font-medium text-text-secondary">Tema</span>
                                <ThemeToggle />
                            </div>
                            <button
                                type="button"
                                onClick={() => { fecharMais(); signOut(); }}
                                className="flex min-h-[52px] items-center gap-2 rounded-2xl border border-slate-200 dark:border-border-subtle px-4 text-sm font-semibold text-slate-600 dark:text-text-secondary hover:text-red-500 hover:border-red-400/50 transition-colors"
                            >
                                <LogOut className="w-4 h-4" /> Sair da conta
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
