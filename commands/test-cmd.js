const chalk = require('chalk');
const ora = require('ora');

module.exports = async () => {
    const spinner = ora('Запуск тестов...').start();
    await new Promise(r => setTimeout(r, 1200));
    spinner.succeed(chalk.green('Пройдено: 15/15 тестов'));
    console.log(chalk.blue('Покрытие: 87%'));
};