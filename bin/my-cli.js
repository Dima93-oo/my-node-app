#!/usr/bin/env node
const { Command } = require('commander');
const chalk = require('chalk');
const initCmd = require('../commands/init');
const buildCmd = require('../commands/build');
const testCmd = require('../commands/test-cmd');
const deployCmd = require('../commands/deploy');

const program = new Command();
program.name('my-cli').description('CLI-приложение для лабораторной работы №17').version('1.0.0');

program.command('init').description('Инициализация проекта').option('--name <name>', 'Имя проекта').option('--type <type>', 'Тип проекта').action(initCmd);
program.command('build').description('Сборка проекта').option('--config <path>', 'Путь к конфигу', 'config.json').action(buildCmd);
program.command('test').description('Запуск тестов').action(testCmd);
program.command('deploy').description('Развёртывание').option('--env <env>', 'Окружение', 'production').option('--force', 'Пропустить подтверждение').action(deployCmd);


process.on('uncaughtException', (err) => {
    if (process.env.NODE_ENV === 'development') {
        console.error(err.stack || err);
    } else {
        let msg = err.message;
        if (err.code === 'ENOENT' || (msg && msg.includes('ENOENT'))) {
            msg = 'файл конфигурации не найден. Укажите путь через --config';
        }
        console.error(`✖ Ошибка: ${msg}`);
    }
    process.exit(1);
});

process.on('unhandledRejection', (reason) => {
    if (process.env.NODE_ENV === 'development') {
        console.error(reason);
    } else {
        let msg = reason.message || String(reason);
        if (reason.code === 'ENOENT' || (msg && msg.includes('ENOENT'))) {
            msg = 'файл конфигурации не найден. Укажите путь через --config';
        }
        console.error(`✖ Ошибка: ${msg}`);
    }
    process.exit(1);
});
program.parse();