'use client';

import dynamic from 'next/dynamic';
import { Skeleton, CardSkeleton } from '@/components/ui/Skeleton';

/**
 * Lazy-loaded components for better initial page load
 * These components are loaded on demand when needed
 */

// Heavy components that benefit from lazy loading
export const LazyShareButton = dynamic(
    () => import('@/components/ui/ShareButton').then(mod => ({ default: mod.ShareButton })),
    {
        loading: () => <Skeleton className="h-10 w-28 rounded-full" />,
        ssr: false
    }
);

export const LazyNotificationManager = dynamic(
    () => import('@/components/NotificationManager').then(mod => ({ default: mod.NotificationManager })),
    {
        loading: () => null,
        ssr: false
    }
);

export const LazyErrorBoundary = dynamic(
    () => import('@/components/ui/ErrorBoundary').then(mod => ({ default: mod.ErrorBoundary })),
    {
        ssr: false
    }
);

// Page-level lazy loading
export const LazyHistoricoContent = dynamic(
    () => import('@/app/historico/page').then(mod => ({ default: mod.default })),
    {
        loading: () => (
            <div className="grid gap-4">
                {[1, 2, 3].map(i => <CardSkeleton key={i} />)}
            </div>
        )
    }
);

export const LazyBibliotecaContent = dynamic(
    () => import('@/app/biblioteca/page').then(mod => ({ default: mod.default })),
    {
        loading: () => (
            <div className="space-y-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-96 w-full" />
            </div>
        )
    }
);

/**
 * Preload hint for critical routes
 * Call this on hover over navigation links
 */
export function preloadRoute(route: 'gerador' | 'historico' | 'biblioteca' | 'chat') {
    const preloaders: Record<string, () => void> = {
        gerador: () => import('@/app/gerador/page'),
        historico: () => import('@/app/historico/page'),
        biblioteca: () => import('@/app/biblioteca/page'),
        chat: () => import('@/app/chat/page'),
    };

    preloaders[route]?.();
}
