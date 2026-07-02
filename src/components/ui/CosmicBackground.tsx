import React from 'react';

interface CosmicBackgroundProps {
    children: React.ReactNode;
    className?: string;
    showOrbs?: boolean;
}

export function CosmicBackground({
    children,
    className = '',
    showOrbs = true
}: CosmicBackgroundProps) {
    return (
        <div className={`relative min-h-screen bg-slate-50 dark:bg-transparent text-slate-900 dark:text-text-primary overflow-x-hidden ${className}`}>

            {/* 1. Divine Gradient Background (Base) - SINGLE TONE */}
            <div className="absolute inset-0 bg-transparent z-0 pointer-events-none"></div>

            {/* 2. Grain sutil (local, sem dependência externa) */}
            <div className="absolute inset-0 grain-overlay z-0 pointer-events-none"></div>

            {/* 4. Glow Effects (Orbs) - REMOVED FOR CLEAN LOOK */}
            {showOrbs && (
                <div className="absolute inset-0 overflow-hidden z-0 pointer-events-none">
                    {/* Keep only subtle gold hint if needed, or remove all for deep black */}
                    <div className="absolute top-[-15%] right-[-10%] w-[800px] h-[800px] bg-amber-500/[0.02] blur-[140px] rounded-full mix-blend-multiply dark:mix-blend-screen animate-pulse-slow"></div>
                </div>
            )}

            {/* 5. Main Content Content Container */}
            <div className="relative z-10 w-full min-h-screen flex flex-col">
                {children}
            </div>
        </div>
    );
}
