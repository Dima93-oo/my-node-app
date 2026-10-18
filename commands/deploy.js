const chalk = require('chalk');
const ora = require('ora');
const inquirer = require('inquirer');

module.exports = async (options) => {
    if (options.env === 'production' && !options.force) {
        console.log(chalk.yellow(` Вы собираетесь развернуть проект в ${options.env}!`));
        const { confirm } = await inquirer.prompt([{
            type: 'confirm', name: 'confirm', message: 'Продолжить?', default: false
        }]);
        if (!confirm) {
            console.log(chalk.yellow('Развёртывание отменено'));
            return;
        }
    }
    const spinner = ora('Развёртывание...').start();
    await new Promise(r => setTimeout(r, 1500));
    spinner.succeed(chalk.green('Развёрнуто успешно'));
    console.log(chalk.blue('URL: https://my-app.example.com'));
};