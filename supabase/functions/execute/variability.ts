/**
 * Sistema de Variabilidade - DNA PVC
 * Gerencia ângulos, temperaturas e arquétipos para evitar repetição
 */

// Tipo para Ângulo
export interface Angulo {
    id: string;
    nome: string;
    descricao: string;
    instrucao: string;
    proibicoes: string[];
    substituicoes: Record<string, string>;
}

// Tipo para Temperatura
export interface Temperatura {
    id: string;
    descricao: string;
}

// Ângulos do Caleidoscópio
export const ANGULOS: Angulo[] = [
    {
        id: 'ESPELHO_MODERNO',
        nome: 'O ESPELHO MODERNO',
        descricao: 'Tradução Cultural',
        instrucao: 'Traduza a metáfora bíblica para hoje. Em vez de falar de "carros de guerra", fale de "status" e "influência". Em vez de "leprosos", fale de "excluídos".',
        proibicoes: ['Egito', 'Faraó', 'Carros', 'Cavalos', 'Assíria', 'Babilônia', 'Tenda', 'Espada'],
        substituicoes: {
            'Egito': 'Sistema / Mundo / Atalho fácil',
            'Carros/Cavalos': 'Recursos / Status / Tecnologia / Influência',
            'Espada': 'Palavras / Ações / Defesa',
            'Faraó': 'O Chefe / O Dono da Bola / A Pressão',
            'Assíria': 'O Inimigo / A Crise / A Ansiedade'
        }
    },
    {
        id: 'RAIZ_HISTORICA',
        nome: 'A RAIZ HISTÓRICA',
        descricao: 'Respeito ao Texto',
        instrucao: 'Mantenha os termos originais (Sião, Egito, Pastor, Ovelha), mas extraia uma lição profunda. Exemplo: "Assim como Israel desceu ao Egito, nós voltamos aos velhos hábitos."',
        proibicoes: [],
        substituicoes: {} as Record<string, string>
    },
    {
        id: 'RAIO_X_EMOCIONAL',
        nome: 'O RAIO-X EMOCIONAL',
        descricao: 'Foco na Alma',
        instrucao: 'Ignore o cenário externo e fale só do sentimento. Não fale de guerra nem de boleto. Fale de Medo, Ansiedade, Paz e Esperança. Foque no interior.',
        proibicoes: [],
        substituicoes: {} as Record<string, string>
    },
    {
        id: 'LENTE_DE_JESUS',
        nome: 'A LENTE DE JESUS',
        descricao: 'Cristocêntrico',
        instrucao: 'Conecte esse texto antigo diretamente a Jesus ou à Graça. Mostre como Cristo resolve esse problema.',
        proibicoes: [],
        substituicoes: {} as Record<string, string>
    }
];

// Temperaturas Emocionais
export const TEMPERATURAS: Temperatura[] = [
    { id: 'DEVOCIONAL', descricao: 'DEVOCIONAL E ÍNTIMO: Tom de oração, sussurro e entrega.' },
    { id: 'SAPIENCIAL', descricao: 'SAPIENCIAL E PRÁTICO: Tom de conselho, decisão e ação ("segunda-feira").' },
    { id: 'PROFETICO', descricao: 'PROFÉTICO E DENÚNCIA: Tom firme, urgente, apontando ídolos.' },
    { id: 'CONSOLADOR', descricao: 'CONSOLADOR E PASTORAL: Tom de graça, acolhimento e respiro.' }
];

// Tipo para DNA da geração
export interface DNAGeracao {
    angulo: string;
    temperatura: string;
    arquetipo: string;
    data_ref: string;
}

/**
 * Sorteia um ângulo, opcionalmente excluindo os já usados
 */
export function sortearAngulo(usados: string[] = []): Angulo {
    const disponiveis = ANGULOS.filter(a => !usados.includes(a.id));
    const pool = disponiveis.length > 0 ? disponiveis : ANGULOS;
    return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * Sorteia uma temperatura, opcionalmente excluindo as já usadas
 */
export function sortearTemperatura(usados: string[] = []): Temperatura {
    const disponiveis = TEMPERATURAS.filter(t => !usados.includes(t.id));
    const pool = disponiveis.length > 0 ? disponiveis : TEMPERATURAS;
    return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * Gera instrução de proibição para ângulo ESPELHO_MODERNO
 */
export function gerarProibicao(angulo: Angulo): string {
    if (angulo.id !== 'ESPELHO_MODERNO' || angulo.proibicoes.length === 0) {
        return '';
    }

    const substituicoes = Object.entries(angulo.substituicoes)
        .map(([de, para]) => `    - ${de} -> ${para}`)
        .join('\n');

    return `
⚠️ PROIBIÇÃO ESTRITA (MODO MODERNO ATIVADO):
Neste ângulo, você está PROIBIDO de usar as palavras: ${angulo.proibicoes.join(', ')}.
Você DEVE substituir por termos equivalentes da vida atual:
${substituicoes}

SE VOCÊ USAR "EGITO" OU "CAVALOS" NESTE MODO, A GERAÇÃO FALHARÁ. TRADUZA TUDO.
`;
}

/**
 * Gera a instrução completa de variabilidade para o prompt
 */
export function gerarInstrucaoVariabilidade(
    angulo: Angulo,
    temperatura: Temperatura,
    arquetipoNome: string
): string {
    const proibicao = gerarProibicao(angulo);

    return `
=== [SISTEMA CALEIDOSCÓPIO - NUANCE INFINITA] ===
ATENÇÃO: Para evitar repetição, você deve observar este texto através de um ÂNGULO ESPECÍFICO.
Não use sempre a mesma fórmula.

🎲 SEU ÂNGULO SORTEADO PARA ESTA EXECUÇÃO:
ÂNGULO: ${angulo.nome} (${angulo.descricao})
${angulo.instrucao}

🌡️ SUA TEMPERATURA EMOCIONAL:
${temperatura.descricao}

👤 SEU ARQUÉTIPO ESTRUTURAL:
${arquetipoNome}

${proibicao}

⚠️ INSTRUÇÃO DE MIXAGEM (CRUCIAL):
1. O ÂNGULO define "DO QUE" você fala. Obedeça o ângulo sorteado para esta execução.
2. A TEMPERATURA define "COMO" você fala (se está orando, aconselhando ou exortando).
3. O ARQUÉTIPO define a ESTRUTURA (o esqueleto do texto).

REGRAS FINAIS DE NUANCE:
- Se o ângulo for "RAIZ HISTÓRICA", use os termos bíblicos (Egito, Tenda).
- Se o ângulo for "ESPELHO MODERNO", obedeça a PROIBIÇÃO acima. Traduza tudo para vida urbana atual.
- Se o ângulo for "RAIO-X EMOCIONAL", foque apenas no sentimento humano.
- Varie. Surpreenda. Não seja robótico.
==================================================
`;
}
