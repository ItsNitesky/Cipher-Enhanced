const mysql = require('mysql2/promise');
const logger = require('../utils/logger');

const pool = mysql.createPool({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});


pool.getConnection()
    .then(connection => {
        logger.info('Successfully connected to MySQL database');
        connection.release();
    })
    .catch(err => {
        logger.error('Failed to connect to MySQL database:', err);
        process.exit(1);
    });

module.exports = pool; 