'use client';

import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/Skeleton';

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
export function preloadRoute(route: 'biblioteca') {
    const preloaders: Record<string, () => void> = {
        biblioteca: () => import('@/app/biblioteca/page'),
    };

    preloaders[route]?.();
}
