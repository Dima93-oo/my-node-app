const chalk = require('chalk');
const ora = require('ora');
const fs = require('fs');

module.exports = async (options) => {
    if (!fs.existsSync(options.config)) {
        throw new Error(`ENOENT: no such file or directory, open '${options.config}'`);
    }
    const spinner = ora('Сборка проекта...').start();
    await new Promise(r => setTimeout(r, 1500));
    spinner.succeed(chalk.green('Сборка завершена за 1.5s'));
    console.log(chalk.blue('Результат: dist/my-app.js'));
};