export type PlataformaVideoSocial = 'instagram' | 'tiktok';

export interface LinkVideoSocial {
    url: string;
    plataforma: PlataformaVideoSocial;
}

const URL_REGEX = /https?:\/\/[^\s<>"']+/gi;

function limparPontuacaoFinal(url: string): string {
    return url.replace(/[),.;!?\]}]+$/g, '');
}

function hostPertenceA(host: string, dominio: string): boolean {
    return host === dominio || host.endsWith(`.${dominio}`);
}

export function identificarLinkVideoSocial(urlBruta: string): LinkVideoSocial | null {
    const urlLimpa = limparPontuacaoFinal(urlBruta.trim());

    try {
        const url = new URL(urlLimpa);
        const host = url.hostname.toLowerCase();

        if (hostPertenceA(host, 'instagram.com') && /^\/(reel|reels)\//i.test(url.pathname)) {
            return { url: url.toString(), plataforma: 'instagram' };
        }

        if (hostPertenceA(host, 'tiktok.com')) {
            return { url: url.toString(), plataforma: 'tiktok' };
        }
    } catch {
        return null;
    }

    return null;
}

export function extrairLinkVideoSocial(texto: string): LinkVideoSocial | null {
    const candidatas = texto.match(URL_REGEX) || [];
    for (const candidata of candidatas) {
        const link = identificarLinkVideoSocial(candidata);
        if (link) return link;
    }
    return null;
}
