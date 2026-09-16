const fs = require('fs');
const path = require('path');
const util = require('util');

class FileManagerHybrid {
    constructor(baseDir = './data-hybrid') {
        this.baseDir = baseDir;
        if (!fs.existsSync(baseDir)) {
            fs.mkdirSync(baseDir, { recursive: true });
        }
    }

    createFile(filename, content, callback) {
        const filePath = path.join(this.baseDir, filename);
        if (callback) {
            fs.writeFile(filePath, content, 'utf8', (err) => {
                callback(err, err ? null : filePath);
            });
        } else {
            return util.promisify(fs.writeFile)(filePath, content, 'utf8')
                .then(() => filePath);
        }
    }

    readFile(filename, callback) {
        const filePath = path.join(this.baseDir, filename);
        if (callback) {
            fs.readFile(filePath, 'utf8', (err, data) => {
                callback(err, err ? null : data);
            });
        } else {
            return util.promisify(fs.readFile)(filePath, 'utf8');
        }
    }

    deleteFile(filename, callback) {
        const filePath = path.join(this.baseDir, filename);
        if (callback) {
            fs.unlink(filePath, (err) => {
                callback(err);
            });
        } else {
            return util.promisify(fs.unlink)(filePath);
        }
    }
}

module.exports = FileManagerHybrid;