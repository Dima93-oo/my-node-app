const FileManagerHybrid = require('./fileOperationsHybrid');
const fileManager = new FileManagerHybrid('./test-data-hybrid');

async function testHybrid() {
    console.log('=== ТЕСТИРОВАНИЕ ГИБРИДНОГО ПОДХОДА ===\n');

    console.log('1. Создание файла через колбэк...');
    fileManager.createFile('hybrid1.txt', 'Колбэк стиль', (err, filePath) => {
        if (err) {
            console.error('  Ошибка:', err.message);
            return;
        }
        console.log(`  Файл создан: ${filePath}`);

        console.log('\n2. Чтение файла через промис...');
        fileManager.readFile('hybrid1.txt')
            .then(content => {
                console.log(`  Содержимое: "${content}"`);

                console.log('\n3. Чтение несуществующего файла через колбэк...');
                fileManager.readFile('nonexistent.txt', (err, data) => {
                    if (err) {
                        console.log(`  Перехвачена ошибка колбэка: ${err.code}`);
                    }

                    console.log('\n4. Чтение несуществующего файла через промис...');
                    fileManager.readFile('nonexistent.txt')
                        .then(() => {
                            console.log('  Неожиданно: файл прочитан');
                        })
                        .catch(err => {
                            console.log(`  Перехвачена ошибка промиса: ${err.code}`);
                        })
                        .then(() => {
                            console.log('\n5. Удаление файла через промис...');
                            return fileManager.deleteFile('hybrid1.txt');
                        })
                        .then(() => {
                            console.log('  Файл hybrid1.txt удалён');
                            console.log('\n Все операции завершены!');
                        })
                        .catch(err => {
                            console.error('  Ошибка промиса:', err.message);
                        });
                });
            })
            .catch(err => {
                console.error('  Ошибка промиса:', err.message);
            });
    });
}

testHybrid();