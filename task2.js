const fs = require('fs').promises;
const path = require('path');

const baseDir = path.join(__dirname, 'project_25');

async function createDirWithInfo(dirPath, description) {
    await fs.mkdir(dirPath, { recursive: true });
    const infoPath = path.join(dirPath, 'info.txt');
    await fs.writeFile(infoPath, description, 'utf8');
}

async function printTree(dir, prefix = '') {
    try {
        const items = await fs.readdir(dir, { withFileTypes: true });
        items.sort((a, b) => {
            if (a.isDirectory() && !b.isDirectory()) return -1;
            if (!a.isDirectory() && b.isDirectory()) return 1;
            return a.name.localeCompare(b.name);
        });

        for (const item of items) {
            const isLast = items.indexOf(item) === items.length - 1;
            const connector = isLast ? '└── ' : '├── ';
            console.log(`${prefix}${connector}${item.name}`);
            
            if (item.isDirectory()) {
                const newPrefix = prefix + (isLast ? '    ' : '│   ');
                await printTree(path.join(dir, item.name), newPrefix);
            }
        }
    } catch (error) {
        console.error('Ошибка чтения директории:', error.message);
    }
}

async function task2() {
    try {
        const dirs = [
            { path: path.join(baseDir, 'src', 'modules'), desc: 'Исходные модули' },
            { path: path.join(baseDir, 'src', 'components', '1'), desc: 'Компонент 1 (Вариант 25 - нечетный)' },
            { path: path.join(baseDir, 'src', 'components', '2'), desc: 'Компонент 2 (Вариант 25 - нечетный)' },
            { path: path.join(baseDir, 'src', 'components', '3'), desc: 'Компонент 3 (Вариант 25 - нечетный)' },
            { path: path.join(baseDir, 'src', 'utils'), desc: 'Утилиты' },
            { path: path.join(baseDir, 'data', 'input'), desc: 'Входные данные' },
            { path: path.join(baseDir, 'data', 'output'), desc: 'Выходные данные' },
            { path: path.join(baseDir, 'temp'), desc: 'Временные файлы' }
        ];

        console.log('Создание начальной структуры...');
        for (const dir of dirs) {
            await createDirWithInfo(dir.path, dir.desc);
        }

        console.log('\n--- Начальная структура каталогов ---');
        await printTree(baseDir);

        const oldTemp = path.join(baseDir, 'temp');
        const newTemp = path.join(baseDir, 'data', 'temp');
        await fs.rename(oldTemp, newTemp);

        const oldOutput = path.join(baseDir, 'data', 'output');
        const newResults = path.join(baseDir, 'data', 'results');
        await fs.rename(oldOutput, newResults);

        await fs.rm(newTemp, { recursive: true, force: true });

        console.log('\n--- Обновленная структура каталогов ---');
        await printTree(baseDir);

    } catch (error) {
        console.error('Ошибка в Задании 2:', error.message);
    }
}

task2();