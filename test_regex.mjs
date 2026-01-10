// Teste simples da regex

const testLine = 'tese": "A liderança';

const key = 'tese';

// Caso 2: regex de início de linha 
const regexStart = new RegExp(`(^|\\r?\\n)(${key}"):`, 'gm');
console.log('regexStart:', regexStart);

const result = testLine.replace(regexStart, '$1"$2":');
console.log('Entrada:', JSON.stringify(testLine));
console.log('Saída:', JSON.stringify(result));

// Verificar se o regex está funcionando
const matches = testLine.match(regexStart);
console.log('Matches:', matches);

// Teste com linha real do arquivo
const realLine = '\r\ntese": "A liderança denuncia conspirações.",';
const resultReal = realLine.replace(regexStart, '$1"$2":');
console.log('\nEntrada real:', JSON.stringify(realLine));
console.log('Saída real:', JSON.stringify(resultReal));
