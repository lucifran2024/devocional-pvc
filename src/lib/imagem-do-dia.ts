// ===========================================
// IMAGEM DO DIA (início) — muda todo dia, percorrendo 31 fotos de natureza
// do Unsplash (licença Unsplash: https://unsplash.com/license), carregadas
// do próprio Unsplash. A foto guardada no app é a reserva: aparece sem
// internet ou se alguma foto sair do ar.
// ===========================================

import { numeroDoDia } from '@/lib/daily-verse';

export interface ImagemDoDia {
    id: string;
    alt: string;
    /** Foto que já vem no app (não precisa de internet) */
    local?: string;
}

export const IMAGEM_RESERVA = { src: '/leitura-natureza.jpg', alt: 'Luz natural atravessando uma floresta verde' };

export const IMAGENS_DO_DIA: readonly ImagemDoDia[] = [
    { id: 'photo-1441974231531-c6227db76b6e', alt: IMAGEM_RESERVA.alt, local: IMAGEM_RESERVA.src },
    { id: 'photo-1536890274788-51861e124205', alt: 'Sol baixo sobre o mar calmo' },
    { id: 'photo-1490682143684-14369e18dce8', alt: 'Montanhas e árvores na luz dourada do entardecer' },
    { id: 'photo-1498408040764-ab6eb772a145', alt: 'Campo de trigo verde sob o céu claro' },
    { id: 'photo-1559310589-2673bfe16970', alt: 'Lago turquesa refletindo montanhas e pinheiros' },
    { id: 'photo-1534629938736-b1b076531d3b', alt: 'Raios de sol atrás de uma nuvem branca' },
    { id: 'photo-1493713838217-28e23b41b798', alt: 'Cascata de águas claras em vários degraus' },
    { id: 'photo-1674668560191-536c9fd88b8d', alt: 'Campo de flores silvestres coloridas' },
    { id: 'photo-1604223190546-a43e4c7f29d7', alt: 'Montanhas em camadas sob o céu alaranjado' },
    { id: 'photo-1674244988698-0bfc39dad0d0', alt: 'Feixes de sol entre as árvores da floresta' },
    { id: 'photo-1760394986860-205d769ee0e4', alt: 'Lago calmo refletindo a montanha ao nascer do sol' },
    { id: 'photo-1503803548695-c2a7b4a5b875', alt: 'Mar sob nuvens douradas ao amanhecer' },
    { id: 'photo-1623958045855-0b7a60cfb9eb', alt: 'Campo de trigo maduro na luz do sol' },
    { id: 'photo-1514519273132-6a1abd48302c', alt: 'Céu do entardecer com nuvens e raios de luz' },
    { id: 'photo-1781632493381-43e3bf7a1061', alt: 'Arco-íris sobre uma cachoeira' },
    { id: 'photo-1617067128946-8c4f807d91e1', alt: 'Prado de flores brancas numa encosta' },
    { id: 'photo-1444090542259-0af8fa96557e', alt: 'Montanhas entre nuvens na luz dourada' },
    { id: 'photo-1595104615356-cbe9c4364513', alt: 'Luz do sol filtrando entre pinheiros' },
    { id: 'photo-1757911261159-c3d020451341', alt: 'Montanhas refletidas num lago tranquilo' },
    { id: 'photo-1524107680653-13db74b77f58', alt: 'Mar na luz dourada do entardecer' },
    { id: 'photo-1464660439080-b79116909ce7', alt: 'Sol se pondo sobre um campo' },
    { id: 'photo-1495756111155-45cb19b8aeee', alt: 'Luz atravessando nuvens num céu azul' },
    { id: 'photo-1518996261636-5801e989cc22', alt: 'Cachoeira caindo entre encostas verdes' },
    { id: 'photo-1744986924390-b0a96741b014', alt: 'Campo florido diante de montanhas verdes' },
    { id: 'photo-1506880648420-aafaa650d147', alt: 'Sol nascendo atrás da montanha' },
    { id: 'photo-1530563937443-1f02f662fa5c', alt: 'Raios de sol na floresta enevoada' },
    { id: 'photo-1650493359585-f394207e8460', alt: 'Lago azul entre montanhas e pinheiros' },
    { id: 'photo-1438045809872-34a58ff469f6', alt: 'Nuvens iluminadas por raios de sol' },
    { id: 'photo-1447958374760-1ce70cf11ee3', alt: 'Cachoeira numa montanha coberta de floresta' },
    { id: 'photo-1559080463-5c7eb3a52de1', alt: 'Lago entre árvores e montanhas nevadas' },
    { id: 'photo-1523712999610-f77fbcfc3843', alt: 'Luz do sol numa floresta de outono' },
];

export function urlImagem(id: string, largura: number): string {
    return `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${largura}&q=70`;
}

/** Foto do dia ('YYYY-MM-DD' opcional; sem data usa hoje no aparelho). */
export function getImagemDoDia(dataStr?: string): ImagemDoDia {
    const n = IMAGENS_DO_DIA.length;
    return IMAGENS_DO_DIA[((numeroDoDia(dataStr) % n) + n) % n];
}
