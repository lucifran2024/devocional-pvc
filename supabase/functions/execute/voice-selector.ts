// =====================================================
// Voice Selector - Seletor de Voz Dinâmica por Gênero Bíblico
// Usado pela Edge Function /execute
// =====================================================

// Mapeamento de livros da Bíblia para gêneros/vozes
const VOICE_MAP: Record<string, string> = {
    // POÉTICO - Contemplativa, ritmo lento, imagens
    'Salmos': 'POETICA',
    'Salmo': 'POETICA',
    'Sl': 'POETICA',
    'Cânticos': 'POETICA',
    'Cantares': 'POETICA',
    'Ct': 'POETICA',
    'Lamentações': 'POETICA',
    'Lm': 'POETICA',

    // SAPIENCIAL - Conselheira, causa-efeito
    'Provérbios': 'SAPIENCIAL',
    'Pv': 'SAPIENCIAL',
    'Eclesiastes': 'SAPIENCIAL',
    'Ec': 'SAPIENCIAL',
    'Tiago': 'SAPIENCIAL',
    'Tg': 'SAPIENCIAL',
    'Jó': 'SAPIENCIAL',

    // PROFÉTICO - Urgente, confronto, convocação
    'Isaías': 'PROFETICA',
    'Is': 'PROFETICA',
    'Jeremias': 'PROFETICA',
    'Jr': 'PROFETICA',
    'Ezequiel': 'PROFETICA',
    'Ez': 'PROFETICA',
    'Daniel': 'PROFETICA',
    'Dn': 'PROFETICA',
    'Oséias': 'PROFETICA',
    'Os': 'PROFETICA',
    'Joel': 'PROFETICA',
    'Jl': 'PROFETICA',
    'Amós': 'PROFETICA',
    'Am': 'PROFETICA',
    'Obadias': 'PROFETICA',
    'Ob': 'PROFETICA',
    'Jonas': 'PROFETICA',
    'Jn': 'PROFETICA',
    'Miquéias': 'PROFETICA',
    'Mq': 'PROFETICA',
    'Naum': 'PROFETICA',
    'Na': 'PROFETICA',
    'Habacuque': 'PROFETICA',
    'Hc': 'PROFETICA',
    'Sofonias': 'PROFETICA',
    'Sf': 'PROFETICA',
    'Ageu': 'PROFETICA',
    'Ag': 'PROFETICA',
    'Zacarias': 'PROFETICA',
    'Zc': 'PROFETICA',
    'Malaquias': 'PROFETICA',
    'Ml': 'PROFETICA',
    'Apocalipse': 'PROFETICA',
    'Ap': 'PROFETICA',

    // NARRATIVO - Contador de histórias, cenas, ação
    'Gênesis': 'NARRATIVA',
    'Gn': 'NARRATIVA',
    'Êxodo': 'NARRATIVA',
    'Ex': 'NARRATIVA',
    'Levítico': 'NARRATIVA',
    'Lv': 'NARRATIVA',
    'Números': 'NARRATIVA',
    'Nm': 'NARRATIVA',
    'Deuteronômio': 'NARRATIVA',
    'Dt': 'NARRATIVA',
    'Josué': 'NARRATIVA',
    'Js': 'NARRATIVA',
    'Juízes': 'NARRATIVA',
    'Jz': 'NARRATIVA',
    'Rute': 'NARRATIVA',
    'Rt': 'NARRATIVA',
    '1 Samuel': 'NARRATIVA',
    '1Sm': 'NARRATIVA',
    '2 Samuel': 'NARRATIVA',
    '2Sm': 'NARRATIVA',
    '1 Reis': 'NARRATIVA',
    '1Rs': 'NARRATIVA',
    '2 Reis': 'NARRATIVA',
    '2Rs': 'NARRATIVA',
    '1 Crônicas': 'NARRATIVA',
    '1Cr': 'NARRATIVA',
    '2 Crônicas': 'NARRATIVA',
    '2Cr': 'NARRATIVA',
    'Esdras': 'NARRATIVA',
    'Ed': 'NARRATIVA',
    'Neemias': 'NARRATIVA',
    'Ne': 'NARRATIVA',
    'Ester': 'NARRATIVA',
    'Et': 'NARRATIVA',
    'Mateus': 'NARRATIVA',
    'Mt': 'NARRATIVA',
    'Marcos': 'NARRATIVA',
    'Mc': 'NARRATIVA',
    'Lucas': 'NARRATIVA',
    'Lc': 'NARRATIVA',
    'João': 'NARRATIVA',
    'Jo': 'NARRATIVA',
    'Atos': 'NARRATIVA',
    'At': 'NARRATIVA',

    // DOUTRINÁRIO - Expositiva, lógica, clareza
    'Romanos': 'DOUTRINARIA',
    'Rm': 'DOUTRINARIA',
    'Gálatas': 'DOUTRINARIA',
    'Gl': 'DOUTRINARIA',
    'Efésios': 'DOUTRINARIA',
    'Ef': 'DOUTRINARIA',
    'Colossenses': 'DOUTRINARIA',
    'Cl': 'DOUTRINARIA',
    'Hebreus': 'DOUTRINARIA',
    'Hb': 'DOUTRINARIA',
    '1 Coríntios': 'DOUTRINARIA',
    '1Co': 'DOUTRINARIA',
    '2 Coríntios': 'DOUTRINARIA',
    '2Co': 'DOUTRINARIA',

    // PASTORAL - Acolhedora, encorajamento
    'Filipenses': 'PASTORAL',
    'Fp': 'PASTORAL',
    '1 Tessalonicenses': 'PASTORAL',
    '1Ts': 'PASTORAL',
    '2 Tessalonicenses': 'PASTORAL',
    '2Ts': 'PASTORAL',
    '1 Timóteo': 'PASTORAL',
    '1Tm': 'PASTORAL',
    '2 Timóteo': 'PASTORAL',
    '2Tm': 'PASTORAL',
    'Tito': 'PASTORAL',
    'Tt': 'PASTORAL',
    'Filemom': 'PASTORAL',
    'Fm': 'PASTORAL',
    '1 Pedro': 'PASTORAL',
    '1Pe': 'PASTORAL',
    '2 Pedro': 'PASTORAL',
    '2Pe': 'PASTORAL',
    '1 João': 'PASTORAL',
    '1Jo': 'PASTORAL',
    '2 João': 'PASTORAL',
    '2Jo': 'PASTORAL',
    '3 João': 'PASTORAL',
    '3Jo': 'PASTORAL',
    'Judas': 'PASTORAL',
    'Jd': 'PASTORAL',
};

// Instruções detalhadas para cada tipo de voz
const VOICE_INSTRUCTIONS: Record<string, string> = {
    POETICA: `
🎵 VOZ: CONTEMPLATIVA/POÉTICA (Livros de Poesia)
- Ritmo LENTO, frases respiradas, pausas significativas
- Use IMAGENS ricas: luz, sombra, água, montanha, céu, vento
- Permita SILÊNCIOS ("..." ou frases incompletas que convidam reflexão)
- Tom de SUSSURRO e reverência, como quem está no santo dos santos
- Comece com contemplação, não com instrução
- EXEMPLO: "A alma encontra um lugar de descanso... não nas respostas que procura, mas na Presença que a sustenta."
- EVITE: frases imperativas demais, listas, tom de urgência
`,

    SAPIENCIAL: `
📖 VOZ: CONSELHEIRA/SAPIENCIAL (Livros de Sabedoria)
- Tom de PAI EXPERIENTE conversando com filho
- Use CAUSA → EFEITO: "Quem faz X, colhe Y"
- Frases CURTAS e decisivas, como provérbios
- CONTRASTES claros: "O tolo... mas o sábio..."
- Observações sobre a VIDA REAL: trabalho, dinheiro, relacionamentos
- EXEMPLO: "A pressa destrói mais do que constrói. Quem para para pensar, chega mais longe."
- EVITE: abstração excessiva, poesia longa, emoção sem direção
`,

    PROFETICA: `
⚡ VOZ: URGENTE/PROFÉTICA (Livros Proféticos)
- Tom de CONVOCAÇÃO e alerta, como quem traz mensagem do Rei
- Frases CURTAS e impactantes, ritmo staccato
- Use linguagem de DECRETO: "Assim diz o Senhor", "Volte!", "Escolha hoje"
- CONFRONTO DIRETO mas sempre com porta de esperança no final
- Aponte o PROBLEMA antes de oferecer a SOLUÇÃO
- EXEMPLO: "Você construiu cisternas rachadas. Água que não sustenta. Volte para a Fonte."
- EVITE: suavização excessiva, tom amigável demais, perder a urgência
`,

    NARRATIVA: `
📜 VOZ: CONTADOR DE HISTÓRIAS (Livros Narrativos/Evangelhos)
- ENTRE NA CENA: "Imagine...", "Veja...", "Enquanto..."
- Use VERBOS DE AÇÃO: chegou, disse, levantou, olhou, tocou
- Descreva o AMBIENTE e as EMOÇÕES dos personagens
- Faça o leitor SE VER na história bíblica
- Conecte a cena antiga com uma cena do HOJE
- EXEMPLO: "Pedro afundava. A água já cobria os ombros. E foi ali, no desespero, que ele finalmente estendeu a mão."
- EVITE: abstração teológica fria, explicar demais sem mostrar
`,

    DOUTRINARIA: `
🎓 VOZ: EXPOSITIVA/CLARA (Cartas Doutrinárias)
- LÓGICA clara: "Portanto", "Porque", "Assim", "Logo"
- Explique a RAZÃO teológica por trás da verdade
- Menos emoção, mais CLAREZA e estrutura
- Conecte a doutrina com a PRÁTICA
- Use perguntas retóricas: "Se isso é verdade, então..."
- EXEMPLO: "Se Deus é por nós, a oposição não muda o resultado. A lógica do Reino inverte o medo."
- EVITE: só emoção sem explicação, poesia sem substância
`,

    PASTORAL: `
💚 VOZ: ACOLHEDORA/PASTORAL (Cartas Pastorais)
- Use "irmãos", "queridos", linguagem de FAMÍLIA
- Tom de ENCORAJAMENTO e carinho paternal/maternal
- VALIDE a dor ANTES de instruir
- Reconheça a LUTA antes de apontar o caminho
- Termine com ABRAÇO verbal: "Você não está sozinho"
- EXEMPLO: "Eu sei que está pesado. O caminho parece longo. Mas você não caminha sozinho — nunca caminhou."
- EVITE: confronto duro demais, frieza, distância emocional
`
};

/**
 * Extrai o nome do livro de uma referência bíblica
 * Ex: "Isaías 30:15" → "Isaías"
 * Ex: "1 Coríntios 13" → "1 Coríntios"
 */
function extractBookName(passagem: string): string {
    if (!passagem) return '';

    // Limpar espaços extras
    const cleaned = passagem.trim();

    // Padrão para livros com número (1 João, 2 Reis, etc)
    const numberedBookMatch = cleaned.match(/^(\d\s*\w+)/);
    if (numberedBookMatch) {
        // Extrair até o primeiro número de capítulo/versículo
        const parts = cleaned.split(/\s+\d+[:\-]/);
        if (parts[0]) {
            return parts[0].trim();
        }
    }

    // Padrão para livros simples (Isaías, Mateus, etc)
    const simpleMatch = cleaned.split(/\s+\d/)[0];
    return simpleMatch ? simpleMatch.trim() : cleaned;
}

/**
 * Retorna a voz e instruções baseado na passagem do dia
 */
export function getVoiceForPassage(passagem: string): {
    voiceType: string;
    instructions: string;
    bookName: string;
} {
    const bookName = extractBookName(passagem);
    const voiceType = VOICE_MAP[bookName] || 'PASTORAL'; // fallback para pastoral
    const instructions = VOICE_INSTRUCTIONS[voiceType] || VOICE_INSTRUCTIONS.PASTORAL;

    console.log(`🎤 [VOICE] Passagem: "${passagem}" → Livro: "${bookName}" → Voz: ${voiceType}`);

    return { voiceType, instructions, bookName };
}

/**
 * Formata a seção de voz para o prompt
 */
export function formatVoiceSection(passagem: string): string {
    const { voiceType, instructions, bookName } = getVoiceForPassage(passagem);

    return `
### [VOZ_DO_DIA] ⭐⭐ AJUSTE DE VOZ BASEADO NO GÊNERO BÍBLICO

📚 Livro: ${bookName}
🎭 Gênero: ${voiceType}

${instructions}

⚠️ IMPORTANTE: Esta voz tem PRIORIDADE sobre a VPU padrão. 
Adapte seu tom conforme o gênero do texto bíblico de hoje.
`;
}
