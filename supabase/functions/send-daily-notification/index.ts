import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webpush from 'npm:web-push'

const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

// Configuração WebPush
const vapidKeys = {
    publicKey: Deno.env.get('NEXT_PUBLIC_VAPID_PUBLIC_KEY')!,
    privateKey: Deno.env.get('VAPID_PRIVATE_KEY')!
}

webpush.setVapidDetails(
    'mailto:contato@devocionalpvc.com',
    vapidKeys.publicKey,
    vapidKeys.privateKey
)

Deno.serve(async (req) => {
    try {
        // 1. Pegar versículo do dia
        const hoje = new Date().toISOString().split('T')[0]
        const { data: leitura } = await supabase
            .from('leitura_do_dia')
            .select('passagem_do_dia, insight_curto') // Supondo que exista insight_curto ou similar
            .eq('data', hoje)
            .maybeSingle()

        const mensagem = leitura
            ? `Versículo do Dia: ${leitura.passagem_do_dia}`
            : 'Seu devocional diário está pronto!'

        // 2. Pegar todas as inscrições
        const { data: inscricoes } = await supabase
            .from('push_subscriptions')
            .select('subscription_json')

        if (!inscricoes?.length) {
            return new Response('Ninguém para notificar', { status: 200 })
        }

        console.log(`Disparando para ${inscricoes.length} usuários...`)

        // 3. Enviar para cada um
        const promises = inscricoes.map(async (registro) => {
            try {
                await webpush.sendNotification(
                    registro.subscription_json,
                    JSON.stringify({
                        title: 'Devocional PVC',
                        body: mensagem,
                        icon: '/icon-192.png'
                    })
                )
            } catch (err) {
                if (err.statusCode === 410) {
                    // Usuário removeu permissão -> Deletar do banco (TODO)
                    console.log('Inscrição expirada')
                }
            }
        })

        await Promise.all(promises)

        return new Response(`Enviado para ${inscricoes.length}`, { status: 200 })

    } catch (err) {
        return new Response(String(err), { status: 500 })
    }
})
