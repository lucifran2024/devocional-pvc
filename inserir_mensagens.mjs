// =====================================================
// SCRIPT PARA INSERIR SUAS MENSAGENS FAVORITAS
// =====================================================
// 20 MODELOS DA SUA GALERIA
// Execute: node inserir_mensagens.mjs
// =====================================================

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Carregar configurações
const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key) env[key.trim()] = valueParts.join('=').trim();
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

// =====================================================
// 📝 GALERIA COMPLETA - 20 MODELOS
// =====================================================

const MINHAS_MENSAGENS = [
    {
        modo_id: "MODO_1",
        passagem: "Galeria M25 - Modelo 01",
        texto: `**PARECE QUE ACABOU, NÉ?**
MAS DEUS AINDA ESTÁ ESCREVENDO O FINAL DESSA HISTÓRIA. 🕊️

A esperança não é fingir que tudo está bem — é crer que Deus está agindo, mesmo quando nada faz sentido.

Quando tudo parece perdido, lembre-se: as promessas de Deus não têm prazo de validade. 💬

Ele continua sendo fiel, mesmo quando você não entende o processo.`
    },
    {
        modo_id: "MODO_1",
        passagem: "Galeria M25 - Modelo 02",
        texto: `**TOME O HÁBITO DE ACORDAR FELIZ, NÃO IMPORTA O QUE VOCÊ ESTEJA PASSANDO.**

A VIDA PODERIA SER MELHOR, MAS TAMBÉM PODERIA SER MUITO PIOR.

SEMPRE ORE E SEJA GRATO.`
    },
    {
        modo_id: "MODO_1",
        passagem: "Galeria M25 - Modelo 03",
        texto: `**E SE TUDO DER ERRADO… VOCÊ AINDA CONSEGUIRIA ADORAR?**

Há dias em que a oliveira mente — quando nada parece dar certo, quando as portas se fecham e o coração se pergunta: 'Deus, até quando?'

Mas é nesses dias que a fé verdadeira se revela.

Alegrar-se em Deus não é negar a dor, é escolher confiar mesmo quando não se vê saída.

Quem confia, adora. E quem adora no deserto, vê o milagre nascer onde ninguém esperava.`
    },
    {
        modo_id: "MODO_1",
        passagem: "Galeria M25 - Modelo 04",
        texto: `**NEM TODA LÁGRIMA É SINAL DE FRAQUEZA… ÀS VEZES, É A ORAÇÃO QUE NÃO ENCONTROU PALAVRAS.**

Há lágrimas que ninguém vê, mas Deus coleciona cada uma delas.

Ele não ignora tua dor, nem se esquece do que você enfrenta no silêncio.

Enquanto o mundo te julga por chorar, o céu te chama de guerreiro(a) — porque ainda que chorando, você continua crendo.

Deus não desperdiça dor. Cada lágrima tem propósito, cada desabafo tem ouvinte.

O que hoje te faz chorar, amanhã será o testemunho que te fará sorrir.`
    },
    {
        modo_id: "MODO_1",
        passagem: "Galeria M25 - Modelo 05",
        texto: `**NEM SEMPRE O PERDÃO RECONSTRÓI O QUE FOI QUEBRADO… MAS ELE LIBERTA O SEU CORAÇÃO PARA SEGUIR EM PAZ.**

Perdoar não significa que tudo será como antes, mas que podemos continuar em frente sem carregar o peso da dor.

Jesus nos ensinou a perdoar porque Ele sabia que o rancor prende, mas o perdão cura.

Quando você decide liberar perdão, o primeiro a ser curado é você.`
    },
    {
        modo_id: "MODO_1",
        passagem: "Galeria M25 - Modelo 06",
        texto: `**VOCÊ JÁ SENTIU UM AMOR QUE TE ESCOLHE MESMO QUANDO VOCÊ ERRA?**

Esse é o amor de Deus.

Um amor que não depende do seu desempenho, mas da graça.

Hoje, esse amor ainda te busca, te perdoa e te oferece vida eterna.

Não fuja do amor que já te encontrou.`
    },
    {
        modo_id: "MODO_1",
        passagem: "Galeria M25 - Modelo 07",
        texto: `**HAVERÁ UM TEMPO EM QUE SUAS LÁGRIMAS CAIRÃO, NÃO POR CAUSA DE PROBLEMAS…**

MAS PORQUE DEUS RESPONDEU ÀS SUAS ORAÇÕES.`
    },
    {
        modo_id: "MODO_1",
        passagem: "Galeria M25 - Modelo 08",
        texto: `**NUNCA SE ENVERGONHE DE NADA QUE VOCÊ PASSOU.**

O QUE PODE SER 'FOFOCA' PARA ELES, É UM 'TESTEMUNHO' PARA VOCÊ E AGRADEÇA A DEUS POR TUDO.`
    },
    {
        modo_id: "MODO_1",
        passagem: "Galeria M25 - Modelo 09",
        texto: `**Gratidão, Senhor, por este novo dia que está iniciando.**

Guia-me com Tua sabedoria, me livra de todo mal e renova meu espírito com Tua paz.

Que eu saiba ser luz na vida de quem me cerca e tenha força para vencer as adversidades.

Amém! ❤️‍🔥`
    },
    {
        modo_id: "MODO_1",
        passagem: "Galeria M25 - Modelo 10",
        texto: `**Deus, abençoa essa nova semana que começa.**

Que eu tenha sabedoria para fazer as escolhas certas, fé para seguir mesmo sem entender tudo e serenidade para descansar em Ti.

Que nenhum desafio roube minha paz e que eu sinta Tua presença guiando cada passo.

Que seja uma semana abençoada, produtiva e cheia da Tua luz. Amém! ❤️‍🔥`
    },
    {
        modo_id: "MODO_1",
        passagem: "Galeria M25 - Modelo 11",
        texto: `**Bom dia Deus!**

Pai amado, eu entrego o meu dia em Tuas mãos, guia cada passo meu, livra-me de todo mal, projeta o meu lar, abençoa a minha vida e a minha família.`
    },
    {
        modo_id: "MODO_1",
        passagem: "Galeria M25 - Modelo 12",
        texto: `**Bom dia, Deus!**

Hoje desperto com o coração cheio de fé, gratidão e esperança.

Obrigado, Senhor, por mais um amanhecer, por Tua presença que renova minhas forças e me guia com amor.

Que este dia seja abençoado, cheio de paz, propósito e Tua luz em cada passo.`
    },
    {
        modo_id: "MODO_1",
        passagem: "Galeria M25 - Modelo 13",
        texto: `**Hoje é um novo capítulo, uma nova oportunidade, um novo começo.**

Seja leve, confie no processo, faça o seu melhor e deixe a vida surpreender você.

Hoje é dia de atrair o que te faz bem, de liberar o que já não serve e de escolher ser feliz.

Que Deus cuide dos seus passos, te proteja de todo mal e te guie para caminhos de vitória.

Que hoje seja especial, produtivo e cheio de coisas boas! Amém! ❤️‍🔥`
    },
    {
        modo_id: "MODO_1",
        passagem: "Galeria M25 - Modelo 14",
        texto: `Deus nos vê.
Deus nos ouve.
Deus nos entende.
Deus nos protege.
Deus nos sustenta.
Deus nos consola.
Deus nos dá paz.
Deus nos fortalece.
Deus cuida de nós.`
    },
    {
        modo_id: "MODO_1",
        passagem: "Galeria M25 - Modelo 15",
        texto: `**Oração da Manhã:**

Não canse de pedir a Deus a direção certa, porque nem tudo que a terra aplaude o céu aprova. Às vezes, o caminho que parece bonito aos olhos do mundo é o mesmo que pode desviar o coração do que é essencial. Por isso, antes de agir, ore, espere e confie. Deus sempre mostra o que é verdadeiro.

**Palavra da Manhã:**

A fé é o fio que te mantém firme quando tudo ao redor parece desabar.
Ela não precisa ver o milagre apenas crer que Deus já está agindo.`
    },
    {
        modo_id: "MODO_1",
        passagem: "Galeria M25 - Modelo 16",
        texto: `**PAI, ENTREGAMOS A NOSSA SEMANA EM TUAS MÃOS.**

FAZ O QUE FOR MELHOR PARA NÓS.

AMÉM!`
    },
    {
        modo_id: "MODO_1",
        passagem: "Galeria M25 - Modelo 17",
        texto: `**Teus sentimentos vão mentir para você… a Bíblia, não.**`
    },
    {
        modo_id: "MODO_1",
        passagem: "Galeria M25 - Modelo 18",
        texto: `**VOCÊ JÁ PERCEBEU QUE DEUS ESTÁ MOLDANDO A SUA VIDA, MESMO QUANDO PARECE DOLOROSO?**

Ser barro nas mãos de Deus significa se render ao processo.

O oleiro não descarta o barro imperfeito, Ele refaz, molda, trabalha até que se torne um vaso de honra.

Muitas vezes não entendemos os apertos, as pressões ou os recomeços, mas tudo faz parte da obra do Oleiro.

👉 O barro sozinho não tem forma.
👉 O barro sozinho não tem valor.
👉 Mas nas mãos de Deus, o barro se torna vaso que carrega a glória d'Ele.

Hoje, declare: 'Senhor, continua me moldando, eu sou Teu.'`
    },
    {
        modo_id: "MODO_1",
        passagem: "Galeria M25 - Modelo 19",
        texto: `**NEM TODO MUNDO É FILHO DE DEUS… MAS TODO AQUELE QUE RECEBE JESUS, É CHAMADO FILHO AMADO DO PAI.**

Nem todos entendem, mas ser filho de Deus não é sobre religião, é sobre relação.

Não é sobre o que fazemos, mas sobre quem recebemos: Jesus.

Quando abrimos o coração para Ele, o céu deixa de ser apenas um destino e se torna nosso lar.

Deus não nos adotou por compaixão, mas por amor eterno.

Em Cristo, deixamos de ser apenas criaturas — e nos tornamos filhos amados. 💛`
    },
    {
        modo_id: "MODO_1",
        passagem: "Galeria M25 - Modelo 20",
        texto: `**O MEDO GRITA, MAS DEUS FALA MAIS ALTO. E QUANDO ELE FALA, O MEDO PERDE FORÇA.**

Todos nós enfrentamos dias em que o medo tenta nos paralisar — medo do amanhã, da perda, do fracasso.

Mas o medo é só uma sombra diante da luz de um Deus que nunca perde o controle.

Davi também teve medo. Mas ele descobriu um segredo: quando o coração treme, é hora de confiar ainda mais.

Porque fé não é ausência de medo — é decidir acreditar, mesmo com o medo presente.

Quando você coloca seus medos nas mãos de Deus, Ele os transforma em testemunho.

A tempestade não vai te afogar; vai te ensinar a caminhar sobre as águas.`
    }
];

// =====================================================
// 🚀 CÓDIGO DE INSERÇÃO
// =====================================================

async function inserirMensagens() {
    console.log('\n🙏 Iniciando inserção de 20 mensagens da Galeria M25...\n');

    let sucesso = 0;
    let erro = 0;

    for (let i = 0; i < MINHAS_MENSAGENS.length; i++) {
        const msg = MINHAS_MENSAGENS[i];
        console.log(`📝 [${i + 1}/20] Inserindo Modelo ${i + 1}...`);

        const { data, error } = await supabase
            .from('historico_geracoes')
            .insert({
                modo_id: msg.modo_id,
                data_referencia: new Date().toISOString().split('T')[0],
                passagem: msg.passagem,
                resultado_texto: msg.texto,
                aprovado: true
            })
            .select('id')
            .single();

        if (error) {
            console.log(`   ❌ Erro: ${error.message}`);
            erro++;
        } else {
            console.log(`   ✅ ID: ${data.id}`);
            sucesso++;
        }
    }

    console.log('\n=============================================');
    console.log(`✅ Sucesso: ${sucesso} mensagens inseridas`);
    console.log(`❌ Erros: ${erro}`);
    console.log('=============================================\n');
}

inserirMensagens().catch(console.error);
