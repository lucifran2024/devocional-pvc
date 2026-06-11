// ===========================================
// PERÍCOPES BÍBLICAS - Títulos das seções/acontecimentos por capítulo
// Formato: livroId -> capitulo -> [{ versiculo, titulo }]
// ===========================================

export interface Pericope {
    verse: number;
    title: string;
}

// Mapa: livroId -> capitulo -> perícopes
const PERICOPES: Record<number, Record<number, Pericope[]>> = {
    // ==========================================
    // MATEUS (40)
    // ==========================================
    40: {
        1: [
            { verse: 1, title: 'A Genealogia de Jesus Cristo' },
            { verse: 18, title: 'O Nascimento de Jesus' },
        ],
        2: [
            { verse: 1, title: 'A Visita dos Magos' },
            { verse: 13, title: 'A Fuga para o Egito' },
            { verse: 16, title: 'A Matança dos Meninos' },
            { verse: 19, title: 'A Volta do Egito' },
        ],
        3: [
            { verse: 1, title: 'A Pregação de João Batista' },
            { verse: 13, title: 'O Batismo de Jesus' },
        ],
        4: [
            { verse: 1, title: 'A Tentação de Jesus' },
            { verse: 12, title: 'O Início do Ministério na Galileia' },
            { verse: 18, title: 'Jesus Chama os Primeiros Discípulos' },
            { verse: 23, title: 'Jesus Cura os Doentes' },
        ],
        5: [
            { verse: 1, title: 'O Sermão do Monte: As Bem-Aventuranças' },
            { verse: 13, title: 'O Sal da Terra e a Luz do Mundo' },
            { verse: 17, title: 'Jesus e a Lei' },
            { verse: 21, title: 'A Ira e a Reconciliação' },
            { verse: 27, title: 'O Adultério' },
            { verse: 31, title: 'O Divórcio' },
            { verse: 33, title: 'Os Juramentos' },
            { verse: 38, title: 'A Vingança' },
            { verse: 43, title: 'O Amor aos Inimigos' },
        ],
        6: [
            { verse: 1, title: 'A Esmola' },
            { verse: 5, title: 'A Oração e o Pai Nosso' },
            { verse: 16, title: 'O Jejum' },
            { verse: 19, title: 'Os Tesouros no Céu' },
            { verse: 25, title: 'A Confiança em Deus' },
        ],
        7: [
            { verse: 1, title: 'Não Julguem os Outros' },
            { verse: 7, title: 'Peçam, Busquem, Batam' },
            { verse: 13, title: 'A Porta Estreita' },
            { verse: 15, title: 'A Árvore e Seus Frutos' },
            { verse: 21, title: 'Os Verdadeiros Discípulos' },
            { verse: 24, title: 'As Duas Casas' },
        ],
        8: [
            { verse: 1, title: 'Jesus Cura um Leproso' },
            { verse: 5, title: 'A Fé do Oficial Romano' },
            { verse: 14, title: 'Jesus Cura a Sogra de Pedro' },
            { verse: 18, title: 'O Preço de Seguir Jesus' },
            { verse: 23, title: 'Jesus Acalma a Tempestade' },
            { verse: 28, title: 'Jesus Cura Dois Endemoninhados' },
        ],
        9: [
            { verse: 1, title: 'Jesus Cura um Paralítico' },
            { verse: 9, title: 'Jesus Chama Mateus' },
            { verse: 14, title: 'A Pergunta sobre o Jejum' },
            { verse: 18, title: 'A Filha de Jairo e a Mulher Doente' },
            { verse: 27, title: 'Jesus Cura Dois Cegos' },
            { verse: 32, title: 'Jesus Cura um Mudo' },
            { verse: 35, title: 'A Compaixão de Jesus' },
        ],
        10: [
            { verse: 1, title: 'Os Doze Apóstolos' },
            { verse: 5, title: 'A Missão dos Doze' },
            { verse: 16, title: 'Perseguições Futuras' },
            { verse: 26, title: 'A Quem Temer' },
            { verse: 32, title: 'Confessar Cristo Diante dos Homens' },
            { verse: 34, title: 'Jesus Traz Divisão' },
        ],
        11: [
            { verse: 1, title: 'Jesus e João Batista' },
            { verse: 16, title: 'Jesus Repreende as Cidades' },
            { verse: 25, title: 'Venham a Mim' },
        ],
        12: [
            { verse: 1, title: 'Jesus É Senhor do Sábado' },
            { verse: 9, title: 'Jesus Cura no Sábado' },
            { verse: 22, title: 'Jesus e Belzebu' },
            { verse: 33, title: 'A Árvore e Seus Frutos' },
            { verse: 38, title: 'O Sinal de Jonas' },
            { verse: 46, title: 'A Mãe e os Irmãos de Jesus' },
        ],
        13: [
            { verse: 1, title: 'A Parábola do Semeador' },
            { verse: 10, title: 'O Propósito das Parábolas' },
            { verse: 18, title: 'Jesus Explica a Parábola do Semeador' },
            { verse: 24, title: 'A Parábola do Joio' },
            { verse: 31, title: 'A Parábola do Grão de Mostarda' },
            { verse: 33, title: 'A Parábola do Fermento' },
            { verse: 36, title: 'Jesus Explica a Parábola do Joio' },
            { verse: 44, title: 'O Tesouro Escondido e a Pérola' },
            { verse: 47, title: 'A Parábola da Rede' },
            { verse: 53, title: 'Jesus em Nazaré' },
        ],
        14: [
            { verse: 1, title: 'A Morte de João Batista' },
            { verse: 13, title: 'Jesus Alimenta Cinco Mil Homens' },
            { verse: 22, title: 'Jesus Anda sobre a Água' },
            { verse: 34, title: 'Jesus Cura os Doentes em Genesaré' },
        ],
        15: [
            { verse: 1, title: 'O Que Torna a Pessoa Impura' },
            { verse: 21, title: 'A Fé da Mulher Cananeia' },
            { verse: 29, title: 'Jesus Cura Muitos Doentes' },
            { verse: 32, title: 'Jesus Alimenta Quatro Mil Homens' },
        ],
        16: [
            { verse: 1, title: 'Os Fariseus Pedem um Sinal' },
            { verse: 5, title: 'O Fermento dos Fariseus' },
            { verse: 13, title: 'A Confissão de Pedro' },
            { verse: 21, title: 'Jesus Anuncia Sua Morte' },
            { verse: 24, title: 'O Preço de Seguir Jesus' },
        ],
        17: [
            { verse: 1, title: 'A Transfiguração' },
            { verse: 14, title: 'Jesus Cura um Menino Endemoninhado' },
            { verse: 22, title: 'Jesus Anuncia Sua Morte Novamente' },
            { verse: 24, title: 'O Imposto do Templo' },
        ],
        18: [
            { verse: 1, title: 'Quem É o Maior no Reino do Céu' },
            { verse: 6, title: 'As Tentações' },
            { verse: 10, title: 'A Parábola da Ovelha Perdida' },
            { verse: 15, title: 'O Irmão que Peca' },
            { verse: 21, title: 'A Parábola do Servo Cruel' },
        ],
        19: [
            { verse: 1, title: 'Jesus Ensina sobre o Divórcio' },
            { verse: 13, title: 'Jesus Abençoa as Crianças' },
            { verse: 16, title: 'O Jovem Rico' },
        ],
        20: [
            { verse: 1, title: 'A Parábola dos Trabalhadores na Vinha' },
            { verse: 17, title: 'Jesus Anuncia Sua Morte pela Terceira Vez' },
            { verse: 20, title: 'O Pedido da Mãe de Tiago e João' },
            { verse: 29, title: 'Jesus Cura Dois Cegos' },
        ],
        21: [
            { verse: 1, title: 'A Entrada Triunfal em Jerusalém' },
            { verse: 12, title: 'Jesus Purifica o Templo' },
            { verse: 18, title: 'A Figueira Seca' },
            { verse: 23, title: 'A Autoridade de Jesus' },
            { verse: 28, title: 'A Parábola dos Dois Filhos' },
            { verse: 33, title: 'A Parábola dos Lavradores Maus' },
        ],
        22: [
            { verse: 1, title: 'A Parábola da Festa de Casamento' },
            { verse: 15, title: 'O Imposto Devido a César' },
            { verse: 23, title: 'A Pergunta sobre a Ressurreição' },
            { verse: 34, title: 'O Maior Mandamento' },
            { verse: 41, title: 'O Cristo, Filho de Davi' },
        ],
        23: [
            { verse: 1, title: 'Jesus Condena os Fariseus' },
            { verse: 13, title: 'Ai de Vocês, Mestres da Lei e Fariseus!' },
            { verse: 37, title: 'Jesus Chora por Jerusalém' },
        ],
        24: [
            { verse: 1, title: 'Jesus Fala sobre a Destruição do Templo' },
            { verse: 3, title: 'Sinais do Fim dos Tempos' },
            { verse: 29, title: 'A Vinda do Filho do Homem' },
            { verse: 36, title: 'Ninguém Sabe o Dia nem a Hora' },
            { verse: 45, title: 'O Servo Fiel e o Servo Mau' },
        ],
        25: [
            { verse: 1, title: 'A Parábola das Dez Virgens' },
            { verse: 14, title: 'A Parábola dos Talentos' },
            { verse: 31, title: 'O Julgamento das Nações' },
        ],
        26: [
            { verse: 1, title: 'A Conspiração contra Jesus' },
            { verse: 6, title: 'Jesus É Ungido em Betânia' },
            { verse: 14, title: 'Judas Concorda em Trair Jesus' },
            { verse: 17, title: 'A Última Ceia' },
            { verse: 30, title: 'Jesus no Getsêmani' },
            { verse: 47, title: 'A Prisão de Jesus' },
            { verse: 57, title: 'Jesus Diante do Sinédrio' },
            { verse: 69, title: 'Pedro Nega Jesus' },
        ],
        27: [
            { verse: 1, title: 'Jesus É Levado a Pilatos' },
            { verse: 3, title: 'A Morte de Judas' },
            { verse: 11, title: 'Jesus Diante de Pilatos' },
            { verse: 27, title: 'Os Soldados Zombam de Jesus' },
            { verse: 32, title: 'A Crucificação' },
            { verse: 45, title: 'A Morte de Jesus' },
            { verse: 57, title: 'O Sepultamento de Jesus' },
            { verse: 62, title: 'A Guarda no Sepulcro' },
        ],
        28: [
            { verse: 1, title: 'A Ressurreição de Jesus' },
            { verse: 11, title: 'O Relatório dos Guardas' },
            { verse: 16, title: 'A Grande Comissão' },
        ],
    },

    // ==========================================
    // MARCOS (41)
    // ==========================================
    41: {
        1: [
            { verse: 1, title: 'A Pregação de João Batista' },
            { verse: 9, title: 'O Batismo de Jesus' },
            { verse: 12, title: 'A Tentação de Jesus' },
            { verse: 14, title: 'O Início do Ministério na Galileia' },
            { verse: 16, title: 'Jesus Chama os Primeiros Discípulos' },
            { verse: 21, title: 'Jesus Expulsa um Espírito Mau' },
            { verse: 29, title: 'Jesus Cura a Sogra de Pedro' },
            { verse: 35, title: 'Jesus Ora num Lugar Deserto' },
            { verse: 40, title: 'Jesus Cura um Leproso' },
        ],
        2: [
            { verse: 1, title: 'Jesus Cura um Paralítico' },
            { verse: 13, title: 'Jesus Chama Levi' },
            { verse: 18, title: 'A Pergunta sobre o Jejum' },
            { verse: 23, title: 'Jesus É Senhor do Sábado' },
        ],
        3: [
            { verse: 1, title: 'Jesus Cura no Sábado' },
            { verse: 7, title: 'A Multidão Segue Jesus' },
            { verse: 13, title: 'Jesus Escolhe os Doze' },
            { verse: 20, title: 'Jesus e Belzebu' },
            { verse: 31, title: 'A Mãe e os Irmãos de Jesus' },
        ],
        4: [
            { verse: 1, title: 'A Parábola do Semeador' },
            { verse: 10, title: 'O Propósito das Parábolas' },
            { verse: 21, title: 'A Parábola da Candeia' },
            { verse: 26, title: 'A Parábola da Semente' },
            { verse: 30, title: 'A Parábola do Grão de Mostarda' },
            { verse: 35, title: 'Jesus Acalma a Tempestade' },
        ],
        5: [
            { verse: 1, title: 'Jesus Cura o Endemoninhado Geraseno' },
            { verse: 21, title: 'A Filha de Jairo e a Mulher Doente' },
        ],
        6: [
            { verse: 1, title: 'Jesus em Nazaré' },
            { verse: 7, title: 'A Missão dos Doze' },
            { verse: 14, title: 'A Morte de João Batista' },
            { verse: 30, title: 'Jesus Alimenta Cinco Mil Homens' },
            { verse: 45, title: 'Jesus Anda sobre a Água' },
            { verse: 53, title: 'Jesus Cura os Doentes em Genesaré' },
        ],
        7: [
            { verse: 1, title: 'O Que Torna a Pessoa Impura' },
            { verse: 24, title: 'A Fé da Mulher Siro-Fenícia' },
            { verse: 31, title: 'Jesus Cura um Surdo-Mudo' },
        ],
        8: [
            { verse: 1, title: 'Jesus Alimenta Quatro Mil Homens' },
            { verse: 11, title: 'Os Fariseus Pedem um Sinal' },
            { verse: 14, title: 'O Fermento dos Fariseus' },
            { verse: 22, title: 'Jesus Cura um Cego em Betsaida' },
            { verse: 27, title: 'A Confissão de Pedro' },
            { verse: 31, title: 'Jesus Anuncia Sua Morte' },
        ],
        9: [
            { verse: 1, title: 'A Transfiguração' },
            { verse: 14, title: 'Jesus Cura um Menino Endemoninhado' },
            { verse: 30, title: 'Jesus Anuncia Sua Morte Novamente' },
            { verse: 33, title: 'Quem É o Maior?' },
            { verse: 38, title: 'Quem Não É contra Nós É a Nosso Favor' },
            { verse: 42, title: 'As Tentações' },
        ],
        10: [
            { verse: 1, title: 'Jesus Ensina sobre o Divórcio' },
            { verse: 13, title: 'Jesus Abençoa as Crianças' },
            { verse: 17, title: 'O Jovem Rico' },
            { verse: 32, title: 'Jesus Anuncia Sua Morte pela Terceira Vez' },
            { verse: 35, title: 'O Pedido de Tiago e João' },
            { verse: 46, title: 'Jesus Cura o Cego Bartimeu' },
        ],
        11: [
            { verse: 1, title: 'A Entrada Triunfal em Jerusalém' },
            { verse: 12, title: 'A Figueira Seca' },
            { verse: 15, title: 'Jesus Purifica o Templo' },
            { verse: 20, title: 'A Lição da Figueira' },
            { verse: 27, title: 'A Autoridade de Jesus' },
        ],
        12: [
            { verse: 1, title: 'A Parábola dos Lavradores Maus' },
            { verse: 13, title: 'O Imposto Devido a César' },
            { verse: 18, title: 'A Pergunta sobre a Ressurreição' },
            { verse: 28, title: 'O Maior Mandamento' },
            { verse: 35, title: 'O Cristo, Filho de Davi' },
            { verse: 38, title: 'Jesus Condena os Mestres da Lei' },
            { verse: 41, title: 'A Oferta da Viúva' },
        ],
        13: [
            { verse: 1, title: 'Jesus Fala sobre a Destruição do Templo' },
            { verse: 3, title: 'Sinais do Fim dos Tempos' },
            { verse: 24, title: 'A Vinda do Filho do Homem' },
            { verse: 32, title: 'Ninguém Sabe o Dia nem a Hora' },
        ],
        14: [
            { verse: 1, title: 'A Conspiração contra Jesus' },
            { verse: 3, title: 'Jesus É Ungido em Betânia' },
            { verse: 10, title: 'Judas Concorda em Trair Jesus' },
            { verse: 12, title: 'A Última Ceia' },
            { verse: 32, title: 'Jesus no Getsêmani' },
            { verse: 43, title: 'A Prisão de Jesus' },
            { verse: 53, title: 'Jesus Diante do Sinédrio' },
            { verse: 66, title: 'Pedro Nega Jesus' },
        ],
        15: [
            { verse: 1, title: 'Jesus Diante de Pilatos' },
            { verse: 16, title: 'Os Soldados Zombam de Jesus' },
            { verse: 21, title: 'A Crucificação' },
            { verse: 33, title: 'A Morte de Jesus' },
            { verse: 42, title: 'O Sepultamento de Jesus' },
        ],
        16: [
            { verse: 1, title: 'A Ressurreição de Jesus' },
            { verse: 9, title: 'Jesus Aparece a Maria Madalena' },
            { verse: 12, title: 'Jesus Aparece a Dois Discípulos' },
            { verse: 14, title: 'A Grande Comissão' },
            { verse: 19, title: 'A Ascensão de Jesus' },
        ],
    },

    // ==========================================
    // LUCAS (42)
    // ==========================================
    42: {
        1: [
            { verse: 1, title: 'Introdução' },
            { verse: 5, title: 'O Anúncio do Nascimento de João' },
            { verse: 26, title: 'O Anúncio do Nascimento de Jesus' },
            { verse: 39, title: 'Maria Visita Isabel' },
            { verse: 46, title: 'O Cântico de Maria' },
            { verse: 57, title: 'O Nascimento de João Batista' },
            { verse: 67, title: 'A Profecia de Zacarias' },
        ],
        2: [
            { verse: 1, title: 'O Nascimento de Jesus' },
            { verse: 8, title: 'Os Pastores e os Anjos' },
            { verse: 21, title: 'A Apresentação de Jesus no Templo' },
            { verse: 39, title: 'A Volta a Nazaré' },
            { verse: 41, title: 'O Menino Jesus no Templo' },
        ],
        3: [
            { verse: 1, title: 'A Pregação de João Batista' },
            { verse: 21, title: 'O Batismo de Jesus' },
            { verse: 23, title: 'A Genealogia de Jesus' },
        ],
        4: [
            { verse: 1, title: 'A Tentação de Jesus' },
            { verse: 14, title: 'Jesus em Nazaré' },
            { verse: 31, title: 'Jesus Expulsa um Espírito Mau' },
            { verse: 38, title: 'Jesus Cura a Sogra de Pedro' },
            { verse: 42, title: 'Jesus Prega na Judeia' },
        ],
        5: [
            { verse: 1, title: 'A Pesca Milagrosa' },
            { verse: 12, title: 'Jesus Cura um Leproso' },
            { verse: 17, title: 'Jesus Cura um Paralítico' },
            { verse: 27, title: 'Jesus Chama Levi' },
            { verse: 33, title: 'A Pergunta sobre o Jejum' },
        ],
        6: [
            { verse: 1, title: 'Jesus É Senhor do Sábado' },
            { verse: 6, title: 'Jesus Cura no Sábado' },
            { verse: 12, title: 'Jesus Escolhe os Doze' },
            { verse: 17, title: 'As Bem-Aventuranças e os Ais' },
            { verse: 27, title: 'O Amor aos Inimigos' },
            { verse: 37, title: 'Não Julguem os Outros' },
            { verse: 43, title: 'A Árvore e Seus Frutos' },
            { verse: 46, title: 'As Duas Casas' },
        ],
        7: [
            { verse: 1, title: 'A Fé do Oficial Romano' },
            { verse: 11, title: 'Jesus Ressuscita o Filho da Viúva' },
            { verse: 18, title: 'Jesus e João Batista' },
            { verse: 36, title: 'Jesus na Casa de Simão' },
        ],
        8: [
            { verse: 1, title: 'As Mulheres que Seguiam Jesus' },
            { verse: 4, title: 'A Parábola do Semeador' },
            { verse: 16, title: 'A Parábola da Candeia' },
            { verse: 19, title: 'A Mãe e os Irmãos de Jesus' },
            { verse: 22, title: 'Jesus Acalma a Tempestade' },
            { verse: 26, title: 'Jesus Cura o Endemoninhado Geraseno' },
            { verse: 40, title: 'A Filha de Jairo e a Mulher Doente' },
        ],
        9: [
            { verse: 1, title: 'A Missão dos Doze' },
            { verse: 7, title: 'A Dúvida de Herodes' },
            { verse: 10, title: 'Jesus Alimenta Cinco Mil Homens' },
            { verse: 18, title: 'A Confissão de Pedro' },
            { verse: 21, title: 'Jesus Anuncia Sua Morte' },
            { verse: 28, title: 'A Transfiguração' },
            { verse: 37, title: 'Jesus Cura um Menino Endemoninhado' },
            { verse: 46, title: 'Quem É o Maior?' },
            { verse: 51, title: 'A Caminho de Jerusalém' },
            { verse: 57, title: 'O Preço de Seguir Jesus' },
        ],
        10: [
            { verse: 1, title: 'A Missão dos Setenta e Dois' },
            { verse: 17, title: 'A Volta dos Setenta e Dois' },
            { verse: 21, title: 'A Oração de Louvor de Jesus' },
            { verse: 25, title: 'A Parábola do Bom Samaritano' },
            { verse: 38, title: 'Jesus na Casa de Marta e Maria' },
        ],
        11: [
            { verse: 1, title: 'Jesus Ensina sobre a Oração' },
            { verse: 14, title: 'Jesus e Belzebu' },
            { verse: 29, title: 'O Sinal de Jonas' },
            { verse: 33, title: 'A Luz do Corpo' },
            { verse: 37, title: 'Jesus Condena os Fariseus' },
        ],
        12: [
            { verse: 1, title: 'O Fermento dos Fariseus' },
            { verse: 4, title: 'A Quem Temer' },
            { verse: 13, title: 'A Parábola do Rico Insensato' },
            { verse: 22, title: 'A Confiança em Deus' },
            { verse: 35, title: 'O Servo Fiel' },
            { verse: 49, title: 'Jesus Traz Divisão' },
            { verse: 54, title: 'Os Sinais dos Tempos' },
        ],
        13: [
            { verse: 1, title: 'Arrependam-se ou Morrerão' },
            { verse: 6, title: 'A Parábola da Figueira' },
            { verse: 10, title: 'Jesus Cura no Sábado' },
            { verse: 18, title: 'As Parábolas do Grão de Mostarda e do Fermento' },
            { verse: 22, title: 'A Porta Estreita' },
            { verse: 31, title: 'Jesus Chora por Jerusalém' },
        ],
        14: [
            { verse: 1, title: 'Jesus Cura no Sábado' },
            { verse: 7, title: 'A Parábola dos Lugares de Honra' },
            { verse: 15, title: 'A Parábola do Grande Banquete' },
            { verse: 25, title: 'O Preço de Ser Discípulo' },
        ],
        15: [
            { verse: 1, title: 'A Parábola da Ovelha Perdida' },
            { verse: 8, title: 'A Parábola da Moeda Perdida' },
            { verse: 11, title: 'A Parábola do Filho Pródigo' },
        ],
        16: [
            { verse: 1, title: 'A Parábola do Administrador Desonesto' },
            { verse: 14, title: 'Jesus Repreende os Fariseus' },
            { verse: 19, title: 'O Rico e Lázaro' },
        ],
        17: [
            { verse: 1, title: 'As Tentações e o Perdão' },
            { verse: 5, title: 'A Fé' },
            { verse: 7, title: 'O Dever do Servo' },
            { verse: 11, title: 'Jesus Cura Dez Leprosos' },
            { verse: 20, title: 'A Vinda do Reino de Deus' },
        ],
        18: [
            { verse: 1, title: 'A Parábola da Viúva e do Juiz' },
            { verse: 9, title: 'A Parábola do Fariseu e do Cobrador de Impostos' },
            { verse: 15, title: 'Jesus Abençoa as Crianças' },
            { verse: 18, title: 'O Líder Rico' },
            { verse: 31, title: 'Jesus Anuncia Sua Morte pela Terceira Vez' },
            { verse: 35, title: 'Jesus Cura um Cego' },
        ],
        19: [
            { verse: 1, title: 'Zaqueu, o Cobrador de Impostos' },
            { verse: 11, title: 'A Parábola das Dez Moedas' },
            { verse: 28, title: 'A Entrada Triunfal em Jerusalém' },
            { verse: 41, title: 'Jesus Chora por Jerusalém' },
            { verse: 45, title: 'Jesus Purifica o Templo' },
        ],
        20: [
            { verse: 1, title: 'A Autoridade de Jesus' },
            { verse: 9, title: 'A Parábola dos Lavradores Maus' },
            { verse: 20, title: 'O Imposto Devido a César' },
            { verse: 27, title: 'A Pergunta sobre a Ressurreição' },
            { verse: 41, title: 'O Cristo, Filho de Davi' },
            { verse: 45, title: 'Jesus Condena os Mestres da Lei' },
        ],
        21: [
            { verse: 1, title: 'A Oferta da Viúva' },
            { verse: 5, title: 'Jesus Fala sobre a Destruição do Templo' },
            { verse: 7, title: 'Sinais do Fim dos Tempos' },
            { verse: 25, title: 'A Vinda do Filho do Homem' },
            { verse: 29, title: 'A Parábola da Figueira' },
        ],
        22: [
            { verse: 1, title: 'Judas Concorda em Trair Jesus' },
            { verse: 7, title: 'A Última Ceia' },
            { verse: 24, title: 'Quem É o Maior?' },
            { verse: 31, title: 'Jesus Prediz a Negação de Pedro' },
            { verse: 39, title: 'Jesus no Getsêmani' },
            { verse: 47, title: 'A Prisão de Jesus' },
            { verse: 54, title: 'Pedro Nega Jesus' },
            { verse: 63, title: 'Jesus Diante do Sinédrio' },
        ],
        23: [
            { verse: 1, title: 'Jesus Diante de Pilatos' },
            { verse: 6, title: 'Jesus Diante de Herodes' },
            { verse: 13, title: 'A Sentença de Morte' },
            { verse: 26, title: 'A Crucificação' },
            { verse: 44, title: 'A Morte de Jesus' },
            { verse: 50, title: 'O Sepultamento de Jesus' },
        ],
        24: [
            { verse: 1, title: 'A Ressurreição de Jesus' },
            { verse: 13, title: 'No Caminho de Emaús' },
            { verse: 36, title: 'Jesus Aparece aos Discípulos' },
            { verse: 50, title: 'A Ascensão de Jesus' },
        ],
    },

    // ==========================================
    // JOÃO (43)
    // ==========================================
    43: {
        1: [
            { verse: 1, title: 'O Verbo Se Fez Carne' },
            { verse: 6, title: 'O Testemunho de João Batista' },
            { verse: 19, title: 'João Nega Ser o Cristo' },
            { verse: 29, title: 'O Cordeiro de Deus' },
            { verse: 35, title: 'Os Primeiros Discípulos de Jesus' },
            { verse: 43, title: 'Jesus Chama Filipe e Natanael' },
        ],
        2: [
            { verse: 1, title: 'O Casamento em Caná' },
            { verse: 13, title: 'Jesus Purifica o Templo' },
        ],
        3: [
            { verse: 1, title: 'Jesus e Nicodemos' },
            { verse: 22, title: 'O Testemunho de João sobre Jesus' },
        ],
        4: [
            { verse: 1, title: 'Jesus e a Mulher Samaritana' },
            { verse: 27, title: 'Os Discípulos Voltam' },
            { verse: 39, title: 'Muitos Samaritanos Creem em Jesus' },
            { verse: 43, title: 'Jesus Cura o Filho de um Funcionário' },
        ],
        5: [
            { verse: 1, title: 'Jesus Cura na Piscina de Betesda' },
            { verse: 16, title: 'A Autoridade do Filho' },
            { verse: 31, title: 'O Testemunho sobre Jesus' },
        ],
        6: [
            { verse: 1, title: 'Jesus Alimenta Cinco Mil Homens' },
            { verse: 16, title: 'Jesus Anda sobre a Água' },
            { verse: 22, title: 'O Pão da Vida' },
            { verse: 60, title: 'Muitos Discípulos Abandonam Jesus' },
        ],
        7: [
            { verse: 1, title: 'Jesus na Festa dos Tabernáculos' },
            { verse: 14, title: 'Jesus Ensina no Templo' },
            { verse: 25, title: 'Jesus É o Cristo?' },
            { verse: 37, title: 'Rios de Água Viva' },
            { verse: 40, title: 'Divisão entre o Povo' },
        ],
        8: [
            { verse: 1, title: 'A Mulher Adúltera' },
            { verse: 12, title: 'Jesus, a Luz do Mundo' },
            { verse: 21, title: 'Jesus Fala da Sua Partida' },
            { verse: 31, title: 'A Verdade Liberta' },
            { verse: 48, title: 'Jesus e Abraão' },
        ],
        9: [
            { verse: 1, title: 'Jesus Cura um Cego de Nascença' },
            { verse: 13, title: 'Os Fariseus Interrogam o Cego' },
            { verse: 35, title: 'A Cegueira Espiritual' },
        ],
        10: [
            { verse: 1, title: 'O Bom Pastor' },
            { verse: 22, title: 'Jesus na Festa da Dedicação' },
        ],
        11: [
            { verse: 1, title: 'A Morte de Lázaro' },
            { verse: 17, title: 'Jesus Consola Marta e Maria' },
            { verse: 38, title: 'Jesus Ressuscita Lázaro' },
            { verse: 45, title: 'A Conspiração para Matar Jesus' },
        ],
        12: [
            { verse: 1, title: 'Jesus É Ungido em Betânia' },
            { verse: 12, title: 'A Entrada Triunfal em Jerusalém' },
            { verse: 20, title: 'Jesus Fala da Sua Morte' },
            { verse: 37, title: 'A Incredulidade dos Judeus' },
        ],
        13: [
            { verse: 1, title: 'Jesus Lava os Pés dos Discípulos' },
            { verse: 18, title: 'Jesus Prediz a Traição de Judas' },
            { verse: 31, title: 'O Novo Mandamento' },
            { verse: 36, title: 'Jesus Prediz a Negação de Pedro' },
        ],
        14: [
            { verse: 1, title: 'Jesus, o Caminho para o Pai' },
            { verse: 15, title: 'A Promessa do Espírito Santo' },
            { verse: 27, title: 'A Paz de Jesus' },
        ],
        15: [
            { verse: 1, title: 'A Videira e os Ramos' },
            { verse: 9, title: 'O Mandamento do Amor' },
            { verse: 18, title: 'O Ódio do Mundo' },
            { verse: 26, title: 'O Testemunho do Espírito Santo' },
        ],
        16: [
            { verse: 1, title: 'A Perseguição dos Discípulos' },
            { verse: 5, title: 'A Obra do Espírito Santo' },
            { verse: 16, title: 'A Tristeza Se Tornará Alegria' },
            { verse: 25, title: 'Jesus Venceu o Mundo' },
        ],
        17: [
            { verse: 1, title: 'Jesus Ora por Si Mesmo' },
            { verse: 6, title: 'Jesus Ora pelos Discípulos' },
            { verse: 20, title: 'Jesus Ora por Todos os Que Creem' },
        ],
        18: [
            { verse: 1, title: 'A Prisão de Jesus' },
            { verse: 12, title: 'Jesus Diante de Anás' },
            { verse: 15, title: 'Pedro Nega Jesus' },
            { verse: 19, title: 'O Sumo Sacerdote Interroga Jesus' },
            { verse: 28, title: 'Jesus Diante de Pilatos' },
        ],
        19: [
            { verse: 1, title: 'Jesus É Açoitado e Zombado' },
            { verse: 4, title: 'A Sentença de Morte' },
            { verse: 17, title: 'A Crucificação' },
            { verse: 28, title: 'A Morte de Jesus' },
            { verse: 38, title: 'O Sepultamento de Jesus' },
        ],
        20: [
            { verse: 1, title: 'O Túmulo Vazio' },
            { verse: 10, title: 'Jesus Aparece a Maria Madalena' },
            { verse: 19, title: 'Jesus Aparece aos Discípulos' },
            { verse: 24, title: 'Jesus Aparece a Tomé' },
        ],
        21: [
            { verse: 1, title: 'Jesus Aparece à Beira do Lago' },
            { verse: 15, title: 'Jesus e Pedro' },
            { verse: 20, title: 'Jesus e o Discípulo Amado' },
        ],
    },

    // ===== LIVROS GERADOS (AT completo + Atos-Apocalipse) =====
// Gênesis a Deuteronômio (ids 1-5)
  1: {
    1: [
      { verse: 1, title: 'A Criação do Mundo' },
    ],
    2: [
      { verse: 1, title: 'O Sétimo Dia' },
      { verse: 4, title: 'O Jardim do Éden' },
      { verse: 18, title: 'A Criação da Mulher' },
    ],
    3: [
      { verse: 1, title: 'A Queda do Homem' },
      { verse: 14, title: 'A Sentença de Deus' },
      { verse: 22, title: 'A Expulsão do Éden' },
    ],
    4: [
      { verse: 1, title: 'Caim e Abel' },
      { verse: 17, title: 'Os Descendentes de Caim' },
      { verse: 25, title: 'O Nascimento de Sete' },
    ],
    5: [
      { verse: 1, title: 'De Adão a Noé' },
    ],
    6: [
      { verse: 1, title: 'A Maldade do Homem' },
      { verse: 9, title: 'A Construção da Arca' },
    ],
    7: [
      { verse: 1, title: 'O Dilúvio' },
    ],
    8: [
      { verse: 1, title: 'O Fim do Dilúvio' },
      { verse: 20, title: 'Noé Oferece Sacrifício' },
    ],
    9: [
      { verse: 1, title: 'A Aliança de Deus com Noé' },
      { verse: 18, title: 'A Embriaguez de Noé' },
    ],
    10: [
      { verse: 1, title: 'As Nações da Terra' },
    ],
    11: [
      { verse: 1, title: 'A Torre de Babel' },
      { verse: 10, title: 'De Sem a Abrão' },
    ],
    12: [
      { verse: 1, title: 'A Chamada de Abrão' },
      { verse: 10, title: 'Abrão no Egito' },
    ],
    13: [
      { verse: 1, title: 'Abrão e Ló se Separam' },
    ],
    14: [
      { verse: 1, title: 'Abrão Resgata Ló' },
      { verse: 17, title: 'Melquisedeque Abençoa Abrão' },
    ],
    15: [
      { verse: 1, title: 'A Aliança de Deus com Abrão' },
    ],
    16: [
      { verse: 1, title: 'Agar e Ismael' },
    ],
    17: [
      { verse: 1, title: 'A Aliança da Circuncisão' },
    ],
    18: [
      { verse: 1, title: 'A Promessa de um Filho' },
      { verse: 16, title: 'Abraão Intercede por Sodoma' },
    ],
    19: [
      { verse: 1, title: 'A Destruição de Sodoma' },
      { verse: 30, title: 'Ló e Suas Filhas' },
    ],
    20: [
      { verse: 1, title: 'Abraão e Abimeleque' },
    ],
    21: [
      { verse: 1, title: 'O Nascimento de Isaque' },
      { verse: 8, title: 'Agar e Ismael São Mandados Embora' },
      { verse: 22, title: 'A Aliança em Berseba' },
    ],
    22: [
      { verse: 1, title: 'O Sacrifício de Isaque' },
      { verse: 20, title: 'Os Filhos de Naor' },
    ],
    23: [
      { verse: 1, title: 'A Morte de Sara' },
    ],
    24: [
      { verse: 1, title: 'Uma Esposa para Isaque' },
    ],
    25: [
      { verse: 1, title: 'A Morte de Abraão' },
      { verse: 12, title: 'Os Descendentes de Ismael' },
      { verse: 19, title: 'O Nascimento de Esaú e Jacó' },
      { verse: 29, title: 'Esaú Vende seu Direito' },
    ],
    26: [
      { verse: 1, title: 'Isaque e Abimeleque' },
      { verse: 34, title: 'As Esposas de Esaú' },
    ],
    27: [
      { verse: 1, title: 'Jacó Recebe a Bênção' },
      { verse: 41, title: 'Jacó Foge para Harã' },
    ],
    28: [
      { verse: 1, title: 'Isaque Abençoa Jacó' },
      { verse: 10, title: 'O Sonho de Jacó em Betel' },
    ],
    29: [
      { verse: 1, title: 'Jacó Chega a Harã' },
      { verse: 14, title: 'Jacó Serve por Lia e Raquel' },
      { verse: 31, title: 'Os Filhos de Jacó' },
    ],
    30: [
      { verse: 1, title: 'Os Filhos de Jacó' },
      { verse: 25, title: 'A Prosperidade de Jacó' },
    ],
    31: [
      { verse: 1, title: 'Jacó Foge de Labão' },
      { verse: 22, title: 'Labão Persegue Jacó' },
    ],
    32: [
      { verse: 1, title: 'Jacó se Prepara para Esaú' },
      { verse: 22, title: 'Jacó Luta com Deus' },
    ],
    33: [
      { verse: 1, title: 'O Encontro de Jacó e Esaú' },
    ],
    34: [
      { verse: 1, title: 'A Vingança pela Desonra de Diná' },
    ],
    35: [
      { verse: 1, title: 'Jacó Retorna a Betel' },
      { verse: 16, title: 'A Morte de Raquel' },
      { verse: 27, title: 'A Morte de Isaque' },
    ],
    36: [
      { verse: 1, title: 'Os Descendentes de Esaú' },
    ],
    37: [
      { verse: 1, title: 'Os Sonhos de José' },
      { verse: 12, title: 'José É Vendido pelos Irmãos' },
    ],
    38: [
      { verse: 1, title: 'Judá e Tamar' },
    ],
    39: [
      { verse: 1, title: 'José e a Mulher de Potifar' },
    ],
    40: [
      { verse: 1, title: 'José Interpreta Sonhos' },
    ],
    41: [
      { verse: 1, title: 'Os Sonhos do Faraó' },
      { verse: 37, title: 'José Governa o Egito' },
    ],
    42: [
      { verse: 1, title: 'Os Irmãos de José no Egito' },
    ],
    43: [
      { verse: 1, title: 'A Segunda Viagem ao Egito' },
    ],
    44: [
      { verse: 1, title: 'A Taça na Saca de Benjamim' },
    ],
    45: [
      { verse: 1, title: 'José se Revela aos Irmãos' },
    ],
    46: [
      { verse: 1, title: 'Jacó Vai para o Egito' },
      { verse: 28, title: 'Jacó Encontra José' },
    ],
    47: [
      { verse: 1, title: 'Jacó Diante do Faraó' },
      { verse: 13, title: 'A Fome no Egito' },
      { verse: 27, title: 'O Último Pedido de Jacó' },
    ],
    48: [
      { verse: 1, title: 'Jacó Abençoa Efraim e Manassés' },
    ],
    49: [
      { verse: 1, title: 'Jacó Abençoa seus Filhos' },
      { verse: 29, title: 'A Morte de Jacó' },
    ],
    50: [
      { verse: 1, title: 'O Sepultamento de Jacó' },
      { verse: 15, title: 'José Consola os Irmãos' },
      { verse: 22, title: 'A Morte de José' },
    ],
  },
  2: {
    1: [
      { verse: 1, title: 'Os Israelitas Oprimidos no Egito' },
    ],
    2: [
      { verse: 1, title: 'O Nascimento de Moisés' },
      { verse: 11, title: 'Moisés Foge para Midiã' },
    ],
    3: [
      { verse: 1, title: 'A Sarça Ardente' },
    ],
    4: [
      { verse: 1, title: 'Sinais para Moisés' },
      { verse: 18, title: 'Moisés Retorna ao Egito' },
    ],
    5: [
      { verse: 1, title: 'Moisés e Arão Diante do Faraó' },
    ],
    6: [
      { verse: 1, title: 'Deus Promete Livramento' },
      { verse: 14, title: 'A Genealogia de Moisés e Arão' },
    ],
    7: [
      { verse: 1, title: 'Arão, Porta-voz de Moisés' },
      { verse: 14, title: 'A Praga do Sangue' },
    ],
    8: [
      { verse: 1, title: 'A Praga das Rãs' },
      { verse: 16, title: 'A Praga dos Piolhos' },
      { verse: 20, title: 'A Praga das Moscas' },
    ],
    9: [
      { verse: 1, title: 'A Praga nos Rebanhos' },
      { verse: 8, title: 'A Praga das Úlceras' },
      { verse: 13, title: 'A Praga do Granizo' },
    ],
    10: [
      { verse: 1, title: 'A Praga dos Gafanhotos' },
      { verse: 21, title: 'A Praga das Trevas' },
    ],
    11: [
      { verse: 1, title: 'A Praga dos Primogênitos Anunciada' },
    ],
    12: [
      { verse: 1, title: 'A Páscoa' },
      { verse: 29, title: 'A Morte dos Primogênitos' },
      { verse: 31, title: 'O Êxodo do Egito' },
      { verse: 43, title: 'Normas da Páscoa' },
    ],
    13: [
      { verse: 1, title: 'A Consagração dos Primogênitos' },
      { verse: 17, title: 'A Coluna de Nuvem e de Fogo' },
    ],
    14: [
      { verse: 1, title: 'A Travessia do Mar Vermelho' },
    ],
    15: [
      { verse: 1, title: 'O Cântico de Moisés' },
      { verse: 22, title: 'As Águas de Mara' },
    ],
    16: [
      { verse: 1, title: 'O Maná e as Codornizes' },
    ],
    17: [
      { verse: 1, title: 'A Água da Rocha' },
      { verse: 8, title: 'A Vitória sobre Amaleque' },
    ],
    18: [
      { verse: 1, title: 'Jetro Visita Moisés' },
      { verse: 13, title: 'A Nomeação de Juízes' },
    ],
    19: [
      { verse: 1, title: 'Os Israelitas no Sinai' },
    ],
    20: [
      { verse: 1, title: 'Os Dez Mandamentos' },
      { verse: 22, title: 'O Altar de Pedras' },
    ],
    21: [
      { verse: 1, title: 'Leis sobre os Escravos' },
      { verse: 12, title: 'Leis sobre a Violência' },
    ],
    22: [
      { verse: 1, title: 'Leis sobre a Restituição' },
      { verse: 16, title: 'Leis Morais e Religiosas' },
    ],
    23: [
      { verse: 1, title: 'Leis sobre a Justiça' },
      { verse: 10, title: 'O Sábado e as Festas' },
      { verse: 20, title: 'A Promessa de Deus' },
    ],
    24: [
      { verse: 1, title: 'A Confirmação da Aliança' },
    ],
    25: [
      { verse: 1, title: 'As Ofertas para o Tabernáculo' },
      { verse: 10, title: 'A Arca da Aliança' },
      { verse: 23, title: 'A Mesa dos Pães' },
      { verse: 31, title: 'O Candelabro' },
    ],
    26: [
      { verse: 1, title: 'O Tabernáculo' },
    ],
    27: [
      { verse: 1, title: 'O Altar do Holocausto' },
      { verse: 9, title: 'O Átrio do Tabernáculo' },
      { verse: 20, title: 'O Azeite para o Candelabro' },
    ],
    28: [
      { verse: 1, title: 'As Vestes Sacerdotais' },
    ],
    29: [
      { verse: 1, title: 'A Consagração dos Sacerdotes' },
    ],
    30: [
      { verse: 1, title: 'O Altar do Incenso' },
      { verse: 11, title: 'O Resgate dos Israelitas' },
      { verse: 17, title: 'A Bacia de Bronze' },
      { verse: 22, title: 'O Óleo da Unção' },
    ],
    31: [
      { verse: 1, title: 'Bezalel e Aoliabe' },
      { verse: 12, title: 'A Observância do Sábado' },
    ],
    32: [
      { verse: 1, title: 'O Bezerro de Ouro' },
    ],
    33: [
      { verse: 1, title: 'A Ordem para Deixar o Sinai' },
      { verse: 7, title: 'A Tenda do Encontro' },
      { verse: 12, title: 'Moisés Vê a Glória de Deus' },
    ],
    34: [
      { verse: 1, title: 'As Novas Tábuas de Pedra' },
      { verse: 29, title: 'O Rosto Resplandecente de Moisés' },
    ],
    35: [
      { verse: 1, title: 'As Normas do Sábado' },
      { verse: 4, title: 'As Ofertas para o Tabernáculo' },
      { verse: 30, title: 'Os Artesãos do Tabernáculo' },
    ],
    36: [
      { verse: 1, title: 'A Construção do Tabernáculo' },
    ],
    37: [
      { verse: 1, title: 'A Arca, a Mesa e o Candelabro' },
    ],
    38: [
      { verse: 1, title: 'O Altar e o Átrio' },
      { verse: 21, title: 'Os Materiais do Tabernáculo' },
    ],
    39: [
      { verse: 1, title: 'As Vestes Sacerdotais' },
      { verse: 32, title: 'O Tabernáculo é Concluído' },
    ],
    40: [
      { verse: 1, title: 'O Tabernáculo é Erguido' },
      { verse: 34, title: 'A Glória do Senhor' },
    ],
  },
  3: {
    1: [
      { verse: 1, title: 'O Holocausto' },
    ],
    2: [
      { verse: 1, title: 'A Oferta de Cereal' },
    ],
    3: [
      { verse: 1, title: 'A Oferta de Comunhão' },
    ],
    4: [
      { verse: 1, title: 'A Oferta pelo Pecado' },
    ],
    5: [
      { verse: 1, title: 'Casos da Oferta pelo Pecado' },
      { verse: 14, title: 'A Oferta pela Culpa' },
    ],
    6: [
      { verse: 1, title: 'A Oferta pela Restituição' },
      { verse: 8, title: 'As Normas do Holocausto' },
      { verse: 14, title: 'As Normas da Oferta de Cereal' },
    ],
    7: [
      { verse: 1, title: 'As Normas da Oferta pela Culpa' },
      { verse: 11, title: 'As Normas da Oferta de Comunhão' },
      { verse: 28, title: 'A Porção dos Sacerdotes' },
    ],
    8: [
      { verse: 1, title: 'A Consagração de Arão e seus Filhos' },
    ],
    9: [
      { verse: 1, title: 'Os Sacerdotes Iniciam o Ministério' },
    ],
    10: [
      { verse: 1, title: 'A Morte de Nadabe e Abiú' },
    ],
    11: [
      { verse: 1, title: 'Os Animais Puros e Impuros' },
    ],
    12: [
      { verse: 1, title: 'A Purificação da Mulher' },
    ],
    13: [
      { verse: 1, title: 'As Leis sobre a Lepra' },
    ],
    14: [
      { verse: 1, title: 'A Purificação do Leproso' },
      { verse: 33, title: 'A Lepra nas Casas' },
    ],
    15: [
      { verse: 1, title: 'As Impurezas Físicas' },
    ],
    16: [
      { verse: 1, title: 'O Dia da Expiação' },
    ],
    17: [
      { verse: 1, title: 'O Sangue é Sagrado' },
    ],
    18: [
      { verse: 1, title: 'As Uniões Proibidas' },
    ],
    19: [
      { verse: 1, title: 'Diversas Leis de Santidade' },
    ],
    20: [
      { verse: 1, title: 'Os Pecados Puníveis com Morte' },
    ],
    21: [
      { verse: 1, title: 'A Santidade dos Sacerdotes' },
    ],
    22: [
      { verse: 1, title: 'As Ofertas Sagradas' },
      { verse: 17, title: 'As Ofertas Aceitáveis' },
    ],
    23: [
      { verse: 1, title: 'As Festas Anuais' },
      { verse: 4, title: 'A Páscoa e os Pães sem Fermento' },
      { verse: 23, title: 'A Festa das Trombetas' },
      { verse: 33, title: 'A Festa dos Tabernáculos' },
    ],
    24: [
      { verse: 1, title: 'O Azeite e os Pães' },
      { verse: 10, title: 'O Castigo do Blasfemo' },
    ],
    25: [
      { verse: 1, title: 'O Ano Sabático' },
      { verse: 8, title: 'O Ano do Jubileu' },
    ],
    26: [
      { verse: 1, title: 'A Recompensa da Obediência' },
      { verse: 14, title: 'O Castigo da Desobediência' },
    ],
    27: [
      { verse: 1, title: 'Os Votos e os Dízimos' },
    ],
  },
  4: {
    1: [
      { verse: 1, title: 'O Recenseamento de Israel' },
    ],
    2: [
      { verse: 1, title: 'A Disposição das Tribos' },
    ],
    3: [
      { verse: 1, title: 'Os Levitas' },
      { verse: 14, title: 'O Censo dos Levitas' },
    ],
    4: [
      { verse: 1, title: 'As Funções dos Coatitas' },
      { verse: 21, title: 'As Funções dos Gersonitas' },
      { verse: 29, title: 'As Funções dos Meraritas' },
    ],
    5: [
      { verse: 1, title: 'A Pureza do Acampamento' },
      { verse: 5, title: 'A Restituição por Danos' },
      { verse: 11, title: 'A Prova da Mulher Suspeita' },
    ],
    6: [
      { verse: 1, title: 'O Voto de Nazireu' },
      { verse: 22, title: 'A Bênção Sacerdotal' },
    ],
    7: [
      { verse: 1, title: 'As Ofertas dos Líderes' },
    ],
    8: [
      { verse: 1, title: 'O Candelabro' },
      { verse: 5, title: 'A Purificação dos Levitas' },
    ],
    9: [
      { verse: 1, title: 'A Segunda Páscoa' },
      { verse: 15, title: 'A Nuvem sobre o Tabernáculo' },
    ],
    10: [
      { verse: 1, title: 'As Trombetas de Prata' },
      { verse: 11, title: 'A Partida do Sinai' },
    ],
    11: [
      { verse: 1, title: 'O Povo se Queixa' },
      { verse: 16, title: 'Os Setenta Anciãos' },
      { verse: 31, title: 'As Codornizes' },
    ],
    12: [
      { verse: 1, title: 'Miriã e Arão se Opõem a Moisés' },
    ],
    13: [
      { verse: 1, title: 'Os Doze Espias' },
    ],
    14: [
      { verse: 1, title: 'A Rebelião do Povo' },
      { verse: 39, title: 'A Derrota em Hormá' },
    ],
    15: [
      { verse: 1, title: 'Leis sobre as Ofertas' },
      { verse: 32, title: 'O Violador do Sábado' },
      { verse: 37, title: 'As Franjas nas Vestes' },
    ],
    16: [
      { verse: 1, title: 'A Rebelião de Corá' },
    ],
    17: [
      { verse: 1, title: 'O Florescimento da Vara de Arão' },
    ],
    18: [
      { verse: 1, title: 'Os Deveres dos Sacerdotes e Levitas' },
      { verse: 21, title: 'Os Dízimos dos Levitas' },
    ],
    19: [
      { verse: 1, title: 'A Água da Purificação' },
    ],
    20: [
      { verse: 1, title: 'A Água em Meribá' },
      { verse: 14, title: 'Edom Recusa Passagem a Israel' },
      { verse: 22, title: 'A Morte de Arão' },
    ],
    21: [
      { verse: 1, title: 'A Vitória sobre Arade' },
      { verse: 4, title: 'A Serpente de Bronze' },
      { verse: 21, title: 'A Vitória sobre Seom e Ogue' },
    ],
    22: [
      { verse: 1, title: 'Balaque Convoca Balaão' },
      { verse: 21, title: 'A Jumenta de Balaão' },
    ],
    23: [
      { verse: 1, title: 'O Primeiro Oráculo de Balaão' },
      { verse: 13, title: 'O Segundo Oráculo de Balaão' },
    ],
    24: [
      { verse: 1, title: 'O Terceiro Oráculo de Balaão' },
      { verse: 15, title: 'O Quarto Oráculo de Balaão' },
    ],
    25: [
      { verse: 1, title: 'A Idolatria em Peor' },
    ],
    26: [
      { verse: 1, title: 'O Segundo Recenseamento' },
    ],
    27: [
      { verse: 1, title: 'A Herança das Filhas de Zelofeade' },
      { verse: 12, title: 'Josué Sucede Moisés' },
    ],
    28: [
      { verse: 1, title: 'As Ofertas Diárias' },
      { verse: 11, title: 'As Ofertas Mensais e da Páscoa' },
    ],
    29: [
      { verse: 1, title: 'As Ofertas das Festas' },
    ],
    30: [
      { verse: 1, title: 'As Leis sobre os Votos' },
    ],
    31: [
      { verse: 1, title: 'A Guerra contra os Midianitas' },
      { verse: 25, title: 'A Divisão dos Despojos' },
    ],
    32: [
      { verse: 1, title: 'As Tribos a Leste do Jordão' },
    ],
    33: [
      { verse: 1, title: 'As Etapas da Caminhada' },
      { verse: 50, title: 'A Ordem de Conquistar Canaã' },
    ],
    34: [
      { verse: 1, title: 'As Fronteiras de Canaã' },
      { verse: 16, title: 'Os Responsáveis pela Divisão' },
    ],
    35: [
      { verse: 1, title: 'As Cidades dos Levitas' },
      { verse: 9, title: 'As Cidades de Refúgio' },
    ],
    36: [
      { verse: 1, title: 'A Herança das Mulheres' },
    ],
  },
  5: {
    1: [
      { verse: 1, title: 'Moisés Recapitula a História' },
      { verse: 9, title: 'A Nomeação de Líderes' },
      { verse: 19, title: 'Os Espias Enviados' },
    ],
    2: [
      { verse: 1, title: 'A Peregrinação no Deserto' },
      { verse: 26, title: 'A Vitória sobre Seom' },
    ],
    3: [
      { verse: 1, title: 'A Vitória sobre Ogue' },
      { verse: 12, title: 'A Divisão da Terra a Leste' },
      { verse: 23, title: 'Moisés Não Entrará em Canaã' },
    ],
    4: [
      { verse: 1, title: 'O Apelo à Obediência' },
      { verse: 41, title: 'As Cidades de Refúgio' },
      { verse: 44, title: 'A Introdução à Lei' },
    ],
    5: [
      { verse: 1, title: 'Os Dez Mandamentos' },
      { verse: 22, title: 'O Temor do Povo' },
    ],
    6: [
      { verse: 1, title: 'Ama o Senhor teu Deus' },
    ],
    7: [
      { verse: 1, title: 'O Povo Escolhido por Deus' },
    ],
    8: [
      { verse: 1, title: 'Não Te Esqueças do Senhor' },
    ],
    9: [
      { verse: 1, title: 'Não por Vossa Justiça' },
      { verse: 7, title: 'O Bezerro de Ouro Relembrado' },
    ],
    10: [
      { verse: 1, title: 'As Novas Tábuas da Lei' },
      { verse: 12, title: 'O que o Senhor Requer' },
    ],
    11: [
      { verse: 1, title: 'Amar e Obedecer ao Senhor' },
      { verse: 26, title: 'A Bênção e a Maldição' },
    ],
    12: [
      { verse: 1, title: 'O Único Lugar de Adoração' },
    ],
    13: [
      { verse: 1, title: 'A Advertência contra a Idolatria' },
    ],
    14: [
      { verse: 1, title: 'Os Alimentos Puros e Impuros' },
      { verse: 22, title: 'Os Dízimos' },
    ],
    15: [
      { verse: 1, title: 'O Ano do Perdão das Dívidas' },
      { verse: 12, title: 'A Libertação dos Escravos' },
      { verse: 19, title: 'Os Primogênitos do Gado' },
    ],
    16: [
      { verse: 1, title: 'A Páscoa' },
      { verse: 9, title: 'A Festa das Semanas' },
      { verse: 13, title: 'A Festa dos Tabernáculos' },
      { verse: 18, title: 'A Administração da Justiça' },
    ],
    17: [
      { verse: 1, title: 'O Julgamento dos Idólatras' },
      { verse: 8, title: 'Os Tribunais' },
      { verse: 14, title: 'As Leis sobre o Rei' },
    ],
    18: [
      { verse: 1, title: 'A Porção dos Sacerdotes e Levitas' },
      { verse: 9, title: 'As Práticas Abomináveis' },
      { verse: 15, title: 'A Promessa de um Profeta' },
    ],
    19: [
      { verse: 1, title: 'As Cidades de Refúgio' },
      { verse: 14, title: 'Os Marcos e as Testemunhas' },
    ],
    20: [
      { verse: 1, title: 'As Leis da Guerra' },
    ],
    21: [
      { verse: 1, title: 'O Homicídio sem Autor Conhecido' },
      { verse: 10, title: 'O Casamento com Cativas' },
      { verse: 15, title: 'O Direito do Primogênito' },
      { verse: 18, title: 'O Filho Rebelde' },
    ],
    22: [
      { verse: 1, title: 'Diversas Leis Sociais' },
      { verse: 13, title: 'As Leis sobre a Castidade' },
    ],
    23: [
      { verse: 1, title: 'A Exclusão da Assembleia' },
      { verse: 9, title: 'A Pureza do Acampamento' },
      { verse: 15, title: 'Diversas Leis' },
    ],
    24: [
      { verse: 1, title: 'O Divórcio e Novo Casamento' },
      { verse: 5, title: 'Diversas Leis de Justiça' },
    ],
    25: [
      { verse: 1, title: 'Diversas Leis' },
      { verse: 5, title: 'O Casamento Levirato' },
      { verse: 17, title: 'A Ordem contra Amaleque' },
    ],
    26: [
      { verse: 1, title: 'As Primícias e os Dízimos' },
      { verse: 16, title: 'O Povo da Aliança' },
    ],
    27: [
      { verse: 1, title: 'O Altar no Monte Ebal' },
      { verse: 11, title: 'As Maldições do Ebal' },
    ],
    28: [
      { verse: 1, title: 'As Bênçãos da Obediência' },
      { verse: 15, title: 'As Maldições da Desobediência' },
    ],
    29: [
      { verse: 1, title: 'A Renovação da Aliança' },
    ],
    30: [
      { verse: 1, title: 'O Retorno ao Senhor' },
      { verse: 11, title: 'A Vida e a Morte' },
    ],
    31: [
      { verse: 1, title: 'Josué Sucede a Moisés' },
      { verse: 9, title: 'A Leitura da Lei' },
      { verse: 14, title: 'A Predição da Apostasia' },
    ],
    32: [
      { verse: 1, title: 'O Cântico de Moisés' },
      { verse: 48, title: 'Moisés Verá a Terra Prometida' },
    ],
    33: [
      { verse: 1, title: 'Moisés Abençoa as Tribos' },
    ],
    34: [
      { verse: 1, title: 'A Morte de Moisés' },
    ],
  },

// Josué a 2 Samuel (ids 6-10)
  6: {
    1: [
      { verse: 1, title: 'Deus Comissiona Josué' },
      { verse: 10, title: 'Josué Ordena ao Povo' },
    ],
    2: [
      { verse: 1, title: 'Raabe e os Espiões' },
    ],
    3: [
      { verse: 1, title: 'A Travessia do Jordão' },
    ],
    4: [
      { verse: 1, title: 'O Memorial de Pedras' },
    ],
    5: [
      { verse: 1, title: 'A Circuncisão em Gilgal' },
      { verse: 10, title: 'A Páscoa em Gilgal' },
      { verse: 13, title: 'O Comandante do Exército do Senhor' },
    ],
    6: [
      { verse: 1, title: 'A Queda de Jericó' },
    ],
    7: [
      { verse: 1, title: 'O Pecado de Acã' },
      { verse: 16, title: 'O Castigo de Acã' },
    ],
    8: [
      { verse: 1, title: 'A Conquista de Ai' },
      { verse: 30, title: 'A Renovação da Aliança no Monte Ebal' },
    ],
    9: [
      { verse: 1, title: 'O Engano dos Gibeonitas' },
    ],
    10: [
      { verse: 1, title: 'O Sol se Detém' },
      { verse: 16, title: 'Os Cinco Reis Amorreus' },
      { verse: 28, title: 'A Conquista das Cidades do Sul' },
    ],
    11: [
      { verse: 1, title: 'A Conquista do Norte' },
      { verse: 16, title: 'O Resumo das Conquistas' },
    ],
    12: [
      { verse: 1, title: 'Os Reis Derrotados' },
    ],
    13: [
      { verse: 1, title: 'A Terra Ainda por Conquistar' },
      { verse: 8, title: 'A Herança a Leste do Jordão' },
    ],
    14: [
      { verse: 1, title: 'A Divisão de Canaã' },
      { verse: 6, title: 'A Herança de Calebe' },
    ],
    15: [
      { verse: 1, title: 'O Território de Judá' },
      { verse: 13, title: 'Calebe Conquista Hebrom' },
    ],
    16: [
      { verse: 1, title: 'O Território de Efraim' },
    ],
    17: [
      { verse: 1, title: 'O Território de Manassés' },
      { verse: 14, title: 'A Queixa de José' },
    ],
    18: [
      { verse: 1, title: 'O Restante da Terra Dividido' },
      { verse: 11, title: 'O Território de Benjamim' },
    ],
    19: [
      { verse: 1, title: 'O Território de Simeão' },
      { verse: 10, title: 'O Território de Zebulom' },
      { verse: 17, title: 'O Território de Issacar' },
      { verse: 24, title: 'O Território de Aser' },
      { verse: 32, title: 'O Território de Naftali' },
      { verse: 40, title: 'O Território de Dã' },
      { verse: 49, title: 'A Herança de Josué' },
    ],
    20: [
      { verse: 1, title: 'As Cidades de Refúgio' },
    ],
    21: [
      { verse: 1, title: 'As Cidades dos Levitas' },
      { verse: 43, title: 'O Senhor Cumpre Suas Promessas' },
    ],
    22: [
      { verse: 1, title: 'As Tribos Orientais Voltam para Casa' },
      { verse: 10, title: 'O Altar às Margens do Jordão' },
    ],
    23: [
      { verse: 1, title: 'A Despedida de Josué' },
    ],
    24: [
      { verse: 1, title: 'A Renovação da Aliança em Siquém' },
      { verse: 29, title: 'A Morte de Josué' },
    ],
  },
  7: {
    1: [
      { verse: 1, title: 'Israel Combate os Cananeus' },
      { verse: 11, title: 'Adoni-Bezeque é Capturado' },
      { verse: 21, title: 'Os Cananeus Não Expulsos' },
    ],
    2: [
      { verse: 1, title: 'O Anjo do Senhor em Boquim' },
      { verse: 6, title: 'A Morte de Josué' },
      { verse: 10, title: 'A Desobediência de Israel' },
    ],
    3: [
      { verse: 1, title: 'As Nações Deixadas para Provar Israel' },
      { verse: 7, title: 'Otniel' },
      { verse: 12, title: 'Eúde' },
      { verse: 31, title: 'Sangar' },
    ],
    4: [
      { verse: 1, title: 'Débora e Baraque' },
    ],
    5: [
      { verse: 1, title: 'O Cântico de Débora' },
    ],
    6: [
      { verse: 1, title: 'Gideão' },
      { verse: 11, title: 'O Anjo do Senhor Chama Gideão' },
      { verse: 25, title: 'Gideão Derruba o Altar de Baal' },
      { verse: 36, title: 'O Sinal da Lã' },
    ],
    7: [
      { verse: 1, title: 'Gideão Derrota os Midianitas' },
    ],
    8: [
      { verse: 1, title: 'Zeba e Zalmuna' },
      { verse: 22, title: 'O Éfode de Gideão' },
      { verse: 33, title: 'A Morte de Gideão' },
    ],
    9: [
      { verse: 1, title: 'Abimeleque' },
      { verse: 7, title: 'A Parábola de Jotão' },
      { verse: 22, title: 'A Queda de Abimeleque' },
    ],
    10: [
      { verse: 1, title: 'Tolá e Jair' },
      { verse: 6, title: 'A Opressão dos Amonitas' },
    ],
    11: [
      { verse: 1, title: 'Jefté' },
      { verse: 29, title: 'O Voto de Jefté' },
    ],
    12: [
      { verse: 1, title: 'Jefté e os Efraimitas' },
      { verse: 8, title: 'Ibsã, Elom e Abdom' },
    ],
    13: [
      { verse: 1, title: 'O Nascimento de Sansão' },
    ],
    14: [
      { verse: 1, title: 'O Casamento de Sansão' },
    ],
    15: [
      { verse: 1, title: 'A Vingança de Sansão sobre os Filisteus' },
    ],
    16: [
      { verse: 1, title: 'Sansão em Gaza' },
      { verse: 4, title: 'Sansão e Dalila' },
      { verse: 23, title: 'A Morte de Sansão' },
    ],
    17: [
      { verse: 1, title: 'Os Ídolos de Mica' },
    ],
    18: [
      { verse: 1, title: 'A Tribo de Dã Migra' },
    ],
    19: [
      { verse: 1, title: 'O Levita e Sua Concubina' },
    ],
    20: [
      { verse: 1, title: 'Israel Combate Benjamim' },
    ],
    21: [
      { verse: 1, title: 'Esposas para os Benjamitas' },
    ],
  },
  8: {
    1: [
      { verse: 1, title: 'Noemi e Rute' },
      { verse: 6, title: 'Rute Permanece com Noemi' },
      { verse: 19, title: 'A Volta a Belém' },
    ],
    2: [
      { verse: 1, title: 'Rute Respiga no Campo de Boaz' },
    ],
    3: [
      { verse: 1, title: 'Rute e Boaz na Eira' },
    ],
    4: [
      { verse: 1, title: 'Boaz Resgata Rute' },
      { verse: 13, title: 'A Genealogia de Davi' },
    ],
  },
  9: {
    1: [
      { verse: 1, title: 'O Nascimento de Samuel' },
      { verse: 9, title: 'A Oração de Ana' },
      { verse: 21, title: 'Ana Dedica Samuel ao Senhor' },
    ],
    2: [
      { verse: 1, title: 'O Cântico de Ana' },
      { verse: 12, title: 'Os Filhos Perversos de Eli' },
      { verse: 27, title: 'A Profecia contra a Casa de Eli' },
    ],
    3: [
      { verse: 1, title: 'O Senhor Chama Samuel' },
    ],
    4: [
      { verse: 1, title: 'Os Filisteus Tomam a Arca' },
      { verse: 12, title: 'A Morte de Eli' },
    ],
    5: [
      { verse: 1, title: 'A Arca entre os Filisteus' },
    ],
    6: [
      { verse: 1, title: 'A Arca Retorna a Israel' },
    ],
    7: [
      { verse: 1, title: 'Samuel Julga Israel' },
      { verse: 7, title: 'Israel Derrota os Filisteus' },
    ],
    8: [
      { verse: 1, title: 'Israel Pede um Rei' },
    ],
    9: [
      { verse: 1, title: 'Samuel Unge Saul' },
    ],
    10: [
      { verse: 1, title: 'Saul é Ungido Rei' },
      { verse: 17, title: 'Saul é Proclamado Rei' },
    ],
    11: [
      { verse: 1, title: 'Saul Liberta Jabes-Gileade' },
    ],
    12: [
      { verse: 1, title: 'O Discurso de Despedida de Samuel' },
    ],
    13: [
      { verse: 1, title: 'Saul Desobedece a Samuel' },
      { verse: 19, title: 'Israel sem Armas' },
    ],
    14: [
      { verse: 1, title: 'Jônatas Ataca os Filisteus' },
      { verse: 24, title: 'O Juramento Imprudente de Saul' },
      { verse: 47, title: 'A Família e as Guerras de Saul' },
    ],
    15: [
      { verse: 1, title: 'O Senhor Rejeita Saul como Rei' },
    ],
    16: [
      { verse: 1, title: 'Samuel Unge Davi' },
      { verse: 14, title: 'Davi a Serviço de Saul' },
    ],
    17: [
      { verse: 1, title: 'Davi e Golias' },
    ],
    18: [
      { verse: 1, title: 'A Amizade de Davi e Jônatas' },
      { verse: 5, title: 'O Ciúme de Saul' },
      { verse: 17, title: 'Davi se Torna Genro de Saul' },
    ],
    19: [
      { verse: 1, title: 'Saul Tenta Matar Davi' },
    ],
    20: [
      { verse: 1, title: 'Davi e Jônatas Fazem Aliança' },
    ],
    21: [
      { verse: 1, title: 'Davi em Nobe' },
      { verse: 10, title: 'Davi em Gate' },
    ],
    22: [
      { verse: 1, title: 'Davi em Adulão e Mispá' },
      { verse: 6, title: 'Saul Mata os Sacerdotes de Nobe' },
    ],
    23: [
      { verse: 1, title: 'Davi Liberta Queila' },
      { verse: 14, title: 'Saul Persegue Davi' },
    ],
    24: [
      { verse: 1, title: 'Davi Poupa a Vida de Saul' },
    ],
    25: [
      { verse: 1, title: 'Davi, Nabal e Abigail' },
    ],
    26: [
      { verse: 1, title: 'Davi Poupa Saul Novamente' },
    ],
    27: [
      { verse: 1, title: 'Davi entre os Filisteus' },
    ],
    28: [
      { verse: 1, title: 'Saul e a Médium de En-Dor' },
    ],
    29: [
      { verse: 1, title: 'Os Filisteus Rejeitam Davi' },
    ],
    30: [
      { verse: 1, title: 'Davi Destrói os Amalequitas' },
    ],
    31: [
      { verse: 1, title: 'A Morte de Saul' },
    ],
  },
  10: {
    1: [
      { verse: 1, title: 'Davi Sabe da Morte de Saul' },
      { verse: 17, title: 'O Lamento de Davi por Saul e Jônatas' },
    ],
    2: [
      { verse: 1, title: 'Davi é Ungido Rei de Judá' },
      { verse: 8, title: 'Guerra entre as Casas de Davi e Saul' },
    ],
    3: [
      { verse: 1, title: 'Abner Adere a Davi' },
      { verse: 22, title: 'Joabe Mata Abner' },
    ],
    4: [
      { verse: 1, title: 'O Assassinato de Is-Bosete' },
    ],
    5: [
      { verse: 1, title: 'Davi é Ungido Rei de Israel' },
      { verse: 6, title: 'Davi Conquista Jerusalém' },
      { verse: 17, title: 'Davi Derrota os Filisteus' },
    ],
    6: [
      { verse: 1, title: 'A Arca é Levada a Jerusalém' },
    ],
    7: [
      { verse: 1, title: 'A Aliança de Deus com Davi' },
      { verse: 18, title: 'A Oração de Davi' },
    ],
    8: [
      { verse: 1, title: 'As Vitórias de Davi' },
    ],
    9: [
      { verse: 1, title: 'Davi e Mefibosete' },
    ],
    10: [
      { verse: 1, title: 'Davi Derrota Amom e Síria' },
    ],
    11: [
      { verse: 1, title: 'Davi e Bate-Seba' },
      { verse: 14, title: 'Davi Manda Matar Urias' },
    ],
    12: [
      { verse: 1, title: 'Natã Repreende Davi' },
      { verse: 15, title: 'A Morte do Filho de Davi' },
      { verse: 26, title: 'Davi Conquista Rabá' },
    ],
    13: [
      { verse: 1, title: 'Amnom e Tamar' },
      { verse: 23, title: 'Absalão Mata Amnom' },
    ],
    14: [
      { verse: 1, title: 'Absalão Retorna a Jerusalém' },
    ],
    15: [
      { verse: 1, title: 'A Conspiração de Absalão' },
      { verse: 13, title: 'Davi Foge de Jerusalém' },
    ],
    16: [
      { verse: 1, title: 'Davi e Ziba' },
      { verse: 5, title: 'Simei Amaldiçoa Davi' },
      { verse: 15, title: 'O Conselho de Aitofel' },
    ],
    17: [
      { verse: 1, title: 'O Conselho de Husai e Aitofel' },
      { verse: 24, title: 'Davi em Maanaim' },
    ],
    18: [
      { verse: 1, title: 'A Morte de Absalão' },
      { verse: 19, title: 'Davi Lamenta Absalão' },
    ],
    19: [
      { verse: 1, title: 'Joabe Repreende Davi' },
      { verse: 9, title: 'Davi Retorna a Jerusalém' },
    ],
    20: [
      { verse: 1, title: 'A Revolta de Seba' },
    ],
    21: [
      { verse: 1, title: 'Davi Vinga os Gibeonitas' },
      { verse: 15, title: 'Guerras contra os Filisteus' },
    ],
    22: [
      { verse: 1, title: 'O Cântico de Louvor de Davi' },
    ],
    23: [
      { verse: 1, title: 'As Últimas Palavras de Davi' },
      { verse: 8, title: 'Os Valentes de Davi' },
    ],
    24: [
      { verse: 1, title: 'Davi Faz o Censo' },
      { verse: 18, title: 'Davi Constrói um Altar' },
    ],
  },

// 1 Reis a Ester (ids 11-17)
  11: {
    1: [
      { verse: 1, title: 'A Velhice de Davi e Abisague' },
      { verse: 5, title: 'Adonias Tenta Usurpar o Trono' },
      { verse: 11, title: 'Natã e Bate-Seba Intervêm' },
      { verse: 28, title: 'Salomão Proclamado Rei' },
    ],
    2: [
      { verse: 1, title: 'As Últimas Instruções de Davi' },
      { verse: 10, title: 'A Morte de Davi' },
      { verse: 13, title: 'A Morte de Adonias' },
      { verse: 26, title: 'Abiatar e Joabe Punidos' },
      { verse: 36, title: 'A Morte de Simei' },
    ],
    3: [
      { verse: 1, title: 'Salomão Pede Sabedoria' },
      { verse: 16, title: 'O Julgamento Sábio de Salomão' },
    ],
    4: [
      { verse: 1, title: 'Os Oficiais de Salomão' },
      { verse: 20, title: 'A Prosperidade do Reino' },
      { verse: 29, title: 'A Sabedoria de Salomão' },
    ],
    5: [
      { verse: 1, title: 'Preparativos para o Templo' },
    ],
    6: [
      { verse: 1, title: 'Salomão Constrói o Templo' },
      { verse: 11, title: 'A Palavra do Senhor a Salomão' },
      { verse: 14, title: 'O Interior do Templo' },
    ],
    7: [
      { verse: 1, title: 'O Palácio de Salomão' },
      { verse: 13, title: 'Os Objetos de Bronze' },
      { verse: 40, title: 'Os Utensílios do Templo' },
    ],
    8: [
      { verse: 1, title: 'A Arca Levada ao Templo' },
      { verse: 12, title: 'Salomão Abençoa o Povo' },
      { verse: 22, title: 'A Oração de Dedicação' },
      { verse: 62, title: 'A Dedicação do Templo' },
    ],
    9: [
      { verse: 1, title: 'O Senhor Aparece a Salomão' },
      { verse: 10, title: 'As Realizações de Salomão' },
      { verse: 26, title: 'A Frota de Salomão' },
    ],
    10: [
      { verse: 1, title: 'A Visita da Rainha de Sabá' },
      { verse: 14, title: 'O Esplendor de Salomão' },
    ],
    11: [
      { verse: 1, title: 'As Mulheres de Salomão' },
      { verse: 14, title: 'Os Adversários de Salomão' },
      { verse: 26, title: 'Jeroboão se Rebela' },
      { verse: 41, title: 'A Morte de Salomão' },
    ],
    12: [
      { verse: 1, title: 'A Revolta de Israel' },
      { verse: 25, title: 'Os Bezerros de Ouro de Jeroboão' },
    ],
    13: [
      { verse: 1, title: 'O Homem de Deus de Judá' },
      { verse: 11, title: 'O Profeta Velho de Betel' },
      { verse: 33, title: 'O Pecado Persistente de Jeroboão' },
    ],
    14: [
      { verse: 1, title: 'A Profecia de Aias contra Jeroboão' },
      { verse: 21, title: 'O Reinado de Roboão em Judá' },
    ],
    15: [
      { verse: 1, title: 'O Reinado de Abias em Judá' },
      { verse: 9, title: 'O Reinado de Asa em Judá' },
      { verse: 25, title: 'O Reinado de Nadabe em Israel' },
      { verse: 33, title: 'O Reinado de Baasa em Israel' },
    ],
    16: [
      { verse: 1, title: 'A Profecia contra Baasa' },
      { verse: 8, title: 'O Reinado de Elá em Israel' },
      { verse: 15, title: 'O Reinado de Zinri em Israel' },
      { verse: 21, title: 'O Reinado de Onri em Israel' },
      { verse: 29, title: 'O Reinado de Acabe em Israel' },
    ],
    17: [
      { verse: 1, title: 'Elias Alimentado pelos Corvos' },
      { verse: 8, title: 'A Viúva de Sarepta' },
      { verse: 17, title: 'Elias Ressuscita o Filho da Viúva' },
    ],
    18: [
      { verse: 1, title: 'Elias e Obadias' },
      { verse: 16, title: 'Elias no Monte Carmelo' },
      { verse: 41, title: 'O Fim da Seca' },
    ],
    19: [
      { verse: 1, title: 'Elias Foge para Horebe' },
      { verse: 19, title: 'O Chamado de Eliseu' },
    ],
    20: [
      { verse: 1, title: 'Ben-Hadade Ataca Samaria' },
      { verse: 13, title: 'Acabe Derrota Ben-Hadade' },
      { verse: 22, title: 'A Segunda Vitória de Acabe' },
      { verse: 35, title: 'Um Profeta Condena Acabe' },
    ],
    21: [
      { verse: 1, title: 'A Vinha de Nabote' },
      { verse: 17, title: 'A Sentença de Elias contra Acabe' },
    ],
    22: [
      { verse: 1, title: 'Micaías Profetiza contra Acabe' },
      { verse: 29, title: 'A Morte de Acabe' },
      { verse: 41, title: 'O Reinado de Josafá em Judá' },
      { verse: 51, title: 'O Reinado de Acazias em Israel' },
    ],
  },
  12: {
    1: [
      { verse: 1, title: 'O Julgamento do Senhor sobre Acazias' },
    ],
    2: [
      { verse: 1, title: 'Elias Levado ao Céu' },
      { verse: 12, title: 'Eliseu Sucede a Elias' },
      { verse: 19, title: 'Eliseu Purifica as Águas' },
      { verse: 23, title: 'Eliseu Zombado por Jovens' },
    ],
    3: [
      { verse: 1, title: 'A Guerra contra Moabe' },
    ],
    4: [
      { verse: 1, title: 'O Azeite da Viúva' },
      { verse: 8, title: 'A Sunamita e Seu Filho' },
      { verse: 38, title: 'Os Milagres com a Comida' },
    ],
    5: [
      { verse: 1, title: 'A Cura de Naamã' },
      { verse: 19, title: 'A Ganância de Geazi' },
    ],
    6: [
      { verse: 1, title: 'O Machado que Flutuou' },
      { verse: 8, title: 'Eliseu e os Sírios Cegos' },
      { verse: 24, title: 'O Cerco de Samaria' },
    ],
    7: [
      { verse: 1, title: 'O Fim do Cerco de Samaria' },
    ],
    8: [
      { verse: 1, title: 'A Terra Restituída à Sunamita' },
      { verse: 7, title: 'Hazael Mata Ben-Hadade' },
      { verse: 16, title: 'O Reinado de Jeorão em Judá' },
      { verse: 25, title: 'O Reinado de Acazias em Judá' },
    ],
    9: [
      { verse: 1, title: 'Jeú Ungido Rei de Israel' },
      { verse: 14, title: 'Jeú Mata Jeorão e Acazias' },
      { verse: 30, title: 'A Morte de Jezabel' },
    ],
    10: [
      { verse: 1, title: 'A Família de Acabe Morta' },
      { verse: 18, title: 'Jeú Extermina os Adoradores de Baal' },
      { verse: 32, title: 'A Morte de Jeú' },
    ],
    11: [
      { verse: 1, title: 'Atalia Usurpa o Trono' },
      { verse: 4, title: 'Joás Proclamado Rei' },
      { verse: 17, title: 'As Reformas de Joiada' },
    ],
    12: [
      { verse: 1, title: 'Joás Repara o Templo' },
      { verse: 17, title: 'O Reinado e a Morte de Joás' },
    ],
    13: [
      { verse: 1, title: 'O Reinado de Jeoacaz em Israel' },
      { verse: 10, title: 'O Reinado de Jeoás em Israel' },
      { verse: 14, title: 'A Morte de Eliseu' },
      { verse: 22, title: 'A Vitória sobre os Sírios' },
    ],
    14: [
      { verse: 1, title: 'O Reinado de Amazias em Judá' },
      { verse: 23, title: 'O Reinado de Jeroboão II em Israel' },
    ],
    15: [
      { verse: 1, title: 'O Reinado de Azarias em Judá' },
      { verse: 8, title: 'O Reinado de Zacarias em Israel' },
      { verse: 13, title: 'O Reinado de Salum em Israel' },
      { verse: 17, title: 'O Reinado de Menaém em Israel' },
      { verse: 23, title: 'O Reinado de Pecaías em Israel' },
      { verse: 27, title: 'O Reinado de Peca em Israel' },
      { verse: 32, title: 'O Reinado de Jotão em Judá' },
    ],
    16: [
      { verse: 1, title: 'O Reinado de Acaz em Judá' },
    ],
    17: [
      { verse: 1, title: 'A Queda de Israel' },
      { verse: 7, title: 'Israel Exilado por seus Pecados' },
      { verse: 24, title: 'Samaria Repovoada' },
    ],
    18: [
      { verse: 1, title: 'O Reinado de Ezequias em Judá' },
      { verse: 13, title: 'Senaqueribe Ameaça Jerusalém' },
    ],
    19: [
      { verse: 1, title: 'Ezequias Consulta Isaías' },
      { verse: 14, title: 'A Oração de Ezequias' },
      { verse: 20, title: 'A Queda de Senaqueribe' },
    ],
    20: [
      { verse: 1, title: 'A Enfermidade de Ezequias' },
      { verse: 12, title: 'Os Enviados da Babilônia' },
    ],
    21: [
      { verse: 1, title: 'O Reinado de Manassés em Judá' },
      { verse: 19, title: 'O Reinado de Amom em Judá' },
    ],
    22: [
      { verse: 1, title: 'Josias Renova a Aliança' },
      { verse: 3, title: 'O Livro da Lei Encontrado' },
    ],
    23: [
      { verse: 1, title: 'As Reformas de Josias' },
      { verse: 21, title: 'A Celebração da Páscoa' },
      { verse: 28, title: 'A Morte de Josias' },
      { verse: 31, title: 'O Reinado de Jeoacaz em Judá' },
      { verse: 36, title: 'O Reinado de Jeoaquim em Judá' },
    ],
    24: [
      { verse: 1, title: 'Nabucodonosor Domina Judá' },
      { verse: 8, title: 'O Reinado de Joaquim em Judá' },
      { verse: 18, title: 'O Reinado de Zedequias em Judá' },
    ],
    25: [
      { verse: 1, title: 'A Queda de Jerusalém' },
      { verse: 8, title: 'A Destruição do Templo' },
      { verse: 22, title: 'Gedalias, Governador de Judá' },
      { verse: 27, title: 'Joaquim Libertado na Babilônia' },
    ],
  },
  13: {
    1: [
      { verse: 1, title: 'De Adão a Abraão' },
      { verse: 24, title: 'Os Descendentes de Abraão' },
    ],
    2: [
      { verse: 1, title: 'Os Filhos de Israel' },
      { verse: 3, title: 'Os Descendentes de Judá' },
    ],
    3: [
      { verse: 1, title: 'Os Filhos de Davi' },
      { verse: 10, title: 'Os Reis de Judá' },
      { verse: 17, title: 'A Família Real após o Exílio' },
    ],
    4: [
      { verse: 1, title: 'Outros Descendentes de Judá' },
      { verse: 24, title: 'Os Descendentes de Simeão' },
    ],
    5: [
      { verse: 1, title: 'Os Descendentes de Rúben' },
      { verse: 11, title: 'Os Descendentes de Gade' },
      { verse: 23, title: 'A Meia Tribo de Manassés' },
    ],
    6: [
      { verse: 1, title: 'Os Descendentes de Levi' },
      { verse: 31, title: 'Os Cantores do Templo' },
      { verse: 54, title: 'As Cidades dos Levitas' },
    ],
    7: [
      { verse: 1, title: 'Os Descendentes de Issacar' },
      { verse: 6, title: 'Os Descendentes de Benjamim' },
      { verse: 13, title: 'Os Descendentes de Naftali' },
      { verse: 14, title: 'Os Descendentes de Manassés' },
      { verse: 20, title: 'Os Descendentes de Efraim' },
      { verse: 30, title: 'Os Descendentes de Aser' },
    ],
    8: [
      { verse: 1, title: 'A Genealogia de Benjamim' },
      { verse: 33, title: 'A Família de Saul' },
    ],
    9: [
      { verse: 1, title: 'O Povo de Jerusalém' },
      { verse: 35, title: 'A Genealogia de Saul' },
    ],
    10: [
      { verse: 1, title: 'A Morte de Saul' },
    ],
    11: [
      { verse: 1, title: 'Davi Torna-se Rei de Israel' },
      { verse: 4, title: 'Davi Conquista Jerusalém' },
      { verse: 10, title: 'Os Guerreiros de Davi' },
    ],
    12: [
      { verse: 1, title: 'Os Aliados de Davi em Ziclague' },
      { verse: 23, title: 'O Exército de Davi em Hebrom' },
    ],
    13: [
      { verse: 1, title: 'A Arca é Trazida de Quiriate-Jearim' },
      { verse: 9, title: 'A Morte de Uzá' },
    ],
    14: [
      { verse: 1, title: 'A Casa e a Família de Davi' },
      { verse: 8, title: 'Davi Derrota os Filisteus' },
    ],
    15: [
      { verse: 1, title: 'A Arca Trazida a Jerusalém' },
      { verse: 25, title: 'A Procissão da Arca' },
    ],
    16: [
      { verse: 1, title: 'A Arca Colocada na Tenda' },
      { verse: 7, title: 'O Salmo de Ação de Graças de Davi' },
      { verse: 37, title: 'A Adoração diante da Arca' },
    ],
    17: [
      { verse: 1, title: 'A Promessa de Deus a Davi' },
      { verse: 16, title: 'A Oração de Davi' },
    ],
    18: [
      { verse: 1, title: 'As Vitórias de Davi' },
    ],
    19: [
      { verse: 1, title: 'Davi Derrota os Amonitas e Sírios' },
    ],
    20: [
      { verse: 1, title: 'A Conquista de Rabá' },
      { verse: 4, title: 'Guerras contra os Filisteus' },
    ],
    21: [
      { verse: 1, title: 'O Censo de Davi' },
      { verse: 18, title: 'O Altar na Eira de Ornã' },
    ],
    22: [
      { verse: 1, title: 'Preparativos para o Templo' },
      { verse: 6, title: 'Davi Instrui Salomão' },
    ],
    23: [
      { verse: 1, title: 'Os Levitas e Seus Deveres' },
    ],
    24: [
      { verse: 1, title: 'As Divisões dos Sacerdotes' },
      { verse: 20, title: 'Os Demais Levitas' },
    ],
    25: [
      { verse: 1, title: 'Os Músicos do Templo' },
    ],
    26: [
      { verse: 1, title: 'As Divisões dos Porteiros' },
      { verse: 20, title: 'Os Tesoureiros e Oficiais' },
    ],
    27: [
      { verse: 1, title: 'As Divisões Militares' },
      { verse: 16, title: 'Os Líderes das Tribos' },
      { verse: 25, title: 'Os Administradores do Rei' },
    ],
    28: [
      { verse: 1, title: 'Davi Instrui sobre o Templo' },
      { verse: 9, title: 'Davi Encarrega Salomão' },
    ],
    29: [
      { verse: 1, title: 'As Ofertas para o Templo' },
      { verse: 10, title: 'A Oração de Davi' },
      { verse: 20, title: 'Salomão Reconhecido Rei' },
      { verse: 26, title: 'A Morte de Davi' },
    ],
  },
  14: {
    1: [
      { verse: 1, title: 'Salomão Pede Sabedoria' },
      { verse: 13, title: 'O Esplendor de Salomão' },
    ],
    2: [
      { verse: 1, title: 'Preparativos para o Templo' },
    ],
    3: [
      { verse: 1, title: 'Salomão Constrói o Templo' },
    ],
    4: [
      { verse: 1, title: 'O Mobiliário do Templo' },
    ],
    5: [
      { verse: 1, title: 'A Arca Levada ao Templo' },
    ],
    6: [
      { verse: 1, title: 'A Oração de Dedicação' },
    ],
    7: [
      { verse: 1, title: 'A Dedicação do Templo' },
      { verse: 11, title: 'O Senhor Aparece a Salomão' },
    ],
    8: [
      { verse: 1, title: 'As Realizações de Salomão' },
    ],
    9: [
      { verse: 1, title: 'A Visita da Rainha de Sabá' },
      { verse: 13, title: 'A Riqueza de Salomão' },
      { verse: 29, title: 'A Morte de Salomão' },
    ],
    10: [
      { verse: 1, title: 'A Revolta de Israel' },
    ],
    11: [
      { verse: 1, title: 'O Reinado de Roboão' },
      { verse: 5, title: 'Roboão Fortifica Judá' },
    ],
    12: [
      { verse: 1, title: 'Sisaque Invade Judá' },
    ],
    13: [
      { verse: 1, title: 'O Reinado de Abias em Judá' },
    ],
    14: [
      { verse: 1, title: 'O Reinado de Asa em Judá' },
      { verse: 9, title: 'Asa Derrota os Etíopes' },
    ],
    15: [
      { verse: 1, title: 'As Reformas de Asa' },
    ],
    16: [
      { verse: 1, title: 'O Tratado de Asa com a Síria' },
      { verse: 11, title: 'A Morte de Asa' },
    ],
    17: [
      { verse: 1, title: 'O Reinado de Josafá em Judá' },
    ],
    18: [
      { verse: 1, title: 'Micaías Profetiza contra Acabe' },
      { verse: 28, title: 'A Morte de Acabe' },
    ],
    19: [
      { verse: 1, title: 'A Repreensão a Josafá' },
      { verse: 4, title: 'As Reformas de Josafá' },
    ],
    20: [
      { verse: 1, title: 'Josafá Derrota os Inimigos' },
      { verse: 31, title: 'O Fim do Reinado de Josafá' },
    ],
    21: [
      { verse: 1, title: 'O Reinado de Jeorão em Judá' },
    ],
    22: [
      { verse: 1, title: 'O Reinado de Acazias em Judá' },
      { verse: 10, title: 'Atalia Usurpa o Trono' },
    ],
    23: [
      { verse: 1, title: 'Joás Proclamado Rei' },
    ],
    24: [
      { verse: 1, title: 'Joás Repara o Templo' },
      { verse: 17, title: 'A Apostasia de Joás' },
    ],
    25: [
      { verse: 1, title: 'O Reinado de Amazias em Judá' },
      { verse: 14, title: 'A Idolatria de Amazias' },
    ],
    26: [
      { verse: 1, title: 'O Reinado de Uzias em Judá' },
      { verse: 16, title: 'O Orgulho e a Lepra de Uzias' },
    ],
    27: [
      { verse: 1, title: 'O Reinado de Jotão em Judá' },
    ],
    28: [
      { verse: 1, title: 'O Reinado de Acaz em Judá' },
    ],
    29: [
      { verse: 1, title: 'Ezequias Purifica o Templo' },
      { verse: 20, title: 'A Restauração do Culto' },
    ],
    30: [
      { verse: 1, title: 'Ezequias Celebra a Páscoa' },
    ],
    31: [
      { verse: 1, title: 'As Reformas de Ezequias' },
    ],
    32: [
      { verse: 1, title: 'Senaqueribe Ameaça Jerusalém' },
      { verse: 24, title: 'A Enfermidade e o Orgulho de Ezequias' },
    ],
    33: [
      { verse: 1, title: 'O Reinado de Manassés em Judá' },
      { verse: 21, title: 'O Reinado de Amom em Judá' },
    ],
    34: [
      { verse: 1, title: 'As Reformas de Josias' },
      { verse: 14, title: 'O Livro da Lei Encontrado' },
    ],
    35: [
      { verse: 1, title: 'Josias Celebra a Páscoa' },
      { verse: 20, title: 'A Morte de Josias' },
    ],
    36: [
      { verse: 1, title: 'Os Últimos Reis de Judá' },
      { verse: 15, title: 'A Queda de Jerusalém' },
      { verse: 22, title: 'O Decreto de Ciro' },
    ],
  },
  15: {
    1: [
      { verse: 1, title: 'O Decreto de Ciro' },
      { verse: 5, title: 'O Retorno dos Exilados' },
    ],
    2: [
      { verse: 1, title: 'A Lista dos que Retornaram' },
      { verse: 64, title: 'A Assembleia do Povo' },
    ],
    3: [
      { verse: 1, title: 'A Reconstrução do Altar' },
      { verse: 7, title: 'A Reconstrução do Templo Iniciada' },
    ],
    4: [
      { verse: 1, title: 'A Oposição à Reconstrução' },
      { verse: 6, title: 'A Carta a Artaxerxes' },
    ],
    5: [
      { verse: 1, title: 'A Obra Recomeça' },
    ],
    6: [
      { verse: 1, title: 'O Decreto de Dario' },
      { verse: 13, title: 'A Conclusão do Templo' },
      { verse: 19, title: 'A Celebração da Páscoa' },
    ],
    7: [
      { verse: 1, title: 'Esdras Chega a Jerusalém' },
      { verse: 11, title: 'A Carta de Artaxerxes a Esdras' },
    ],
    8: [
      { verse: 1, title: 'Os que Voltaram com Esdras' },
      { verse: 15, title: 'O Retorno a Jerusalém' },
    ],
    9: [
      { verse: 1, title: 'O Pecado dos Casamentos Mistos' },
      { verse: 5, title: 'A Oração de Esdras' },
    ],
    10: [
      { verse: 1, title: 'A Confissão do Povo' },
      { verse: 18, title: 'Os Culpados de Casamentos Mistos' },
    ],
  },
  16: {
    1: [
      { verse: 1, title: 'A Oração de Neemias' },
    ],
    2: [
      { verse: 1, title: 'Neemias Enviado a Jerusalém' },
      { verse: 11, title: 'Neemias Inspeciona os Muros' },
    ],
    3: [
      { verse: 1, title: 'Os Construtores do Muro' },
    ],
    4: [
      { verse: 1, title: 'A Oposição à Reconstrução' },
      { verse: 15, title: 'Os Trabalhadores Armados' },
    ],
    5: [
      { verse: 1, title: 'Neemias Combate a Opressão' },
      { verse: 14, title: 'A Generosidade de Neemias' },
    ],
    6: [
      { verse: 1, title: 'Conspirações contra Neemias' },
      { verse: 15, title: 'A Conclusão do Muro' },
    ],
    7: [
      { verse: 1, title: 'Neemias Organiza Jerusalém' },
      { verse: 5, title: 'A Lista dos que Retornaram' },
    ],
    8: [
      { verse: 1, title: 'Esdras Lê a Lei' },
      { verse: 13, title: 'A Festa dos Tabernáculos' },
    ],
    9: [
      { verse: 1, title: 'O Povo Confessa seus Pecados' },
      { verse: 5, title: 'A Oração dos Levitas' },
    ],
    10: [
      { verse: 1, title: 'A Aliança do Povo' },
    ],
    11: [
      { verse: 1, title: 'Os Habitantes de Jerusalém' },
      { verse: 25, title: 'Os Moradores das Cidades' },
    ],
    12: [
      { verse: 1, title: 'Os Sacerdotes e Levitas' },
      { verse: 27, title: 'A Dedicação dos Muros' },
    ],
    13: [
      { verse: 1, title: 'As Reformas Finais de Neemias' },
    ],
  },
  17: {
    1: [
      { verse: 1, title: 'A Rainha Vasti Deposta' },
    ],
    2: [
      { verse: 1, title: 'Ester Torna-se Rainha' },
      { verse: 19, title: 'Mardoqueu Descobre a Conspiração' },
    ],
    3: [
      { verse: 1, title: 'O Plano de Hamã contra os Judeus' },
    ],
    4: [
      { verse: 1, title: 'Mardoqueu Pede Ajuda a Ester' },
    ],
    5: [
      { verse: 1, title: 'Ester se Apresenta ao Rei' },
      { verse: 9, title: 'O Ódio de Hamã por Mardoqueu' },
    ],
    6: [
      { verse: 1, title: 'Mardoqueu é Honrado' },
    ],
    7: [
      { verse: 1, title: 'Hamã é Enforcado' },
    ],
    8: [
      { verse: 1, title: 'O Decreto em Favor dos Judeus' },
    ],
    9: [
      { verse: 1, title: 'O Triunfo dos Judeus' },
      { verse: 20, title: 'A Festa de Purim Instituída' },
    ],
    10: [
      { verse: 1, title: 'A Grandeza de Mardoqueu' },
    ],
  },

// Jó a Cantares (ids 18-22)
  18: {
    1: [
      { verse: 1, title: 'Jó e Sua Família' },
      { verse: 6, title: 'A Primeira Prova de Jó' },
      { verse: 13, title: 'A Perda dos Bens e Filhos' },
    ],
    2: [
      { verse: 1, title: 'A Segunda Prova de Jó' },
      { verse: 11, title: 'Os Três Amigos de Jó' },
    ],
    3: [
      { verse: 1, title: 'Jó Amaldiçoa o Dia em Que Nasceu' },
    ],
    4: [
      { verse: 1, title: 'O Primeiro Discurso de Elifaz' },
    ],
    5: [
      { verse: 1, title: 'Elifaz Exorta Jó' },
    ],
    6: [
      { verse: 1, title: 'A Resposta de Jó a Elifaz' },
    ],
    7: [
      { verse: 1, title: 'O Lamento de Jó' },
    ],
    8: [
      { verse: 1, title: 'O Primeiro Discurso de Bildade' },
    ],
    9: [
      { verse: 1, title: 'A Resposta de Jó a Bildade' },
    ],
    10: [
      { verse: 1, title: 'Jó Clama Diante de Deus' },
    ],
    11: [
      { verse: 1, title: 'O Primeiro Discurso de Zofar' },
    ],
    12: [
      { verse: 1, title: 'A Resposta de Jó a Zofar' },
    ],
    13: [
      { verse: 1, title: 'Jó Defende-se Diante de Deus' },
    ],
    14: [
      { verse: 1, title: 'A Brevidade da Vida Humana' },
    ],
    15: [
      { verse: 1, title: 'O Segundo Discurso de Elifaz' },
    ],
    16: [
      { verse: 1, title: 'A Resposta de Jó a Elifaz' },
    ],
    17: [
      { verse: 1, title: 'Jó Implora por Justiça' },
    ],
    18: [
      { verse: 1, title: 'O Segundo Discurso de Bildade' },
    ],
    19: [
      { verse: 1, title: 'A Resposta de Jó a Bildade' },
      { verse: 23, title: 'Eu Sei Que o Meu Redentor Vive' },
    ],
    20: [
      { verse: 1, title: 'O Segundo Discurso de Zofar' },
    ],
    21: [
      { verse: 1, title: 'A Resposta de Jó a Zofar' },
    ],
    22: [
      { verse: 1, title: 'O Terceiro Discurso de Elifaz' },
    ],
    23: [
      { verse: 1, title: 'A Resposta de Jó a Elifaz' },
    ],
    24: [
      { verse: 1, title: 'A Maldade dos Ímpios' },
    ],
    25: [
      { verse: 1, title: 'O Terceiro Discurso de Bildade' },
    ],
    26: [
      { verse: 1, title: 'Jó Exalta o Poder de Deus' },
    ],
    27: [
      { verse: 1, title: 'Jó Mantém a Sua Integridade' },
    ],
    28: [
      { verse: 1, title: 'O Hino à Sabedoria' },
    ],
    29: [
      { verse: 1, title: 'Jó Recorda o Passado' },
    ],
    30: [
      { verse: 1, title: 'O Sofrimento Presente de Jó' },
    ],
    31: [
      { verse: 1, title: 'A Última Defesa de Jó' },
    ],
    32: [
      { verse: 1, title: 'O Primeiro Discurso de Eliú' },
    ],
    33: [
      { verse: 1, title: 'Eliú Repreende Jó' },
    ],
    34: [
      { verse: 1, title: 'Eliú Proclama a Justiça de Deus' },
    ],
    35: [
      { verse: 1, title: 'Eliú Continua o Seu Discurso' },
    ],
    36: [
      { verse: 1, title: 'A Grandeza de Deus' },
    ],
    37: [
      { verse: 1, title: 'O Poder de Deus na Natureza' },
    ],
    38: [
      { verse: 1, title: 'O Senhor Responde a Jó' },
    ],
    39: [
      { verse: 1, title: 'As Maravilhas da Criação' },
    ],
    40: [
      { verse: 1, title: 'Jó Reconhece a Sua Pequenez' },
      { verse: 15, title: 'O Beemote' },
    ],
    41: [
      { verse: 1, title: 'O Leviatã' },
    ],
    42: [
      { verse: 1, title: 'Jó Se Humilha Diante de Deus' },
      { verse: 7, title: 'A Restauração de Jó' },
    ],
  },
  19: {
    1: [ { verse: 1, title: 'O Caminho dos Justos e dos Ímpios' } ],
    2: [ { verse: 1, title: 'O Reinado do Ungido do Senhor' } ],
    3: [ { verse: 1, title: 'O Senhor é o Meu Escudo' } ],
    4: [ { verse: 1, title: 'Oração da Noite' } ],
    5: [ { verse: 1, title: 'Guia-me na Tua Justiça' } ],
    6: [ { verse: 1, title: 'Súplica por Misericórdia' } ],
    7: [ { verse: 1, title: 'Deus, o Justo Juiz' } ],
    8: [ { verse: 1, title: 'A Glória do Criador e a Dignidade do Homem' } ],
    9: [ { verse: 1, title: 'Ação de Graças pela Justiça de Deus' } ],
    10: [ { verse: 1, title: 'Clamor por Auxílio Contra os Ímpios' } ],
    11: [ { verse: 1, title: 'A Confiança no Senhor' } ],
    12: [ { verse: 1, title: 'O Socorro Contra os Falsos' } ],
    13: [ { verse: 1, title: 'Até Quando, Senhor?' } ],
    14: [ { verse: 1, title: 'A Corrupção da Humanidade' } ],
    15: [ { verse: 1, title: 'Quem Habitará no Teu Santuário?' } ],
    16: [ { verse: 1, title: 'O Senhor é a Minha Herança' } ],
    17: [ { verse: 1, title: 'Oração por Livramento' } ],
    18: [ { verse: 1, title: 'O Cântico de Vitória de Davi' } ],
    19: [ { verse: 1, title: 'A Glória de Deus na Criação e na Lei' } ],
    20: [ { verse: 1, title: 'Oração pela Vitória do Rei' } ],
    21: [ { verse: 1, title: 'Louvor pela Vitória do Rei' } ],
    22: [ { verse: 1, title: 'Clamor de Angústia e Louvor' } ],
    23: [ { verse: 1, title: 'O Senhor é o Meu Pastor' } ],
    24: [ { verse: 1, title: 'O Rei da Glória' } ],
    25: [ { verse: 1, title: 'Oração por Orientação e Perdão' } ],
    26: [ { verse: 1, title: 'A Integridade do Justo' } ],
    27: [ { verse: 1, title: 'O Senhor é a Minha Luz e Salvação' } ],
    28: [ { verse: 1, title: 'Súplica e Ação de Graças' } ],
    29: [ { verse: 1, title: 'A Voz do Senhor na Tempestade' } ],
    30: [ { verse: 1, title: 'Cântico de Gratidão pela Cura' } ],
    31: [ { verse: 1, title: 'Confiança no Senhor em Tempo de Aflição' } ],
    32: [ { verse: 1, title: 'A Bem-Aventurança do Perdão' } ],
    33: [ { verse: 1, title: 'Louvai ao Senhor com Júbilo' } ],
    34: [ { verse: 1, title: 'Provai e Vede Que o Senhor é Bom' } ],
    35: [ { verse: 1, title: 'Oração por Socorro Contra Inimigos' } ],
    36: [ { verse: 1, title: 'A Maldade do Ímpio e a Bondade de Deus' } ],
    37: [ { verse: 1, title: 'O Destino dos Justos e dos Ímpios' } ],
    38: [ { verse: 1, title: 'Oração do Penitente Aflito' } ],
    39: [ { verse: 1, title: 'A Brevidade da Vida' } ],
    40: [ { verse: 1, title: 'Louvor e Súplica por Livramento' } ],
    41: [ { verse: 1, title: 'A Bênção sobre o Que Cuida do Pobre' } ],
    42: [ { verse: 1, title: 'A Sede da Alma por Deus' } ],
    43: [ { verse: 1, title: 'Oração por Vindicação' } ],
    44: [ { verse: 1, title: 'Clamor da Nação Aflita' } ],
    45: [ { verse: 1, title: 'O Cântico Nupcial do Rei' } ],
    46: [ { verse: 1, title: 'Deus é o Nosso Refúgio e Força' } ],
    47: [ { verse: 1, title: 'Deus, o Rei de Toda a Terra' } ],
    48: [ { verse: 1, title: 'A Glória de Sião' } ],
    49: [ { verse: 1, title: 'A Vaidade das Riquezas' } ],
    50: [ { verse: 1, title: 'A Verdadeira Adoração' } ],
    51: [ { verse: 1, title: 'Oração de Arrependimento' } ],
    52: [ { verse: 1, title: 'O Juízo Contra o Maligno' } ],
    53: [ { verse: 1, title: 'A Insensatez do Ateu' } ],
    54: [ { verse: 1, title: 'Oração por Proteção' } ],
    55: [ { verse: 1, title: 'A Traição de um Amigo' } ],
    56: [ { verse: 1, title: 'Confiança em Deus no Temor' } ],
    57: [ { verse: 1, title: 'Refúgio à Sombra das Tuas Asas' } ],
    58: [ { verse: 1, title: 'O Juízo Contra os Juízes Injustos' } ],
    59: [ { verse: 1, title: 'Oração por Livramento dos Inimigos' } ],
    60: [ { verse: 1, title: 'Oração Após a Derrota' } ],
    61: [ { verse: 1, title: 'A Rocha Mais Alta do Que Eu' } ],
    62: [ { verse: 1, title: 'Somente em Deus a Minha Alma Descansa' } ],
    63: [ { verse: 1, title: 'A Sede de Deus no Deserto' } ],
    64: [ { verse: 1, title: 'Proteção Contra Conspiradores' } ],
    65: [ { verse: 1, title: 'Louvor pela Providência de Deus' } ],
    66: [ { verse: 1, title: 'Aclamai a Deus com Alegria' } ],
    67: [ { verse: 1, title: 'Que Todos os Povos Te Louvem' } ],
    68: [ { verse: 1, title: 'A Marcha Triunfal de Deus' } ],
    69: [ { verse: 1, title: 'Clamor das Profundas Águas' } ],
    70: [ { verse: 1, title: 'Oração por Socorro Imediato' } ],
    71: [ { verse: 1, title: 'Oração na Velhice' } ],
    72: [ { verse: 1, title: 'O Reinado do Rei Justo' } ],
    73: [ { verse: 1, title: 'A Prosperidade dos Ímpios' } ],
    74: [ { verse: 1, title: 'Lamento pela Destruição do Templo' } ],
    75: [ { verse: 1, title: 'Deus é o Juiz' } ],
    76: [ { verse: 1, title: 'Deus, o Vitorioso' } ],
    77: [ { verse: 1, title: 'Consolo na Aflição' } ],
    78: [ { verse: 1, title: 'As Lições da História de Israel' } ],
    79: [ { verse: 1, title: 'Lamento pela Profanação de Jerusalém' } ],
    80: [ { verse: 1, title: 'Restaura-nos, ó Deus' } ],
    81: [ { verse: 1, title: 'Cântico para a Festa' } ],
    82: [ { verse: 1, title: 'O Juízo Contra os Poderosos Injustos' } ],
    83: [ { verse: 1, title: 'Oração Contra os Inimigos de Israel' } ],
    84: [ { verse: 1, title: 'O Desejo pela Casa de Deus' } ],
    85: [ { verse: 1, title: 'Oração pela Restauração' } ],
    86: [ { verse: 1, title: 'Oração por Misericórdia' } ],
    87: [ { verse: 1, title: 'A Glória de Sião, Cidade de Deus' } ],
    88: [ { verse: 1, title: 'Clamor na Mais Profunda Aflição' } ],
    89: [ { verse: 1, title: 'A Aliança com Davi' } ],
    90: [ { verse: 1, title: 'A Eternidade de Deus e a Fragilidade Humana' } ],
    91: [ { verse: 1, title: 'À Sombra do Altíssimo' } ],
    92: [ { verse: 1, title: 'Cântico para o Dia de Sábado' } ],
    93: [ { verse: 1, title: 'A Majestade do Senhor Rei' } ],
    94: [ { verse: 1, title: 'Deus, o Vingador dos Justos' } ],
    95: [ { verse: 1, title: 'Convite ao Louvor' } ],
    96: [ { verse: 1, title: 'Cantai ao Senhor um Cântico Novo' } ],
    97: [ { verse: 1, title: 'O Senhor Reina' } ],
    98: [ { verse: 1, title: 'Louvor ao Senhor Vitorioso' } ],
    99: [ { verse: 1, title: 'O Senhor Santo Reina' } ],
    100: [ { verse: 1, title: 'Cântico de Louvor e Gratidão' } ],
    101: [ { verse: 1, title: 'O Compromisso do Rei com a Justiça' } ],
    102: [ { verse: 1, title: 'Oração do Aflito' } ],
    103: [ { verse: 1, title: 'Bendize, ó Minha Alma, ao Senhor' } ],
    104: [ { verse: 1, title: 'Louvor ao Deus Criador' } ],
    105: [ { verse: 1, title: 'A Fidelidade de Deus a Israel' } ],
    106: [ { verse: 1, title: 'A Infidelidade de Israel' } ],
    107: [ { verse: 1, title: 'Gratidão pela Redenção do Senhor' } ],
    108: [ { verse: 1, title: 'Louvor e Confiança em Deus' } ],
    109: [ { verse: 1, title: 'Clamor Contra o Acusador' } ],
    110: [ { verse: 1, title: 'O Senhor e o Seu Ungido' } ],
    111: [ { verse: 1, title: 'Louvor pelas Obras do Senhor' } ],
    112: [ { verse: 1, title: 'A Bem-Aventurança do Justo' } ],
    113: [ { verse: 1, title: 'Louvai o Nome do Senhor' } ],
    114: [ { verse: 1, title: 'As Maravilhas do Êxodo' } ],
    115: [ { verse: 1, title: 'Glória Somente a Deus' } ],
    116: [ { verse: 1, title: 'Gratidão pelo Livramento da Morte' } ],
    117: [ { verse: 1, title: 'Louvai ao Senhor, Todas as Nações' } ],
    118: [ { verse: 1, title: 'A Bondade Eterna do Senhor' } ],
    119: [ { verse: 1, title: 'A Excelência da Palavra de Deus' } ],
    120: [ { verse: 1, title: 'Oração por Livramento da Mentira' } ],
    121: [ { verse: 1, title: 'O Senhor é o Meu Guardião' } ],
    122: [ { verse: 1, title: 'Oração pela Paz de Jerusalém' } ],
    123: [ { verse: 1, title: 'Os Olhos Voltados para o Senhor' } ],
    124: [ { verse: 1, title: 'O Senhor Está ao Nosso Lado' } ],
    125: [ { verse: 1, title: 'A Segurança dos que Confiam no Senhor' } ],
    126: [ { verse: 1, title: 'A Alegria da Restauração' } ],
    127: [ { verse: 1, title: 'Tudo Depende do Senhor' } ],
    128: [ { verse: 1, title: 'A Bênção sobre o que Teme ao Senhor' } ],
    129: [ { verse: 1, title: 'Israel Oprimido mas Livre' } ],
    130: [ { verse: 1, title: 'Das Profundezas Clamo a Ti' } ],
    131: [ { verse: 1, title: 'A Humildade e a Confiança' } ],
    132: [ { verse: 1, title: 'A Promessa a Davi' } ],
    133: [ { verse: 1, title: 'A Bênção da Unidade Fraterna' } ],
    134: [ { verse: 1, title: 'Exortação ao Louvor Noturno' } ],
    135: [ { verse: 1, title: 'Louvor pela Grandeza do Senhor' } ],
    136: [ { verse: 1, title: 'A Misericórdia Eterna do Senhor' } ],
    137: [ { verse: 1, title: 'O Lamento no Exílio' } ],
    138: [ { verse: 1, title: 'Ação de Graças de Todo o Coração' } ],
    139: [ { verse: 1, title: 'A Onisciência e Onipresença de Deus' } ],
    140: [ { verse: 1, title: 'Oração por Proteção dos Maus' } ],
    141: [ { verse: 1, title: 'Oração Contra a Tentação' } ],
    142: [ { verse: 1, title: 'Clamor na Caverna' } ],
    143: [ { verse: 1, title: 'Oração por Orientação' } ],
    144: [ { verse: 1, title: 'Oração por Vitória e Prosperidade' } ],
    145: [ { verse: 1, title: 'Louvor à Grandeza de Deus' } ],
    146: [ { verse: 1, title: 'Louvai ao Senhor, ó Minha Alma' } ],
    147: [ { verse: 1, title: 'Louvor ao Restaurador de Jerusalém' } ],
    148: [ { verse: 1, title: 'Toda a Criação Louve ao Senhor' } ],
    149: [ { verse: 1, title: 'Cântico Novo de Louvor' } ],
    150: [ { verse: 1, title: 'Tudo o Que Respira Louve ao Senhor' } ],
  },
  20: {
    1: [
      { verse: 1, title: 'O Propósito dos Provérbios' },
      { verse: 7, title: 'O Temor do Senhor, Princípio da Sabedoria' },
      { verse: 8, title: 'Exortação aos Jovens' },
      { verse: 20, title: 'O Convite da Sabedoria' },
    ],
    2: [
      { verse: 1, title: 'Os Benefícios da Sabedoria' },
    ],
    3: [
      { verse: 1, title: 'Confia no Senhor de Todo o Coração' },
      { verse: 13, title: 'O Valor da Sabedoria' },
    ],
    4: [
      { verse: 1, title: 'A Supremacia da Sabedoria' },
      { verse: 20, title: 'Guarda o Teu Coração' },
    ],
    5: [
      { verse: 1, title: 'Advertência Contra a Imoralidade' },
    ],
    6: [
      { verse: 1, title: 'Conselhos Práticos' },
      { verse: 20, title: 'Advertência Contra o Adultério' },
    ],
    7: [
      { verse: 1, title: 'O Perigo da Mulher Adúltera' },
    ],
    8: [
      { verse: 1, title: 'O Elogio da Sabedoria' },
    ],
    9: [
      { verse: 1, title: 'O Banquete da Sabedoria' },
      { verse: 13, title: 'O Convite da Insensatez' },
    ],
    10: [
      { verse: 1, title: 'Provérbios de Salomão' },
    ],
    11: [
      { verse: 1, title: 'A Justiça e a Maldade' },
    ],
    12: [
      { verse: 1, title: 'O Sábio e o Insensato' },
    ],
    13: [
      { verse: 1, title: 'Os Frutos da Sabedoria' },
    ],
    14: [
      { verse: 1, title: 'A Conduta do Sábio' },
    ],
    15: [
      { verse: 1, title: 'A Resposta Branda' },
    ],
    16: [
      { verse: 1, title: 'A Soberania do Senhor' },
    ],
    17: [
      { verse: 1, title: 'A Sabedoria nas Relações' },
    ],
    18: [
      { verse: 1, title: 'O Poder das Palavras' },
    ],
    19: [
      { verse: 1, title: 'A Integridade e a Disciplina' },
    ],
    20: [
      { verse: 1, title: 'Advertências Contra os Vícios' },
    ],
    21: [
      { verse: 1, title: 'O Coração do Rei nas Mãos do Senhor' },
    ],
    22: [
      { verse: 1, title: 'O Bom Nome e a Riqueza' },
      { verse: 17, title: 'Os Ditos dos Sábios' },
    ],
    23: [
      { verse: 1, title: 'Conselhos de Sabedoria' },
    ],
    24: [
      { verse: 1, title: 'Não Invejes os Maus' },
      { verse: 23, title: 'Outros Ditos dos Sábios' },
    ],
    25: [
      { verse: 1, title: 'Mais Provérbios de Salomão' },
    ],
    26: [
      { verse: 1, title: 'O Tolo e o Preguiçoso' },
    ],
    27: [
      { verse: 1, title: 'A Verdadeira Amizade' },
    ],
    28: [
      { verse: 1, title: 'O Justo e o Ímpio' },
    ],
    29: [
      { verse: 1, title: 'A Disciplina e a Justiça' },
    ],
    30: [
      { verse: 1, title: 'As Palavras de Agur' },
    ],
    31: [
      { verse: 1, title: 'As Palavras do Rei Lemuel' },
      { verse: 10, title: 'A Mulher Virtuosa' },
    ],
  },
  21: {
    1: [
      { verse: 1, title: 'Tudo é Vaidade' },
      { verse: 12, title: 'A Vaidade da Sabedoria Humana' },
    ],
    2: [
      { verse: 1, title: 'A Vaidade dos Prazeres' },
      { verse: 12, title: 'A Vaidade do Trabalho' },
    ],
    3: [
      { verse: 1, title: 'Para Tudo Há um Tempo' },
      { verse: 16, title: 'A Injustiça e a Morte' },
    ],
    4: [
      { verse: 1, title: 'As Opressões da Vida' },
      { verse: 9, title: 'O Valor da Companhia' },
    ],
    5: [
      { verse: 1, title: 'A Reverência Diante de Deus' },
      { verse: 8, title: 'A Vaidade das Riquezas' },
    ],
    6: [
      { verse: 1, title: 'A Insatisfação das Riquezas' },
    ],
    7: [
      { verse: 1, title: 'A Sabedoria Prática da Vida' },
    ],
    8: [
      { verse: 1, title: 'A Obediência à Autoridade' },
      { verse: 10, title: 'O Mistério da Retribuição' },
    ],
    9: [
      { verse: 1, title: 'Um Destino Comum a Todos' },
      { verse: 13, title: 'A Sabedoria Superior à Força' },
    ],
    10: [
      { verse: 1, title: 'A Sabedoria e a Insensatez' },
    ],
    11: [
      { verse: 1, title: 'Lança o Teu Pão Sobre as Águas' },
      { verse: 7, title: 'Lembra-te do Teu Criador' },
    ],
    12: [
      { verse: 1, title: 'Lembra-te do Criador na Juventude' },
      { verse: 9, title: 'A Conclusão da Questão' },
    ],
  },
  22: {
    1: [
      { verse: 1, title: 'O Anseio da Esposa' },
      { verse: 9, title: 'O Diálogo dos Amados' },
    ],
    2: [
      { verse: 1, title: 'A Rosa de Sarom' },
      { verse: 8, title: 'A Chegada do Amado' },
    ],
    3: [
      { verse: 1, title: 'A Busca pelo Amado' },
      { verse: 6, title: 'O Cortejo de Salomão' },
    ],
    4: [
      { verse: 1, title: 'A Beleza da Amada' },
    ],
    5: [
      { verse: 1, title: 'O Amado no Jardim' },
      { verse: 2, title: 'O Sonho da Amada' },
    ],
    6: [
      { verse: 1, title: 'A Procura do Amado' },
      { verse: 4, title: 'O Encanto da Amada' },
    ],
    7: [
      { verse: 1, title: 'A Formosura da Amada' },
      { verse: 10, title: 'O Amor da Esposa' },
    ],
    8: [
      { verse: 1, title: 'O Anseio pelo Amado' },
      { verse: 5, title: 'O Selo do Amor' },
    ],
  },

// Isaías a Daniel (ids 23-27)
  23: {
    1: [
      { verse: 1, title: 'A Rebeldia de Judá' },
      { verse: 18, title: 'O Senhor Convida ao Juízo' },
      { verse: 21, title: 'A Cidade Infiel' },
    ],
    2: [
      { verse: 1, title: 'O Monte do Senhor' },
      { verse: 6, title: 'O Dia do Senhor' },
    ],
    3: [
      { verse: 1, title: 'O Juízo sobre Jerusalém e Judá' },
      { verse: 16, title: 'As Mulheres de Sião' },
    ],
    4: [
      { verse: 1, title: 'O Renovo do Senhor' },
    ],
    5: [
      { verse: 1, title: 'A Canção da Vinha' },
      { verse: 8, title: 'Os Ais e os Juízos' },
    ],
    6: [
      { verse: 1, title: 'A Visão e a Vocação de Isaías' },
    ],
    7: [
      { verse: 1, title: 'O Sinal do Emanuel' },
    ],
    8: [
      { verse: 1, title: 'A Invasão da Assíria' },
      { verse: 11, title: 'O Temor do Senhor' },
      { verse: 19, title: 'Buscai a Lei e o Testemunho' },
    ],
    9: [
      { verse: 1, title: 'O Príncipe da Paz' },
      { verse: 8, title: 'A Ira do Senhor contra Israel' },
    ],
    10: [
      { verse: 1, title: 'O Juízo Justo do Senhor' },
      { verse: 5, title: 'A Assíria, Vara da Ira' },
      { verse: 20, title: 'O Remanescente de Israel' },
    ],
    11: [
      { verse: 1, title: 'O Ramo de Jessé' },
      { verse: 10, title: 'O Retorno do Remanescente' },
    ],
    12: [
      { verse: 1, title: 'Cânticos de Louvor' },
    ],
    13: [
      { verse: 1, title: 'Profecia contra a Babilônia' },
    ],
    14: [
      { verse: 1, title: 'A Restauração de Israel' },
      { verse: 3, title: 'A Queda do Rei da Babilônia' },
      { verse: 24, title: 'Profecia contra a Assíria' },
      { verse: 28, title: 'Profecia contra a Filístia' },
    ],
    15: [
      { verse: 1, title: 'Profecia contra Moabe' },
    ],
    16: [
      { verse: 1, title: 'O Clamor de Moabe' },
    ],
    17: [
      { verse: 1, title: 'Profecia contra Damasco' },
    ],
    18: [
      { verse: 1, title: 'Profecia contra a Etiópia' },
    ],
    19: [
      { verse: 1, title: 'Profecia contra o Egito' },
      { verse: 18, title: 'A Conversão do Egito' },
    ],
    20: [
      { verse: 1, title: 'Sinal contra o Egito e a Etiópia' },
    ],
    21: [
      { verse: 1, title: 'A Queda da Babilônia' },
      { verse: 11, title: 'Profecia contra Edom' },
      { verse: 13, title: 'Profecia contra a Arábia' },
    ],
    22: [
      { verse: 1, title: 'Profecia contra o Vale da Visão' },
      { verse: 15, title: 'Sebna e Eliaquim' },
    ],
    23: [
      { verse: 1, title: 'Profecia contra Tiro' },
    ],
    24: [
      { verse: 1, title: 'O Juízo sobre a Terra' },
      { verse: 14, title: 'Louvores pela Majestade do Senhor' },
    ],
    25: [
      { verse: 1, title: 'Louvor ao Senhor' },
      { verse: 6, title: 'O Banquete do Senhor' },
    ],
    26: [
      { verse: 1, title: 'Cântico de Confiança' },
    ],
    27: [
      { verse: 1, title: 'A Libertação de Israel' },
    ],
    28: [
      { verse: 1, title: 'Ai da Coroa de Efraim' },
      { verse: 14, title: 'A Pedra Angular em Sião' },
    ],
    29: [
      { verse: 1, title: 'Ai de Ariel' },
      { verse: 13, title: 'A Hipocrisia do Povo' },
    ],
    30: [
      { verse: 1, title: 'A Aliança Inútil com o Egito' },
      { verse: 18, title: 'A Graça do Senhor a Israel' },
    ],
    31: [
      { verse: 1, title: 'Ai dos que Descem ao Egito' },
    ],
    32: [
      { verse: 1, title: 'O Rei Justo' },
      { verse: 9, title: 'Aviso às Mulheres Confiadas' },
    ],
    33: [
      { verse: 1, title: 'Socorro nas Aflições' },
    ],
    34: [
      { verse: 1, title: 'O Juízo contra as Nações' },
    ],
    35: [
      { verse: 1, title: 'A Alegria dos Redimidos' },
    ],
    36: [
      { verse: 1, title: 'Senaqueribe Ameaça Jerusalém' },
    ],
    37: [
      { verse: 1, title: 'A Libertação de Jerusalém' },
      { verse: 14, title: 'A Oração de Ezequias' },
      { verse: 21, title: 'A Queda de Senaqueribe' },
    ],
    38: [
      { verse: 1, title: 'A Doença e a Cura de Ezequias' },
    ],
    39: [
      { verse: 1, title: 'Os Enviados da Babilônia' },
    ],
    40: [
      { verse: 1, title: 'Consolação para o Povo de Deus' },
      { verse: 12, title: 'A Grandeza de Deus' },
    ],
    41: [
      { verse: 1, title: 'O Senhor, o Único Deus' },
    ],
    42: [
      { verse: 1, title: 'O Servo do Senhor' },
      { verse: 10, title: 'Cântico de Louvor' },
      { verse: 18, title: 'Israel Cego e Surdo' },
    ],
    43: [
      { verse: 1, title: 'O Redentor de Israel' },
      { verse: 14, title: 'A Misericórdia do Senhor' },
    ],
    44: [
      { verse: 1, title: 'Israel, o Escolhido do Senhor' },
      { verse: 9, title: 'A Loucura da Idolatria' },
      { verse: 21, title: 'O Senhor Redime Israel' },
    ],
    45: [
      { verse: 1, title: 'Ciro, Instrumento do Senhor' },
      { verse: 14, title: 'O Senhor, o Único Salvador' },
    ],
    46: [
      { verse: 1, title: 'Os Ídolos da Babilônia' },
    ],
    47: [
      { verse: 1, title: 'A Queda da Babilônia' },
    ],
    48: [
      { verse: 1, title: 'Israel Obstinado' },
      { verse: 12, title: 'A Libertação Prometida' },
    ],
    49: [
      { verse: 1, title: 'O Servo do Senhor, Luz das Nações' },
      { verse: 14, title: 'A Restauração de Sião' },
    ],
    50: [
      { verse: 1, title: 'O Pecado de Israel e a Obediência do Servo' },
    ],
    51: [
      { verse: 1, title: 'Consolo para Sião' },
      { verse: 17, title: 'O Cálice da Ira' },
    ],
    52: [
      { verse: 1, title: 'Desperta, ó Sião' },
      { verse: 13, title: 'O Servo Sofredor' },
    ],
    53: [
      { verse: 1, title: 'O Sofrimento e a Glória do Servo' },
    ],
    54: [
      { verse: 1, title: 'A Glória Futura de Sião' },
    ],
    55: [
      { verse: 1, title: 'O Convite à Salvação' },
    ],
    56: [
      { verse: 1, title: 'Salvação para Todos os Povos' },
      { verse: 9, title: 'Os Líderes Infiéis' },
    ],
    57: [
      { verse: 1, title: 'A Idolatria de Israel' },
      { verse: 14, title: 'Conforto para os Contritos' },
    ],
    58: [
      { verse: 1, title: 'O Verdadeiro Jejum' },
    ],
    59: [
      { verse: 1, title: 'O Pecado Separa de Deus' },
      { verse: 15, title: 'O Senhor Vem Redimir' },
    ],
    60: [
      { verse: 1, title: 'A Glória Futura de Sião' },
    ],
    61: [
      { verse: 1, title: 'O Ano da Graça do Senhor' },
    ],
    62: [
      { verse: 1, title: 'O Novo Nome de Sião' },
    ],
    63: [
      { verse: 1, title: 'O Dia da Vingança do Senhor' },
      { verse: 7, title: 'Louvor e Oração' },
    ],
    64: [
      { verse: 1, title: 'Oração por Socorro' },
    ],
    65: [
      { verse: 1, title: 'O Juízo e a Salvação' },
      { verse: 17, title: 'Novos Céus e Nova Terra' },
    ],
    66: [
      { verse: 1, title: 'O Juízo e a Esperança' },
      { verse: 18, title: 'A Glória do Senhor entre as Nações' },
    ],
  },
  24: {
    1: [
      { verse: 1, title: 'A Vocação de Jeremias' },
    ],
    2: [
      { verse: 1, title: 'Israel Abandona o Senhor' },
    ],
    3: [
      { verse: 1, title: 'O Apelo ao Arrependimento' },
    ],
    4: [
      { verse: 1, title: 'O Juízo Iminente' },
    ],
    5: [
      { verse: 1, title: 'A Corrupção de Jerusalém' },
    ],
    6: [
      { verse: 1, title: 'O Cerco de Jerusalém' },
    ],
    7: [
      { verse: 1, title: 'A Falsa Confiança no Templo' },
    ],
    8: [
      { verse: 1, title: 'O Pecado e o Castigo' },
      { verse: 18, title: 'A Tristeza de Jeremias' },
    ],
    9: [
      { verse: 1, title: 'O Lamento de Jeremias' },
      { verse: 23, title: 'A Verdadeira Sabedoria' },
    ],
    10: [
      { verse: 1, title: 'Deus e os Ídolos' },
    ],
    11: [
      { verse: 1, title: 'A Aliança Quebrada' },
      { verse: 18, title: 'A Conspiração contra Jeremias' },
    ],
    12: [
      { verse: 1, title: 'A Queixa de Jeremias' },
    ],
    13: [
      { verse: 1, title: 'O Cinto de Linho' },
    ],
    14: [
      { verse: 1, title: 'A Seca e a Fome' },
    ],
    15: [
      { verse: 1, title: 'O Juízo Inevitável' },
      { verse: 10, title: 'A Lamentação de Jeremias' },
    ],
    16: [
      { verse: 1, title: 'O Dia da Calamidade' },
    ],
    17: [
      { verse: 1, title: 'O Pecado de Judá' },
      { verse: 19, title: 'A Santificação do Sábado' },
    ],
    18: [
      { verse: 1, title: 'O Oleiro e o Barro' },
    ],
    19: [
      { verse: 1, title: 'A Botija Quebrada' },
    ],
    20: [
      { verse: 1, title: 'Jeremias e Pasur' },
      { verse: 7, title: 'A Queixa de Jeremias' },
    ],
    21: [
      { verse: 1, title: 'A Mensagem a Zedequias' },
    ],
    22: [
      { verse: 1, title: 'Juízo contra os Reis de Judá' },
    ],
    23: [
      { verse: 1, title: 'O Renovo Justo' },
      { verse: 9, title: 'Os Falsos Profetas' },
    ],
    24: [
      { verse: 1, title: 'Os Dois Cestos de Figos' },
    ],
    25: [
      { verse: 1, title: 'Os Setenta Anos de Cativeiro' },
      { verse: 15, title: 'O Cálice da Ira do Senhor' },
    ],
    26: [
      { verse: 1, title: 'Jeremias Ameaçado de Morte' },
    ],
    27: [
      { verse: 1, title: 'O Jugo da Babilônia' },
    ],
    28: [
      { verse: 1, title: 'O Falso Profeta Hananias' },
    ],
    29: [
      { verse: 1, title: 'A Carta aos Exilados' },
    ],
    30: [
      { verse: 1, title: 'A Restauração de Israel' },
    ],
    31: [
      { verse: 1, title: 'A Nova Aliança' },
      { verse: 23, title: 'A Restauração de Judá' },
      { verse: 31, title: 'A Promessa da Nova Aliança' },
    ],
    32: [
      { verse: 1, title: 'Jeremias Compra um Campo' },
    ],
    33: [
      { verse: 1, title: 'A Promessa de Restauração' },
    ],
    34: [
      { verse: 1, title: 'O Aviso a Zedequias' },
      { verse: 8, title: 'A Libertação dos Escravos' },
    ],
    35: [
      { verse: 1, title: 'A Fidelidade dos Recabitas' },
    ],
    36: [
      { verse: 1, title: 'O Rolo Queimado por Jeoaquim' },
    ],
    37: [
      { verse: 1, title: 'Jeremias Aprisionado' },
    ],
    38: [
      { verse: 1, title: 'Jeremias na Cisterna' },
    ],
    39: [
      { verse: 1, title: 'A Queda de Jerusalém' },
      { verse: 15, title: 'A Promessa a Ebede-Meleque' },
    ],
    40: [
      { verse: 1, title: 'Gedalias, Governador de Judá' },
    ],
    41: [
      { verse: 1, title: 'O Assassinato de Gedalias' },
    ],
    42: [
      { verse: 1, title: 'A Advertência contra a Fuga ao Egito' },
    ],
    43: [
      { verse: 1, title: 'Jeremias Levado ao Egito' },
    ],
    44: [
      { verse: 1, title: 'Juízo contra os Judeus no Egito' },
    ],
    45: [
      { verse: 1, title: 'A Mensagem a Baruque' },
    ],
    46: [
      { verse: 1, title: 'Profecia contra o Egito' },
    ],
    47: [
      { verse: 1, title: 'Profecia contra os Filisteus' },
    ],
    48: [
      { verse: 1, title: 'Profecia contra Moabe' },
    ],
    49: [
      { verse: 1, title: 'Profecia contra Amom' },
      { verse: 7, title: 'Profecia contra Edom' },
      { verse: 23, title: 'Profecia contra Damasco' },
      { verse: 28, title: 'Profecia contra Quedar e Hazor' },
      { verse: 34, title: 'Profecia contra Elão' },
    ],
    50: [
      { verse: 1, title: 'Profecia contra a Babilônia' },
    ],
    51: [
      { verse: 1, title: 'A Destruição da Babilônia' },
      { verse: 59, title: 'A Mensagem Lançada no Eufrates' },
    ],
    52: [
      { verse: 1, title: 'A Queda de Jerusalém' },
      { verse: 31, title: 'A Libertação de Joaquim' },
    ],
  },
  25: {
    1: [
      { verse: 1, title: 'A Desolação de Jerusalém' },
    ],
    2: [
      { verse: 1, title: 'A Ira do Senhor sobre Sião' },
    ],
    3: [
      { verse: 1, title: 'A Aflição e a Esperança' },
      { verse: 22, title: 'As Misericórdias do Senhor' },
    ],
    4: [
      { verse: 1, title: 'O Castigo de Sião' },
    ],
    5: [
      { verse: 1, title: 'A Oração por Restauração' },
    ],
  },
  26: {
    1: [
      { verse: 1, title: 'A Visão da Glória de Deus' },
    ],
    2: [
      { verse: 1, title: 'A Vocação de Ezequiel' },
    ],
    3: [
      { verse: 1, title: 'O Rolo Comido' },
      { verse: 16, title: 'O Atalaia de Israel' },
    ],
    4: [
      { verse: 1, title: 'O Cerco de Jerusalém Simbolizado' },
    ],
    5: [
      { verse: 1, title: 'O Cabelo Cortado e o Juízo' },
    ],
    6: [
      { verse: 1, title: 'Profecia contra os Montes de Israel' },
    ],
    7: [
      { verse: 1, title: 'O Fim Chegou' },
    ],
    8: [
      { verse: 1, title: 'A Idolatria no Templo' },
    ],
    9: [
      { verse: 1, title: 'A Marca e a Matança' },
    ],
    10: [
      { verse: 1, title: 'A Glória do Senhor Deixa o Templo' },
    ],
    11: [
      { verse: 1, title: 'O Juízo sobre os Líderes' },
      { verse: 14, title: 'A Promessa de Restauração' },
    ],
    12: [
      { verse: 1, title: 'O Exílio Simbolizado' },
    ],
    13: [
      { verse: 1, title: 'Contra os Falsos Profetas' },
    ],
    14: [
      { verse: 1, title: 'Contra os Idólatras' },
      { verse: 12, title: 'O Juízo Inevitável' },
    ],
    15: [
      { verse: 1, title: 'A Videira Inútil' },
    ],
    16: [
      { verse: 1, title: 'A Infidelidade de Jerusalém' },
    ],
    17: [
      { verse: 1, title: 'A Parábola das Águias' },
    ],
    18: [
      { verse: 1, title: 'A Alma que Pecar Morrerá' },
    ],
    19: [
      { verse: 1, title: 'O Lamento pelos Príncipes de Israel' },
    ],
    20: [
      { verse: 1, title: 'A Rebeldia de Israel' },
      { verse: 33, title: 'O Juízo e a Restauração' },
    ],
    21: [
      { verse: 1, title: 'A Espada do Senhor' },
    ],
    22: [
      { verse: 1, title: 'Os Pecados de Jerusalém' },
    ],
    23: [
      { verse: 1, title: 'As Duas Irmãs Adúlteras' },
    ],
    24: [
      { verse: 1, title: 'A Panela Ferrugenta' },
      { verse: 15, title: 'A Morte da Esposa de Ezequiel' },
    ],
    25: [
      { verse: 1, title: 'Profecia contra Amom e Moabe' },
      { verse: 8, title: 'Profecia contra Edom e Filístia' },
    ],
    26: [
      { verse: 1, title: 'Profecia contra Tiro' },
    ],
    27: [
      { verse: 1, title: 'O Lamento sobre Tiro' },
    ],
    28: [
      { verse: 1, title: 'O Juízo sobre o Rei de Tiro' },
      { verse: 20, title: 'Profecia contra Sidom' },
    ],
    29: [
      { verse: 1, title: 'Profecia contra o Egito' },
    ],
    30: [
      { verse: 1, title: 'O Dia do Egito' },
    ],
    31: [
      { verse: 1, title: 'O Cedro do Líbano' },
    ],
    32: [
      { verse: 1, title: 'O Lamento sobre o Faraó' },
    ],
    33: [
      { verse: 1, title: 'A Responsabilidade do Atalaia' },
      { verse: 21, title: 'A Queda de Jerusalém Anunciada' },
    ],
    34: [
      { verse: 1, title: 'Os Pastores de Israel' },
      { verse: 11, title: 'O Bom Pastor' },
    ],
    35: [
      { verse: 1, title: 'Profecia contra Edom' },
    ],
    36: [
      { verse: 1, title: 'A Restauração de Israel' },
      { verse: 16, title: 'O Novo Coração e o Novo Espírito' },
    ],
    37: [
      { verse: 1, title: 'O Vale dos Ossos Secos' },
      { verse: 15, title: 'A União de Judá e Israel' },
    ],
    38: [
      { verse: 1, title: 'A Profecia contra Gogue' },
    ],
    39: [
      { verse: 1, title: 'A Derrota de Gogue' },
      { verse: 21, title: 'A Restauração de Israel' },
    ],
    40: [
      { verse: 1, title: 'A Visão do Novo Templo' },
    ],
    41: [
      { verse: 1, title: 'O Interior do Templo' },
    ],
    42: [
      { verse: 1, title: 'As Câmaras do Templo' },
    ],
    43: [
      { verse: 1, title: 'A Glória do Senhor Volta ao Templo' },
      { verse: 13, title: 'O Altar' },
    ],
    44: [
      { verse: 1, title: 'A Porta Oriental' },
      { verse: 4, title: 'Os Sacerdotes e os Levitas' },
    ],
    45: [
      { verse: 1, title: 'A Porção Santa da Terra' },
    ],
    46: [
      { verse: 1, title: 'As Ofertas e as Festas' },
    ],
    47: [
      { verse: 1, title: 'O Rio que Sai do Templo' },
      { verse: 13, title: 'As Fronteiras da Terra' },
    ],
    48: [
      { verse: 1, title: 'A Divisão da Terra' },
      { verse: 30, title: 'As Portas da Cidade' },
    ],
  },
  27: {
    1: [
      { verse: 1, title: 'Daniel e Seus Amigos na Babilônia' },
    ],
    2: [
      { verse: 1, title: 'O Sonho de Nabucodonosor' },
      { verse: 31, title: 'A Interpretação do Sonho' },
    ],
    3: [
      { verse: 1, title: 'A Estátua de Ouro' },
      { verse: 8, title: 'A Fornalha Ardente' },
    ],
    4: [
      { verse: 1, title: 'O Sonho da Grande Árvore' },
      { verse: 28, title: 'A Loucura de Nabucodonosor' },
    ],
    5: [
      { verse: 1, title: 'A Escrita na Parede' },
    ],
    6: [
      { verse: 1, title: 'Daniel na Cova dos Leões' },
    ],
    7: [
      { verse: 1, title: 'A Visão dos Quatro Animais' },
      { verse: 15, title: 'A Interpretação da Visão' },
    ],
    8: [
      { verse: 1, title: 'A Visão do Carneiro e do Bode' },
      { verse: 15, title: 'A Interpretação da Visão' },
    ],
    9: [
      { verse: 1, title: 'A Oração de Daniel' },
      { verse: 20, title: 'As Setenta Semanas' },
    ],
    10: [
      { verse: 1, title: 'A Visão junto ao Rio Tigre' },
    ],
    11: [
      { verse: 1, title: 'Os Reis do Norte e do Sul' },
    ],
    12: [
      { verse: 1, title: 'O Tempo do Fim' },
    ],
  },

// Oséias a Malaquias (ids 28-39)
  28: {
    1: [
      { verse: 1, title: 'A Esposa e os Filhos de Oseias' },
    ],
    2: [
      { verse: 1, title: 'Israel Castigada e Restaurada' },
    ],
    3: [
      { verse: 1, title: 'A Reconciliação de Oseias com Gômer' },
    ],
    4: [
      { verse: 1, title: 'A Acusação do Senhor contra Israel' },
    ],
    5: [
      { verse: 1, title: 'Juízo contra Israel e Judá' },
    ],
    6: [
      { verse: 1, title: 'O Apelo ao Arrependimento' },
      { verse: 4, title: 'A Infidelidade do Povo' },
    ],
    7: [
      { verse: 1, title: 'A Maldade de Israel' },
    ],
    8: [
      { verse: 1, title: 'Israel Colhe a Tempestade' },
    ],
    9: [
      { verse: 1, title: 'O Castigo de Israel' },
    ],
    10: [
      { verse: 1, title: 'Israel Será Julgada' },
    ],
    11: [
      { verse: 1, title: 'O Amor de Deus por Israel' },
    ],
    12: [
      { verse: 1, title: 'O Pecado de Israel' },
    ],
    13: [
      { verse: 1, title: 'A Ira do Senhor contra Israel' },
    ],
    14: [
      { verse: 1, title: 'A Conversão de Israel' },
    ],
  },
  29: {
    1: [
      { verse: 1, title: 'A Praga de Gafanhotos' },
    ],
    2: [
      { verse: 1, title: 'O Dia do Senhor' },
      { verse: 12, title: 'O Chamado ao Arrependimento' },
      { verse: 18, title: 'A Resposta do Senhor' },
      { verse: 28, title: 'O Derramamento do Espírito' },
    ],
    3: [
      { verse: 1, title: 'O Juízo das Nações' },
    ],
  },
  30: {
    1: [
      { verse: 1, title: 'O Juízo contra as Nações Vizinhas' },
    ],
    2: [
      { verse: 4, title: 'O Juízo contra Judá e Israel' },
    ],
    3: [
      { verse: 1, title: 'A Acusação contra Israel' },
    ],
    4: [
      { verse: 1, title: 'O Povo Não se Arrependeu' },
    ],
    5: [
      { verse: 1, title: 'Lamento e Apelo a Israel' },
      { verse: 18, title: 'O Dia do Senhor' },
    ],
    6: [
      { verse: 1, title: 'A Condenação dos Acomodados' },
    ],
    7: [
      { verse: 1, title: 'As Visões de Amós' },
      { verse: 10, title: 'Amós e Amazias' },
    ],
    8: [
      { verse: 1, title: 'O Cesto de Frutas Maduras' },
    ],
    9: [
      { verse: 1, title: 'A Destruição de Israel' },
      { verse: 11, title: 'A Restauração de Israel' },
    ],
  },
  31: {
    1: [
      { verse: 1, title: 'O Juízo contra Edom' },
      { verse: 17, title: 'A Restauração de Israel' },
    ],
  },
  32: {
    1: [
      { verse: 1, title: 'A Fuga de Jonas' },
    ],
    2: [
      { verse: 1, title: 'A Oração de Jonas' },
    ],
    3: [
      { verse: 1, title: 'A Conversão de Nínive' },
    ],
    4: [
      { verse: 1, title: 'A Ira de Jonas e a Compaixão de Deus' },
    ],
  },
  33: {
    1: [
      { verse: 1, title: 'O Juízo contra Samaria e Judá' },
    ],
    2: [
      { verse: 1, title: 'A Condenação dos Opressores' },
      { verse: 12, title: 'A Promessa de Restauração' },
    ],
    3: [
      { verse: 1, title: 'Líderes e Profetas Repreendidos' },
    ],
    4: [
      { verse: 1, title: 'O Monte do Senhor' },
    ],
    5: [
      { verse: 1, title: 'O Governante de Belém' },
    ],
    6: [
      { verse: 1, title: 'A Acusação do Senhor' },
    ],
    7: [
      { verse: 1, title: 'A Corrupção de Israel' },
      { verse: 8, title: 'A Esperança em Deus' },
    ],
  },
  34: {
    1: [
      { verse: 1, title: 'A Ira e a Bondade do Senhor' },
    ],
    2: [
      { verse: 1, title: 'A Queda de Nínive' },
    ],
    3: [
      { verse: 1, title: 'O Fim de Nínive' },
    ],
  },
  35: {
    1: [
      { verse: 1, title: 'A Queixa de Habacuque' },
      { verse: 5, title: 'A Resposta do Senhor' },
      { verse: 12, title: 'A Segunda Queixa de Habacuque' },
    ],
    2: [
      { verse: 1, title: 'A Resposta do Senhor' },
      { verse: 6, title: 'Os Ais contra os Ímpios' },
    ],
    3: [
      { verse: 1, title: 'A Oração de Habacuque' },
    ],
  },
  36: {
    1: [
      { verse: 1, title: 'O Juízo no Dia do Senhor' },
    ],
    2: [
      { verse: 1, title: 'O Chamado ao Arrependimento' },
      { verse: 4, title: 'O Juízo contra as Nações' },
    ],
    3: [
      { verse: 1, title: 'O Futuro de Jerusalém' },
      { verse: 9, title: 'A Restauração de Israel' },
    ],
  },
  37: {
    1: [
      { verse: 1, title: 'O Chamado para Reconstruir o Templo' },
    ],
    2: [
      { verse: 1, title: 'A Glória do Novo Templo' },
      { verse: 10, title: 'Bênçãos para o Povo Obediente' },
      { verse: 20, title: 'A Promessa a Zorobabel' },
    ],
  },
  38: {
    1: [
      { verse: 1, title: 'O Chamado ao Arrependimento' },
      { verse: 7, title: 'O Homem entre as Murtas' },
      { verse: 18, title: 'A Visão dos Quatro Chifres' },
    ],
    2: [
      { verse: 1, title: 'O Homem com a Corda de Medir' },
    ],
    3: [
      { verse: 1, title: 'As Vestes do Sumo Sacerdote' },
    ],
    4: [
      { verse: 1, title: 'O Candelabro de Ouro e as Duas Oliveiras' },
    ],
    5: [
      { verse: 1, title: 'O Rolo Voador' },
      { verse: 5, title: 'A Mulher dentro do Cesto' },
    ],
    6: [
      { verse: 1, title: 'As Quatro Carruagens' },
      { verse: 9, title: 'A Coroa para Josué' },
    ],
    7: [
      { verse: 1, title: 'A Pergunta sobre o Jejum' },
    ],
    8: [
      { verse: 1, title: 'A Restauração de Jerusalém' },
    ],
    9: [
      { verse: 1, title: 'O Juízo contra as Nações' },
      { verse: 9, title: 'A Vinda do Rei de Sião' },
    ],
    10: [
      { verse: 1, title: 'A Restauração de Judá e Israel' },
    ],
    11: [
      { verse: 1, title: 'Os Dois Pastores' },
    ],
    12: [
      { verse: 1, title: 'A Libertação de Jerusalém' },
      { verse: 10, title: 'O Pranto por Aquele a Quem Traspassaram' },
    ],
    13: [
      { verse: 1, title: 'A Purificação do Pecado' },
      { verse: 7, title: 'O Pastor Ferido' },
    ],
    14: [
      { verse: 1, title: 'O Senhor Vem e Reina' },
    ],
  },
  39: {
    1: [
      { verse: 1, title: 'O Amor de Deus por Israel' },
      { verse: 6, title: 'As Ofertas Impuras' },
    ],
    2: [
      { verse: 1, title: 'A Repreensão aos Sacerdotes' },
      { verse: 10, title: 'A Infidelidade de Judá' },
      { verse: 17, title: 'O Dia do Juízo' },
    ],
    3: [
      { verse: 1, title: 'O Mensageiro do Senhor' },
      { verse: 6, title: 'O Roubo das Ofertas' },
      { verse: 13, title: 'A Promessa aos Fiéis' },
    ],
    4: [
      { verse: 1, title: 'O Dia do Senhor' },
      { verse: 4, title: 'A Vinda de Elias' },
    ],
  },

// Atos a 2 Coríntios (ids 44-47)
  44: {
    1: [
      { verse: 1, title: 'A Promessa do Espírito Santo' },
      { verse: 9, title: 'A Ascensão de Jesus' },
      { verse: 12, title: 'A Escolha de Matias' },
    ],
    2: [
      { verse: 1, title: 'A Vinda do Espírito Santo' },
      { verse: 14, title: 'O Discurso de Pedro' },
      { verse: 42, title: 'A Comunhão dos Crentes' },
    ],
    3: [
      { verse: 1, title: 'A Cura do Coxo' },
      { verse: 11, title: 'Pedro Fala ao Povo' },
    ],
    4: [
      { verse: 1, title: 'Pedro e João no Sinédrio' },
      { verse: 23, title: 'A Oração dos Crentes' },
      { verse: 32, title: 'Tudo em Comum' },
    ],
    5: [
      { verse: 1, title: 'Ananias e Safira' },
      { verse: 12, title: 'Sinais e Maravilhas' },
      { verse: 17, title: 'A Perseguição aos Apóstolos' },
    ],
    6: [
      { verse: 1, title: 'A Escolha dos Sete' },
      { verse: 8, title: 'A Prisão de Estêvão' },
    ],
    7: [
      { verse: 1, title: 'O Discurso de Estêvão' },
      { verse: 54, title: 'O Martírio de Estêvão' },
    ],
    8: [
      { verse: 1, title: 'A Igreja Perseguida e Espalhada' },
      { verse: 4, title: 'Filipe em Samaria' },
      { verse: 9, title: 'Simão, o Mágico' },
      { verse: 26, title: 'Filipe e o Etíope' },
    ],
    9: [
      { verse: 1, title: 'A Conversão de Saulo' },
      { verse: 19, title: 'Saulo Prega em Damasco' },
      { verse: 32, title: 'Pedro Cura Eneias' },
      { verse: 36, title: 'A Ressurreição de Dorcas' },
    ],
    10: [
      { verse: 1, title: 'Cornélio Manda Chamar Pedro' },
      { verse: 9, title: 'A Visão de Pedro' },
      { verse: 23, title: 'Pedro na Casa de Cornélio' },
      { verse: 44, title: 'Os Gentios Recebem o Espírito' },
    ],
    11: [
      { verse: 1, title: 'Pedro Explica Sua Ação' },
      { verse: 19, title: 'A Igreja em Antioquia' },
    ],
    12: [
      { verse: 1, title: 'Tiago Morto e Pedro Preso' },
      { verse: 6, title: 'A Libertação de Pedro' },
      { verse: 20, title: 'A Morte de Herodes' },
    ],
    13: [
      { verse: 1, title: 'Barnabé e Saulo Enviados' },
      { verse: 4, title: 'Em Chipre' },
      { verse: 13, title: 'Em Antioquia da Pisídia' },
    ],
    14: [
      { verse: 1, title: 'Em Icônio' },
      { verse: 8, title: 'Em Listra e Derbe' },
      { verse: 21, title: 'O Retorno a Antioquia' },
    ],
    15: [
      { verse: 1, title: 'O Concílio de Jerusalém' },
      { verse: 36, title: 'A Separação de Paulo e Barnabé' },
    ],
    16: [
      { verse: 1, title: 'Timóteo Acompanha Paulo' },
      { verse: 6, title: 'A Visão do Homem da Macedônia' },
      { verse: 11, title: 'A Conversão de Lídia' },
      { verse: 16, title: 'Paulo e Silas na Prisão' },
    ],
    17: [
      { verse: 1, title: 'Em Tessalônica' },
      { verse: 10, title: 'Em Bereia' },
      { verse: 16, title: 'Paulo em Atenas' },
    ],
    18: [
      { verse: 1, title: 'Paulo em Corinto' },
      { verse: 18, title: 'O Retorno a Antioquia' },
      { verse: 24, title: 'Apolo em Éfeso' },
    ],
    19: [
      { verse: 1, title: 'Paulo em Éfeso' },
      { verse: 11, title: 'Os Filhos de Ceva' },
      { verse: 23, title: 'O Tumulto em Éfeso' },
    ],
    20: [
      { verse: 1, title: 'Pela Macedônia e Grécia' },
      { verse: 7, title: 'A Ressurreição de Êutico' },
      { verse: 13, title: 'A Despedida de Mileto' },
    ],
    21: [
      { verse: 1, title: 'A Caminho de Jerusalém' },
      { verse: 17, title: 'A Chegada de Paulo a Jerusalém' },
      { verse: 27, title: 'A Prisão de Paulo no Templo' },
    ],
    22: [
      { verse: 1, title: 'Paulo Defende-se Diante do Povo' },
      { verse: 22, title: 'Paulo e o Comandante Romano' },
    ],
    23: [
      { verse: 1, title: 'Paulo Diante do Sinédrio' },
      { verse: 12, title: 'O Plano para Matar Paulo' },
      { verse: 23, title: 'Paulo Enviado a Cesareia' },
    ],
    24: [
      { verse: 1, title: 'O Julgamento Diante de Félix' },
    ],
    25: [
      { verse: 1, title: 'O Julgamento Diante de Festo' },
      { verse: 13, title: 'Festo Consulta o Rei Agripa' },
    ],
    26: [
      { verse: 1, title: 'A Defesa de Paulo Diante de Agripa' },
    ],
    27: [
      { verse: 1, title: 'A Viagem de Paulo a Roma' },
      { verse: 13, title: 'A Tempestade no Mar' },
      { verse: 27, title: 'O Naufrágio' },
    ],
    28: [
      { verse: 1, title: 'Paulo na Ilha de Malta' },
      { verse: 11, title: 'A Chegada a Roma' },
      { verse: 17, title: 'Paulo Prega em Roma' },
    ],
  },
  45: {
    1: [
      { verse: 1, title: 'Saudação' },
      { verse: 8, title: 'O Desejo de Paulo de Visitar Roma' },
      { verse: 16, title: 'O Poder do Evangelho' },
      { verse: 18, title: 'A Ira de Deus contra a Humanidade' },
    ],
    2: [
      { verse: 1, title: 'O Justo Juízo de Deus' },
      { verse: 17, title: 'Os Judeus e a Lei' },
    ],
    3: [
      { verse: 1, title: 'A Fidelidade de Deus' },
      { verse: 9, title: 'Ninguém é Justo' },
      { verse: 21, title: 'A Justiça pela Fé' },
    ],
    4: [
      { verse: 1, title: 'Abraão Justificado pela Fé' },
      { verse: 13, title: 'A Promessa Recebida pela Fé' },
    ],
    5: [
      { verse: 1, title: 'A Paz com Deus' },
      { verse: 12, title: 'A Morte por Adão, a Vida por Cristo' },
    ],
    6: [
      { verse: 1, title: 'Mortos para o Pecado, Vivos em Cristo' },
      { verse: 15, title: 'Escravos da Justiça' },
    ],
    7: [
      { verse: 1, title: 'Libertos da Lei' },
      { verse: 7, title: 'A Luta contra o Pecado' },
    ],
    8: [
      { verse: 1, title: 'A Vida no Espírito' },
      { verse: 18, title: 'A Glória Futura' },
      { verse: 31, title: 'Mais que Vencedores' },
    ],
    9: [
      { verse: 1, title: 'A Eleição de Deus' },
      { verse: 30, title: 'Israel e o Evangelho' },
    ],
    10: [
      { verse: 1, title: 'A Salvação para Todos' },
    ],
    11: [
      { verse: 1, title: 'O Remanescente de Israel' },
      { verse: 11, title: 'A Salvação dos Gentios' },
      { verse: 33, title: 'Doxologia' },
    ],
    12: [
      { verse: 1, title: 'O Sacrifício Vivo' },
      { verse: 9, title: 'O Amor em Ação' },
    ],
    13: [
      { verse: 1, title: 'A Submissão às Autoridades' },
      { verse: 8, title: 'O Amor Cumpre a Lei' },
    ],
    14: [
      { verse: 1, title: 'Não Julgar o Irmão' },
    ],
    15: [
      { verse: 1, title: 'Agradar ao Próximo, Não a Si Mesmo' },
      { verse: 14, title: 'Paulo, Ministro dos Gentios' },
      { verse: 23, title: 'Os Planos de Paulo' },
    ],
    16: [
      { verse: 1, title: 'Saudações Pessoais' },
      { verse: 17, title: 'Advertências Finais' },
      { verse: 25, title: 'Doxologia' },
    ],
  },
  46: {
    1: [
      { verse: 1, title: 'Saudação' },
      { verse: 4, title: 'Ação de Graças' },
      { verse: 10, title: 'Divisões na Igreja' },
      { verse: 18, title: 'Cristo, Poder e Sabedoria de Deus' },
    ],
    2: [
      { verse: 1, title: 'A Pregação de Cristo Crucificado' },
      { verse: 6, title: 'A Sabedoria do Espírito' },
    ],
    3: [
      { verse: 1, title: 'Cooperadores de Deus' },
      { verse: 10, title: 'O Único Fundamento' },
    ],
    4: [
      { verse: 1, title: 'Os Apóstolos de Cristo' },
    ],
    5: [
      { verse: 1, title: 'Imoralidade na Igreja' },
    ],
    6: [
      { verse: 1, title: 'Processos entre Irmãos' },
      { verse: 12, title: 'A Glorificação de Deus no Corpo' },
    ],
    7: [
      { verse: 1, title: 'Sobre o Casamento' },
      { verse: 25, title: 'Sobre os Solteiros' },
    ],
    8: [
      { verse: 1, title: 'O Alimento Sacrificado aos Ídolos' },
    ],
    9: [
      { verse: 1, title: 'Os Direitos de um Apóstolo' },
      { verse: 24, title: 'A Disciplina da Corrida' },
    ],
    10: [
      { verse: 1, title: 'Advertências da História de Israel' },
      { verse: 23, title: 'A Liberdade do Crente' },
    ],
    11: [
      { verse: 2, title: 'O Véu sobre a Cabeça' },
      { verse: 17, title: 'A Ceia do Senhor' },
    ],
    12: [
      { verse: 1, title: 'Os Dons Espirituais' },
      { verse: 12, title: 'Um Corpo, Muitos Membros' },
    ],
    13: [
      { verse: 1, title: 'O Amor' },
    ],
    14: [
      { verse: 1, title: 'O Dom de Profecia e Línguas' },
      { verse: 26, title: 'A Ordem no Culto' },
    ],
    15: [
      { verse: 1, title: 'A Ressurreição de Cristo' },
      { verse: 12, title: 'A Ressurreição dos Mortos' },
      { verse: 35, title: 'O Corpo da Ressurreição' },
    ],
    16: [
      { verse: 1, title: 'A Coleta para os Santos' },
      { verse: 5, title: 'Os Planos de Paulo' },
      { verse: 19, title: 'Saudações Finais' },
    ],
  },
  47: {
    1: [
      { verse: 1, title: 'Saudação' },
      { verse: 3, title: 'O Deus de Toda Consolação' },
      { verse: 12, title: 'A Mudança nos Planos de Paulo' },
    ],
    2: [
      { verse: 5, title: 'O Perdão ao Ofensor' },
      { verse: 12, title: 'Vitória em Cristo' },
    ],
    3: [
      { verse: 1, title: 'Ministros da Nova Aliança' },
      { verse: 7, title: 'A Glória da Nova Aliança' },
    ],
    4: [
      { verse: 1, title: 'Tesouros em Vasos de Barro' },
      { verse: 16, title: 'Vivendo pela Fé' },
    ],
    5: [
      { verse: 1, title: 'A Morada Celestial' },
      { verse: 11, title: 'O Ministério da Reconciliação' },
    ],
    6: [
      { verse: 1, title: 'As Provações do Ministério' },
      { verse: 14, title: 'Não vos Prendais a Jugo Desigual' },
    ],
    7: [
      { verse: 2, title: 'A Alegria de Paulo' },
    ],
    8: [
      { verse: 1, title: 'O Incentivo à Generosidade' },
      { verse: 16, title: 'Tito Enviado a Corinto' },
    ],
    9: [
      { verse: 1, title: 'A Coleta para os Santos' },
      { verse: 6, title: 'Deus Ama Quem Dá com Alegria' },
    ],
    10: [
      { verse: 1, title: 'Paulo Defende Seu Ministério' },
    ],
    11: [
      { verse: 1, title: 'Paulo e os Falsos Apóstolos' },
      { verse: 16, title: 'Os Sofrimentos de Paulo' },
    ],
    12: [
      { verse: 1, title: 'A Visão e o Espinho de Paulo' },
      { verse: 11, title: 'A Preocupação de Paulo com os Coríntios' },
    ],
    13: [
      { verse: 1, title: 'Advertências Finais' },
      { verse: 11, title: 'Saudações Finais' },
    ],
  },

// Gálatas a 2 Tessalonicenses (ids 48-53)
  48: {
    1: [
      { verse: 1, title: 'Saudação' },
      { verse: 6, title: 'Não Há Outro Evangelho' },
      { verse: 11, title: 'Paulo Chamado por Deus' },
    ],
    2: [
      { verse: 1, title: 'Paulo Aceito pelos Apóstolos' },
      { verse: 11, title: 'Paulo Repreende Pedro' },
      { verse: 15, title: 'Justificados pela Fé' },
    ],
    3: [
      { verse: 1, title: 'A Fé ou a Observância da Lei' },
      { verse: 6, title: 'A Bênção de Abraão' },
      { verse: 15, title: 'A Lei e a Promessa' },
      { verse: 26, title: 'Filhos de Deus pela Fé' },
    ],
    4: [
      { verse: 1, title: 'Filhos e Herdeiros' },
      { verse: 8, title: 'Preocupação de Paulo com os Gálatas' },
      { verse: 21, title: 'Agar e Sara' },
    ],
    5: [
      { verse: 1, title: 'Liberdade em Cristo' },
      { verse: 13, title: 'Vida pelo Espírito' },
    ],
    6: [
      { verse: 1, title: 'Levai as Cargas Uns dos Outros' },
      { verse: 11, title: 'Glória Somente na Cruz' },
    ],
  },
  49: {
    1: [
      { verse: 1, title: 'Saudação' },
      { verse: 3, title: 'Bênçãos Espirituais em Cristo' },
      { verse: 15, title: 'Gratidão e Oração' },
    ],
    2: [
      { verse: 1, title: 'Da Morte para a Vida' },
      { verse: 11, title: 'Um em Cristo' },
    ],
    3: [
      { verse: 1, title: 'Paulo, o Apóstolo dos Gentios' },
      { verse: 14, title: 'Oração pelos Efésios' },
    ],
    4: [
      { verse: 1, title: 'A Unidade no Corpo de Cristo' },
      { verse: 17, title: 'A Vida Nova em Cristo' },
    ],
    5: [
      { verse: 1, title: 'Vivam como Filhos da Luz' },
      { verse: 21, title: 'Maridos e Esposas' },
    ],
    6: [
      { verse: 1, title: 'Filhos e Pais' },
      { verse: 5, title: 'Escravos e Senhores' },
      { verse: 10, title: 'A Armadura de Deus' },
      { verse: 21, title: 'Saudações Finais' },
    ],
  },
  50: {
    1: [
      { verse: 1, title: 'Saudação' },
      { verse: 3, title: 'Ação de Graças e Oração' },
      { verse: 12, title: 'O Viver é Cristo' },
      { verse: 27, title: 'Dignos do Evangelho' },
    ],
    2: [
      { verse: 1, title: 'A Humildade de Cristo' },
      { verse: 12, title: 'Brilhem como Estrelas' },
      { verse: 19, title: 'Timóteo e Epafrodito' },
    ],
    3: [
      { verse: 1, title: 'A Justiça que Vem de Deus' },
      { verse: 12, title: 'Prosseguindo para o Alvo' },
    ],
    4: [
      { verse: 1, title: 'Exortações' },
      { verse: 4, title: 'Alegrai-vos no Senhor' },
      { verse: 10, title: 'Gratidão pelas Ofertas' },
      { verse: 21, title: 'Saudações Finais' },
    ],
  },
  51: {
    1: [
      { verse: 1, title: 'Saudação' },
      { verse: 3, title: 'Ação de Graças e Oração' },
      { verse: 15, title: 'A Supremacia de Cristo' },
      { verse: 24, title: 'O Trabalho de Paulo pela Igreja' },
    ],
    2: [
      { verse: 6, title: 'Plenitude da Vida em Cristo' },
      { verse: 16, title: 'Liberdade das Regras Humanas' },
    ],
    3: [
      { verse: 1, title: 'Regras para a Vida Santa' },
      { verse: 18, title: 'Normas para o Lar Cristão' },
    ],
    4: [
      { verse: 2, title: 'Outras Instruções' },
      { verse: 7, title: 'Saudações Finais' },
    ],
  },
  52: {
    1: [
      { verse: 1, title: 'Saudação' },
      { verse: 2, title: 'Ação de Graças pela Fé dos Tessalonicenses' },
    ],
    2: [
      { verse: 1, title: 'O Ministério de Paulo em Tessalônica' },
      { verse: 17, title: 'O Desejo de Paulo de Revê-los' },
    ],
    3: [
      { verse: 1, title: 'O Relatório de Timóteo' },
      { verse: 11, title: 'Oração de Paulo' },
    ],
    4: [
      { verse: 1, title: 'Vida que Agrada a Deus' },
      { verse: 13, title: 'A Vinda do Senhor' },
    ],
    5: [
      { verse: 1, title: 'O Dia do Senhor' },
      { verse: 12, title: 'Instruções Finais' },
      { verse: 23, title: 'Bênção e Saudações' },
    ],
  },
  53: {
    1: [
      { verse: 1, title: 'Saudação' },
      { verse: 3, title: 'Ação de Graças e Oração' },
      { verse: 5, title: 'O Julgamento na Vinda de Cristo' },
    ],
    2: [
      { verse: 1, title: 'O Homem do Pecado' },
      { verse: 13, title: 'Permaneçam Firmes' },
    ],
    3: [
      { verse: 1, title: 'Pedido de Oração' },
      { verse: 6, title: 'A Advertência contra a Ociosidade' },
      { verse: 16, title: 'Saudações Finais' },
    ],
  },

// 1 Timóteo a Apocalipse (ids 54-66)
  54: {
    1: [
      { verse: 1, title: 'Saudação' },
      { verse: 3, title: 'Advertência Contra Falsos Mestres' },
      { verse: 12, title: 'A Graça do Senhor a Paulo' },
      { verse: 18, title: 'A Boa Milícia da Fé' },
    ],
    2: [
      { verse: 1, title: 'Instruções Sobre a Oração' },
      { verse: 8, title: 'A Conduta das Mulheres' },
    ],
    3: [
      { verse: 1, title: 'Os Bispos' },
      { verse: 8, title: 'Os Diáconos' },
      { verse: 14, title: 'O Mistério da Piedade' },
    ],
    4: [
      { verse: 1, title: 'A Apostasia Vindoura' },
      { verse: 6, title: 'Bom Ministro de Cristo Jesus' },
    ],
    5: [
      { verse: 1, title: 'Deveres Para com os Outros' },
      { verse: 3, title: 'As Viúvas' },
      { verse: 17, title: 'Os Presbíteros' },
    ],
    6: [
      { verse: 1, title: 'Os Servos' },
      { verse: 3, title: 'Falsos Mestres e a Verdadeira Riqueza' },
      { verse: 11, title: 'Recomendações Finais a Timóteo' },
    ],
  },
  55: {
    1: [
      { verse: 1, title: 'Saudação' },
      { verse: 3, title: 'Ação de Graças e Encorajamento' },
      { verse: 15, title: 'A Fidelidade de Onesíforo' },
    ],
    2: [
      { verse: 1, title: 'Bom Soldado de Cristo Jesus' },
      { verse: 14, title: 'Obreiro Aprovado por Deus' },
    ],
    3: [
      { verse: 1, title: 'Os Últimos Dias' },
      { verse: 10, title: 'Permaneça na Sã Doutrina' },
    ],
    4: [
      { verse: 1, title: 'Prega a Palavra' },
      { verse: 6, title: 'A Boa Batalha de Paulo' },
      { verse: 9, title: 'Instruções Pessoais' },
      { verse: 19, title: 'Saudações Finais' },
    ],
  },
  56: {
    1: [
      { verse: 1, title: 'Saudação' },
      { verse: 5, title: 'O Trabalho de Tito em Creta' },
      { verse: 10, title: 'Falsos Mestres' },
    ],
    2: [
      { verse: 1, title: 'A Sã Doutrina' },
      { verse: 11, title: 'A Graça de Deus e a Salvação' },
    ],
    3: [
      { verse: 1, title: 'Fazer o Bem' },
      { verse: 9, title: 'Recomendações Finais' },
    ],
  },
  57: {
    1: [
      { verse: 1, title: 'Saudação' },
      { verse: 4, title: 'O Amor e a Fé de Filemom' },
      { verse: 8, title: 'O Apelo por Onésimo' },
      { verse: 23, title: 'Saudações Finais' },
    ],
  },
  58: {
    1: [
      { verse: 1, title: 'Deus Falou por Seu Filho' },
      { verse: 5, title: 'O Filho Superior aos Anjos' },
    ],
    2: [
      { verse: 1, title: 'A Grande Salvação' },
      { verse: 5, title: 'Jesus, o Autor da Salvação' },
    ],
    3: [
      { verse: 1, title: 'Jesus Superior a Moisés' },
      { verse: 7, title: 'Advertência Contra a Incredulidade' },
    ],
    4: [
      { verse: 1, title: 'O Repouso do Povo de Deus' },
      { verse: 14, title: 'Jesus, o Grande Sumo Sacerdote' },
    ],
    5: [
      { verse: 1, title: 'O Sacerdócio de Cristo' },
      { verse: 11, title: 'Advertência Contra a Apostasia' },
    ],
    6: [
      { verse: 1, title: 'Progredir na Maturidade' },
      { verse: 13, title: 'A Certeza da Promessa de Deus' },
    ],
    7: [
      { verse: 1, title: 'O Sacerdote Melquisedeque' },
      { verse: 11, title: 'Jesus, Sacerdote Como Melquisedeque' },
    ],
    8: [
      { verse: 1, title: 'O Sumo Sacerdote da Nova Aliança' },
      { verse: 7, title: 'A Nova Aliança' },
    ],
    9: [
      { verse: 1, title: 'O Culto no Tabernáculo Terreno' },
      { verse: 11, title: 'O Sangue de Cristo' },
    ],
    10: [
      { verse: 1, title: 'O Sacrifício de Cristo de Uma Vez por Todas' },
      { verse: 19, title: 'Perseverança na Fé' },
      { verse: 26, title: 'Advertência Contra o Pecado Deliberado' },
    ],
    11: [
      { verse: 1, title: 'Pela Fé' },
      { verse: 17, title: 'A Fé de Abraão' },
      { verse: 23, title: 'A Fé de Moisés' },
      { verse: 32, title: 'Muitos Exemplos de Fé' },
    ],
    12: [
      { verse: 1, title: 'Olhando para Jesus' },
      { verse: 4, title: 'A Disciplina do Senhor' },
      { verse: 14, title: 'Advertência Contra a Rejeição da Graça' },
      { verse: 18, title: 'O Monte Sião' },
    ],
    13: [
      { verse: 1, title: 'Serviço Agradável a Deus' },
      { verse: 7, title: 'Exortações Finais' },
      { verse: 20, title: 'Bênção e Saudações' },
    ],
  },
  59: {
    1: [
      { verse: 1, title: 'Saudação' },
      { verse: 2, title: 'Provações e Tentações' },
      { verse: 19, title: 'Ouvir e Praticar a Palavra' },
    ],
    2: [
      { verse: 1, title: 'Advertência Contra a Parcialidade' },
      { verse: 14, title: 'A Fé e as Obras' },
    ],
    3: [
      { verse: 1, title: 'A Língua' },
      { verse: 13, title: 'A Sabedoria do Alto' },
    ],
    4: [
      { verse: 1, title: 'A Amizade com o Mundo' },
      { verse: 11, title: 'Não Julgar o Irmão' },
      { verse: 13, title: 'Advertência Contra a Presunção' },
    ],
    5: [
      { verse: 1, title: 'Advertência aos Ricos' },
      { verse: 7, title: 'Paciência e Perseverança' },
      { verse: 13, title: 'A Oração da Fé' },
    ],
  },
  60: {
    1: [
      { verse: 1, title: 'Saudação' },
      { verse: 3, title: 'A Esperança Viva' },
      { verse: 13, title: 'Chamados à Santidade' },
    ],
    2: [
      { verse: 1, title: 'A Pedra Viva e o Povo Eleito' },
      { verse: 11, title: 'Vivendo Como Servos de Deus' },
      { verse: 18, title: 'O Exemplo de Cristo no Sofrimento' },
    ],
    3: [
      { verse: 1, title: 'Esposas e Maridos' },
      { verse: 8, title: 'Sofrendo por Fazer o Bem' },
    ],
    4: [
      { verse: 1, title: 'Vivendo para a Vontade de Deus' },
      { verse: 12, title: 'Sofrendo Como Cristão' },
    ],
    5: [
      { verse: 1, title: 'Exortação aos Presbíteros e aos Jovens' },
      { verse: 6, title: 'Exortações Finais' },
      { verse: 12, title: 'Saudações Finais' },
    ],
  },
  61: {
    1: [
      { verse: 1, title: 'Saudação' },
      { verse: 3, title: 'A Vocação e a Eleição do Cristão' },
      { verse: 12, title: 'As Testemunhas Oculares da Glória de Cristo' },
    ],
    2: [
      { verse: 1, title: 'Os Falsos Mestres' },
      { verse: 17, title: 'A Sentença dos Falsos Mestres' },
    ],
    3: [
      { verse: 1, title: 'O Dia do Senhor' },
      { verse: 11, title: 'Vivendo em Santidade' },
      { verse: 14, title: 'Exortação Final' },
    ],
  },
  62: {
    1: [
      { verse: 1, title: 'O Verbo da Vida' },
      { verse: 5, title: 'Deus é Luz' },
    ],
    2: [
      { verse: 1, title: 'Cristo, Nosso Advogado' },
      { verse: 7, title: 'O Novo Mandamento' },
      { verse: 15, title: 'Não Amar o Mundo' },
      { verse: 18, title: 'O Anticristo' },
    ],
    3: [
      { verse: 1, title: 'Filhos de Deus' },
      { verse: 11, title: 'Amai-vos Uns aos Outros' },
    ],
    4: [
      { verse: 1, title: 'Provai os Espíritos' },
      { verse: 7, title: 'Deus é Amor' },
    ],
    5: [
      { verse: 1, title: 'A Fé que Vence o Mundo' },
      { verse: 6, title: 'O Testemunho de Deus' },
      { verse: 13, title: 'A Vida Eterna' },
    ],
  },
  63: {
    1: [
      { verse: 1, title: 'Saudação' },
      { verse: 4, title: 'A Verdade e o Amor' },
      { verse: 7, title: 'Advertência Contra os Enganadores' },
      { verse: 12, title: 'Saudações Finais' },
    ],
  },
  64: {
    1: [
      { verse: 1, title: 'Saudação' },
      { verse: 2, title: 'Elogio a Gaio' },
      { verse: 9, title: 'A Conduta de Diótrefes' },
      { verse: 11, title: 'O Bom Testemunho de Demétrio' },
      { verse: 13, title: 'Saudações Finais' },
    ],
  },
  65: {
    1: [
      { verse: 1, title: 'Saudação' },
      { verse: 3, title: 'A Condenação dos Falsos Mestres' },
      { verse: 17, title: 'Exortação à Perseverança' },
      { verse: 24, title: 'Doxologia' },
    ],
  },
  66: {
    1: [
      { verse: 1, title: 'Prólogo' },
      { verse: 4, title: 'Saudação às Sete Igrejas' },
      { verse: 9, title: 'A Visão do Filho do Homem' },
    ],
    2: [
      { verse: 1, title: 'A Carta à Igreja de Éfeso' },
      { verse: 8, title: 'A Carta à Igreja de Esmirna' },
      { verse: 12, title: 'A Carta à Igreja de Pérgamo' },
      { verse: 18, title: 'A Carta à Igreja de Tiatira' },
    ],
    3: [
      { verse: 1, title: 'A Carta à Igreja de Sardes' },
      { verse: 7, title: 'A Carta à Igreja de Filadélfia' },
      { verse: 14, title: 'A Carta à Igreja de Laodiceia' },
    ],
    4: [
      { verse: 1, title: 'O Trono no Céu' },
    ],
    5: [
      { verse: 1, title: 'O Livro e o Cordeiro' },
    ],
    6: [
      { verse: 1, title: 'Os Selos' },
      { verse: 12, title: 'O Sexto Selo' },
    ],
    7: [
      { verse: 1, title: 'Os 144 Mil de Israel' },
      { verse: 9, title: 'A Grande Multidão' },
    ],
    8: [
      { verse: 1, title: 'O Sétimo Selo e o Incensário de Ouro' },
      { verse: 6, title: 'As Trombetas' },
    ],
    9: [
      { verse: 1, title: 'A Quinta Trombeta' },
      { verse: 13, title: 'A Sexta Trombeta' },
    ],
    10: [
      { verse: 1, title: 'O Anjo e o Livrinho' },
    ],
    11: [
      { verse: 1, title: 'As Duas Testemunhas' },
      { verse: 15, title: 'A Sétima Trombeta' },
    ],
    12: [
      { verse: 1, title: 'A Mulher e o Dragão' },
      { verse: 7, title: 'A Guerra no Céu' },
    ],
    13: [
      { verse: 1, title: 'A Besta que Sobe do Mar' },
      { verse: 11, title: 'A Besta que Sobe da Terra' },
    ],
    14: [
      { verse: 1, title: 'O Cordeiro e os 144 Mil' },
      { verse: 6, title: 'Os Três Anjos' },
      { verse: 14, title: 'A Ceifa da Terra' },
    ],
    15: [
      { verse: 1, title: 'Os Anjos com as Últimas Pragas' },
    ],
    16: [
      { verse: 1, title: 'As Taças da Ira de Deus' },
    ],
    17: [
      { verse: 1, title: 'A Grande Prostituta' },
    ],
    18: [
      { verse: 1, title: 'A Queda da Babilônia' },
      { verse: 9, title: 'O Lamento sobre a Babilônia' },
    ],
    19: [
      { verse: 1, title: 'Aleluia no Céu' },
      { verse: 11, title: 'O Cavaleiro do Cavalo Branco' },
    ],
    20: [
      { verse: 1, title: 'Os Mil Anos' },
      { verse: 7, title: 'A Derrota de Satanás' },
      { verse: 11, title: 'O Juízo Final' },
    ],
    21: [
      { verse: 1, title: 'O Novo Céu e a Nova Terra' },
      { verse: 9, title: 'A Nova Jerusalém' },
    ],
    22: [
      { verse: 1, title: 'O Rio da Vida' },
      { verse: 6, title: 'A Vinda de Jesus' },
      { verse: 18, title: 'Advertência Final' },
    ],
  },
};

/**
 * Retorna as perícopes (títulos de seções) para um capítulo específico.
 * @param livroId ID do livro (ex: 40 = Mateus)
 * @param capitulo Número do capítulo
 * @returns Array de perícopes ou array vazio se não disponível
 */
export function getPericopes(livroId: number, capitulo: number): Pericope[] {
    return PERICOPES[livroId]?.[capitulo] || [];
}
