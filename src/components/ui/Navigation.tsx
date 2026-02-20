'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, BookOpen, Sparkles, User } from 'lucide-react';

export function Navigation() {
    const pathname = usePathname();

    const navItems = [
        { name: 'Hoje', href: '/', icon: Home },
        { name: 'Bíblia', href: '/biblioteca', icon: BookOpen },
        { name: 'Inspiração', href: '/devocional-externo', icon: Sparkles },
        { name: 'Diário', href: '/historico', icon: User },
    ];

    return (
        <>
            {/* Mobile Bottom Bar */}
            <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/90 dark:bg-surface-1/80 backdrop-blur-xl border-t border-slate-200 dark:border-border-subtle md:hidden pb-2 shadow-[0_-4px_24px_rgba(0,0,0,0.05)] dark:shadow-[0_-4px_24px_rgba(0,0,0,0.1)]">
                <ul className="flex items-center justify-around p-2">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href || (item.href !== '/' && pathname?.startsWith(item.href));
                        return (
                            <li key={item.name} className="flex-1">
                                <Link
                                    href={item.href}
                                    className={`flex flex-col items-center justify-center w-full py-2 gap-1 rounded-xl transition-all ${isActive ? 'text-amber-600 dark:text-amber-500' : 'text-slate-500 hover:text-slate-800 dark:text-text-muted dark:hover:text-text-secondary'
                                        }`}
                                >
                                    <div className={`p-1.5 rounded-lg transition-colors ${isActive ? 'bg-amber-500/10' : ''}`}>
                                        <item.icon className={`w-5 h-5 ${isActive ? 'fill-amber-500/20' : ''}`} />
                                    </div>
                                    <span className="text-[10px] font-medium">{item.name}</span>
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            </nav>

            {/* Desktop Sidebar */}
            <nav className="hidden md:flex flex-col fixed left-0 top-0 bottom-0 w-24 bg-white/90 dark:bg-surface-1/80 backdrop-blur-xl border-r border-slate-200 dark:border-border-subtle z-50 items-center py-8">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold mb-12 shadow-lg shadow-amber-500/20">
                    PVC
                </div>
                <ul className="flex flex-col gap-6 w-full px-4">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href || (item.href !== '/' && pathname?.startsWith(item.href));
                        return (
                            <li key={item.name} className="w-full">
                                <Link
                                    href={item.href}
                                    className={`flex flex-col items-center justify-center w-full py-4 gap-2 rounded-2xl transition-all ${isActive ? 'text-amber-600 dark:text-amber-500 bg-amber-500/10 shadow-inner' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-text-muted dark:hover:text-text-secondary dark:hover:bg-surface-2'
                                        }`}
                                >
                                    <item.icon className={`w-6 h-6 ${isActive ? 'fill-amber-500/20' : ''}`} />
                                    <span className="text-[11px] font-medium">{item.name}</span>
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            </nav>
        </>
    );
}
