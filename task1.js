const fs = require('fs').promises;
const path = require('path');

async function task1() {
    const variant = 25;
    const filename = `student_${variant}.txt`;
    const filePath = path.join(__dirname, filename);

    const studentName = "Фурс Дмитрий Геннадьевич";
    const group = "477";
    const date = new Date().toLocaleString('ru-RU');
    
    const favorites = [
        '1. "Война и мир" - Л. Толстой',
        '2. "Преступление и наказание" - Ф. Достоевский',
        '3. "Мастер и Маргарита" - М. Булгаков',
        '4. "1984" - Дж. Оруэлл',
        '5. "Гарри Поттер" - Дж. Роулинг'
    ];

    const lines = [
        `Студент: ${studentName}`,
        `Группа: ${group}`,
        `Вариант: ${variant}`,
        `Дата: ${date}`,
        'Любимые книги:',
        ...favorites
    ];

    const content = lines.join('\n');
    const finalContent = content + `\nКоличество записей: ${lines.length}`;

    try {
        await fs.writeFile(filePath, finalContent, 'utf8');
        console.log(`Создан файл: ${filename}`);
        
        const readContent = await fs.readFile(filePath, 'utf8');
        console.log('\nСодержимое файла:');
        console.log(readContent);
    } catch (error) {
        console.error('Ошибка в Задании 1:', error.message);
    }
}

task1();