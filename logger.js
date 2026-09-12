const fs = require('fs');

function setupLogger(app) {
    app.on('server:started', (port) => {
        const log = `[${new Date().toISOString()}] СОБЫТИЕ: server:started - порт ${port}\n`;
        fs.appendFile('logs.txt', log, (err) => { if (err) console.error(err); });
    });

    app.on('request:received', (data) => {
        const log = `[${new Date().toISOString()}] СОБЫТИЕ: request:received - ${data.method} ${data.url}\n`;
        fs.appendFile('logs.txt', log, (err) => { if (err) console.error(err); });
    });

    app.on('server:stopped', () => {
        const log = `[${new Date().toISOString()}] СОБЫТИЕ: server:stopped\n`;
        fs.appendFile('logs.txt', log, (err) => { if (err) console.error(err); });
    });
}

module.exports = { setupLogger };