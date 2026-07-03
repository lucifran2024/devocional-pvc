'use client';

import { useState, useCallback } from 'react';
import { RefreshCw, BookOpen, Copy, Check } from 'lucide-react';
import { VERSES, getDailyVerseIndex } from '@/lib/daily-verse';

export function RandomVerse() {
    const [verseIndex, setVerseIndex] = useState(() => getDailyVerseIndex());
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [copied, setCopied] = useState(false);

    const verse = VERSES[verseIndex];

    const handleCopy = useCallback(() => {
        const texto = `📖 *VERSÍCULO DO DIA*\n\n"${verse.text}"\n— ${verse.ref}\n\n📲 _Devocional PVC_`;
        navigator.clipboard.writeText(texto);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }, [verse]);

    const handleRefresh = useCallback(() => {
        setIsRefreshing(true);
        // Escolhe um versículo diferente do atual
        let next = verseIndex;
        while (next === verseIndex) {
            next = Math.floor(Math.random() * VERSES.length);
        }
        setVerseIndex(next);
        setTimeout(() => setIsRefreshing(false), 400);
    }, [verseIndex]);

    return (
        <div className="w-full max-w-2xl mx-auto mt-8">
            <div className="relative glass-panel rounded-2xl p-6 border border-amber-500/10 hover:border-amber-500/20 transition-all group">
                {/* Brilho sutil */}
                <div className="absolute top-0 left-0 w-[200px] h-[200px] bg-amber-500/[0.03] rounded-full blur-[60px] -ml-10 -mt-10 pointer-events-none" />

                <div className="relative z-10">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <BookOpen className="w-4 h-4 text-amber-500/70" />
                            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-muted">
                                Versículo do Dia
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleCopy}
                                className={`p-1.5 rounded-lg transition-all ${
                                    copied
                                        ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10'
                                        : 'text-text-muted hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-500/10'
                                }`}
                                title="Copiar versículo"
                            >
                                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                            <button
                                onClick={handleRefresh}
                                disabled={isRefreshing}
                                className="p-1.5 rounded-lg hover:bg-amber-500/10 text-text-muted hover:text-amber-500 transition-all"
                                title="Sortear outro versículo"
                            >
                                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                            </button>
                        </div>
                    </div>

                    {/* Versículo */}
                    <blockquote className="reading-serif text-lg md:text-xl font-medium text-text-primary leading-relaxed mb-3 italic">
                        &ldquo;{verse.text}&rdquo;
                    </blockquote>

                    {/* Referência */}
                    <cite className="text-xs font-bold text-amber-500/80 tracking-wide not-italic">
                        — {verse.ref}
                    </cite>
                </div>
            </div>
        </div>
    );
}
