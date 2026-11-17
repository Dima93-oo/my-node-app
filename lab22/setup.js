const mysql = require('mysql2/promise');

async function setup() {
  const connection = await mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: ''
  });

  await connection.query('CREATE DATABASE IF NOT EXISTS bbmo_01_23;');
  await connection.query("CREATE USER IF NOT EXISTS 'student'@'localhost' IDENTIFIED BY '123';");
  await connection.query("GRANT ALL PRIVILEGES ON bbmo_01_23.* TO 'student'@'localhost';");
  await connection.query('FLUSH PRIVILEGES;');

  console.log('Готово');
  await connection.end();
}

setup().catch(console.error);