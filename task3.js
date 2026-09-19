const fs = require('fs').promises;
const path = require('path');

const variant = 25;
const MAX_FILE_SIZE = 10 * 1024 * 1024; 
async function scanDirectory(dirPath) {
    let files = [];
    let folders = 0;

    async function recursiveScan(currentPath) {
        try {
            const items = await fs.readdir(currentPath, { withFileTypes: true });
            for (const item of items) {
                const fullPath = path.join(currentPath, item.name);
                if (item.isDirectory()) {
                    folders++;
                    await recursiveScan(fullPath);
                } else if (item.isFile()) {
                    const stats = await fs.stat(fullPath);
                    if (stats.size <= MAX_FILE_SIZE) {
                        files.push({
                            name: item.name,
                            path: fullPath,
                            size: stats.size,
                            ext: path.extname(item.name).toLowerCase() || 'без расширения'
                        });
                    }
                }
            }
        } catch (error) {
            console.error(`Ошибка чтения директории ${currentPath}:`, error.message);
        }
    }

    await recursiveScan(dirPath);
    return { files, folders };
}

function formatSize(bytes) {
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} МБ`;
    if (bytes >= 1024) return `${(bytes / 1024).toFixed(2)} КБ`;
    return `${bytes} байт`;
}

async function task3() {
    const targetDir = process.argv[2] || '.';
    const absolutePath = path.resolve(targetDir);

    console.log(`Анализ директории: ${absolutePath}\n`);

    const { files, folders } = await scanDirectory(absolutePath);

    const totalSize = files.reduce((sum, f) => sum + f.size, 0);

    console.log(`Общее количество папок: ${folders}`);
    console.log(`Общее количество файлов: ${files.length}`);
    console.log(`Общий размер: ${formatSize(totalSize)} (${totalSize.toLocaleString()} байт)\n`);


    const extGroups = {};
    files.forEach(f => {
        if (!extGroups[f.ext]) extGroups[f.ext] = { count: 0, size: 0 };
        extGroups[f.ext].count++;
        extGroups[f.ext].size += f.size;
    });

    console.log('Расширения файлов:');
    Object.entries(extGroups)
        .sort((a, b) => b[1].size - a[1].size)
        .forEach(([ext, data]) => {
            console.log(`  ${ext}: ${data.count} файлов (${formatSize(data.size)})`);
        });


    const sortedBySize = [...files].sort((a, b) => b.size - a.size);
    console.log('\nТоп-5 самых больших файлов:');
    sortedBySize.slice(0, 5).forEach((f, i) => {
        console.log(`  ${i + 1}. ${f.name} (${formatSize(f.size)}) - ${f.path}`);
    });


    const sortedBySizeAsc = [...files].sort((a, b) => a.size - b.size);
    console.log('\nТоп-5 самых маленьких файлов:');
    sortedBySizeAsc.slice(0, 5).forEach((f, i) => {
        console.log(`  ${i + 1}. ${f.name} (${formatSize(f.size)}) - ${f.path}`);
    });

    const report = {
        directory: absolutePath,
        scanDate: new Date().toISOString(),
        totalFolders: folders,
        totalFiles: files.length,
        totalSizeBytes: totalSize,
        totalSizeFormatted: formatSize(totalSize),
        extensions: extGroups,
        topLargest: sortedBySize.slice(0, 5),
        topSmallest: sortedBySizeAsc.slice(0, 5),
        ignoredFilesLargerThan: formatSize(MAX_FILE_SIZE)
    };

    const reportPath = path.join(__dirname, `report_${variant}.json`);
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2), 'utf8');
    console.log(`\nОтчет сохранен: ${reportPath}`);
}

task3().catch(err => console.error('Ошибка в Задании 3:', err.message));