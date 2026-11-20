import { createClient } from '@supabase/supabase-js';
import { caminhoPrintPalavra, pngValido } from '@/lib/palavra-artefato';

export const runtime = 'nodejs';

/** Leitura pública de um artefato já publicado no Storage, sem IA, cron ou escrita.
 * O conteúdo da Palavra já é público no início do app. */
export async function GET(request: Request) {
    const data = new URL(request.url).searchParams.get('data');
    const hoje = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
    if (!data || !/^\d{4}-\d{2}-\d{2}$/.test(data) || data !== hoje) {
        return Response.json({ error: 'Data diferente do dia atual' }, { status: 404 });
    }
    try {
        const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
        const registro = await supabase.from('palavra_manha_diaria')
            .select('id,data,mensagem').eq('data', data).maybeSingle();
        const palavra = registro.data;
        if (registro.error || !palavra || palavra.data !== data || !palavra.mensagem?.trim()) {
            return Response.json({ error: 'Palavra ausente' }, { status: 404 });
        }
        const foto = await supabase.storage.from('pvc').download(caminhoPrintPalavra(palavra));
        if (foto.error || !foto.data) return Response.json({ error: 'Print ainda indisponível' }, { status: 404 });
        const bytes = new Uint8Array(await foto.data.arrayBuffer());
        if (!pngValido(bytes)) return Response.json({ error: 'Print inválido' }, { status: 502 });
        return new Response(bytes, {
            headers: { 'content-type': 'image/png', 'cache-control': 'no-store, max-age=0',
                'x-content-type-options': 'nosniff', 'x-pvc-palavra-data': data },
        });
    } catch {
        return Response.json({ error: 'Não foi possível ler o print' }, { status: 503 });
    }
}
