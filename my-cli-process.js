const { Command } = require('commander');
const chalk = require('chalk');
const ora = require('ora');
const cliProgress = require('cli-progress');
const fs = require('fs');

const program = new Command();

program
    .name('my-cli')
    .description('CLI-приложение для лабораторной работы №17')
    .version('1.0.0');

program
    .command('process')
    .description('обработка файлов')
    .option('--files <files...>', 'список файлов для обработки')
    .option('--output <path>', 'путь для сохранения результата', 'output.json')
    .action(async (options) => {
        if (!options.files || options.files.length === 0) {
            process.stderr.write(chalk.red('Ошибка: укажите хотя бы один файл через --files\n'));
            process.exit(1);
        }

        const isTTY = process.stdout.isTTY;
        const results = [];
        let errors = 0;

        
        const spinner = ora({ text: 'Поиск файлов...', stream: process.stderr }).start();
        await new Promise(resolve => setTimeout(resolve, 800));
        spinner.succeed(chalk.green(`Файлы найдены (${options.files.length} шт.)`));

        
        const progressBar = new cliProgress.SingleBar({
            format: chalk.cyan('[{bar}] {percentage}% | {value}/{total} | ETA: {eta}s'),
            barCompleteChar: '█',
            barIncompleteChar: '░',
            hideCursor: true,
            stream: process.stderr
        });
        progressBar.start(options.files.length, 0);

        for (let i = 0; i < options.files.length; i++) {
            const file = options.files[i];
            await new Promise(resolve => setTimeout(resolve, 500));

            if (fs.existsSync(file)) {
                results.push({ file, status: 'ok', size: fs.statSync(file).size });
                if (isTTY) {
                    process.stderr.write(chalk.green(`   Файл ${file} обработан\n`));
                }
            } else {
                errors++;
                if (isTTY) {
                    process.stderr.write(chalk.red(`   Файл ${file} не найден\n`));
                }
            }
            progressBar.update(i + 1);
        }
        progressBar.stop();

        
        if (errors > 0) {
            process.stderr.write(chalk.yellow(` Пропущено ${errors} файл(ов)\n`));
        }

        if (results.length > 0) {
            const output = JSON.stringify(results, null, 2);
            fs.writeFileSync(options.output, output);
            process.stderr.write(chalk.green(' Обработка завершена\n'));
            process.stderr.write(chalk.blue(`Результат сохранён: ${options.output}\n`));
            
            
            process.stdout.write(output + '\n');
        } else {
            process.stderr.write(chalk.red(' Ни один файл не обработан\n'));
            process.exit(1);
        }

        
        if (errors > 0) {
            process.exit(1);
        }
    });

program.parse();