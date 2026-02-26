import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';

// ============================================
// CONFIG
// ============================================
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 'BOl_RIst7Fkgnn5VGKOTAxP6jniHuG9t2JA4GKmmdBz6TSDtv0phLxQYP-NqNhkXoNaoQE49D3nRoUxelGX3a-k';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || 'pU2qtMHShhrEa4JA0Bb5Tq02A3KScgoeA3G0_mPP6VI';
const VAPID_EMAIL = process.env.VAPID_EMAIL || 'mailto:lucifran2024@gmail.com';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Versiculos inspiradores para "Palavra do Dia"
const VERSICULOS_DIA = [
    { ref: 'Filipenses 4:13', texto: 'Tudo posso naquele que me fortalece.' },
    { ref: 'Salmos 23:1', texto: 'O Senhor e meu pastor; nada me faltara.' },
    { ref: 'Isaias 41:10', texto: 'Nao temas, porque eu sou contigo; nao te assombres, porque eu sou o teu Deus.' },
    { ref: 'Josue 1:9', texto: 'Seja forte e corajoso! Nao se apavore, nem se desanime, pois o Senhor esta com voce.' },
    { ref: 'Romanos 8:28', texto: 'Sabemos que todas as coisas cooperam para o bem daqueles que amam a Deus.' },
    { ref: 'Jeremias 29:11', texto: 'Eu sei os planos que tenho para voces, planos de paz e nao de mal, para dar a voces um futuro e uma esperanca.' },
    { ref: 'Salmos 37:5', texto: 'Entregue o seu caminho ao Senhor; confie nele, e ele agira.' },
    { ref: 'Proverbios 3:5-6', texto: 'Confie no Senhor de todo o seu coracao e nao se apoie em seu proprio entendimento. Reconheca o Senhor em todos os seus caminhos, e ele endireitara as suas veredas.' },
    { ref: 'Mateus 11:28', texto: 'Venham a mim, todos os que estao cansados e sobrecarregados, e eu lhes darei descanso.' },
    { ref: 'Salmos 91:1-2', texto: 'Aquele que habita no abrigo do Altissimo descansara a sombra do Todo-Poderoso. Direi do Senhor: Ele e o meu refugio e a minha fortaleza, o meu Deus, em quem confio.' },
    { ref: '2 Timoteo 1:7', texto: 'Pois Deus nao nos deu espirito de covardia, mas de poder, de amor e de equilibrio.' },
    { ref: 'Isaias 40:31', texto: 'Mas aqueles que esperam no Senhor renovam as suas forcas. Voam alto como aguias; correm e nao ficam cansados, andam e nao se fatigam.' },
    { ref: 'Salmos 46:10', texto: 'Aquietem-se e saibam que eu sou Deus.' },
    { ref: 'Joao 14:27', texto: 'Deixo-lhes a paz; a minha paz lhes dou. Nao a dou como o mundo a da. Nao se perturbem os seus coracoes, nem tenham medo.' },
    { ref: 'Salmos 34:18', texto: 'Perto esta o Senhor dos que tem o coracao quebrantado e salva os de espirito abatido.' },
    { ref: 'Romanos 15:13', texto: 'Que o Deus da esperanca os encha de toda alegria e paz, por sua confianca nele, para que voces transbordem de esperanca, pelo poder do Espirito Santo.' },
    { ref: 'Lamentacoes 3:22-23', texto: 'O amor do Senhor nao se acaba; as suas misericordias nao tem fim. Renovam-se a cada manha; grande e a tua fidelidade.' },
    { ref: 'Salmos 119:105', texto: 'A tua palavra e lampada para os meus pes e luz para o meu caminho.' },
    { ref: '1 Corintios 10:13', texto: 'Deus e fiel; ele nao permitira que voces sejam tentados alem do que podem suportar.' },
    { ref: 'Efesios 3:20', texto: 'Aquele que e poderoso para fazer infinitamente mais do que tudo o que pedimos ou pensamos, de acordo com o seu poder que age em nos.' },
    { ref: 'Hebreus 13:8', texto: 'Jesus Cristo e o mesmo, ontem, hoje e para sempre.' },
    { ref: 'Salmos 27:1', texto: 'O Senhor e a minha luz e a minha salvacao; de quem terei medo?' },
    { ref: 'Mateus 6:33', texto: 'Busquem em primeiro lugar o Reino de Deus e a sua justica, e todas essas coisas lhes serao acrescentadas.' },
    { ref: 'Filipenses 4:6-7', texto: 'Nao andem ansiosos por coisa alguma, mas em tudo, pela oracao e suplicas, e com acao de gracas, apresentem seus pedidos a Deus. E a paz de Deus, que excede todo o entendimento, guardara o coracao e a mente de voces.' },
    { ref: 'Galatas 5:22-23', texto: 'Mas o fruto do Espirito e: amor, alegria, paz, paciencia, amabilidade, bondade, fidelidade, mansidao e dominio proprio.' },
    { ref: 'Salmos 121:1-2', texto: 'Levanto os meus olhos para os montes e pergunto: De onde me vem o socorro? O meu socorro vem do Senhor, que fez os ceus e a terra.' },
    { ref: 'Tiago 1:5', texto: 'Se algum de voces tem falta de sabedoria, peca-a a Deus, que a todos da livremente.' },
    { ref: 'Salmos 139:14', texto: 'Eu te louvo porque me fizeste de modo especial e admiravel. Tuas obras sao maravilhosas!' },
    { ref: '1 Pedro 5:7', texto: 'Lancem sobre ele toda a sua ansiedade, porque ele tem cuidado de voces.' },
    { ref: 'Deuteronomio 31:6', texto: 'Sejam fortes e corajosos. Nao tenham medo, pois o Senhor vai com voces; nunca os deixara, nunca os abandonara.' },
];

function getVersiculoDoDia(): { ref: string; texto: string } {
    // Usa a data como seed para pegar um versiculo diferente por dia
    const hoje = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
    const seed = hoje.split('-').join('');
    const index = parseInt(seed) % VERSICULOS_DIA.length;
    return VERSICULOS_DIA[index];
}

// ============================================
// CRON HANDLER
// ============================================
export async function GET(request: Request) {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Configurar VAPID
        webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

        // Versiculo do dia
        const versiculo = getVersiculoDoDia();

        // Buscar todas as subscriptions
        const { data: subs, error } = await supabase
            .from('push_subscriptions')
            .select('id, subscription_json');

        if (error || !subs || subs.length === 0) {
            console.log('Nenhuma subscription encontrada:', error?.message);
            return NextResponse.json({ ok: true, message: 'Nenhuma subscription ativa', count: 0 });
        }

        // Payload da notificacao
        const payload = JSON.stringify({
            title: `Palavra do Dia - ${versiculo.ref}`,
            body: versiculo.texto,
            url: '/biblioteca',
        });

        // Enviar para cada subscription
        let enviados = 0;
        let falhas = 0;
        const idsParaRemover: number[] = [];

        for (const sub of subs) {
            try {
                await webpush.sendNotification(sub.subscription_json, payload);
                enviados++;
            } catch (err: any) {
                console.error(`Push falhou para sub ${sub.id}:`, err.statusCode || err.message);
                // Se subscription expirou ou foi removida (410 Gone, 404), remover
                if (err.statusCode === 410 || err.statusCode === 404) {
                    idsParaRemover.push(sub.id);
                }
                falhas++;
            }
        }

        // Limpar subscriptions invalidas
        if (idsParaRemover.length > 0) {
            await supabase
                .from('push_subscriptions')
                .delete()
                .in('id', idsParaRemover);
            console.log(`Removidas ${idsParaRemover.length} subscriptions invalidas`);
        }

        return NextResponse.json({
            ok: true,
            message: `Push enviado: ${enviados} sucesso, ${falhas} falhas`,
            versiculo: versiculo.ref,
            enviados,
            falhas,
            removidos: idsParaRemover.length
        });

    } catch (e: any) {
        console.error('Erro no push cron:', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
