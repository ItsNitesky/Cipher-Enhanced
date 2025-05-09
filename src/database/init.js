const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const logger = require('../utils/logger');

async function initializeDatabase() {
    let connection;

    try {

        connection = await mysql.createConnection({
            host: process.env.MYSQL_HOST,
            user: process.env.MYSQL_USER,
            password: process.env.MYSQL_PASSWORD
        });


        const schemaPath = path.join(__dirname, 'schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');


        const statements = schema
            .split(';')
            .filter(statement => statement.trim())
            .map(statement => statement + ';');


        for (const statement of statements) {
            await connection.query(statement);
        }

        logger.info('Database schema initialized successfully');
    } catch (error) {
        logger.error('Error initializing database:', error);
        throw error;
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

// Only run if this file is executed directly
if (require.main === module) {
    require('dotenv').config();
    initializeDatabase()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
}

module.exports = initializeDatabase; 