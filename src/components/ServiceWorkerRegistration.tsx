'use client';

import { useEffect } from 'react';

export function ServiceWorkerRegistration() {
    useEffect(() => {
        if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
            navigator.serviceWorker
                .register('/sw.js')
                .then((registration) => {
                    console.log('SW registered:', registration.scope);
                    // Busca atualização do SW a cada carga (garante que correções
                    // de cache cheguem aos usuários sem reinstalar o PWA)
                    registration.update().catch(() => { });
                })
                .catch((error) => {
                    console.error('SW registration failed:', error);
                });
        }
    }, []);

    return null;
}
