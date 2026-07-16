import { describe, expect, it } from 'vitest';
import {
    extrairLinkVideoSocial,
    extrairLinksVideoSocial,
    identificarLinkVideoSocial,
} from '@/lib/social-video';

describe('links de vídeo social', () => {
    it('encontra Reel do Instagram dentro de uma anotação', () => {
        expect(extrairLinkVideoSocial('Ver depois: https://www.instagram.com/reel/ABC_123/?igsh=teste')).toEqual({
            url: 'https://www.instagram.com/reel/ABC_123/?igsh=teste',
            plataforma: 'instagram',
        });
    });

    it('aceita links curtos e completos do TikTok', () => {
        expect(identificarLinkVideoSocial('https://vt.tiktok.com/ZS123/')?.plataforma).toBe('tiktok');
        expect(identificarLinkVideoSocial('https://www.tiktok.com/@autor/video/123')?.plataforma).toBe('tiktok');
    });

    it('remove pontuação colada ao final do link', () => {
        expect(extrairLinkVideoSocial('Link: https://www.instagram.com/reels/XYZ/).')?.url)
            .toBe('https://www.instagram.com/reels/XYZ/');
    });

    it('não confunde domínios falsos, perfis ou texto sem link', () => {
        expect(identificarLinkVideoSocial('https://instagram.com.evil.test/reel/ABC/')).toBeNull();
        expect(identificarLinkVideoSocial('https://www.instagram.com/algumperfil/')).toBeNull();
        expect(extrairLinkVideoSocial('Uma anotação sem link')).toBeNull();
    });

    // 16/07/2026 — formatos reais que o dono cola do celular e ficavam sem o
    // botão de transcrever (motivo do furo original): link de compartilhar do
    // app (/share/...), post /p/ (pode ser vídeo — o backend responde educado
    // se não for), IGTV /tv/, domínio instagr.am e links sem https://.
    it('aceita o link de compartilhar do app do Instagram (/share/...)', () => {
        expect(identificarLinkVideoSocial('https://www.instagram.com/share/reel/AbC123')?.plataforma).toBe('instagram');
        expect(identificarLinkVideoSocial('https://www.instagram.com/share/p/AbC123/?igsh=x')?.plataforma).toBe('instagram');
        expect(identificarLinkVideoSocial('https://www.instagram.com/share/AbC123')?.plataforma).toBe('instagram');
    });

    it('aceita post /p/ (pode ser vídeo), /tv/ e instagr.am', () => {
        expect(identificarLinkVideoSocial('https://www.instagram.com/p/ABC/')?.plataforma).toBe('instagram');
        expect(identificarLinkVideoSocial('https://www.instagram.com/tv/ABC/')?.plataforma).toBe('instagram');
        expect(identificarLinkVideoSocial('https://instagr.am/reel/ABC/')?.plataforma).toBe('instagram');
    });

    it('encontra links colados sem https://', () => {
        expect(extrairLinkVideoSocial('olha esse www.instagram.com/reel/SemHttps/')).toEqual({
            url: 'https://www.instagram.com/reel/SemHttps/',
            plataforma: 'instagram',
        });
        expect(extrairLinkVideoSocial('vm.tiktok.com/ZM123abc/')?.plataforma).toBe('tiktok');
    });

    it('não duplica quando o mesmo link aparece com e sem protocolo', () => {
        const texto = 'https://www.instagram.com/reel/DUP/ e www.instagram.com/reel/DUP/';
        expect(extrairLinksVideoSocial(texto)).toHaveLength(1);
    });

    it('lista todos os vídeos da anotação em ordem e sem duplicar links', () => {
        const instagram = 'https://www.instagram.com/reel/PRIMEIRO/';
        const tiktok = 'https://www.tiktok.com/@autor/video/987';

        expect(extrairLinksVideoSocial(`${instagram}\n${tiktok}\n${instagram}`)).toEqual([
            { url: instagram, plataforma: 'instagram' },
            { url: tiktok, plataforma: 'tiktok' },
        ]);
    });
});
