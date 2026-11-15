// Preferências da leitura guardadas no aparelho (14/11/2026). Chaves próprias
// da Bíblia: as do plano de leitura não são reaproveitadas (são duas
// experiências diferentes, decisão de 04/09/2026).
export const BIBLIA_SEM_NUMEROS_KEY = 'biblia-sem-numeros';
export const BIBLIA_TELA_ACESA_KEY = 'biblia-tela-acesa';
export const PLANO_TELA_ACESA_KEY = 'plano-tela-acesa';

/** Liga/desliga guardado no aparelho; qualquer erro ou valor estranho é "desligado". */
export function lerPreferencia(chave: string): boolean {
    try {
        return localStorage.getItem(chave) === '1';
    } catch {
        return false;
    }
}

export function guardarPreferencia(chave: string, ligada: boolean): void {
    try {
        if (ligada) localStorage.setItem(chave, '1');
        else localStorage.removeItem(chave);
    } catch {
        /* aparelho sem armazenamento: a escolha vale só até fechar */
    }
}
