import chromiumServerless from '@sparticuz/chromium';
import { chromium } from 'playwright-core';

import type { PalavraManhaCache } from './supabase';

const PVC = 'https://devocional-pvc.vercel.app';
const LARGURA = 409;
const MARGEM_SUPERIOR = 12;
const MARGEM_INFERIOR = 10;

/** Captura a interface real com o mesmo registro que o cron acabou de ler.
 * O navegador não recebe credenciais do cron, não grava no banco e não gera conteúdo. */
export async function capturarPalavra(
    palavra: PalavraManhaCache,
    local?: { origin: string; executablePath: string },
): Promise<Uint8Array<ArrayBuffer>> {
    const origin = local?.origin ?? (
        process.env.VERCEL_ENV === 'preview' && process.env.VERCEL_URL
            ? `https://${process.env.VERCEL_URL}`
            : PVC
    );
    const browser = await chromium.launch({
        executablePath: local?.executablePath ?? await chromiumServerless.executablePath(),
        ...(local ? {} : { args: chromiumServerless.args }),
        headless: true,
        env: Object.fromEntries(Object.entries(process.env).filter(([nome]) =>
            ['PATH', 'HOME', 'TMPDIR', 'TZ', 'LANG', 'LD_LIBRARY_PATH', 'FONTCONFIG_PATH'].includes(nome),
        )),
        timeout: 15_000,
    });
    try {
        const context = await browser.newContext({
            viewport: { width: LARGURA, height: 920 }, deviceScaleFactor: 3,
            isMobile: true, hasTouch: true, locale: 'pt-BR', colorScheme: 'light',
            reducedMotion: 'reduce', timezoneId: 'America/Sao_Paulo', serviceWorkers: 'block',
        });
        let serviuRegistro = false;
        await context.route('**/*', async (route) => {
            const request = route.request();
            const url = new URL(request.url());
            // Supabase usa uma leitura REST filtrada. Responda direto com o registro já lido,
            // sem que a aba possa regenerar ou substituir a Palavra durante a captura.
            if (request.method() === 'GET' && url.pathname === '/rest/v1/palavra_manha_diaria' &&
                url.searchParams.get('data') === `eq.${palavra.data}`) {
                serviuRegistro = true;
                return route.fulfill({ json: [palavra], headers: { 'access-control-allow-origin': '*' } });
            }
            if (request.method() === 'OPTIONS' && url.pathname === '/rest/v1/palavra_manha_diaria') {
                return route.fulfill({ status: 204, headers: {
                    'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET',
                    'access-control-allow-headers': 'apikey, authorization, x-client-info, accept-profile',
                } });
            }
            if (url.origin === origin && request.method() === 'GET' &&
                (url.pathname === '/' || url.pathname.startsWith('/_next/static/'))) {
                const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
                if (!bypass) return route.continue();
                return route.continue({
                    headers: { ...request.headers(), 'x-vercel-protection-bypass': bypass },
                });
            }
            return route.abort();
        });
        const page = await context.newPage();
        page.setDefaultTimeout(8_000);
        const res = await page.goto(`${origin}/`, { waitUntil: 'domcontentloaded', timeout: 12_000 });
        if (!res?.ok() || new URL(page.url()).origin !== origin) throw new Error('Página do PVC indisponível');

        // Tema do app, não apenas a preferência do navegador (o PVC abre em tema escuro).
        const tema = page.getByRole('button', { name: 'Ativar modo claro', exact: true });
        await tema.click();
        await page.locator('html.light').waitFor();
        const secao = page.locator('section[aria-labelledby="titulo-palavra-manha"]');
        const corpo = secao.locator('.texto-palavra');
        await corpo.waitFor();
        if (!serviuRegistro || await secao.getAttribute('data-palavra-id') !== String(palavra.id) ||
            await secao.getAttribute('data-palavra-data') !== palavra.data || !(await corpo.innerText()).trim()) {
            throw new Error('A tela não mostrou a Palavra esperada');
        }
        await page.evaluate(() => Promise.race([
            document.fonts.ready.then(() => true),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Fontes indisponíveis')), 5_000)),
        ]));
        const clip = await secao.evaluate((el, { top, bottom }) => {
            const texto = el.querySelector('.texto-palavra')!;
            const inicio = el.querySelector('h3') ?? texto;
            const y = Math.max(0, Math.floor(inicio.getBoundingClientRect().top + scrollY - top));
            const fim = Math.ceil(texto.getBoundingClientRect().bottom + scrollY + bottom);
            return { x: 0, y, width: document.documentElement.clientWidth, height: fim - y };
        }, { top: MARGEM_SUPERIOR, bottom: MARGEM_INFERIOR });
        // Limites do sendPhoto (10 MB; largura + altura de até 10000 pixels).
        if (clip.height <= 0 || (clip.width + clip.height) * 3 > 10_000) throw new Error('Tamanho do print fora do limite');
        const png = await page.screenshot({ type: 'png', clip, animations: 'disabled', timeout: 7_000 });
        if (!png.length || png.length > 10_000_000) throw new Error('PNG fora do limite');
        return new Uint8Array(png);
    } finally {
        await browser.close();
    }
}
