import React from 'react';

interface CosmicHeaderProps {
    children: React.ReactNode;
    height?: 'standard' | 'large' | 'auto';
    variant?: 'hero' | 'navbar';
    sticky?: boolean;
    className?: string;
}

export function CosmicHeader({
    children,
    height = 'auto',
    variant = 'hero',
    sticky = false,
    className = ''
}: CosmicHeaderProps) {

    const heightClasses = {
        standard: 'pb-24 md:pb-32',
        large: 'pb-32 md:pb-48',
        auto: 'py-8 md:py-12'
    };

    const variantStyles = {
        hero: heightClasses[height],
        navbar: 'h-16 flex items-center border-b border-slate-200 dark:border-border-subtle'
    };

    const positionStyles = sticky ? 'sticky top-0 z-50' : 'relative z-10';

    return (
        <header className={`${positionStyles} bg-white dark:bg-surface-0 text-slate-900 dark:text-text-primary overflow-hidden transition-all duration-300 ${variantStyles[variant]} ${className}`}>

            {/* Divine Gradient Background - SINGLE TONE */}
            <div className={`absolute inset-0 bg-white dark:bg-surface-0 ${variant === 'navbar' ? 'opacity-100' : 'opacity-100'}`}></div>

            {/* Grain sutil (local, sem dependência externa) */}
            <div className="absolute inset-0 grain-overlay"></div>

            {/* Subtle Bottom Glow Border */}
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border-subtle to-transparent"></div>


            {/* Content Container */}
            <div className={`relative z-10 w-full ${variant === 'navbar' ? 'h-full' : ''}`}>
                {children}
            </div>
        </header>
    );
}
