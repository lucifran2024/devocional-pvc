// Versículos curados — frases fortes, curtas, compartilháveis.
// Compartilhado entre o widget do app (RandomVerse) e o push do versículo
// do dia, para que ambos mostrem exatamente o mesmo versículo por data.

export interface Verse {
    text: string;
    ref: string;
}

export const VERSES: Verse[] = [
    { text: 'O Senhor é o meu pastor; nada me faltará.', ref: 'Salmos 23:1' },
    { text: 'Posso todas as coisas naquele me fortalece.', ref: 'Filipenses 4:13' },
    { text: 'Confia no Senhor de todo o teu coração e não te estribes no teu próprio entendimento.', ref: 'Provérbios 3:5' },
    { text: 'Porque eu bem sei os pensamentos que penso de vós, diz o Senhor; pensamentos de paz e não de mal, para vos dar o fim que esperais.', ref: 'Jeremias 29:11' },
    { text: 'Mas os que esperam no Senhor renovarão as suas forças, levantarão as asas como águias; correrão, e não se cansarão; caminharão, e não se enfadarão.', ref: 'Isaías 40:31' },
    { text: 'Lancem sobre Ele toda a ansiedade, porque Ele cuida de vocês.', ref: '1 Pedro 5:7' },
    { text: 'Perto está o Senhor dos que têm o coração quebrantado; e salva os de espírito oprimido.', ref: 'Salmos 34:18' },
    { text: 'Não temas, porque eu sou contigo; não te assombres, porque eu sou o teu Deus; eu te fortaleço, e te ajudo, e te sustento com a destra da minha justiça.', ref: 'Isaías 41:10' },
    { text: 'Bendirei o Senhor em todo o tempo; o seu louvor estará continuamente na minha boca.', ref: 'Salmos 34:1' },
    { text: 'O Senhor é a minha luz e a minha salvação; a quem temerei?', ref: 'Salmos 27:1' },
    { text: 'E sabemos que todas as coisas contribuem juntamente para o bem daqueles que amam a Deus.', ref: 'Romanos 8:28' },
    { text: 'Porque Deus não nos deu espírito de covardia, mas de poder, de amor e de moderação.', ref: '2 Timóteo 1:7' },
    { text: 'Entrega o teu caminho ao Senhor; confia nele, e ele tudo fará.', ref: 'Salmos 37:5' },
    { text: 'Alegrai-vos sempre no Senhor; outra vez digo, alegrai-vos.', ref: 'Filipenses 4:4' },
    { text: 'Se Deus é por nós, quem será contra nós?', ref: 'Romanos 8:31' },
    { text: 'Clama a mim, e responder-te-ei, e anunciar-te-ei coisas grandes e firmes, que não sabes.', ref: 'Jeremias 33:3' },
    { text: 'O Senhor é bom, fortaleza no dia da tribulação; e conhece os que nele confiam.', ref: 'Naum 1:7' },
    { text: 'Vinde a mim, todos os que estais cansados e sobrecarregados, e eu vos aliviarei.', ref: 'Mateus 11:28' },
    { text: 'Mas buscai primeiro o reino de Deus, e a sua justiça, e todas estas cousas vos serão acrescentadas.', ref: 'Mateus 6:33' },
    { text: 'Porque onde estiverem dois ou três reunidos em meu nome, ali estou no meio deles.', ref: 'Mateus 18:20' },
    { text: 'Porque Deus amou o mundo de tal maneira que deu o seu Filho unigênito, para que todo aquele que nele crê não pereça, mas tenha a vida eterna.', ref: 'João 3:16' },
    { text: 'Deus é o nosso refúgio e fortaleza, socorro bem presente na angústia.', ref: 'Salmos 46:1' },
    { text: 'Não estejais inquietos por coisa alguma; antes, as vossas petições sejam em tudo conhecidas diante de Deus, pela oração e súplica, com ação de graças.', ref: 'Filipenses 4:6' },
    { text: 'Esforça-te, e tem bom ânimo; não temas, nem te espantes, porque o Senhor teu Deus é contigo por onde quer que andares.', ref: 'Josué 1:9' },
    { text: 'Lâmpada para os meus pés é a tua palavra, e luz para o meu caminho.', ref: 'Salmos 119:105' },
    { text: 'Confia ao Senhor as tuas obras, e teus pensamentos serão estabelecidos.', ref: 'Provérbios 16:3' },
    { text: 'Assim que, se alguém está em Cristo, nova criatura é; as coisas velhas já passaram; eis que tudo se fez novo.', ref: '2 Coríntios 5:17' },
    { text: 'Ora, a fé é o firme fundamento das coisas que se esperam, e a prova das coisas que se não veem.', ref: 'Hebreus 11:1' },
    { text: 'E, se algum de vós tem falta de sabedoria, peça-a a Deus, que a todos dá liberalmente e o não lança em rosto, e ser-lhe-á dada.', ref: 'Tiago 1:5' },
    { text: 'O meu socorro vem do Senhor, que fez o céu e a terra.', ref: 'Salmos 121:2' },
    { text: 'Disse-lhe Jesus: Eu sou o caminho, e a verdade, e a vida; ninguém vem ao Pai senão por mim.', ref: 'João 14:6' },
    { text: 'E não vos conformeis com este mundo, mas transformai-vos pela renovação do vosso entendimento.', ref: 'Romanos 12:2' },
    { text: 'Deleita-te também no Senhor, e ele te concederá o que deseja o teu coração.', ref: 'Salmos 37:4' },
    { text: 'Tu conservarás em paz aquele cuja mente está firme em ti; porque ele confia em ti.', ref: 'Isaías 26:3' },
    { text: 'As misericórdias do Senhor são a causa de não sermos consumidos; renovam-se cada manhã; grande é a tua fidelidade.', ref: 'Lamentações 3:22-23' },
    { text: 'O Senhor teu Deus está no meio de ti, poderoso para te salvar; ele se deleitará em ti com alegria.', ref: 'Sofonias 3:17' },
    { text: 'O Senhor pelejará por vós, e vós vos calareis.', ref: 'Êxodo 14:14' },
    { text: 'Esforçai-vos, e animai-vos; não temais, porque o Senhor teu Deus é o que vai contigo; não te deixará nem te desamparará.', ref: 'Deuteronômio 31:6' },
    { text: 'Estas coisas vos tenho dito para que em mim tenhais paz; no mundo tereis aflições, mas tende bom ânimo, eu venci o mundo.', ref: 'João 16:33' },
];

/**
 * Índice do versículo do dia — rotação sequencial que percorre TODOS os
 * versículos antes de repetir. Opcionalmente aceita uma data 'YYYY-MM-DD'
 * (usada no servidor com o fuso de São Paulo); sem argumento usa hoje local.
 */
export function getDailyVerseIndex(dataStr?: string): number {
    let numeroDoDia: number;
    if (dataStr) {
        const [y, m, d] = dataStr.split('-').map(Number);
        numeroDoDia = Math.floor(Date.UTC(y, m - 1, d) / 86400000);
    } else {
        const hoje = new Date();
        numeroDoDia = Math.floor(Date.UTC(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()) / 86400000);
    }
    return ((numeroDoDia % VERSES.length) + VERSES.length) % VERSES.length;
}

export function getDailyVerse(dataStr?: string): Verse {
    return VERSES[getDailyVerseIndex(dataStr)];
}
