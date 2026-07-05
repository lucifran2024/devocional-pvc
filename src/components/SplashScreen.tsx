'use client';

import { useState, useEffect } from 'react';
import { BookOpen } from 'lucide-react';

export function SplashScreen() {
    const [isVisible, setIsVisible] = useState(true);
    const [isAnimating, setIsAnimating] = useState(false);

    useEffect(() => {
        // Start animation after a brief delay
        const timer = setTimeout(() => {
            setIsAnimating(true);
        }, 500);

        // Hide splash screen after animation
        const hideTimer = setTimeout(() => {
            setIsVisible(false);
        }, 2000);

        return () => {
            clearTimeout(timer);
            clearTimeout(hideTimer);
        };
    }, []);

    if (!isVisible) return null;

    return (
        <div
            className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#14110d] transition-opacity duration-500 ${
                isAnimating ? 'opacity-0' : 'opacity-100'
            }`}
        >
            {/* Background gradient */}
            <div className="absolute inset-0 bg-gradient-to-b from-amber-500/10 via-transparent to-transparent" />
            
            {/* Logo container */}
            <div className="relative z-10 flex flex-col items-center gap-6">
                {/* Animated logo */}
                <div className="relative">
                    <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-amber-400 via-amber-500 to-orange-500 flex items-center justify-center shadow-2xl shadow-amber-500/30 animate-pulse">
                        <BookOpen className="w-9 h-9 text-white" strokeWidth={2.2} />
                    </div>
                    
                    {/* Glow effect */}
                    <div className="absolute inset-0 w-20 h-20 rounded-3xl bg-amber-500/30 blur-xl animate-pulse" />
                </div>

                {/* App name */}
                <div className="text-center">
                    <h1 className="reading-serif text-3xl font-semibold text-white mb-2">Bíblia</h1>
                    <p className="text-sm text-slate-400">Sua jornada espiritual diária</p>
                </div>

                {/* Loading indicator */}
                <div className="flex gap-1.5 mt-4">
                    <div className="w-2 h-2 rounded-full bg-amber-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 rounded-full bg-amber-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 rounded-full bg-amber-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
            </div>
        </div>
    );
}
