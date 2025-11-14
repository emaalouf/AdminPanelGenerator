const sql = require('mssql');

let pool = null;
let currentDatabase = null;

/**
 * Creates an MSSQL connection pool
 * @param {Object} credentials - Database credentials
 * @returns {Promise<Object>} Connection pool
 */
async function createConnection(credentials) {
  try {
    // Close existing pool if any
    if (pool) {
      await pool.close();
    }

    const config = {
      server: credentials.host,
      user: credentials.user,
      password: credentials.password,
      database: credentials.database,
      options: {
        encrypt: true, // Use encryption
        trustServerCertificate: true, // Trust self-signed certificates
        enableArithAbort: true
      },
      pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
      }
    };

    // Create new connection pool
    pool = await sql.connect(config);
    currentDatabase = credentials.database;

    return pool;
  } catch (error) {
    throw new Error(`MSSQL connection failed: ${error.message}`);
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
    const result = await pool.request().query(`
      SELECT TABLE_NAME
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_TYPE = 'BASE TABLE'
      AND TABLE_CATALOG = '${currentDatabase}'
      ORDER BY TABLE_NAME
    `);

    return result.recordset.map(row => row.TABLE_NAME);
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
    const result = await pool.request().query(`
      SELECT
        c.COLUMN_NAME as name,
        c.DATA_TYPE as type,
        c.IS_NULLABLE as nullable,
        c.COLUMN_DEFAULT as defaultValue,
        c.CHARACTER_MAXIMUM_LENGTH as maxLength,
        c.NUMERIC_PRECISION as numericPrecision,
        c.NUMERIC_SCALE as numericScale,
        CASE
          WHEN pk.COLUMN_NAME IS NOT NULL THEN 'PRI'
          WHEN uq.COLUMN_NAME IS NOT NULL THEN 'UNI'
          ELSE ''
        END as keyType,
        CASE
          WHEN ic.is_identity = 1 THEN 'auto_increment'
          ELSE ''
        END as extra
      FROM INFORMATION_SCHEMA.COLUMNS c
      LEFT JOIN (
        SELECT ku.TABLE_CATALOG, ku.TABLE_SCHEMA, ku.TABLE_NAME, ku.COLUMN_NAME
        FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS AS tc
        INNER JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE AS ku
          ON tc.CONSTRAINT_TYPE = 'PRIMARY KEY'
          AND tc.CONSTRAINT_NAME = ku.CONSTRAINT_NAME
      ) pk
        ON c.TABLE_CATALOG = pk.TABLE_CATALOG
        AND c.TABLE_SCHEMA = pk.TABLE_SCHEMA
        AND c.TABLE_NAME = pk.TABLE_NAME
        AND c.COLUMN_NAME = pk.COLUMN_NAME
      LEFT JOIN (
        SELECT ku.TABLE_CATALOG, ku.TABLE_SCHEMA, ku.TABLE_NAME, ku.COLUMN_NAME
        FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS AS tc
        INNER JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE AS ku
          ON tc.CONSTRAINT_TYPE = 'UNIQUE'
          AND tc.CONSTRAINT_NAME = ku.CONSTRAINT_NAME
      ) uq
        ON c.TABLE_CATALOG = uq.TABLE_CATALOG
        AND c.TABLE_SCHEMA = uq.TABLE_SCHEMA
        AND c.TABLE_NAME = uq.TABLE_NAME
        AND c.COLUMN_NAME = uq.COLUMN_NAME
      LEFT JOIN sys.columns ic
        ON ic.object_id = OBJECT_ID(c.TABLE_SCHEMA + '.' + c.TABLE_NAME)
        AND ic.name = c.COLUMN_NAME
      WHERE c.TABLE_NAME = '${tableName}'
      ORDER BY c.ORDINAL_POSITION
    `);

    // Get check constraints for enum-like fields
    const checkConstraints = await pool.request().query(`
      SELECT
        cc.COLUMN_NAME,
        cc.CHECK_CLAUSE
      FROM INFORMATION_SCHEMA.CHECK_CONSTRAINTS cc
      INNER JOIN INFORMATION_SCHEMA.CONSTRAINT_COLUMN_USAGE ccu
        ON cc.CONSTRAINT_NAME = ccu.CONSTRAINT_NAME
      WHERE ccu.TABLE_NAME = '${tableName}'
    `);

    const constraintMap = {};
    checkConstraints.recordset.forEach(constraint => {
      constraintMap[constraint.COLUMN_NAME] = constraint.CHECK_CLAUSE;
    });

    // Parse schema information
    const schemaInfo = result.recordset.map(col => {
      const schema = {
        name: col.name,
        type: col.type,
        nullable: col.nullable === 'YES',
        default: col.defaultValue,
        primary: col.keyType === 'PRI',
        unique: col.keyType === 'UNI',
        autoIncrement: col.extra.includes('auto_increment')
      };

      // Add length/precision info
      if (col.maxLength) {
        schema.maxLength = col.maxLength;
      }
      if (col.numericPrecision) {
        schema.precision = col.numericPrecision;
        schema.scale = col.numericScale;
      }

      // Try to extract enum-like values from check constraints
      if (constraintMap[col.name]) {
        const checkClause = constraintMap[col.name];
        // Try to parse values like: ([status]='active' OR [status]='inactive')
        const matches = checkClause.match(/'([^']+)'/g);
        if (matches) {
          schema.enumValues = matches.map(m => m.replace(/'/g, ''));
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
    await pool.close();
    pool = null;
    currentDatabase = null;
  }
}

module.exports = {
  createConnection,
  getTables,
  getSchema,
  closeConnection
};
