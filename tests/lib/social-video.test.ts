import { describe, expect, it } from 'vitest';
import { extrairLinkVideoSocial, identificarLinkVideoSocial } from '@/lib/social-video';

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

    it('não confunde domínios falsos ou posts sem vídeo', () => {
        expect(identificarLinkVideoSocial('https://instagram.com.evil.test/reel/ABC/')).toBeNull();
        expect(identificarLinkVideoSocial('https://www.instagram.com/p/ABC/')).toBeNull();
        expect(extrairLinkVideoSocial('Uma anotação sem link')).toBeNull();
    });
});
