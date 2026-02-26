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
                // (necessario quando a chave VAPID mudou ou subscription expirou)
                registerPushSubscription();
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
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 animate-slide-up">
            <div className="bg-slate-800/95 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl">
                <button
                    onClick={dismissBanner}
                    className="absolute top-2 right-2 p-1 hover:bg-white/10 rounded-full transition-colors"
                    aria-label="Fechar"
                >
                    <X className="w-4 h-4 text-slate-400" />
                </button>

                <div className="flex items-start gap-4">
                    <div className="p-3 rounded-xl bg-amber-500/20">
                        <Bell className="w-6 h-6 text-amber-400" />
                    </div>

                    <div className="flex-1">
                        <h3 className="text-white font-bold mb-1">Devocional Diário</h3>
                        <p className="text-slate-400 text-sm mb-3">
                            Receba lembretes para sua leitura bíblica diária.
                        </p>

                        <div className="flex gap-2">
                            <button
                                onClick={requestPermission}
                                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-black font-medium rounded-lg transition-colors text-sm"
                            >
                                Ativar
                            </button>
                            <button
                                onClick={dismissBanner}
                                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors text-sm"
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
