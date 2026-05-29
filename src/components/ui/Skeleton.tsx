interface SkeletonProps {
    className?: string;
    shimmer?: boolean;
}

export function Skeleton({ className = '', shimmer = false }: SkeletonProps) {
    return (
        <div
            className={`${shimmer ? 'skeleton-shimmer' : 'animate-pulse'} bg-white/5 dark:bg-white/5 bg-slate-200/60 rounded-lg ${className}`}
            aria-hidden="true"
        />
    );
}

export function CardSkeleton() {
    return (
        <div className="relative h-full w-full p-6 lg:p-8 rounded-3xl glass-card border border-white/5">
            <div className="space-y-4">
                <div className="flex justify-between items-start">
                    <Skeleton shimmer className="h-16 w-16 rounded-2xl" />
                    <Skeleton shimmer className="h-6 w-20 rounded-full" />
                </div>
                <Skeleton shimmer className="h-8 w-3/4" />
                <Skeleton shimmer className="h-4 w-full" />
                <Skeleton shimmer className="h-4 w-2/3" />
                <div className="pt-4 mt-4 border-t border-white/5">
                    <div className="flex justify-between items-center">
                        <Skeleton shimmer className="h-4 w-16" />
                        <Skeleton shimmer className="h-8 w-8 rounded-full" />
                    </div>
                </div>
            </div>
        </div>
    );
}

export function TextSkeleton({ lines = 3 }: { lines?: number }) {
    return (
        <div className="space-y-2">
            {Array.from({ length: lines }).map((_, i) => (
                <Skeleton
                    key={i}
                    className={`h-4 ${i === lines - 1 ? 'w-2/3' : 'w-full'}`}
                />
            ))}
        </div>
    );
}

export function HeroSkeleton() {
    return (
        <div className="flex flex-col items-center w-full max-w-2xl mx-auto">
            <Skeleton shimmer className="h-6 w-48 mb-8 rounded-full" />
            <Skeleton shimmer className="h-16 w-full mb-4" />
            <Skeleton shimmer className="h-10 w-3/4" />
        </div>
    );
}
