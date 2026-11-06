const { Command } = require('commander');
const inquirer = require('inquirer');

const program = new Command();

program
    .name('my-cli')
    .description('CLI-приложение для лабораторной работы №17')
    .version('1.0.0');

program
    .command('init')
    .description('инициализация проекта')
    .option('--name <name>', 'название проекта')
    .option('--type <type>', 'тип проекта (web, cli, lib, microservice)')
    .option('--typescript', 'использовать TypeScript')
    .option('--prettier', 'использовать Prettier')
    .option('--eslint', 'использовать ESLint')
    .option('--jest', 'использовать Jest')
    .option('--git', 'инициализировать Git')
    .option('--no-interactive', 'отключить интерактивный режим')
    .action(async (options) => {
        const hasStdin = !process.stdin.isTTY;
        const isInteractive = options.interactive !== false && !hasStdin;

        const allDataProvided = options.name && options.type;

        if (!isInteractive || allDataProvided) {
            if (!options.name || !options.type) {
                if (hasStdin) {
                    console.error('Ошибка: недостаточно данных. Укажите --type');
                } else {
                    console.error('Ошибка: в неинтерактивном режиме необходимо указать --name и --type');
                }
                process.exit(1);
            }

            const optsList = [];
            if (options.typescript) optsList.push('TypeScript');
            if (options.prettier) optsList.push('Prettier');
            if (options.eslint) optsList.push('ESLint');
            if (options.jest) optsList.push('Jest');

            console.log(`✓ Проект "${options.name}" успешно инициализирован!`);
            console.log(`Тип: ${options.type}`);
            console.log(`Опции: ${optsList.length > 0 ? optsList.join(', ') : 'нет'}`);
            console.log(`Git: ${options.git ? 'да' : 'нет'}`);
            return;
        }

        const answers = await inquirer.prompt([
            {
                type: 'input',
                name: 'name',
                message: 'Введите название проекта:',
                default: options.name || 'my-project'
            },
            {
                type: 'list',
                name: 'type',
                message: 'Выберите тип проекта:',
                choices: ['Web-приложение', 'CLI-утилита', 'Библиотека', 'Микросервис'],
                default: 'Web-приложение'
            },
            {
                type: 'checkbox',
                name: 'features',
                message: 'Выберите дополнительные опции:',
                choices: [
                    { name: 'TypeScript', checked: options.typescript || false },
                    { name: 'ESLint', checked: options.eslint || false },
                    { name: 'Prettier', checked: options.prettier || false },
                    { name: 'Jest', checked: options.jest || false }
                ]
            },
            {
                type: 'confirm',
                name: 'git',
                message: 'Использовать Git?',
                default: options.git || true
            },
            {
                type: 'password',
                name: 'token',
                message: 'Введите токен доступа:',
                mask: '*'
            }
        ]);

        console.log(`✓ Проект "${answers.name}" успешно инициализирован!`);
        console.log(`Тип: ${answers.type}`);
        console.log(`Опции: ${answers.features.length > 0 ? answers.features.join(', ') : 'нет'}`);
        console.log(`Git: ${answers.git ? 'да' : 'нет'}`);
    });

program.parse();