'use client';

import { useEffect, useState } from 'react';
import { Bell, BellOff, X } from 'lucide-react';

interface NotificationManagerProps {
    onPermissionChange?: (granted: boolean) => void;
}

export function NotificationManager({ onPermissionChange }: NotificationManagerProps) {
    const [permission, setPermission] = useState<NotificationPermission>('default');
    const [showBanner, setShowBanner] = useState(false);

    useEffect(() => {
        if ('Notification' in window) {
            setPermission(Notification.permission);

            if (Notification.permission === 'granted') {
                // Permissao ja ativa — registra subscription automaticamente
                // (necessario quando a chave VAPID mudou ou subscription expirou).
                // Adiado alguns segundos para não disputar a rede com a abertura.
                const timer = setTimeout(() => registerPushSubscription(), 4000);
                return () => clearTimeout(timer);
            } else if (Notification.permission === 'default') {
                // Show banner if permission not yet decided
                const timer = setTimeout(() => setShowBanner(true), 5000);
                return () => clearTimeout(timer);
            }
        }
    }, []);

    const requestPermission = async () => {
        if (!('Notification' in window)) {
            console.log('Notifications not supported');
            return;
        }

        try {
            const result = await Notification.requestPermission();
            setPermission(result);
            setShowBanner(false);
            onPermissionChange?.(result === 'granted');

            if (result === 'granted') {
                // Subscribe to push notifications
                registerPushSubscription();
            }
        } catch (err) {
            console.error('Error requesting notification permission:', err);
        }
    };

    const registerPushSubscription = async () => {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
            console.log('Push not supported');
            return;
        }

        try {
            const registration = await navigator.serviceWorker.ready;
            console.log('SW ready, registrando push...');

            // Chave pública VAPID
            const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 'BOl_RIst7Fkgnn5VGKOTAxP6jniHuG9t2JA4GKmmdBz6TSDtv0phLxQYP-NqNhkXoNaoQE49D3nRoUxelGX3a-k';

            // Converter base64url para Uint8Array (necessario para Web Push API)
            const urlBase64ToUint8Array = (base64String: string) => {
                const padding = '='.repeat((4 - base64String.length % 4) % 4);
                const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
                const rawData = window.atob(base64);
                const outputArray = new Uint8Array(rawData.length);
                for (let i = 0; i < rawData.length; ++i) {
                    outputArray[i] = rawData.charCodeAt(i);
                }
                return outputArray;
            };

            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
            });

            console.log('Push subscription:', subscription);

            // Salvar no Supabase
            const { supabase } = await import('@/lib/supabase');

            const subJson = JSON.parse(JSON.stringify(subscription));
            const endpoint = subJson.endpoint;

            // Verifica se ja existe para nao duplicar
            const { data: existing } = await supabase
                .from('push_subscriptions')
                .select('id')
                .eq('endpoint', endpoint)
                .limit(1);

            if (existing && existing.length > 0) {
                // Atualiza subscription existente (pode ter mudado)
                await supabase
                    .from('push_subscriptions')
                    .update({ subscription_json: subJson, updated_at: new Date().toISOString() })
                    .eq('id', existing[0].id);
                console.log('✅ Subscription atualizada');
            } else {
                // Insere nova
                const { error } = await supabase
                    .from('push_subscriptions')
                    .insert({
                        endpoint,
                        subscription_json: subJson,
                        updated_at: new Date().toISOString()
                    });
                if (error) {
                    console.warn('Erro ao salvar push:', error);
                } else {
                    console.log('✅ Notificações ativadas com sucesso!');
                }
            }

        } catch (err) {
            console.error('Push subscription failed:', err);
        }
    };

    const dismissBanner = () => {
        setShowBanner(false);
    };

    if (!showBanner) return null;

    return (
        // 14/11/2026: cartão liso nas cores do app (era cinza-azulado translúcido,
        // que deixava o texto de trás aparecer e, no tema claro, o título escuro
        // sobre fundo escuro). Botões com 44 px de toque.
        <div className="fixed bottom-[calc(var(--altura-nav-inferior,5.5rem)+0.75rem)] md:bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-[60] animate-slide-up">
            <div className="relative rounded-[22px] border border-border-subtle bg-surface-1 p-4 pr-12 shadow-xl dark:border-transparent dark:bg-surface-2">
                <button
                    onClick={dismissBanner}
                    className="absolute right-1 top-1 flex h-11 w-11 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-surface-2 hover:text-text-primary"
                    aria-label="Fechar"
                >
                    <X className="h-4 w-4" />
                </button>

                <div className="flex items-start gap-3">
                    <Bell className="mt-0.5 h-5 w-5 shrink-0 text-amber-700 dark:text-amber-400" aria-hidden="true" />

                    <div className="min-w-0 flex-1">
                        <h3 className="text-base font-semibold leading-snug text-text-primary">Lembrete da leitura</h3>
                        <p className="mb-3 mt-0.5 text-sm leading-snug text-text-secondary">
                            Receba um aviso por dia para a sua leitura bíblica.
                        </p>

                        <div className="flex gap-2">
                            <button
                                onClick={requestPermission}
                                className="inline-flex h-11 items-center rounded-full bg-campo px-5 text-sm font-semibold text-campo-texto transition-opacity hover:opacity-90"
                            >
                                Ativar
                            </button>
                            <button
                                onClick={dismissBanner}
                                className="inline-flex h-11 items-center rounded-full bg-surface-2 px-5 text-sm font-semibold text-text-primary transition-colors hover:bg-border-strong/50 dark:bg-surface-0"
                            >
                                Agora não
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

/**
 * Hook para verificar status de notificações
 */
export function useNotifications() {
    const [permission, setPermission] = useState<NotificationPermission>('default');
    const [supported, setSupported] = useState(false);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- leitura síncrona de localStorage/window na montagem (hydration-safe)
        setSupported('Notification' in window);
        if ('Notification' in window) {
            setPermission(Notification.permission);
        }
    }, []);

    const sendLocalNotification = (title: string, options?: NotificationOptions) => {
        if (permission === 'granted') {
            new Notification(title, options);
        }
    };

    return {
        supported,
        permission,
        granted: permission === 'granted',
        sendLocalNotification
    };
}
