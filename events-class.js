const EventEmitter = require('events');

const GROUP = '477';

class DatabaseConnection extends EventEmitter {
    connect() {
        this.emit('connect');
    }

    query(sql) {
        let result = 'ok';

        if (sql.startsWith('SELECT')) {
            result = '50 записей';
        } else if (sql.startsWith('INSERT')) {
            result = '1 запись добавлена';
        }

        this.emit('query', sql, result);
    }

    close() {
        this.emit('close');
    }

    error(message) {
        this.emit('error', new Error(message));
    }
}

console.log(`=== DatabaseConnection (группа ${GROUP}) ===`);

const db = new DatabaseConnection();

db.on('connect', () => {
    console.log('[EVENT] Соединение установлено');
});

db.on('query', (sql, result) => {
    console.log(`[EVENT] Выполнение запроса: ${sql}`);
    console.log(`[EVENT] Результат: ${result}`);
});

db.on('close', () => {
    console.log('[EVENT] Соединение закрыто');
});

db.on('error', (err) => {
    console.log(`[EVENT] Ошибка: ${err.message}`);
});

console.log('[EVENT] Подключение к БД...');
db.connect();

db.query('SELECT * FROM students');
db.query('INSERT INTO students');

console.log('[EVENT] Закрытие соединения');
db.close();

console.log('');
console.log('=== Демонстрация ошибки ===');
db.error('Connection timeout');
console.log('(без слушателя error — процесс упал бы с исключением)');