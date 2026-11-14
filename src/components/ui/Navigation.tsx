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
import { MarcaBiblia } from '@/components/ui/MarcaBiblia';

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
            {/* Barra de baixo (celular). 14/11/2026: fundo liso da própria
                página (sem vidro fosco); o item aberto fica mais claro e ganha
                um traço de ouro na borda de cima, como um marcador. */}
            <nav ref={navInferiorRef} aria-label="Navegação principal" className="fixed bottom-0 left-0 right-0 z-50 border-t border-border-subtle bg-surface-0 md:hidden">
                <ul className="flex items-stretch justify-around px-1 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
                    {navItems.map((item) => {
                        const isActive = isItemActive(item.href);
                        return (
                            <li key={item.name} className="flex-1">
                                <Link
                                    href={item.href}
                                    aria-current={isActive ? "page" : undefined}
                                    className={`relative flex w-full flex-col items-center justify-center gap-1 pb-1 pt-2.5 transition-colors duration-200 active:scale-95
                                        ${isActive ? 'text-text-primary' : 'text-text-muted hover:text-text-secondary'}`}
                                >
                                    {isActive && <span className="absolute -top-px left-1/2 h-[2px] w-8 -translate-x-1/2 rounded-full bg-amber-500" aria-hidden="true" />}
                                    <item.icon className={`h-[22px] w-[22px] ${isActive ? 'stroke-[2.1]' : 'stroke-[1.7]'}`} />
                                    <span className={`text-[11px] ${isActive ? 'font-semibold' : 'font-medium'}`}>
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
                            className={`relative flex w-full flex-col items-center justify-center gap-1 pb-1 pt-2.5 transition-colors duration-200 active:scale-95
                                ${maisAtivo || maisAberto ? 'text-text-primary' : 'text-text-muted hover:text-text-secondary'}`}
                        >
                            {maisAtivo && <span className="absolute -top-px left-1/2 h-[2px] w-8 -translate-x-1/2 rounded-full bg-amber-500" aria-hidden="true" />}
                            <LayoutGrid className={`h-[22px] w-[22px] ${maisAtivo ? 'stroke-[2.1]' : 'stroke-[1.7]'}`} />
                            <span className={`text-[11px] ${maisAtivo ? 'font-semibold' : 'font-medium'}`}>Mais</span>
                        </button>
                    </li>
                </ul>
            </nav>

            {/* Barra lateral (computador): o mesmo fundo da página, separada
                por uma linha; o item aberto é um degrau mais claro. */}
            <nav aria-label="Navegação lateral" className="fixed bottom-0 left-0 top-0 z-50 hidden w-[88px] flex-col items-center border-r border-border-subtle bg-surface-0 py-7 md:flex">
                <div className="mb-9 select-none">
                    <MarcaBiblia className="h-9 w-9" />
                </div>
                <ul className="flex w-full flex-col gap-1 px-3">
                    {navItems.map((item) => {
                        const isActive = isItemActive(item.href);
                        return (
                            <li key={item.name} className="w-full">
                                <Link
                                    href={item.href}
                                    aria-current={isActive ? "page" : undefined}
                                    className={`relative flex w-full flex-col items-center justify-center gap-1.5 rounded-2xl py-3.5 transition-colors duration-200
                                        ${isActive ? 'bg-surface-2 text-text-primary' : 'text-text-muted hover:bg-surface-1 hover:text-text-primary'}`}
                                >
                                    {isActive && (
                                        <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-amber-500" aria-hidden="true" />
                                    )}
                                    <item.icon className={`h-5 w-5 ${isActive ? 'stroke-[2.1]' : 'stroke-[1.7]'}`} />
                                    <span className={`text-[11px] ${isActive ? 'font-semibold' : 'font-medium'}`}>
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
                            className={`relative flex w-full flex-col items-center justify-center gap-1.5 rounded-2xl py-3.5 transition-colors duration-200
                                ${maisAtivo ? 'bg-surface-2 text-text-primary' : 'text-text-muted hover:bg-surface-1 hover:text-text-primary'}`}
                        >
                            {maisAtivo && (
                                <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-amber-500" aria-hidden="true" />
                            )}
                            <LayoutGrid className={`h-5 w-5 ${maisAtivo ? 'stroke-[2.1]' : 'stroke-[1.7]'}`} />
                            <span className={`text-[11px] ${maisAtivo ? 'font-semibold' : 'font-medium'}`}>Mais</span>
                        </button>
                    </li>
                </ul>

                {/* Sair (computador) */}
                <button
                    onClick={signOut}
                    className="mt-auto flex w-full flex-col items-center gap-1.5 rounded-2xl px-3 py-3.5 text-text-muted transition-colors duration-200 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                    title="Sair da conta"
                >
                    <LogOut className="h-5 w-5 stroke-[1.8]" />
                    <span className="text-[11px] font-medium">Sair</span>
                </button>
            </nav>

            {/* Painel "Mais" — folha inferior no celular, janela no computador */}
            {maisAberto && (
                <div className="fixed inset-0 z-[80] flex items-end md:items-center justify-center md:p-4">
                    <div className="absolute inset-0 bg-black/60 animate-[fadeIn_0.15s_ease-out]" onClick={fecharMais} aria-hidden="true" />
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-label="Mais opções"
                        className="relative w-full md:max-w-md bg-surface-1 rounded-t-[28px] md:rounded-[28px] shadow-2xl px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] animate-[slideUp_0.22s_cubic-bezier(0.2,0.8,0.2,1)]"
                    >
                        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border-strong md:hidden" aria-hidden="true" />
                        <div className="flex items-center justify-between mb-3 px-1">
                            <p className="reading-serif text-[1.25rem] font-medium text-text-primary">Mais opções</p>
                            <button
                                ref={fecharRef}
                                type="button"
                                onClick={fecharMais}
                                aria-label="Fechar menu"
                                className="flex h-11 w-11 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-surface-2 hover:text-text-primary"
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
                                            className={`flex h-full min-h-[84px] flex-col justify-between gap-2 rounded-2xl p-3.5 transition-[background-color,transform] active:scale-[0.97]
                                                ${ativo
                                                    ? 'bg-amber-500/15'
                                                    : 'bg-surface-0 hover:bg-surface-2 dark:bg-surface-2 dark:hover:bg-border-strong/60'
                                                }`}
                                        >
                                            <item.icon className="h-[22px] w-[22px] text-amber-700 dark:text-amber-400" />
                                            <span className="flex flex-col">
                                                <span className="text-sm font-semibold leading-tight text-text-primary">{item.name}</span>
                                                <span className="mt-0.5 text-xs text-text-muted">{item.desc}</span>
                                            </span>
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>

                        <div className="mt-3 flex items-center gap-2.5">
                            <div className="flex flex-1 items-center justify-between rounded-2xl bg-surface-0 px-3.5 py-1.5 dark:bg-surface-2">
                                <span className="text-sm font-medium text-text-secondary">Tema</span>
                                <ThemeToggle discreto />
                            </div>
                            <button
                                type="button"
                                onClick={() => { fecharMais(); signOut(); }}
                                className="flex min-h-[56px] items-center gap-2 rounded-2xl bg-surface-0 px-4 text-sm font-semibold text-text-secondary transition-colors hover:text-red-500 dark:bg-surface-2"
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
