import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Health Check Edge Function
 * Verifica status de todos os serviços
 */

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface HealthStatus {
    status: 'healthy' | 'degraded' | 'unhealthy';
    checks: {
        database: CheckResult;
        storage: CheckResult;
        gemini: CheckResult;
    };
    timestamp: string;
    version: string;
}

interface CheckResult {
    status: 'ok' | 'error';
    latencyMs?: number;
    message?: string;
}

async function checkDatabase(supabase: any): Promise<CheckResult> {
    const start = Date.now();
    try {
        const { error } = await supabase
            .from('modos')
            .select('id')
            .limit(1);

        if (error) throw error;

        return {
            status: 'ok',
            latencyMs: Date.now() - start
        };
    } catch (err: any) {
        return {
            status: 'error',
            message: err.message,
            latencyMs: Date.now() - start
        };
    }
}

async function checkStorage(supabase: any): Promise<CheckResult> {
    const start = Date.now();
    try {
        const { error } = await supabase.storage
            .from('pvc')
            .list('', { limit: 1 });

        if (error) throw error;

        return {
            status: 'ok',
            latencyMs: Date.now() - start
        };
    } catch (err: any) {
        return {
            status: 'error',
            message: err.message,
            latencyMs: Date.now() - start
        };
    }
}

async function checkGemini(geminiKey: string): Promise<CheckResult> {
    const start = Date.now();
    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${geminiKey}`;
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        return {
            status: 'ok',
            latencyMs: Date.now() - start
        };
    } catch (err: any) {
        return {
            status: 'error',
            message: err.message,
            latencyMs: Date.now() - start
        };
    }
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const geminiKey = Deno.env.get("GEMINI_API_KEY") || Deno.env.get("GEMINI_KEY") || '';

        const supabase = createClient(supabaseUrl, serviceKey);

        // Run all checks in parallel
        const [database, storage, gemini] = await Promise.all([
            checkDatabase(supabase),
            checkStorage(supabase),
            checkGemini(geminiKey)
        ]);

        // Determine overall status
        const checks = { database, storage, gemini };
        const allOk = Object.values(checks).every(c => c.status === 'ok');
        const anyError = Object.values(checks).some(c => c.status === 'error');

        const health: HealthStatus = {
            status: allOk ? 'healthy' : anyError ? 'unhealthy' : 'degraded',
            checks,
            timestamp: new Date().toISOString(),
            version: '1.0.0'
        };

        const httpStatus = health.status === 'healthy' ? 200 :
            health.status === 'degraded' ? 200 : 503;

        return new Response(
            JSON.stringify(health, null, 2),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: httpStatus
            }
        );

    } catch (error: any) {
        return new Response(
            JSON.stringify({
                status: 'unhealthy',
                error: error.message,
                timestamp: new Date().toISOString()
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 500
            }
        );
    }
});
