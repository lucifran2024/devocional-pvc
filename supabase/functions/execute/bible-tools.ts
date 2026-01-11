// =====================================================
// BIBLE TOOLS - Ferramentas para Function Calling
// Permite que a IA consulte versículos bíblicos reais
// =====================================================

// Definição da ferramenta para o Gemini (Schema)
export const BIBLE_TOOLS_DEFINITION = [{
    function_declarations: [{
        name: "consultar_versiculo",
        description: "Busca o texto EXATO de um versículo ou passagem bíblica na versão NTLH. Use isso SEMPRE que for citar um versículo específico para garantir que o texto esteja correto e evitar alucinações.",
        parameters: {
            type: "object",
            properties: {
                referencia: {
                    type: "string",
                    description: "Referência bíblica, ex: 'João 3:16', 'Salmos 23:1-4', 'Isaías 40:31'"
                }
            },
            required: ["referencia"]
        }
    }]
}];

/**
 * Busca texto bíblico na API bolls.life (NTLH)
 * Adaptação da função do frontend para Deno
 */
export async function consultarVersiculo(referencia: string): Promise<string> {
    console.log(`📖 [TOOL] Consultando Bíblia: ${referencia}`);

    // Tratamento básico de referência
    // Espera formato "Livro Cap:Ver" ou "Livro Cap:Ver-Ver"
    // Vamos usar a API bolls.life que é robusta

    // Mapeamento simplificado de nomes (os mesmos do frontend seriam ideais, 
    // mas aqui vamos confiar que a API ou a IA normalizem um pouco)
    // A IA geralmente manda "João 3:16" corretamente.

    // Precisamos extrair Livro ID, Capitulo e Versiculos.
    // Como a API bolls.life precisa de ID numérico, vamos usar um map básico
    // ou tentar usar a API de busca se falhar?
    // Bolls.life não tem busca por texto "João 3:16". Tem que saber o ID.

    // Vou incluir o MAPA DE LIVROS essencial aqui (copiado do frontend para garantir)
    const LIVRO_PARA_ID: { [key: string]: number } = {
        'gênesis': 1, 'genesis': 1, 'gn': 1,
        'êxodo': 2, 'exodo': 2, 'ex': 2,
        'salmos': 19, 'sl': 19,
        'provérbios': 20, 'proverbios': 20, 'pv': 20,
        'isaías': 23, 'isaias': 23, 'is': 23,
        'mateus': 40, 'mt': 40,
        'marcos': 41, 'mc': 41,
        'lucas': 42, 'lc': 42,
        'joão': 43, 'joao': 43, 'jo': 43,
        'atos': 44, 'at': 44,
        'romanos': 45, 'rm': 45,
        '1 coríntios': 46, '1 co': 46,
        '2 coríntios': 47, '2 co': 47,
        'galatas': 48, 'gl': 48,
        'efésios': 49, 'ef': 49,
        'filipenses': 50, 'fp': 50,
        'colossenses': 51, 'cl': 51,
        '1 tessalonicenses': 52, '1 ts': 52,
        '2 tessalonicenses': 53, '2 ts': 53,
        '1 timóteo': 54, '1 tm': 54,
        '2 timóteo': 55, '2 tm': 55,
        'hebreus': 58, 'hb': 58,
        'tiago': 59, 'tg': 59,
        '1 pedro': 60, '1 pe': 60,
        '2 pedro': 61, '2 pe': 61,
        '1 joão': 62, '1 jo': 62,
        'apocalipse': 66, 'ap': 66
        // ... adicionar outros conforme necessário ou usar regex inteligente
    };

    try {
        const parts = referencia.match(/^(.+?)\s+(\d+)(?::(\d+)(?:[-–](\d+))?)?$/);
        // Ex: ["João 3:16", "João", "3", "16", undefined]

        if (!parts) {
            return `Erro: Formato de referência inválido. Use 'Livro Capítulo:Versículo'. (Recebido: ${referencia})`;
        }

        const livroNome = parts[1].toLowerCase().trim();
        const capitulo = parts[2];
        const versoInicio = parts[3] ? parseInt(parts[3]) : null;
        const versoFim = parts[4] ? parseInt(parts[4]) : versoInicio;

        // Tenta achar ID
        let livroId = LIVRO_PARA_ID[livroNome];

        // Se não achou, tenta busca parcial nas chaves
        if (!livroId) {
            const key = Object.keys(LIVRO_PARA_ID).find(k => livroNome.includes(k) || k.includes(livroNome));
            if (key) livroId = LIVRO_PARA_ID[key];
        }

        // Se ainda não achou, retorna erro para a IA tentar corrigir
        if (!livroId) {
            // Fallback: Tenta alguns comuns se for undefined
            return `Não encontrei o livro '${livroNome}'. Tente usar abreviações padrão (ex: Gn, Ex, Sl, Mt, Jo).`;
        }

        const response = await fetch(`https://bolls.life/get-chapter/NTLH/${livroId}/${capitulo}/`);
        const data = await response.json();

        if (!Array.isArray(data)) {
            return `Erro ao buscar texto na API.`;
        }

        // Filtra versículos
        let versiculos = data;
        if (versoInicio) {
            versiculos = data.filter((v: any) => {
                return v.verse >= versoInicio && v.verse <= (versoFim || versoInicio);
            });
        }

        // Formata
        const texto = versiculos.map((v: any) => {
            // Limpa tags HTML simples
            const t = v.text.replace(/<[^>]+>/g, '');
            return `(${referencia} v${v.verse}) ${t}`;
        }).join('\n');

        return texto || "Nenhum versículo encontrado nesta faixa.";

    } catch (e: any) {
        console.error("Erro na Tool:", e);
        return `Erro ao buscar versículo: ${e.message}`;
    }
}
