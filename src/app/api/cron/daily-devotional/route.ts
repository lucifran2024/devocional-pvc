import { NextResponse } from 'next/server';

/**
 * Endpoint legado desativado.
 *
 * Evangelho Para Todos e Tribo de Judá não devem mais produzir mensagens no
 * Telegram. A Palavra da Manhã continua isolada em /api/cron/daily-push.
 */
export async function GET() {
    return NextResponse.json(
        {
            ok: false,
            disabled: true,
            message: 'daily-devotional foi desativado; use daily-push para a Palavra da Manhã.',
        },
        { status: 410 }
    );
}
