const EventEmitter = require('events');

const emitter = new EventEmitter();
let onCalls = 0;
let onceCalls = 0;

function onTick(n) {
    onCalls++;
    console.log(`[tick #${n}] on-слушатель`);
}

function onceTick(n) {
    onceCalls++;
    console.log(`[tick #${n}] once-слушатель`);
}

console.log('=== Сравнение on и once ===');
emitter.on('tick', onTick);
emitter.once('tick', onceTick);

emitter.emit('tick', 1);
emitter.emit('tick', 2);
emitter.emit('tick', 3);

console.log(`on-слушатель вызван: ${onCalls} раза`);
console.log(`once-слушатель вызван: ${onceCalls} раз`);

console.log('=== Управление подписками ===');
const demo = new EventEmitter();
const l1 = function l1() {};
const l2 = function l2() {};
const l3 = function l3() {};

demo.on('event', l1);
demo.on('event', l2);
demo.on('event', l3);

console.log(`Слушателей до удаления: ${demo.listenerCount('event')}`);
console.log(`Массив слушателей: ${demo.listeners('event').map(f => f.name).join(', ')}`);
demo.removeListener('event', l2);
console.log(`Слушателей после удаления одного: ${demo.listenerCount('event')}`);
demo.removeAllListeners('event');
console.log(`Слушателей после removeAllListeners: ${demo.listenerCount('event')}`);

console.log('=== Порядок вызова ===');
const order = new EventEmitter();
order.on('seq', () => console.log('1. Первый слушатель (группа 477)'));
order.on('seq', () => console.log('2. Второй слушатель'));
order.on('seq', () => console.log('3. Третий слушатель'));
order.emit('seq');