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
        <div className={`relative min-h-screen bg-[#020617] text-slate-100 overflow-x-hidden ${className}`}>

            {/* 1. Divine Gradient Background (Base) - SINGLE TONE */}
            <div className="absolute inset-0 bg-[#020617] z-0 pointer-events-none"></div>

            {/* 2. Stardust Pattern Overlay */}
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-[0.03] mix-blend-screen z-0 pointer-events-none"></div>

            {/* 3. Noise Texture */}
            <div className="absolute inset-0 noise-overlay z-0 pointer-events-none"></div>

            {/* 4. Glow Effects (Orbs) */}
            {showOrbs && (
                <div className="absolute inset-0 overflow-hidden z-0 pointer-events-none">
                    <div className="absolute top-[-15%] right-[-10%] w-[800px] h-[800px] bg-amber-500/[0.03] blur-[140px] rounded-full mix-blend-screen animate-pulse-slow"></div>
                    <div className="absolute top-[20%] left-[-15%] w-[600px] h-[600px] bg-blue-500/[0.05] blur-[120px] rounded-full mix-blend-screen animate-pulse-slow delay-700"></div>
                    <div className="absolute bottom-[-10%] right-[10%] w-[500px] h-[500px] bg-purple-500/[0.03] blur-[100px] rounded-full mix-blend-screen animate-pulse-slow delay-1000"></div>
                </div>
            )}

            {/* 5. Main Content Content Container */}
            <div className="relative z-10 w-full min-h-screen flex flex-col">
                {children}
            </div>
        </div>
    );
}
