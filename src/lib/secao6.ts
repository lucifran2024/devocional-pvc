// ===========================================
// SEÇÃO 6 - Passagem do Dia (Local JSON)
// ===========================================

export interface InsightPreMinerado {
    tese: string;
    familia: string;
    verso_suporte: string;
    voz_performance: string;
}

export interface PassagemSecao6 {
    data: string;
    referencia: string;
    arquetipo_maestro: string;
    lexico_do_dia: string[];
    estrutura_dinamica?: string[];
    insights_pre_minerados: InsightPreMinerado[];
}

// Dados embutidos do SECAO6_LOCAL.json (necessário para client-side)
const SECAO6_DATA: PassagemSecao6[] = [
    {
        "data": "2026-01-09",
        "referencia": "Isaías 16-18",
        "arquetipo_maestro": "O Refúgio em Sião",
        "lexico_do_dia": ["Justiça", "Trono", "Moabe", "Damasco", "Etiópia", "Poda", "Sinal"],
        "estrutura_dinamica": ["FraseImpacto", "VersoPrimeiro", "MiniThread3", "InsightPílula"],
        "insights_pre_minerados": [
            {
                "tese": "Busca refugio no trono estabelecido em benignidade.",
                "familia": "Teologia",
                "verso_suporte": "Is 16:5",
                "voz_performance": "Profeta"
            },
            {
                "tese": "Damasco deixará de ser cidade e será um montão de ruínas.",
                "familia": "Profecia",
                "verso_suporte": "Is 17:1",
                "voz_performance": "Sentinela"
            },
            {
                "tese": "Naquele dia o homem atentará para o seu Criador.",
                "familia": "Esperança",
                "verso_suporte": "Is 17:7",
                "voz_performance": "Conselheiro"
            }
        ]
    },
    {
        "data": "2026-01-08",
        "referencia": "Isaías 13-15",
        "arquetipo_maestro": "Profeta",
        "lexico_do_dia": ["Babilônia", "juízo", "dia do Senhor", "estrelas", "Moabe", "lamento", "orgulho", "destruição"],
        "estrutura_dinamica": ["FraseImpacto", "VersoPrimeiro", "MiniThread3", "InsightPílula"],
        "insights_pre_minerados": [
            {
                "tese": "O dia do Senhor traz juízo sobre Babilônia.",
                "familia": "Teologia",
                "verso_suporte": "Is 13:6-9",
                "voz_performance": "Profeta"
            },
            {
                "tese": "As estrelas não darão luz no juízo.",
                "familia": "Teologia",
                "verso_suporte": "Is 13:10",
                "voz_performance": "Poeta"
            },
            {
                "tese": "Moabe lamenta sua destruição.",
                "familia": "Tensao",
                "verso_suporte": "Is 15:1-2",
                "voz_performance": "Conselheiro"
            },
            {
                "tese": "O orgulho de Babilônia é humilhado.",
                "familia": "Teologia",
                "verso_suporte": "Is 14:12-15",
                "voz_performance": "Mestre"
            },
            {
                "tese": "Deus destrói os ímpios como palha.",
                "familia": "Teologia",
                "verso_suporte": "Is 14:22-23",
                "voz_performance": "Profeta"
            },
            {
                "tese": "A liderança profética anuncia ruína às nações.",
                "familia": "Lideranca",
                "verso_suporte": "Is 13:1",
                "voz_performance": "Estrategista"
            }
        ]
    },
    {
        "data": "2026-01-07",
        "referencia": "Isaías 10-12",
        "arquetipo_maestro": "Profeta",
        "lexico_do_dia": ["assíria", "juízo", "remanescente", "ramo", "Jessé", "paz", "conhecimento", "louvor"],
        "estrutura_dinamica": ["FraseImpacto", "VersoPrimeiro", "MiniThread3", "InsightPílula"],
        "insights_pre_minerados": [
            {
                "tese": "A Assíria é vara da ira de Deus.",
                "familia": "Teologia",
                "verso_suporte": "Is 10:5",
                "voz_performance": "Profeta"
            },
            {
                "tese": "O remanescente de Israel retornará a Deus.",
                "familia": "Teologia",
                "verso_suporte": "Is 10:20-21",
                "voz_performance": "Conselheiro"
            },
            {
                "tese": "O Ramo de Jessé julgará com justiça.",
                "familia": "Cristologico",
                "verso_suporte": "Is 11:1-4",
                "voz_performance": "Mestre"
            }
        ]
    }
];

/**
 * Busca a passagem do dia pela data (formato YYYY-MM-DD)
 */
export function getPassagemDoDia(data: string): PassagemSecao6 | null {
    const passagem = SECAO6_DATA.find(p => p.data === data);
    return passagem || null;
}

/**
 * Retorna a tese central (primeiro insight) da passagem
 */
export function getTeseCentral(passagem: PassagemSecao6): string {
    if (passagem.insights_pre_minerados.length > 0) {
        return passagem.insights_pre_minerados[0].tese;
    }
    return "Estudo bíblico guiado para crescimento espiritual.";
}
