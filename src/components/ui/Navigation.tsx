'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, BookOpen, Bookmark, Calendar, LogOut } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';

export function Navigation() {
    const pathname = usePathname();
    const { user, signOut } = useAuth();

    // Sem navegação na tela de login (ou antes de logar)
    if (!user || pathname?.startsWith('/login')) return null;

    const navItems = [
        { name: 'Hoje', href: '/', icon: Home },
        { name: 'Bíblia', href: '/biblioteca', icon: BookOpen },
        { name: 'Salvos', href: '/biblioteca?salvos=1', icon: Bookmark },
        { name: 'Leitura', href: '/plano-de-leitura?ler=1', icon: Calendar },
    ];

    return (
        <>
            {/* Mobile Bottom Bar */}
            <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-surface-1/95 backdrop-blur-xl border-t border-slate-200/80 dark:border-border-subtle md:hidden shadow-[0_-1px_0_0_rgba(0,0,0,0.06)] dark:shadow-[0_-1px_0_0_rgba(255,255,255,0.04)]">
                <ul className="flex items-stretch justify-around px-2 pt-1.5 pb-3">
                    {navItems.map((item) => {
                        const hrefPath = item.href.split('?')[0];
                        const isActive = pathname === hrefPath || (hrefPath !== '/' && pathname?.startsWith(hrefPath));
                        return (
                            <li key={item.name} className="flex-1">
                                <Link
                                    href={item.href}
                                    className={`flex flex-col items-center justify-center w-full py-1.5 gap-1 rounded-xl transition-all duration-200
                                        ${isActive
                                            ? 'text-amber-600 dark:text-amber-400'
                                            : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                        }`}
                                >
                                    <div className={`relative p-1.5 rounded-xl transition-all duration-200
                                        ${isActive ? 'bg-amber-500/12 dark:bg-amber-500/15' : 'bg-transparent'}`}>
                                        <item.icon className={`w-5 h-5 transition-all duration-200 ${isActive ? 'stroke-[2.2]' : 'stroke-[1.8]'}`} />
                                        {isActive && (
                                            <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-amber-500 dark:bg-amber-400" />
                                        )}
                                    </div>
                                    <span className={`text-[10px] transition-all duration-200 ${isActive ? 'font-bold' : 'font-medium'}`}>
                                        {item.name}
                                    </span>
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            </nav>

            {/* Desktop Sidebar */}
            <nav className="hidden md:flex flex-col fixed left-0 top-0 bottom-0 w-[88px] bg-white/95 dark:bg-surface-1/90 backdrop-blur-xl border-r border-slate-200/80 dark:border-border-subtle z-50 items-center py-7">
                {/* Logo */}
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-orange-500 flex items-center justify-center text-white text-xs font-black mb-10 shadow-lg shadow-amber-500/30 tracking-wider select-none">
                    PVC
                </div>
                <ul className="flex flex-col gap-1 w-full px-3">
                    {navItems.map((item) => {
                        const hrefPath = item.href.split('?')[0];
                        const isActive = pathname === hrefPath || (hrefPath !== '/' && pathname?.startsWith(hrefPath));
                        return (
                            <li key={item.name} className="w-full">
                                <Link
                                    href={item.href}
                                    className={`relative flex flex-col items-center justify-center w-full py-3.5 gap-1.5 rounded-2xl transition-all duration-200
                                        ${isActive
                                            ? 'text-amber-600 dark:text-amber-400 bg-amber-500/10 dark:bg-amber-500/12'
                                            : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5'
                                        }`}
                                >
                                    {isActive && (
                                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-amber-500 dark:bg-amber-400" />
                                    )}
                                    <item.icon className={`w-5 h-5 transition-all duration-200 ${isActive ? 'stroke-[2.2]' : 'stroke-[1.8]'}`} />
                                    <span className={`text-[10px] transition-all duration-200 ${isActive ? 'font-bold' : 'font-medium'}`}>
                                        {item.name}
                                    </span>
                                </Link>
                            </li>
                        );
                    })}
                </ul>

                {/* Sair (desktop) */}
                <button
                    onClick={signOut}
                    className="mt-auto flex flex-col items-center gap-1.5 py-3.5 px-3 rounded-2xl text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all duration-200 w-full"
                    title="Sair da conta"
                >
                    <LogOut className="w-5 h-5 stroke-[1.8]" />
                    <span className="text-[10px] font-medium">Sair</span>
                </button>
            </nav>
        </>
    );
}
