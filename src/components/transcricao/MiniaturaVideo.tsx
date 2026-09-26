'use client';

import { useState } from 'react';
import { Youtube } from 'lucide-react';
import { extrairIdYoutube, miniaturaYoutube } from '@/lib/transcricao-apresentacao';

// Capa do vídeo do YouTube; sem link reconhecido (ou sem capa), mostra o ícone.
export function MiniaturaVideo({ fonteUrl, className = '' }: { fonteUrl?: string | null; className?: string }) {
    const id = extrairIdYoutube(fonteUrl);
    const [falhouId, setFalhouId] = useState<string | null>(null);

    return (
        <div className={`relative overflow-hidden rounded-xl border border-border-subtle bg-surface-2 ${className}`} aria-hidden="true">
            {id && falhouId !== id ? (
                // eslint-disable-next-line @next/next/no-img-element -- capa pequena do YouTube, sem passar pelo otimizador
                <img
                    src={miniaturaYoutube(id)}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    referrerPolicy="no-referrer"
                    onError={() => setFalhouId(id)}
                    className="absolute inset-0 h-full w-full object-cover"
                />
            ) : (
                <div className="absolute inset-0 flex items-center justify-center text-amber-600/70 dark:text-amber-400/70">
                    <Youtube className="h-6 w-6" />
                </div>
            )}
        </div>
    );
}
