'use client';

import { useState, useEffect, useCallback } from 'react';

export type NotificationType =
    | 'palavra_manha'
    | 'versiculo_dia'
    | 'lembrete_leitura'
    | 'dna_diario'
    | 'resumo_semanal';

export interface NotificationSettings {
    // Tipos de notificação habilitados
    enabledTypes: Record<NotificationType, boolean>;

    // Horário preferido para notificações (formato 24h: "07:30")
    preferredTime: string;

    // Resumo semanal: dia da semana (0=Domingo, 1=Segunda, ..., 6=Sábado)
    resumoSemanalDay: number;
    // Resumo semanal: horário
    resumoSemanalTime: string;

    // Som ao receber notificação
    soundEnabled: boolean;

    // Vibração (mobile)
    vibrationEnabled: boolean;
}

const STORAGE_KEY = 'pvc_notification_settings';

const DEFAULT_SETTINGS: NotificationSettings = {
    enabledTypes: {
        palavra_manha: true,
        versiculo_dia: true,
        lembrete_leitura: true,
        dna_diario: false,
        resumo_semanal: true,
    },
    preferredTime: '07:00',
    resumoSemanalDay: 0, // Domingo
    resumoSemanalTime: '18:00',
    soundEnabled: true,
    vibrationEnabled: true,
};

function loadSettings(): NotificationSettings {
    if (typeof window === 'undefined') return DEFAULT_SETTINGS;
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return DEFAULT_SETTINGS;
        const parsed = JSON.parse(raw) as Partial<NotificationSettings>;
        return {
            ...DEFAULT_SETTINGS,
            ...parsed,
            enabledTypes: {
                ...DEFAULT_SETTINGS.enabledTypes,
                ...(parsed.enabledTypes || {}),
            },
        };
    } catch {
        return DEFAULT_SETTINGS;
    }
}

export function useNotificationSettings() {
    const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_SETTINGS);
    const [isLoaded, setIsLoaded] = useState(false);

    // Carrega do localStorage na inicialização
    useEffect(() => {
        setSettings(loadSettings());
        setIsLoaded(true);
    }, []);

    // Persiste sempre que mudar
    useEffect(() => {
        if (!isLoaded) return;
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
        } catch (e) {
            console.error('Erro ao salvar preferências:', e);
        }
    }, [settings, isLoaded]);

    const updateType = useCallback((type: NotificationType, enabled: boolean) => {
        setSettings(prev => ({
            ...prev,
            enabledTypes: { ...prev.enabledTypes, [type]: enabled },
        }));
    }, []);

    const updateField = useCallback(<K extends keyof Omit<NotificationSettings, 'enabledTypes'>>(
        field: K,
        value: NotificationSettings[K]
    ) => {
        setSettings(prev => ({ ...prev, [field]: value }));
    }, []);

    const reset = useCallback(() => {
        setSettings(DEFAULT_SETTINGS);
    }, []);

    // Retorna string legível do tipo
    const labelFor = useCallback((type: NotificationType): string => {
        const map: Record<NotificationType, string> = {
            palavra_manha: 'Palavra da Manhã',
            versiculo_dia: 'Versículo do Dia',
            lembrete_leitura: 'Lembrete de Leitura',
            dna_diario: 'DNA Diário',
            resumo_semanal: 'Resumo Semanal',
        };
        return map[type];
    }, []);

    // Retorna descrição curta do tipo
    const descFor = useCallback((type: NotificationType): string => {
        const map: Record<NotificationType, string> = {
            palavra_manha: 'Receba a palavra de manhã cedo, antes do seu dia começar.',
            versiculo_dia: 'Um versículo inspirador selecionado para hoje.',
            lembrete_leitura: 'Lembrete diário caso você ainda não tenha lido.',
            dna_diario: 'Mensagem personalizada do seu DNA espiritual.',
            resumo_semanal: 'Resumo do seu progresso de leitura da semana.',
        };
        return map[type];
    }, []);

    return {
        settings,
        isLoaded,
        updateType,
        updateField,
        reset,
        labelFor,
        descFor,
    };
}
