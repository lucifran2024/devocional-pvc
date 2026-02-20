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

Deno.serve(async (_req) => {
    try {
        // Timezone Brasil (UTC-3)
        const agora = new Date()
        agora.setHours(agora.getHours() - 3)
        const hoje = agora.toISOString().split('T')[0]

        // 1. Buscar a Palavra da Manhã do dia
        const { data: palavraManha } = await supabase
            .from('palavra_manha_diaria')
            .select('mensagem, passagem_ref, dia_semana, categoria')
            .eq('data', hoje)
            .maybeSingle()

        // 2. Fallback: buscar passagem do dia
        let titulo = '🌅 Palavra da Manhã'
        let corpo = 'Sua reflexão diária está pronta. Abra o app!'

        if (palavraManha) {
            // Extrai os primeiros ~120 chars da mensagem (limpo de markdown)
            const mensagemLimpa = palavraManha.mensagem
                .replace(/[*#_>]/g, '')
                .replace(/\n+/g, ' ')
                .trim()
            const trecho = mensagemLimpa.length > 120
                ? mensagemLimpa.substring(0, 117) + '...'
                : mensagemLimpa

            titulo = palavraManha.passagem_ref
                ? `🌅 ${palavraManha.passagem_ref}`
                : '🌅 Palavra da Manhã'

            corpo = trecho
        } else {
            // Se não tem Palavra da Manhã, tenta pegar a passagem do dia
            const { data: leitura } = await supabase
                .from('leitura_do_dia')
                .select('passagem_do_dia')
                .eq('data', hoje)
                .maybeSingle()

            if (leitura) {
                titulo = '📖 Leitura do Dia'
                corpo = `${leitura.passagem_do_dia} — Abra o app para ler sua reflexão.`
            }
        }

        // 3. Pegar todas as inscrições
        const { data: inscricoes } = await supabase
            .from('push_subscriptions')
            .select('id, subscription_json')

        if (!inscricoes?.length) {
            return new Response('Ninguém para notificar', { status: 200 })
        }

        console.log(`Disparando para ${inscricoes.length} usuários...`)

        // 4. Enviar para cada um e limpar expirados
        const idsExpirados: number[] = []
        let enviados = 0

        const promises = inscricoes.map(async (registro) => {
            try {
                await webpush.sendNotification(
                    registro.subscription_json,
                    JSON.stringify({
                        title: titulo,
                        body: corpo,
                        icon: '/icon-192.png',
                        url: '/'
                    })
                )
                enviados++
            } catch (err: any) {
                if (err.statusCode === 410 || err.statusCode === 404) {
                    // Inscrição expirada ou inválida -> marcar para remoção
                    idsExpirados.push(registro.id)
                    console.log(`Inscrição ${registro.id} expirada (${err.statusCode})`)
                } else {
                    console.error(`Erro ao enviar para ${registro.id}:`, err.message)
                }
            }
        })

        await Promise.all(promises)

        // 5. Limpar inscrições expiradas
        if (idsExpirados.length > 0) {
            await supabase
                .from('push_subscriptions')
                .delete()
                .in('id', idsExpirados)
            console.log(`Removidas ${idsExpirados.length} inscrições expiradas`)
        }

        return new Response(
            JSON.stringify({
                ok: true,
                enviados,
                expirados: idsExpirados.length,
                total: inscricoes.length
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
        )

    } catch (err) {
        console.error('Erro fatal:', err)
        return new Response(String(err), { status: 500 })
    }
})
