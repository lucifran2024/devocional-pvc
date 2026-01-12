// =====================================================
// BIBLE API - Consulta de Versículos via API.Bible
// Substituindo RSS por API oficial
// =====================================================

// Versículos selecionados para "versículo do dia"
// Um por dia do mês (31 versículos)
const VERSICULO_DO_DIA = [
    "JER.29.11", // Dia 1 - Jeremias 29:11
    "PSA.23.1",  // Dia 2 - Salmo 23:1
    "PHP.4.13",  // Dia 3 - Filipenses 4:13
    "ISA.40.31", // Dia 4 - Isaías 40:31
    "JHN.3.16",  // Dia 5 - João 3:16
    "ROM.8.28",  // Dia 6 - Romanos 8:28
    "PRO.3.5",   // Dia 7 - Provérbios 3:5
    "PSA.46.1",  // Dia 8 - Salmo 46:1
    "JOS.1.9",   // Dia 9 - Josué 1:9
    "MAT.11.28", // Dia 10 - Mateus 11:28
    "ISA.41.10", // Dia 11 - Isaías 41:10
    "GAL.5.22",  // Dia 12 - Gálatas 5:22
    "PSA.119.105", // Dia 13 - Salmo 119:105
    "ROM.12.2",  // Dia 14 - Romanos 12:2
    "HEB.11.1",  // Dia 15 - Hebreus 11:1
    "1COR.13.4", // Dia 16 - 1 Coríntios 13:4
    "MAT.6.33",  // Dia 17 - Mateus 6:33
    "EPH.2.8",   // Dia 18 - Efésios 2:8
    "PSA.27.1",  // Dia 19 - Salmo 27:1
    "JHN.14.6",  // Dia 20 - João 14:6
    "2TIM.1.7",  // Dia 21 - 2 Timóteo 1:7
    "COL.3.23",  // Dia 22 - Colossenses 3:23
    "PSA.91.1",  // Dia 23 - Salmo 91:1
    "ROM.5.8",   // Dia 24 - Romanos 5:8
    "1JHN.4.19", // Dia 25 - 1 João 4:19
    "ISA.26.3",  // Dia 26 - Isaías 26:3
    "PSA.37.4",  // Dia 27 - Salmo 37:4
    "MAT.5.16",  // Dia 28 - Mateus 5:16
    "DEU.31.6",  // Dia 29 - Deuteronômio 31:6
    "LAM.3.22",  // Dia 30 - Lamentações 3:22
    "REV.21.4"   // Dia 31 - Apocalipse 21:4
];

// Bible IDs para português (Almeida Revista e Corrigida)
const BIBLE_ID_PT = "90799bb5b996fddc-01"; // Portuguese ARC

/**
 * Busca versículo via API.Bible
 */
export async function consultarBibleAPI(apiKey: string, data: string): Promise<string> {
    console.log(`📖 [BIBLE API] Consultando versículo para: ${data}`);

    if (!apiKey) {
        return "Erro: API Key da Bible API não configurada.";
    }

    try {
        // Pega o dia do mês para selecionar o versículo
        const dia = new Date(data + 'T12:00:00').getDate();
        const versiculoId = VERSICULO_DO_DIA[(dia - 1) % VERSICULO_DO_DIA.length];

        console.log(`📖 Buscando: ${versiculoId} (dia ${dia})`);

        const response = await fetch(
            `https://api.scripture.api.bible/v1/bibles/${BIBLE_ID_PT}/verses/${versiculoId}?content-type=text&include-notes=false&include-titles=false`,
            {
                headers: {
                    'api-key': apiKey,
                    'Accept': 'application/json'
                }
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Erro API.Bible (${response.status}):`, errorText);
            return `Erro ao acessar API.Bible (${response.status})`;
        }

        const json = await response.json();
        const verseData = json.data;

        if (!verseData || !verseData.content) {
            return "Versículo não encontrado.";
        }

        // Limpa o texto (remove espaços extras)
        const texto = verseData.content.trim().replace(/\s+/g, ' ');
        const referencia = verseData.reference || versiculoId;

        return `📖 VERSÍCULO DO DIA\n${referencia}\n\n"${texto}"`;

    } catch (e: any) {
        console.error("Erro Bible API:", e);
        return `Erro ao processar Bible API: ${e.message}`;
    }
}

/**
 * Busca passagem específica via API.Bible
 */
export async function consultarPassagem(apiKey: string, passagem: string): Promise<string> {
    console.log(`📖 [BIBLE API] Consultando passagem: ${passagem}`);

    if (!apiKey) {
        return "Erro: API Key da Bible API não configurada.";
    }

    try {
        // Faz busca por texto
        const response = await fetch(
            `https://api.scripture.api.bible/v1/bibles/${BIBLE_ID_PT}/search?query=${encodeURIComponent(passagem)}&limit=1`,
            {
                headers: {
                    'api-key': apiKey,
                    'Accept': 'application/json'
                }
            }
        );

        if (!response.ok) {
            return `Erro ao buscar passagem (${response.status})`;
        }

        const json = await response.json();
        const verses = json.data?.verses;

        if (!verses || verses.length === 0) {
            return `Passagem "${passagem}" não encontrada.`;
        }

        const verse = verses[0];
        return `📖 ${verse.reference}\n\n"${verse.text?.trim() || 'Sem texto'}"`;

    } catch (e: any) {
        console.error("Erro Bible API:", e);
        return `Erro: ${e.message}`;
    }
}
