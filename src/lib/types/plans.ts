export interface Plano {
    id: string;
    titulo: string;
    descricao: string | null;
    duracao_dias: number;
    badge: 'NOVO' | 'POPULAR' | 'CLÁSSICO' | 'INTENSO' | 'LEVE' | null;
    cor_tema: 'blue' | 'green' | 'orange' | 'purple' | 'indigo' | 'cyan' | null;
    capa_url: string | null;
    ordem: number;
    ativo: boolean;
}

export interface PlanoDia {
    id: string;
    plano_id: string;
    dia_numero: number;
    referencia: string;
    titulo_dia: string | null;
}

export interface DiaConcluido {
    id: string;
    user_id: string;
    plano_id: string;
    dia_numero: number;
    data_conclusao: string;
}

export interface InscricaoPlano {
    id: string;
    user_id: string;
    plano_id: string;
    dia_atual: number;
    data_inicio: string;
    ultimo_acesso: string;
    status: 'ativo' | 'concluido' | 'pausado';
    // Join fields
    plano?: Plano;
    progresso_percent?: number;
    dias_concluidos?: number[];
}
