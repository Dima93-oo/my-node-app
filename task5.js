const fs = require('fs');
const fsp = require('fs').promises;
const path = require('path');

const variant = 25;
const sourceDir = path.join(__dirname, `source_${variant}`);
const backupDir = path.join(__dirname, `backup_${variant}`);
const CHUNK_SIZE = 512 * 1024;

async function createTestStructure() {
    await fsp.rm(sourceDir, { recursive: true, force: true });
    await fsp.mkdir(sourceDir, { recursive: true });
    
    const subDirs = ['sub1', 'sub2', 'sub3'];
    for (const sub of subDirs) {
        await fsp.mkdir(path.join(sourceDir, sub));
    }

    const extensions = ['.txt', '.js', '.json', '.jpg', '.png', '.gif'];
    let fileCount = 0;

    for (let i = 1; i <= 20; i++) {
        const ext = extensions[i % extensions.length];
        const isLarge = i === 5 || i === 15;
        const size = isLarge ? 1024 * 1024 + 100 : Math.floor(Math.random() * 5000) + 100;
        const content = isLarge ? 'x'.repeat(size) : `Содержимое файла ${i}\n`.repeat(Math.ceil(size / 20));
        const dir = i <= 15 ? sourceDir : path.join(sourceDir, subDirs[i % 3]);
        const filePath = path.join(dir, `file_${i}${ext}`);
        await fsp.writeFile(filePath, content);
        fileCount++;
    }

    const manifest = {
        variant: variant,
        created: new Date().toISOString(),
        totalFiles: fileCount,
        directories: ['root', ...subDirs]
    };
    await fsp.writeFile(path.join(sourceDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
    console.log(`Структура source_${variant} создана.`);
}

async function copyFile(src, dest, ext) {
    await fsp.mkdir(path.dirname(dest), { recursive: true });
    const streamExtensions = ['.txt', '.js', '.json'];
    const imageExtensions = ['.jpg', '.png', '.gif'];

    if (streamExtensions.includes(ext)) {
        const readStream = fs.createReadStream(src, { highWaterMark: CHUNK_SIZE });
        const writeStream = fs.createWriteStream(dest);
        readStream.pipe(writeStream);
        await new Promise((resolve, reject) => {
            writeStream.on('finish', resolve);
            writeStream.on('error', reject);
        });
    } else if (imageExtensions.includes(ext)) {
        await fsp.copyFile(src, dest);
    } else {
        await fsp.copyFile(src, dest);
    }
}

async function copyDirectory(src, dest) {
    await fsp.rm(backupDir, { recursive: true, force: true });
    await fsp.mkdir(backupDir, { recursive: true });

    const items = await fsp.readdir(src, { withFileTypes: true });
    let copied = 0;
    const total = items.length;

    for (const item of items) {
        const srcPath = path.join(src, item.name);
        const destPath = path.join(dest, item.name);

        if (item.isDirectory()) {
            await copyDirectory(srcPath, destPath);
        } else {
            const ext = path.extname(item.name).toLowerCase();
            await copyFile(srcPath, destPath, ext);
            copied++;
            console.log(`Скопировано: ${item.name} (${copied}/${total})`);
        }
    }
}

async function getFilesList(dir, prefix = '') {
    const files = [];
    const items = await fsp.readdir(dir, { withFileTypes: true });
    for (const item of items) {
        const fullPath = path.join(dir, item.name);
        const relativePath = prefix ? path.join(prefix, item.name) : item.name;
        if (item.isDirectory()) {
            const subFiles = await getFilesList(fullPath, relativePath);
            files.push(...subFiles);
        } else {
            files.push(relativePath);
        }
    }
    return files;
}

async function syncDirectories() {
    const sourceFiles = await getFilesList(sourceDir);
    const backupFiles = await getFilesList(backupDir);

    let identical = 0;
    let modified = 0;
    let added = 0;
    let removed = 0;

    for (const file of sourceFiles) {
        const backupPath = path.join(backupDir, file);
        if (backupFiles.includes(file)) {
            const srcStat = await fsp.stat(path.join(sourceDir, file));
            const bakStat = await fsp.stat(backupPath);
            if (srcStat.size === bakStat.size && srcStat.mtimeMs === bakStat.mtimeMs) {
                identical++;
            } else {
                modified++;
            }
        } else {
            removed++;
        }
    }

    for (const file of backupFiles) {
        if (!sourceFiles.includes(file)) {
            added++;
        }
    }

    const report = [
        `Отчет синхронизации для варианта ${variant}`,
        `Дата: ${new Date().toLocaleString('ru-RU')}`,
        `Совпадают: ${identical} файлов`,
        `Изменены: ${modified} файлов`,
        `Добавлены: ${added} файлов`,
        `Удалены: ${removed} файлов`
    ];

    const reportPath = path.join(__dirname, `sync_report_${variant}.txt`);
    await fsp.writeFile(reportPath, report.join('\n'), 'utf8');
    console.log(`\nОтчет сохранен: ${reportPath}`);
}

async function task5() {
    try {
        console.log('Создание тестовой структуры...');
        await createTestStructure();

        console.log('\nКопирование файлов...');
        await copyDirectory(sourceDir, backupDir);
        console.log('Копирование завершено!');

        console.log('\nСинхронизация директорий...');
        await syncDirectories();
    } catch (error) {
        console.error('Ошибка в Задании 5:', error.message);
    }
}

task5();