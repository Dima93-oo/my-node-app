const http = require('http');
function calculatePi(digits) {
    const scale = 10n ** BigInt(digits + 5);
    function arctan(x) {
        let power = scale / BigInt(x);
        let sum = power;
        const xSq = BigInt(x) * BigInt(x);
        for (let i = 1; i < 1000; i++) {
            power = -power / xSq;
            const term = power / BigInt(2 * i + 1);
            sum += term;
            if (term === 0n) break;
        }
        return sum;
    }  
    const pi = 4n * (4n * arctan(5) - arctan(239));
    const piStr = pi.toString();
    return piStr[0] + '.' + piStr.slice(1, digits + 1);
}
const studentName = "Фурс Дмитрий Геннадьевич";
const studentGroup = "477";
const journalNumber = 25;                      
const piValue = calculatePi(journalNumber);
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`
        <h1>Привет, мир!</h1>
        <p>1. ${studentName}</p>
        <p>2. ${studentGroup}</p>
        <p>3. Число Пи (до ${journalNumber} знака): ${piValue}</p>
    `);
});
const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Сервер запущен на http://localhost:${PORT}`);
});