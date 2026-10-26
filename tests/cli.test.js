const { execSync } = require('child_process');

test('--help выводит справку', () => {
    const output = execSync('node bin/my-cli.js --help').toString();
    expect(output).toContain('CLI-приложение для лабораторной работы №17');
});

test('--version выводит версию', () => {
    const output = execSync('node bin/my-cli.js --version').toString();
    expect(output).toContain('1.0.0');
});

test('неизвестная команда возвращает код 1', () => {
    try {
        execSync('node bin/my-cli.js unknown', { stdio: 'pipe' });
    } catch (err) {
        expect(err.status).toBe(1);
    }
});