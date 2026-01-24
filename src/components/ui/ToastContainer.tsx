'use client';

import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/useToast';

const icons = {
    success: CheckCircle,
    error: AlertCircle,
    info: Info,
    warning: AlertTriangle,
};

const colors = {
    success: 'bg-green-500/20 border-green-500/30 text-green-400',
    error: 'bg-red-500/20 border-red-500/30 text-red-400',
    info: 'bg-blue-500/20 border-blue-500/30 text-blue-400',
    warning: 'bg-amber-500/20 border-amber-500/30 text-amber-400',
};

interface ToastContainerProps {
    toasts: ReturnType<typeof useToast>['toasts'];
    removeToast: (id: string) => void;
}

export function ToastContainer({ toasts, removeToast }: ToastContainerProps) {
    if (toasts.length === 0) return null;

    return (
        <div className="fixed bottom-4 right-4 z-50 space-y-2 max-w-sm">
            {toasts.map((toast) => {
                const Icon = icons[toast.type];

                return (
                    <div
                        key={toast.id}
                        className={`
              flex items-center gap-3 p-4 rounded-xl border backdrop-blur-xl
              animate-slide-up shadow-lg
              ${colors[toast.type]}
            `}
                    >
                        <Icon className="w-5 h-5 shrink-0" />
                        <p className="text-sm font-medium flex-1">{toast.message}</p>
                        <button
                            onClick={() => removeToast(toast.id)}
                            className="p-1 hover:bg-white/10 rounded-full transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                );
            })}
        </div>
    );
}
