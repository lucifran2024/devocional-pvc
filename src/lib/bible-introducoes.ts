// ===========================================
// INTRODUÇÕES DOS LIVROS DA BÍBLIA
// Contexto pré-escrito (sem IA) para exibir ao carregar cada parte da
// leitura: quem escreveu, quando, o tema central e um resumo curto.
// Formato: livroId (1-66) -> IntroducaoLivro
// ===========================================

export interface IntroducaoLivro {
    categoria: string; // Ex.: "Lei", "Histórico", "Evangelho", "Carta de Paulo"
    autor: string;
    epoca: string;
    tema: string;
    resumo: string;
}

const INTRODUCOES: Record<number, IntroducaoLivro> = {
    // ===== PENTATEUCO (Lei) =====
    1: { categoria: 'Lei', autor: 'Moisés (tradição)', epoca: 'séc. XV–XIII a.C.', tema: 'As origens', resumo: 'O começo de tudo: a criação, a queda do ser humano e o chamado dos patriarcas — Abraão, Isaque, Jacó e José. Deus escolhe um povo para abençoar todas as nações.' },
    2: { categoria: 'Lei', autor: 'Moisés (tradição)', epoca: 'séc. XV–XIII a.C.', tema: 'Libertação', resumo: 'Deus liberta Israel da escravidão no Egito por meio de Moisés, faz aliança no Sinai e entrega os Dez Mandamentos. Nasce um povo livre para servir a Deus.' },
    3: { categoria: 'Lei', autor: 'Moisés (tradição)', epoca: 'séc. XV–XIII a.C.', tema: 'Santidade', resumo: 'Leis sobre sacrifícios, pureza e adoração. O tema é a santidade: como um povo pecador pode viver perto de um Deus santo.' },
    4: { categoria: 'Lei', autor: 'Moisés (tradição)', epoca: 'séc. XV–XIII a.C.', tema: 'A peregrinação', resumo: 'Os quarenta anos de Israel no deserto: censos, murmurações e a incredulidade que adia a entrada na Terra Prometida. Deus permanece fiel apesar da falha do povo.' },
    5: { categoria: 'Lei', autor: 'Moisés (tradição)', epoca: 'séc. XV–XIII a.C.', tema: 'A aliança renovada', resumo: 'Os discursos finais de Moisés à beira da Terra Prometida, relembrando a lei e chamando o povo a amar e obedecer a Deus de coração.' },

    // ===== HISTÓRICOS =====
    6: { categoria: 'Histórico', autor: 'Josué / tradição', epoca: 'séc. XIV–XIII a.C.', tema: 'A conquista', resumo: 'Sob a liderança de Josué, Israel entra e conquista a Terra Prometida. Deus cumpre a promessa feita aos patriarcas.' },
    7: { categoria: 'Histórico', autor: 'Tradição (Samuel?)', epoca: 'período dos juízes', tema: 'Ciclos de queda', resumo: 'Sem um rei, Israel vive ciclos de pecado, opressão, clamor e libertação por juízes como Gideão e Sansão. "Cada um fazia o que achava certo."' },
    8: { categoria: 'Histórico', autor: 'Tradição (Samuel?)', epoca: 'período dos juízes', tema: 'Lealdade e redenção', resumo: 'A história de Rute, a moabita que se torna bisavó do rei Davi. Um retrato de lealdade, bondade e da graça de Deus incluindo estrangeiros.' },
    9: { categoria: 'Histórico', autor: 'Tradição', epoca: 'séc. XI a.C.', tema: 'O nascimento da monarquia', resumo: 'Samuel, Saul e a ascensão de Davi. Israel pede um rei; Deus concede, mas mostra que o coração importa mais que a aparência.' },
    10: { categoria: 'Histórico', autor: 'Tradição', epoca: 'séc. X a.C.', tema: 'O reinado de Davi', resumo: 'O reinado de Davi em seus altos e baixos — vitórias, pecado com Bate-Seba e consequências. Deus promete a Davi um trono eterno.' },
    11: { categoria: 'Histórico', autor: 'Tradição', epoca: 'séc. X–IX a.C.', tema: 'Salomão e a divisão', resumo: 'A glória de Salomão e a construção do Templo, seguidas pela divisão do reino em Israel (norte) e Judá (sul). Começa a decadência.' },
    12: { categoria: 'Histórico', autor: 'Tradição', epoca: 'até o séc. VI a.C.', tema: 'O exílio', resumo: 'A história dos dois reinos até a queda: Israel cai para a Assíria e Judá para a Babilônia. O pecado leva ao exílio, como os profetas advertiram.' },
    13: { categoria: 'Histórico', autor: 'Esdras (tradição)', epoca: 'pós-exílio, séc. V a.C.', tema: 'A linhagem de Davi', resumo: 'Recontagem da história desde Adão até Davi, com foco no culto e na linhagem real. Escrito para os que voltaram do exílio recuperarem sua identidade.' },
    14: { categoria: 'Histórico', autor: 'Esdras (tradição)', epoca: 'pós-exílio, séc. V a.C.', tema: 'O Templo e a adoração', resumo: 'A história dos reis de Judá com ênfase no Templo e nos avivamentos. Um chamado para o povo voltar a adorar corretamente.' },
    15: { categoria: 'Histórico', autor: 'Esdras', epoca: 'pós-exílio, séc. V a.C.', tema: 'A volta do exílio', resumo: 'O retorno dos judeus da Babilônia e a reconstrução do Templo. Esdras lidera uma reforma espiritual baseada na Palavra de Deus.' },
    16: { categoria: 'Histórico', autor: 'Neemias', epoca: 'pós-exílio, séc. V a.C.', tema: 'Reconstrução', resumo: 'Neemias reconstrói os muros de Jerusalém em meio à oposição. Um modelo de liderança, oração e coragem para restaurar o povo de Deus.' },
    17: { categoria: 'Histórico', autor: 'Desconhecido', epoca: 'período persa, séc. V a.C.', tema: 'Providência oculta', resumo: 'A rainha Ester arrisca a vida para salvar os judeus de um extermínio. Deus não é citado uma vez, mas Sua providência está em cada detalhe.' },

    // ===== POÉTICOS / SABEDORIA =====
    18: { categoria: 'Poético', autor: 'Desconhecido', epoca: 'antiga', tema: 'O sofrimento e a fé', resumo: 'Um homem justo perde tudo e luta para entender por quê. O livro enfrenta a pergunta do sofrimento e termina na confiança na soberania de Deus.' },
    19: { categoria: 'Poético', autor: 'Davi e outros', epoca: 'vários séculos', tema: 'Adoração e oração', resumo: 'O hinário de Israel: 150 cânticos de louvor, lamento, gratidão e confiança. Toda emoção humana levada diante de Deus com honestidade.' },
    20: { categoria: 'Sabedoria', autor: 'Salomão e outros', epoca: 'séc. X a.C. em diante', tema: 'Sabedoria prática', resumo: 'Ditados curtos sobre como viver bem: trabalho, palavras, amizade, dinheiro. "O temor do Senhor é o princípio da sabedoria."' },
    21: { categoria: 'Sabedoria', autor: 'Salomão (tradição)', epoca: 'séc. X a.C.', tema: 'O sentido da vida', resumo: 'Uma busca honesta pelo sentido da vida "debaixo do sol". Tudo é passageiro; a conclusão é temer a Deus e aproveitar a vida como dom.' },
    22: { categoria: 'Poético', autor: 'Salomão (tradição)', epoca: 'séc. X a.C.', tema: 'O amor', resumo: 'Um poema celebrando o amor entre um homem e uma mulher. Também lido como quadro do amor entre Deus e Seu povo.' },

    // ===== PROFETAS MAIORES =====
    23: { categoria: 'Profeta Maior', autor: 'Isaías', epoca: 'séc. VIII a.C.', tema: 'Juízo e salvação', resumo: 'Advertências de juízo e promessas gloriosas de restauração. Isaías anuncia o Messias sofredor e o Príncipe da Paz com clareza única.' },
    24: { categoria: 'Profeta Maior', autor: 'Jeremias', epoca: 'séc. VII–VI a.C.', tema: 'Fidelidade em tempo de queda', resumo: 'O "profeta chorão" adverte Judá às vésperas do exílio babilônico. Em meio ao juízo, promete uma nova aliança escrita no coração.' },
    25: { categoria: 'Poético', autor: 'Jeremias (tradição)', epoca: 'séc. VI a.C.', tema: 'Luto e esperança', resumo: 'Cinco poemas de lamento pela destruição de Jerusalém. No meio da dor, brilha a esperança: "as misericórdias do Senhor se renovam cada manhã".' },
    26: { categoria: 'Profeta Maior', autor: 'Ezequiel', epoca: 'séc. VI a.C.', tema: 'A glória de Deus', resumo: 'Profeta no exílio com visões impressionantes. Anuncia juízo, mas também a restauração: um coração novo e os ossos secos voltando à vida.' },
    27: { categoria: 'Profeta Maior', autor: 'Daniel', epoca: 'séc. VI a.C.', tema: 'Fidelidade e soberania', resumo: 'Daniel e seus amigos permanecem fiéis na Babilônia. Histórias de coragem (a cova dos leões) e visões sobre os reinos e o fim dos tempos.' },

    // ===== PROFETAS MENORES =====
    28: { categoria: 'Profeta Menor', autor: 'Oséias', epoca: 'séc. VIII a.C.', tema: 'O amor fiel de Deus', resumo: 'O casamento de Oséias com uma mulher infiel ilustra o amor de Deus por um povo que se desvia. Apesar da traição, Deus continua chamando de volta.' },
    29: { categoria: 'Profeta Menor', autor: 'Joel', epoca: 'incerta', tema: 'O Dia do Senhor', resumo: 'Uma praga de gafanhotos torna-se um chamado ao arrependimento. Joel promete o derramamento do Espírito sobre todos — cumprido em Pentecostes.' },
    30: { categoria: 'Profeta Menor', autor: 'Amós', epoca: 'séc. VIII a.C.', tema: 'Justiça social', resumo: 'Um pastor chamado por Deus para denunciar a injustiça e a religião vazia. "Corra a justiça como as águas."' },
    31: { categoria: 'Profeta Menor', autor: 'Obadias', epoca: 'séc. VI a.C.', tema: 'Juízo sobre o orgulho', resumo: 'O livro mais curto do Antigo Testamento. Anuncia o juízo de Edom pelo orgulho e pela crueldade contra Judá.' },
    32: { categoria: 'Profeta Menor', autor: 'Jonas', epoca: 'séc. VIII a.C.', tema: 'A misericórdia de Deus', resumo: 'Um profeta foge do chamado, é engolido por um grande peixe e aprende que a misericórdia de Deus alcança até os inimigos de Israel.' },
    33: { categoria: 'Profeta Menor', autor: 'Miquéias', epoca: 'séc. VIII a.C.', tema: 'Justiça e humildade', resumo: 'Denúncia da corrupção e promessa do Messias que nasceria em Belém. "Que pede o Senhor? Que pratiques a justiça e andes humildemente."' },
    34: { categoria: 'Profeta Menor', autor: 'Naum', epoca: 'séc. VII a.C.', tema: 'O juízo de Nínive', resumo: 'A queda anunciada da cruel Nínive. Deus é lento para a ira, mas não deixa impune a maldade — consolo para os oprimidos.' },
    35: { categoria: 'Profeta Menor', autor: 'Habacuque', epoca: 'séc. VII a.C.', tema: 'Fé em meio às dúvidas', resumo: 'O profeta questiona a Deus sobre o mal e recebe resposta. "O justo viverá pela fé" — a fé que confia mesmo sem entender.' },
    36: { categoria: 'Profeta Menor', autor: 'Sofonias', epoca: 'séc. VII a.C.', tema: 'O Dia do Senhor', resumo: 'Advertência sobre o juízo vindouro e promessa de um remanescente humilde. Deus se alegra com alegria sobre os Seus.' },
    37: { categoria: 'Profeta Menor', autor: 'Ageu', epoca: 'pós-exílio, 520 a.C.', tema: 'Prioridades', resumo: 'Um chamado para reconstruir o Templo e colocar Deus em primeiro lugar, em vez das próprias casas e interesses.' },
    38: { categoria: 'Profeta Menor', autor: 'Zacarias', epoca: 'pós-exílio, séc. VI a.C.', tema: 'Restauração e o Messias', resumo: 'Visões de encorajamento aos que reconstroem Jerusalém, com profecias notáveis sobre o Messias que viria humilde, montado num jumento.' },
    39: { categoria: 'Profeta Menor', autor: 'Malaquias', epoca: 'pós-exílio, séc. V a.C.', tema: 'Fidelidade renovada', resumo: 'O último profeta do Antigo Testamento repreende a religião fria e anuncia a vinda do mensageiro que prepararia o caminho — João Batista.' },

    // ===== EVANGELHOS =====
    40: { categoria: 'Evangelho', autor: 'Mateus', epoca: '60–70 d.C.', tema: 'Jesus, o Rei Messias', resumo: 'Escrito para os judeus, apresenta Jesus como o Messias prometido, cumprimento das Escrituras e Rei do Reino dos Céus.' },
    41: { categoria: 'Evangelho', autor: 'Marcos', epoca: '55–65 d.C.', tema: 'Jesus, o Servo', resumo: 'O evangelho mais curto e ágil. Mostra Jesus em ação como o Servo que veio para servir e dar a vida em resgate por muitos.' },
    42: { categoria: 'Evangelho', autor: 'Lucas', epoca: '60–70 d.C.', tema: 'Jesus, o Salvador de todos', resumo: 'Um relato cuidadoso e histórico. Destaca a compaixão de Jesus pelos pobres, mulheres e excluídos — o Salvador de toda a humanidade.' },
    43: { categoria: 'Evangelho', autor: 'João', epoca: '85–95 d.C.', tema: 'Jesus, o Filho de Deus', resumo: 'Mais teológico que os demais. Revela Jesus como o Verbo eterno e Filho de Deus, "para que, crendo, tenhais vida em Seu nome".' },

    // ===== HISTÓRIA DA IGREJA =====
    44: { categoria: 'Histórico', autor: 'Lucas', epoca: '60–70 d.C.', tema: 'O Espírito e a Igreja', resumo: 'A continuação de Lucas: o nascimento da Igreja em Pentecostes e a expansão do evangelho de Jerusalém até Roma, pelo poder do Espírito Santo.' },

    // ===== CARTAS DE PAULO =====
    45: { categoria: 'Carta de Paulo', autor: 'Paulo', epoca: '~57 d.C.', tema: 'O evangelho da graça', resumo: 'A exposição mais completa do evangelho: todos pecaram, mas somos justificados pela fé em Cristo. A carta mais influente da história cristã.' },
    46: { categoria: 'Carta de Paulo', autor: 'Paulo', epoca: '~55 d.C.', tema: 'Correção na igreja', resumo: 'Paulo corrige divisões, imoralidade e desordem em Corinto. Contém o famoso capítulo do amor (13) e a defesa da ressurreição.' },
    47: { categoria: 'Carta de Paulo', autor: 'Paulo', epoca: '~56 d.C.', tema: 'Força na fraqueza', resumo: 'A mais pessoal das cartas de Paulo. Ele defende seu ministério e mostra que o poder de Deus se aperfeiçoa na fraqueza.' },
    48: { categoria: 'Carta de Paulo', autor: 'Paulo', epoca: '~49 d.C.', tema: 'Liberdade em Cristo', resumo: 'Paulo defende que a salvação é pela fé, não pela lei. Um manifesto da liberdade cristã e da vida no Espírito.' },
    49: { categoria: 'Carta de Paulo', autor: 'Paulo', epoca: '~60 d.C.', tema: 'A Igreja, corpo de Cristo', resumo: 'A riqueza da salvação e a unidade da Igreja. Metade doutrina, metade prática: como viver de forma digna do chamado.' },
    50: { categoria: 'Carta de Paulo', autor: 'Paulo', epoca: '~61 d.C.', tema: 'Alegria', resumo: 'Escrita da prisão, transborda alegria. "Alegrai-vos sempre no Senhor." O segredo do contentamento em qualquer circunstância.' },
    51: { categoria: 'Carta de Paulo', autor: 'Paulo', epoca: '~61 d.C.', tema: 'A supremacia de Cristo', resumo: 'Cristo é supremo sobre tudo e suficiente para tudo. Um alerta contra falsos ensinos que diminuem a Sua pessoa.' },
    52: { categoria: 'Carta de Paulo', autor: 'Paulo', epoca: '~51 d.C.', tema: 'Esperança na volta de Cristo', resumo: 'Encoraja uma igreja jovem e sofredora, ensinando sobre a santidade e a volta gloriosa do Senhor.' },
    53: { categoria: 'Carta de Paulo', autor: 'Paulo', epoca: '~51 d.C.', tema: 'Firmeza até o fim', resumo: 'Corrige mal-entendidos sobre a volta de Cristo e chama à firmeza e ao trabalho enquanto se espera.' },
    54: { categoria: 'Carta de Paulo', autor: 'Paulo', epoca: '~63 d.C.', tema: 'Liderança na igreja', resumo: 'Orientações a Timóteo sobre como conduzir a igreja: sã doutrina, liderança e conduta piedosa.' },
    55: { categoria: 'Carta de Paulo', autor: 'Paulo', epoca: '~66 d.C.', tema: 'Perseverança', resumo: 'As últimas palavras de Paulo antes de morrer. "Combati o bom combate, completei a carreira, guardei a fé." Um chamado à fidelidade.' },
    56: { categoria: 'Carta de Paulo', autor: 'Paulo', epoca: '~63 d.C.', tema: 'Ordem e boas obras', resumo: 'Instruções a Tito para organizar as igrejas de Creta, com líderes íntegros e uma fé que produz boas obras.' },
    57: { categoria: 'Carta de Paulo', autor: 'Paulo', epoca: '~61 d.C.', tema: 'Perdão e reconciliação', resumo: 'Um bilhete pessoal pedindo que Filemom receba de volta seu escravo fugitivo Onésimo — agora irmão em Cristo. O evangelho aplicado às relações.' },

    // ===== CARTAS GERAIS =====
    58: { categoria: 'Carta Geral', autor: 'Desconhecido', epoca: '~65 d.C.', tema: 'Cristo é superior', resumo: 'Mostra que Jesus é superior a tudo do Antigo Testamento — anjos, Moisés, sacerdotes. Um chamado a perseverar na fé e não retroceder.' },
    59: { categoria: 'Carta Geral', autor: 'Tiago', epoca: '~48 d.C.', tema: 'Fé que age', resumo: 'Fé prática e verdadeira. "A fé sem obras é morta." Sabedoria direta sobre a língua, as provações e o cuidado com os necessitados.' },
    60: { categoria: 'Carta Geral', autor: 'Pedro', epoca: '~63 d.C.', tema: 'Esperança no sofrimento', resumo: 'Encorajamento a cristãos perseguidos. Sofrer por fazer o bem tem propósito, seguindo o exemplo de Cristo.' },
    61: { categoria: 'Carta Geral', autor: 'Pedro', epoca: '~66 d.C.', tema: 'Cuidado com o engano', resumo: 'Alerta contra falsos mestres e um chamado a crescer no conhecimento de Cristo enquanto se aguarda o Seu retorno.' },
    62: { categoria: 'Carta Geral', autor: 'João', epoca: '~90 d.C.', tema: 'Amor e certeza', resumo: 'Como ter certeza da salvação: quem nasce de Deus ama, obedece e crê. "Deus é amor."' },
    63: { categoria: 'Carta Geral', autor: 'João', epoca: '~90 d.C.', tema: 'Andar na verdade', resumo: 'Um bilhete curto elogiando o andar na verdade e alertando contra os que negam a Cristo.' },
    64: { categoria: 'Carta Geral', autor: 'João', epoca: '~90 d.C.', tema: 'Hospitalidade e fidelidade', resumo: 'Um bilhete pessoal encorajando a hospitalidade aos servos fiéis e repreendendo a arrogância na igreja.' },
    65: { categoria: 'Carta Geral', autor: 'Judas', epoca: '~65 d.C.', tema: 'Contender pela fé', resumo: 'Um chamado urgente para defender a fé verdadeira contra o engano e viver firme na graça de Deus.' },

    // ===== APOCALÍPTICO =====
    66: { categoria: 'Profecia', autor: 'João', epoca: '~95 d.C.', tema: 'A vitória de Cristo', resumo: 'Visões da vitória final de Jesus sobre o mal. Em meio à perseguição, a mensagem é clara: Cristo reina e fará novas todas as coisas.' },
};

export function getIntroducaoLivro(livroId: number): IntroducaoLivro | null {
    return INTRODUCOES[livroId] ?? null;
}
