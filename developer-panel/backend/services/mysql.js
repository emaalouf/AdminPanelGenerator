const mysql = require('mysql2/promise');

let pool = null;

/**
 * Creates a MySQL connection pool
 * @param {Object} credentials - Database credentials
 * @returns {Promise<Object>} Connection pool
 */
async function createConnection(credentials) {
  try {
    // Close existing pool if any
    if (pool) {
      await pool.end();
    }

    // Create new connection pool
    pool = mysql.createPool({
      host: credentials.host,
      user: credentials.user,
      password: credentials.password,
      database: credentials.database,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });

    // Test the connection
    const connection = await pool.getConnection();
    connection.release();

    return pool;
  } catch (error) {
    throw new Error(`MySQL connection failed: ${error.message}`);
  }
}

/**
 * Gets list of all tables in the database
 * @returns {Promise<Array>} List of table names
 */
async function getTables() {
  if (!pool) {
    throw new Error('No active database connection. Please connect first.');
  }

  try {
    const [rows] = await pool.query('SHOW TABLES');
    const tableKey = Object.keys(rows[0])[0];
    return rows.map(row => row[tableKey]);
  } catch (error) {
    throw new Error(`Failed to fetch tables: ${error.message}`);
  }
}

/**
 * Gets schema information for a specific table
 * @param {string} tableName - Name of the table
 * @returns {Promise<Array>} Column metadata
 */
async function getSchema(tableName) {
  if (!pool) {
    throw new Error('No active database connection. Please connect first.');
  }

  try {
    // Get column information
    const [columns] = await pool.query(
      `SELECT
        COLUMN_NAME as name,
        DATA_TYPE as type,
        IS_NULLABLE as nullable,
        COLUMN_DEFAULT as defaultValue,
        COLUMN_KEY as key,
        COLUMN_TYPE as fullType,
        EXTRA as extra
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
      ORDER BY ORDINAL_POSITION`,
      [tableName]
    );

    // Parse enum values if present
    const schemaInfo = columns.map(col => {
      const schema = {
        name: col.name,
        type: col.type,
        nullable: col.nullable === 'YES',
        default: col.defaultValue,
        primary: col.key === 'PRI',
        unique: col.key === 'UNI',
        autoIncrement: col.extra.includes('auto_increment')
      };

      // Extract enum values if column type is enum or set
      if (col.fullType.startsWith('enum') || col.fullType.startsWith('set')) {
        const match = col.fullType.match(/\((.*)\)/);
        if (match) {
          schema.enumValues = match[1]
            .split(',')
            .map(val => val.trim().replace(/'/g, ''));
        }
      }

      return schema;
    });

    return schemaInfo;
  } catch (error) {
    throw new Error(`Failed to fetch schema for table ${tableName}: ${error.message}`);
  }
}

/**
 * Closes the connection pool
 */
async function closeConnection() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

module.exports = {
  createConnection,
  getTables,
  getSchema,
  closeConnection
};
