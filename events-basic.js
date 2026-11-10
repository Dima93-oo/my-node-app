const EventEmitter = require('events');

const emitter = new EventEmitter();
let silent = false;

emitter.on('greet', (name) => {
    if (!silent) {
        console.log(`[greet] Привет, ${name}!`);
    }
});

emitter.on('info', (group) => {
    if (!silent) {
        console.log(`[info] Группа: ${group}`);
    }
});

emitter.on('bye', () => {
    if (!silent) {
        console.log('[bye] До свидания!');
    }
});

console.log('=== Демонстрация EventEmitter ===');

emitter.emit('greet', 'Иван');
emitter.emit('info', '477');
emitter.emit('bye');

silent = true;

console.log(`Событие "unknown" без слушателей: ${emitter.emit('unknown')}`);
console.log(`Событие "greet" со слушателями: ${emitter.emit('greet', 'Иван')}`);