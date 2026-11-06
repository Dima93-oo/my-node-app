const chalk = require('chalk');
const ora = require('ora');

module.exports = async (options) => {
    if (!options.name) {
        console.error(chalk.red(' Ошибка: укажите --name'));
        process.exit(1);
    }
    const s1 = ora('Создание проекта...').start();
    await new Promise(r => setTimeout(r, 800));
    s1.succeed(chalk.green(`Проект "${options.name}" создан`));
    
    const s2 = ora('Установка зависимостей...').start();
    await new Promise(r => setTimeout(r, 1000));
    s2.succeed(chalk.green('Зависимости установлены'));
    
    const s3 = ora('Инициализация Git...').start();
    await new Promise(r => setTimeout(r, 600));
    s3.succeed(chalk.green('Git-репозиторий инициализирован'));
    
    console.log(chalk.blue('Проект готов к работе!'));
};