// =====================================================
// SCRIPT PARA INSERIR NOVAS MENSAGENS (9 EXEMPLOS)
// Modos ativos: MODO_1, MODO_1.2, MODO_1.3, MODO_1.4, MODO_1.9
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
// 📝 9 NOVOS EXEMPLOS (Modos ativos)
// =====================================================

const MINHAS_MENSAGENS = [
    {
        modo_id: "MODO_1.9",  // Direto ao Ponto
        passagem: "Neemias - Visão",
        texto: `Enquanto alguns zombavam, Neemias construía. Visão de Deus não se discute, se obedece.`
    },
    {
        modo_id: "MODO_1",  // Devocional Completo
        passagem: "1 Tessalonicenses 5:18",
        texto: `**COMECE AGRADECENDO. DEUS JÁ ESTÁ AGINDO.**

Começo o ano com o coração grato.
Não porque tudo foi fácil,
mas porque Deus foi fiel em cada detalhe.

Grato pelas orações respondidas,
pelas que ainda estão em silêncio
e até pelas lágrimas que me ensinaram a confiar.

A gratidão não ignora a dor,
ela reconhece a presença de Deus no processo.

"Em tudo, dai graças." — 1 Tessalonicenses 5:18

Que este ano comece assim:
com menos reclamação e mais fé,
menos pressa e mais confiança,
menos medo e mais gratidão.`
    },
    {
        modo_id: "MODO_1",  // Devocional Completo
        passagem: "Romanos 12:2 / Salmos 51:10",
        texto: `**RENOVA-ME, SENHOR... PORQUE EU JÁ NÃO QUERO SER IGUAL.**

Chega um momento em que a alma cansa de repetir os mesmos erros.
O coração clama por mudança, não de aparência, mas de natureza.

A Bíblia diz:
"E não vos conformeis com este mundo, mas transformai-vos pela renovação da vossa mente" (Romanos 12:2).

Renovação dói, porque Deus não remenda — Ele transforma.
O que Ele renova, Ele alinha.
O que Ele toca, Ele muda.

Se hoje você sente esse clamor no peito, não ignore.
É o Espírito Santo chamando você para uma vida mais profunda, mais santa, mais parecida com Jesus.

"Cria em mim, ó Deus, um coração puro e renova dentro de mim um espírito reto" (Salmos 51:10).`
    },
    {
        modo_id: "MODO_1",  // Devocional Completo
        passagem: "Isaías 43:19",
        texto: `**DEVOCIONAL DO DIA**
Segunda-feira, 29 de dezembro

**ÚLTIMA SEGUNDA-FEIRA DO ANO PROFÉTICO**

Antes de Deus abrir um novo ciclo, Ele encerra processos.

Esta não é apenas mais uma segunda-feira.
É a última segunda-feira do ano profético — um dia de fechamentos, ajustes e alinhamentos. Deus não vira páginas sem antes tratar o coração.

Talvez você entre neste dia cansado, ferido ou confuso...
mas saiba: Deus não desperdiça nenhuma estação.

O que não deu certo foi aprendizado.
O que doeu foi preparação.
O que terminou abriu espaço para o novo.

"Eis que faço coisa nova; porventura não a percebeis?" (Isaías 43:19)

Hoje é dia de soltar pesos, perdoar, se arrepender, agradecer e confiar.
Não leve para o novo ano o que Deus já encerrou.

Entre leve. Entre curado. Entre alinhado.`
    },
    {
        modo_id: "MODO_1.2",  // Estrutura Profética
        passagem: "Isaías 52:12",
        texto: `**PROFETIZE SOBRE ESSA SEMANA**

Eu profetizo que Deus vai alinhar o que estava fora do lugar,
vai acalmar o que te tirava a paz
e vai abrir portas que você já tinha parado de orar, mas o céu não esqueceu.

"O Senhor irá à tua frente e será tua retaguarda." (Isaías 52:12)

**Esta semana:**
O cansaço não vai te parar
A dúvida não vai te governar
O medo não vai ter a última palavra

O céu já liberou direção, provisão e discernimento.
Você não entra nesses dias sozinho(a).
Deus já foi na frente.

**Declare hoje:**
"Senhor, eu recebo essa semana como resposta, crescimento e amadurecimento."`
    },
    {
        modo_id: "MODO_1.4",  // Fato Histórico / Confronto
        passagem: "Tiago 3:16",
        texto: `**NEM TUDO É BATALHA ESPIRITUAL.**
ÀS VEZES É SÓ EGO FERIDO, AMBIÇÃO DESCONTROLADA E DISPUTA POR TERRITÓRIO.

Nem todo conflito é ataque do inferno.
Algumas guerras nascem quando o dinheiro fala mais alto, quando o orgulho grita, e quando o "eu" quer sentar no trono.

A Bíblia é clara:
"Pois onde há inveja e sentimento faccioso, aí há confusão e toda espécie de coisas ruins." (Tiago 3:16 – NAA)

Antes de amarrar demônios, Deus nos chama a examinar o coração.
Antes de gritar "é espiritual", o Espírito Santo pergunta:
isso é guerra espiritual... ou é falta de renúncia?

Discernimento também é maturidade espiritual.`
    },
    {
        modo_id: "MODO_1",  // Devocional Completo
        passagem: "Mateus 6:15",
        texto: `**DEVOCIONAL DO DIA**
Quarta, 07 de janeiro

**A FALTA DE PERDÃO NÃO PRENDE QUEM TE FERIU. PRENDE VOCÊ.**

Muita gente ora, jejua e canta...
mas carrega no coração algo que Deus já pediu para soltar.

A falta de perdão vira peso, vira silêncio espiritual, vira oração que não flui.

Jesus foi direto:
"Se vocês não perdoarem, também o Pai celestial não lhes perdoará." (Mateus 6:15)

Perdoar não é concordar. Não é esquecer.
É decidir não continuar preso ao passado.

Enquanto você segura a mágoa,
o inimigo constrói fortalezas no coração.
Mas quando você libera perdão,
Deus libera cura.

O perdão não muda o que aconteceu, mas muda o que acontece dentro de você.

Hoje, escolha soltar.
Não por eles.
Mas por você — e pela sua comunhão com Deus.

Perdoe. Seja livre.`
    },
    {
        modo_id: "MODO_1",  // Devocional Completo
        passagem: "Mateus 4:17",
        texto: `**NÃO É O FIM DO MUNDO... É O CHAMADO DE DEUS.**

"Arrependei-vos, porque está próximo o Reino dos Céus." (Mateus 4:17)

Jesus não gritou essa frase para assustar pessoas,
mas para acordar corações.

Arrependimento não é vergonha.
É coragem.
É admitir: "Desse jeito não dá mais."

Muita gente acha que arrependimento é perder liberdade,
quando na verdade é o começo da verdadeira vida.

O Reino de Deus não se aproxima para condenar,
mas para restaurar, curar e reconciliar.

Enquanto há tempo, há graça.
Enquanto há fôlego, há oportunidade.

Hoje ainda é dia de voltar.`
    },
    {
        modo_id: "MODO_1.9",  // Direto ao Ponto
        passagem: "Neemias 2:18",
        texto: `Não cheguei até aqui por força, nem por capacidade humana.

Foi a boa mão do Senhor que me levantou, me conduziu em meio às lutas e me posicionou neste tempo.

Se estou de pé, é porque Deus me sustentou.

O que Ele começou, Ele mesmo fará prosperar.`
    }
];

// =====================================================
// 🚀 CÓDIGO DE INSERÇÃO
// =====================================================

async function inserirMensagens() {
    console.log('\n🙏 Inserindo 9 novas mensagens de exemplo...\n');

    let sucesso = 0;
    let erro = 0;

    for (let i = 0; i < MINHAS_MENSAGENS.length; i++) {
        const msg = MINHAS_MENSAGENS[i];
        console.log(`📝 [${i + 1}/9] ${msg.modo_id} - ${msg.passagem.substring(0, 30)}...`);

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
    console.log(`✅ Sucesso: ${sucesso} mensagens`);
    console.log(`❌ Erros: ${erro}`);
    console.log('=============================================\n');
}

inserirMensagens().catch(console.error);
