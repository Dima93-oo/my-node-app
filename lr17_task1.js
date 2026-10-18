const args = process.argv.slice(2);
const command = args[0];
const name = args[1];

const today = new Date().toISOString().split('T')[0];

if (args.length === 0) {
    console.log('Использование: my-cli <команда> [аргументы]');
    console.log('Доступные команды:');
    console.log('greet <имя> - поприветствовать пользователя');
    console.log('info - вывести информацию о группе');
    process.exit(0);
}

if (command === 'greet') {
    if (!name) {
        console.error('Ошибка: укажите имя после команды greet');
        process.exit(1);
    }
    console.log(`Привет, ${name}! Добро пожаловать в CLI-приложение группы ББМО-01-23.`);
    process.exit(0);
}

if (command === 'info') {
    console.log('Группа: ББМО-01-23');
    console.log('Студент: Дмитрий');
    console.log('Лабораторная работа: №17');
    console.log(`Дата: ${today}`);
    process.exit(0);
}

console.error(`Ошибка: неизвестная команда "${command}"`);
console.error('Для справки используйте: my-cli --help');
process.exit(1);