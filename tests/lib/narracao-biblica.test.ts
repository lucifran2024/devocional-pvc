import { describe, it, expect } from 'vitest';
import {
    anuncioDoCapitulo, separarVerso, pausaDepois, fimDoTexto, tituloFalado, prepararVersos,
    comTitulosDeSecao, assinaturaDosTitulos, montarFalas, montarBlocos,
    ssmlDoBloco, segmentosDoBloco, silabas, PAUSA, SILENCIO, type Fala,
} from '@/lib/narracao-biblica';
import { getPericopes } from '@/lib/bible-pericopes';
import {
    escolherVozNarracao, VOZ_PADRAO, VOZES_NARRACAO, estiloDaVoz,
    VOZ_VOICESTUDIO_MASCULINA, VOZ_AZURE_RESERVA, vozAzureDeReserva,
} from '@/lib/vozes-narracao';
import { gravacaoVoiceStudio } from '@/lib/narracao-voicestudio';

// Trecho real da NTLH como vem da bolls.life (Salmo 23:1-2)
const SALMO_23 = [
    { verse: 1, text: '<b>Salmo de Davi.</b> O SENHOR é o meu pastor: <br>nada me faltará. <br>' },
    { verse: 2, text: 'Ele me faz descansar <br>em pastos verdes <br>e me leva a águas tranquilas. <br>' },
];

describe('narração bíblica — texto', () => {
    it('separa o título do salmo, as linhas do poema e normaliza SENHOR', () => {
        const { titulo, linhas } = separarVerso(SALMO_23[0].text);
        expect(titulo).toBe('Salmo de Davi.');
        expect(linhas).toEqual(['O Senhor é o meu pastor:', 'nada me faltará.']);
    });

    it('reconhece como o versículo termina', () => {
        expect(fimDoTexto('e me leva a águas tranquilas.')).toBe('frase');
        expect(fimDoTexto('Ele disse: “Venham!”')).toBe('frase');
        expect(fimDoTexto('O SENHOR é o meu pastor:')).toBe('doisPontos');
        expect(fimDoTexto('para o bem de vocês,')).toBe('virgula');
        expect(fimDoTexto('perto dos teus altares')).toBe('aberto');
    });

    // 12/11/2026: a voz já respira na pontuação; o SSML só acrescenta nos dois-pontos.
    it('só os dois-pontos ganham pausa a mais', () => {
        expect(pausaDepois('O Senhor Deus diz:')).toBe(PAUSA.doisPontos);
        expect(pausaDepois('e me leva a águas tranquilas.')).toBe(0);
        expect(pausaDepois('para o bem de vocês,')).toBe(0);
        expect(pausaDepois('perto dos teus altares')).toBe(0);
    });

    it('anuncia o capítulo como se fala, sem vírgula depois do livro', () => {
        expect(anuncioDoCapitulo(19, 23)).toBe('Salmo 23.');
        expect(anuncioDoCapitulo(1, 1)).toBe('Gênesis capítulo 1.');
        expect(anuncioDoCapitulo(9, 3)).toBe('Primeiro Samuel capítulo 3.');
        expect(anuncioDoCapitulo(65, 1)).toBe('Judas.');
    });

    it('título vira frase própria', () => {
        expect(tituloFalado('Consolo para Sião')).toBe('Consolo para Sião.');
        expect(tituloFalado('Salmo de Davi.')).toBe('Salmo de Davi.');
        expect(tituloFalado('  ')).toBe('');
    });

    it('anuncia só onde o capítulo começa, inclusive no meio de uma parte do plano', () => {
        const versos = prepararVersos([
            { verse: 30, chapter: 1, text: 'E assim aconteceu.' },
            { verse: 31, chapter: 1, text: 'Deus viu que tudo era muito bom.' },
            { verse: 1, chapter: 2, text: 'Assim foram terminados o céu e a terra.' },
        ], 1);
        const falas = montarFalas(versos, 1);
        expect(falas.map(f => (f.tipo === 'anuncio' ? f.texto : `${f.verso.chapter}:${f.verso.verse}`)))
            .toEqual(['1:30', '1:31', 'Gênesis capítulo 2.', '2:1']);
    });
});

describe('narração bíblica — blocos e SSML', () => {
    it('corta o bloco no fim de uma frase, não no meio', () => {
        const longo = 'palavra '.repeat(40).trim();
        const versos = prepararVersos([
            { verse: 1, text: `${longo},` },
            { verse: 2, text: `${longo},` },
            { verse: 3, text: `${longo}.` },
            { verse: 4, text: `${longo}.` },
        ], 1);
        const blocos = montarBlocos(montarFalas(versos, 40).slice(1), 500, 2000);
        const fimDoPrimeiro = blocos[0][blocos[0].length - 1] as Extract<Fala, { tipo: 'verso' }>;
        expect(blocos.length).toBe(2);
        expect(fimDoPrimeiro.verso.verse).toBe(3);
    });

    it('monta SSML com pausas, estilo só quando pedido e escapa o texto', () => {
        const falas = montarFalas(prepararVersos([...SALMO_23, { verse: 3, text: 'Pão & vinho <br>' }], 23), 19);
        const ssml = ssmlDoBloco(falas, { voz: 'pt-BR-FranciscaNeural', estilo: 'calm' });
        expect(ssml).toContain("<voice name='pt-BR-FranciscaNeural'>");
        expect(ssml).toContain("<mstts:express-as style='calm'>");
        expect(ssml).toContain(`Salmo 23.<break time='${PAUSA.anuncio}ms'/>`);
        expect(ssml).toContain(`Salmo de Davi.<break time='${PAUSA.titulo}ms'/>`);
        expect(ssml).toContain(`O Senhor é o meu pastor:<break time='${PAUSA.doisPontos}ms'/>nada me faltará.`);
        expect(ssml).toContain(`<mstts:silence type='Sentenceboundary' value='${SILENCIO.entreFrases}ms'/>`);
        expect(ssml).toContain(`<mstts:silence type='Comma-exact' value='${SILENCIO.virgula}ms'/>`);
        expect(ssml).toContain('Pão &amp; vinho');
        expect(ssml).not.toContain('<b>');

        const semEstilo = ssmlDoBloco(falas, { voz: 'pt-BR-ThalitaMultilingualNeural' });
        expect(semEstilo).not.toContain('express-as');
        expect(semEstilo).toContain("<lang xml:lang='pt-BR'>");
    });

    // 28/10/2026: ele ouviu a "frase corrida" e ficou com a leitura de então.
    // 12/11/2026: pediu o ritmo da leitura de referência; agora é o padrão.
    it('só a pontuação pausa: a frase que continua é lida corrida', () => {
        const falas = montarFalas(prepararVersos([
            ...SALMO_23,
            { verse: 3, text: 'Ele me dá novas forças <br>e me guia' },
            { verse: 4, text: 'por caminhos certos.' },
        ], 23), 19);
        const ssml = ssmlDoBloco(falas, { voz: 'pt-BR-MacerioMultilingualNeural' });
        expect(ssml).toContain('em pastos verdes e me leva');
        expect(ssml).toContain('e me guia por caminhos certos.');
        expect(ssml).toContain('nada me faltará. Ele me faz descansar');
        // fora anúncio, título e dois-pontos, nenhuma pausa forçada
        expect(ssml.match(/<break /g)?.length).toBe(3);
    });

    it('lê o título da seção antes do versículo em que ela começa', () => {
        const versos = comTitulosDeSecao(
            prepararVersos([
                { verse: 1, text: 'O SENHOR Deus diz: <br>“Escutem, os que procuram a salvação! <br>' },
                { verse: 16, text: 'Eu sou o seu Deus.” <br>' },
                { verse: 17, text: 'Acorde, Jerusalém, acorde e levante-se! <br>' },
            ], 51),
            (cap, v) => getPericopes(23, cap).find(p => p.verse === v)?.title,
        );
        expect(versos.map(v => v.secao)).toEqual(['Consolo para Sião.', '', 'O Cálice da Ira.']);
        const ssml = ssmlDoBloco(montarFalas(versos, 23), { voz: 'pt-BR-MacerioMultilingualNeural' });
        // logo depois do anúncio, sem pausa extra antes
        expect(ssml).toContain(
            `Isaías capítulo 51.<break time='${PAUSA.anuncio}ms'/> Consolo para Sião.<break time='${PAUSA.titulo}ms'/>O Senhor Deus diz:`,
        );
        // no meio do capítulo, pausa maior antes do título
        expect(ssml).toContain(
            `Eu sou o seu Deus.” <break time='${PAUSA.antesDoTitulo}ms'/>O Cálice da Ira.<break time='${PAUSA.titulo}ms'/>Acorde, Jerusalém`,
        );
        expect(assinaturaDosTitulos(versos)).not.toBe('');
        expect(assinaturaDosTitulos(prepararVersos([{ verse: 2, text: 'Sem título.' }], 51))).toBe('');
    });

    it('salmo: título da seção e depois o cabeçalho do próprio salmo', () => {
        const versos = comTitulosDeSecao(prepararVersos(SALMO_23, 23), (_c, v) => (v === 1 ? 'O Senhor é o Meu Pastor' : ''));
        const ssml = ssmlDoBloco(montarFalas(versos, 19), { voz: 'pt-BR-AntonioNeural' });
        expect(ssml).toContain(
            `O Senhor é o Meu Pastor.<break time='${PAUSA.titulo}ms'/>Salmo de Davi.<break time='${PAUSA.titulo}ms'/>O Senhor é o meu pastor:`,
        );
    });

    it('todo capítulo da Bíblia tem título de seção para ler', () => {
        expect(getPericopes(1, 1).length).toBeGreaterThan(0);
        expect(getPericopes(23, 51)[0]).toEqual({ verse: 1, title: 'Consolo para Sião' });
        expect(getPericopes(66, 22).length).toBeGreaterThan(0);
    });

    it('os tempos dos versículos seguem em ordem e fecham na duração do áudio', () => {
        const falas = montarFalas(prepararVersos(SALMO_23, 23), 19);
        const segs = segmentosDoBloco(falas, 20, 10);
        expect(segs.map(s => s.verse)).toEqual([1, 2]);
        expect(segs[0].start).toBeGreaterThan(10.5); // depois do anúncio
        expect(segs[1].start).toBeCloseTo(segs[0].end, 5);
        expect(segs[1].end).toBeCloseTo(30, 5);
    });

    it('número conta como fala longa', () => {
        expect(silabas('Salmo 23.')).toBeGreaterThan(silabas('Salmo dois.'));
    });
});

describe('vozes da narração', () => {
    it('aceita só as vozes da lista', () => {
        expect(escolherVozNarracao('pt-BR-MacerioMultilingualNeural')).toBe('pt-BR-MacerioMultilingualNeural');
        expect(escolherVozNarracao("pt-BR-X'/><voice name='y")).toBe(VOZ_PADRAO);
        expect(escolherVozNarracao(undefined)).toBe(VOZ_PADRAO);
        expect(VOZES_NARRACAO.length).toBeGreaterThanOrEqual(4);
    });

    it('só a Francisca usa o estilo calmo', () => {
        expect(estiloDaVoz('pt-BR-FranciscaNeural')).toBe('calm');
        expect(estiloDaVoz('pt-BR-ThalitaMultilingualNeural')).toBe('');
    });

    it('prioriza a voz masculina aprovada e preserva as vozes Azure anteriores', () => {
        expect(VOZ_PADRAO).toBe(VOZ_VOICESTUDIO_MASCULINA);
        expect(escolherVozNarracao(VOZ_VOICESTUDIO_MASCULINA)).toBe(VOZ_VOICESTUDIO_MASCULINA);
        expect(vozAzureDeReserva(VOZ_VOICESTUDIO_MASCULINA)).toBe(VOZ_AZURE_RESERVA);
        expect(vozAzureDeReserva('pt-BR-ThalitaMultilingualNeural')).toBe('pt-BR-ThalitaMultilingualNeural');
        expect(VOZES_NARRACAO.length).toBe(5);
    });

    it('não serve gravação de outra tradução, capítulo ou leitura parcial', () => {
        expect(gravacaoVoiceStudio(19, 23, SALMO_23)).toBeNull();
        expect(gravacaoVoiceStudio(19, 22, SALMO_23)).toBeNull();
        expect(gravacaoVoiceStudio(40, 23, SALMO_23)).toBeNull();
        expect(gravacaoVoiceStudio(19, 23, [
            ...SALMO_23,
            { verse: 3, text: 'texto incorreto' },
            { verse: 4, text: 'texto incorreto' },
            { verse: 5, text: 'texto incorreto' },
            { verse: 6, text: 'texto incorreto' },
        ])).toBeNull();
    });
});
