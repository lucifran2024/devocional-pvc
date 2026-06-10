'use client';

import { useState, useEffect } from 'react';

export function useDailyStreak() {
    const [streak, setStreak] = useState(0);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        // Evita problemas de hidratação no Next.js (roda só no client)
        const today = new Date().toLocaleDateString('pt-BR');
        const storedLastActive = localStorage.getItem('pvc_last_active_date');
        const storedStreak = parseInt(localStorage.getItem('pvc_current_streak') || '0', 10);

        if (storedLastActive === today) {
            // Já acessou hoje, mantém a ofensiva
            // eslint-disable-next-line react-hooks/set-state-in-effect -- leitura síncrona de localStorage/window na montagem (hydration-safe)
            setStreak(storedStreak);
        } else {
            // Diferença de dias
            let newStreak = storedStreak;
            if (storedLastActive) {
                const [dayLast, monthLast, yearLast] = storedLastActive.split('/');
                const [dayNow, monthNow, yearNow] = today.split('/');

                const lastDate = new Date(`${yearLast}-${monthLast}-${dayLast}T12:00:00Z`).getTime();
                const now = new Date(`${yearNow}-${monthNow}-${dayNow}T12:00:00Z`).getTime();

                const diffDays = Math.floor((now - lastDate) / (1000 * 60 * 60 * 24));

                if (diffDays === 1) {
                    // Acessou ontem, aumenta a ofensiva
                    newStreak += 1;
                } else if (diffDays > 1) {
                    // Perdeu um dia ou mais, zera e começa de novo
                    newStreak = 1;
                }
            } else {
                // Primeiro acesso
                newStreak = 1;
            }

            setStreak(newStreak);
            localStorage.setItem('pvc_last_active_date', today);
            localStorage.setItem('pvc_current_streak', newStreak.toString());
        }

        setIsLoaded(true);
    }, []);

    return { streak, isLoaded };
}
