setTimeout(() => console.log("1. setTimeout"), 0);
setImmediate(() => console.log("2. setImmediate"));
process.nextTick(() => console.log("3. process.nextTick"));
Promise.resolve().then(() => console.log("4. Promise.then"));
console.log("5. Синхронный код");

/*
ОБЪЯСНЕНИЕ ПОРЯДКА:
1. "5. Синхронный код" — выполняется первым, так как сразу попадает в Call Stack.
2. "3. process.nextTick" — имеет наивысший приоритет, выполняется сразу после синхронного кода, до перехода к другим фазам.
3. "4. Promise.then" — микрозадача, выполняется сразу после nextTick.
4. "1. setTimeout" и "2. setImmediate" — в корневом модуле setTimeout(0) обычно срабатывает раньше, так как цикл событий начинает проверку с фазы timers, а setImmediate ждет фазы check.
*/