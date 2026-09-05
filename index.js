const http = require('http');

function calculatePi(precision) {
    let pi = 0;
    const iterations = 100000000; 
    for (let i = 0; i < iterations; i++) {
        pi += (i % 2 === 0 ? 1 : -1) / (2 * i + 1);
    }
    return (pi * 4).toFixed(precision);
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