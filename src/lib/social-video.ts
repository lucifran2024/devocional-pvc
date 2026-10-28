export type PlataformaVideoSocial = 'instagram' | 'tiktok';

export interface LinkVideoSocial {
    url: string;
    plataforma: PlataformaVideoSocial;
}

const URL_REGEX = /https?:\/\/[^\s<>"']+/gi;

// Links colados sem "https://" (ex.: "www.instagram.com/reel/..." digitado à
// mão) também contam — só dos domínios que sabemos transcrever.
const URL_SEM_PROTOCOLO_REGEX =
    /(?:^|[\s(])((?:www\.)?(?:instagram\.com|instagr\.am|(?:vm\.|vt\.|www\.)?tiktok\.com)\/[^\s<>"']+)/gi;

// Caminhos do Instagram que podem conter vídeo: reel clássico, post (/p/ pode
// ser vídeo), IGTV antigo e o link de compartilhar do app (/share/..., que o
// backend desembrulha seguindo o redirecionamento antes de transcrever).
const INSTAGRAM_PATH_REGEX = /^\/(reel|reels|tv|p)\//i;
const INSTAGRAM_SHARE_REGEX = /^\/share(\/|$)/i;
// Desde out/2026 o app do Instagram também compartilha com o perfil antes:
// /<perfil>/reel/<código>/. Vira /reel/<código>/, que o backend já resolve.
// O perfil sozinho e a grade /<perfil>/reels/ continuam sem botão.
const INSTAGRAM_COM_PERFIL_REGEX = /^\/[A-Za-z0-9._]+\/(reel|p|tv)\/([A-Za-z0-9_-]+)\/?$/i;

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

        if (hostPertenceA(host, 'instagram.com') || hostPertenceA(host, 'instagr.am')) {
            if (INSTAGRAM_PATH_REGEX.test(url.pathname) || INSTAGRAM_SHARE_REGEX.test(url.pathname)) {
                return { url: url.toString(), plataforma: 'instagram' };
            }
            const comPerfil = url.pathname.match(INSTAGRAM_COM_PERFIL_REGEX);
            if (comPerfil) {
                url.pathname = `/${comPerfil[1].toLowerCase()}/${comPerfil[2]}/`;
                return { url: url.toString(), plataforma: 'instagram' };
            }
        }

        if (hostPertenceA(host, 'tiktok.com')) {
            return { url: url.toString(), plataforma: 'tiktok' };
        }
    } catch {
        return null;
    }

    return null;
}

export function extrairLinksVideoSocial(texto: string): LinkVideoSocial[] {
    const candidatas: string[] = texto.match(URL_REGEX) || [];

    // Segunda passada: links sem protocolo. Prefixa https:// pra normalizar.
    for (const m of texto.matchAll(URL_SEM_PROTOCOLO_REGEX)) {
        candidatas.push(`https://${m[1]}`);
    }

    const links: LinkVideoSocial[] = [];
    const urlsEncontradas = new Set<string>();

    for (const candidata of candidatas) {
        const link = identificarLinkVideoSocial(candidata);
        if (link && !urlsEncontradas.has(link.url)) {
            urlsEncontradas.add(link.url);
            links.push(link);
        }
    }

    return links;
}

export function extrairLinkVideoSocial(texto: string): LinkVideoSocial | null {
    return extrairLinksVideoSocial(texto)[0] || null;
}
