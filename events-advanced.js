const EventEmitter = require('events');

const GROUP = '477';

class PluginManager extends EventEmitter {
    constructor() {
        super();
        this.plugins = new Map();

        this.on('removeListener', (event) => {
            console.log(`[removeListener] Удалён слушатель "${event}"`);
        });

        this.on('newListener', (event) => {
            console.log(`[newListener] Добавлен слушатель "${event}"`);
        });

        this.on('plugin:registered', (name) => {
            console.log(`[PLUGIN] Зарегистрирован: ${name}`);
        });

        this.on('plugin:removed', (name) => {
            console.log(`[PLUGIN] Удалён: ${name}`);
        });
    }

    register(plugin) {
        this.plugins.set(plugin.name, plugin);
        this.emit('plugin:registered', plugin.name);
        plugin.setup(this);
    }

    unregister(plugin) {
        plugin.teardown(this);
        this.plugins.delete(plugin.name);
        this.emit('plugin:removed', plugin.name);
    }
}

const LoggerPlugin = {
    name: 'LoggerPlugin',
    setup(emitter) {
        this._handler = () => {};
        emitter.on('log', this._handler);
    },
    teardown(emitter) {
        emitter.removeListener('log', this._handler);
    }
};

const AlertPlugin = {
    name: 'AlertPlugin',
    setup(emitter) {
        this._handler = () => {};
        emitter.on('alert', this._handler);
    },
    teardown(emitter) {
        emitter.removeListener('alert', this._handler);
    }
};

console.log('=== Система плагинов ===');
const pm = new PluginManager();
pm.register(LoggerPlugin);
pm.register(AlertPlugin);
pm.unregister(LoggerPlugin);

console.log('');
console.log('=== Демонстрация утечки ===');
const leak = new EventEmitter();
leak.setMaxListeners(0);
for (let i = 0; i < 10; i++) leak.on('data', () => {});
console.log(`Слушателей до: ${leak.listenerCount('data')}`);
for (let i = 0; i < 1000; i++) leak.on('data', () => {});
console.log(`Слушателей после добавления 1000: ${leak.listenerCount('data')}`);
leak.removeAllListeners('data');
console.log(`Слушателей после removeAllListeners: ${leak.listenerCount('data')}`);

console.log('');
console.log('=== Асинхронные слушатели ===');
const asyncEm = new EventEmitter();
asyncEm.on('work', async () => {
    await new Promise(resolve => setTimeout(resolve, 100));
    console.log(`[${GROUP}] async-слушатель завершён через 100ms`);
});
setImmediate(() => {
    console.log(`[${GROUP}] emit вызван (не ждёт async-слушатель)`);
    asyncEm.emit('work');
});