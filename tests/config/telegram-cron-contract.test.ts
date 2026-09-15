import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

interface VercelCron {
    path: string;
    schedule: string;
}

interface VercelConfig {
    crons?: VercelCron[];
}

const projectRoot = resolve(__dirname, '../..');

function readProjectFile(relativePath: string): string {
    return readFileSync(resolve(projectRoot, relativePath), 'utf8');
}

describe('contrato dos envios automáticos do PVC ao Telegram', () => {
    it('mantém daily-push agendado e desliga daily-devotional', () => {
        const config = JSON.parse(readProjectFile('vercel.json')) as VercelConfig;
        const crons = config.crons ?? [];

        expect(crons).toEqual([
            { path: '/api/cron/daily-dna', schedule: '30 6 * * *' },
            { path: '/api/cron/daily-push', schedule: '0 7 * * *' },
            { path: '/api/cron/push-notifications', schedule: '0 10 * * *' },
            { path: '/api/cron/push-notifications', schedule: '0 17 * * *' },
            { path: '/api/cron/push-notifications', schedule: '0 23 * * *' },
        ]);
        expect(crons.map((cron) => cron.path)).not.toContain('/api/cron/daily-devotional');
    });

    it('limita daily-push à Palavra da Manhã', () => {
        const route = readProjectFile('src/app/api/cron/daily-push/route.ts');

        expect(route).toContain("mensagensEnviadas.push('Palavra da Manha')");
        expect(route).not.toContain('const msgVersiculo =');
        expect(route).not.toContain('Versiculo do Dia');
    });

    it('mantém o endpoint antigo daily-devotional permanentemente inerte', () => {
        const route = readProjectFile('src/app/api/cron/daily-devotional/route.ts');

        expect(route).toContain('status: 410');
        expect(route).not.toContain('enviarTelegram');
        expect(route).not.toContain('TELEGRAM_BOT_TOKEN');
        expect(route).not.toContain('tribodejuda');
        expect(route).not.toContain('evangelhoparatodos');
    });

    it('usa Vercel CLI atual no deploy do GitHub Actions', () => {
        const workflow = readProjectFile('.github/workflows/deploy.yml');

        expect(workflow).not.toContain('amondnet/vercel-action');
        expect(workflow).toContain('npm install --global vercel@latest');
        expect(workflow).toContain('vercel deploy --prebuilt --prod');
    });
});
