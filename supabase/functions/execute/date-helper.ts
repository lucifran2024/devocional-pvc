export function getContextoTemporal(dataString: string): string {
    // dataString vem no formato YYYY-MM-DD
    if (!dataString) return "";

    const data = new Date(dataString + 'T12:00:00'); // Força meio dia para evitar fuso
    const dia = data.getDate();
    const mes = data.getMonth() + 1; // 1-12
    const diaSemana = data.getDay(); // 0 (Dom) - 6 (Sab)

    const diasSemana = [
        "Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira",
        "Quinta-feira", "Sexta-feira", "Sábado"
    ];

    const nomeDia = diasSemana[diaSemana];
    let contexto = `Hoje é ${nomeDia}, ${dia}/${mes}. `;

    // 1. Contexto Semanal
    if (diaSemana === 0) {
        contexto += "Dia de culto, descanso e família. Tom sugerido: Espiritual, reflexivo, preparatório para a semana. Encoraje a comunhão.";
    } else if (diaSemana === 1) {
        contexto += "Início da semana de trabalho. Tom sugerido: Encorajador, força, propósito, motivação para os desafios.";
    } else if (diaSemana === 5) {
        contexto += "Sexta-feira, fim do expediente. Tom sugerido: Gratidão, alívio, preparação para o descanso.";
    } else if (diaSemana === 6) {
        contexto += "Sábado, dia de lazer ou tarefas. Tom sugerido: Leve, descomplicado, relacional.";
    }

    // 2. Feriados Fixos e Datas Especiais
    const chaveData = `${dia.toString().padStart(2, '0')}/${mes.toString().padStart(2, '0')}`;

    const feriados: { [key: string]: string } = {
        "01/01": "ANO NOVO. Tom: Esperança, recomeço, planos, consagração do ano.",
        "25/12": "NATAL. Tom: Celebração do nascimento de Jesus, encarnação, humildade, alegria profunda.",
        "24/12": "VÉSPERA DE NATAL. Tom: Expectativa, família, luz, preparação.",
        "31/12": "VÉSPERA DE ANO NOVO. Tom: Gratidão pelo ano que passou, balanço, encerramento.",
        "07/09": "INDEPENDÊNCIA DO BRASIL. Tom: Liberdade (espiritual e civil), oração pela nação.",
        "12/10": "DIA DAS CRIANÇAS (Brasil). Tom: Pureza, fé como de criança, futuro.",
        "02/11": "FINADOS. Tom: Consolo, eternidade, esperança na ressurreição.",
        "15/11": "PROCLAMAÇÃO DA REPÚBLICA. Tom: Cidadania celestial e terrena.",
        "01/05": "DIA do TRABALHO. Tom: Dignidade do trabalho, provisão divina."
    };

    if (feriados[chaveData]) {
        contexto += `\nDATA ESPECIAL: ${feriados[chaveData]}`;
    }

    // 3. Estações/Meses Específicos (Opcional - simplificado)
    if (mes === 1) contexto += " (Início de ano).";
    if (mes === 12) contexto += " (Fim de ano, advento).";

    return contexto;
}
