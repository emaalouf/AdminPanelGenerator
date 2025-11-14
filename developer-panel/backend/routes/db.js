const express = require('express');
const router = express.Router();
const mysql = require('mysql2/promise');
const sql = require('mssql');

// Store active connections (in production, use session management)
const connections = new Map();

/**
 * Test database connection
 * POST /api/db/connect
 * Body: { type: 'mysql'|'mssql', host, port, user, password, database }
 */
router.post('/connect', async (req, res) => {
  const { type, host, port, user, password, database } = req.body;

  try {
    let connection;
    let connectionId = `${type}_${host}_${database}_${Date.now()}`;

    if (type === 'mysql') {
      connection = await mysql.createConnection({
        host,
        port: port || 3306,
        user,
        password,
        database
      });

      // Test connection
      await connection.ping();

      connections.set(connectionId, { type, connection, config: { host, port, user, password, database } });

      res.json({
        success: true,
        connectionId,
        message: 'MySQL connection successful'
      });

    } else if (type === 'mssql') {
      const config = {
        server: host,
        port: port || 1433,
        user,
        password,
        database,
        options: {
          encrypt: true,
          trustServerCertificate: true
        }
      };

      connection = await sql.connect(config);

      connections.set(connectionId, { type, connection, config });

      res.json({
        success: true,
        connectionId,
        message: 'MSSQL connection successful'
      });

    } else {
      res.status(400).json({
        success: false,
        error: 'Invalid database type. Supported: mysql, mssql'
      });
    }

  } catch (error) {
    console.error('Database connection error:', error);
    res.status(500).json({
      success: false,
      error: 'Connection failed',
      message: error.message
    });
  }
});

/**
 * Get list of tables from connected database
 * GET /api/db/:connectionId/tables
 */
router.get('/:connectionId/tables', async (req, res) => {
  const { connectionId } = req.params;

  const conn = connections.get(connectionId);
  if (!conn) {
    return res.status(404).json({
      success: false,
      error: 'Connection not found. Please reconnect.'
    });
  }

  try {
    let tables = [];

    if (conn.type === 'mysql') {
      const [rows] = await conn.connection.query(
        'SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ?',
        [conn.config.database]
      );
      tables = rows.map(row => row.TABLE_NAME);

    } else if (conn.type === 'mssql') {
      const result = await conn.connection.query(
        `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE'`
      );
      tables = result.recordset.map(row => row.TABLE_NAME);
    }

    res.json({
      success: true,
      tables
    });

  } catch (error) {
    console.error('Error fetching tables:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tables',
      message: error.message
    });
  }
});

/**
 * Get schema for a specific table
 * GET /api/db/:connectionId/tables/:tableName/schema
 */
router.get('/:connectionId/tables/:tableName/schema', async (req, res) => {
  const { connectionId, tableName } = req.params;

  const conn = connections.get(connectionId);
  if (!conn) {
    return res.status(404).json({
      success: false,
      error: 'Connection not found. Please reconnect.'
    });
  }

  try {
    let fields = {};

    if (conn.type === 'mysql') {
      const [columns] = await conn.connection.query(
        `SELECT
          COLUMN_NAME as name,
          DATA_TYPE as type,
          IS_NULLABLE as nullable,
          COLUMN_KEY as columnKey,
          COLUMN_DEFAULT as defaultValue,
          COLUMN_TYPE as columnType,
          EXTRA as extra
         FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
         ORDER BY ORDINAL_POSITION`,
        [conn.config.database, tableName]
      );

      columns.forEach(col => {
        const isPrimary = col.columnKey === 'PRI';
        const isAutoIncrement = col.extra.includes('auto_increment');

        // Check if enum
        let enumValues = null;
        if (col.columnType.startsWith('enum(')) {
          const match = col.columnType.match(/enum\((.*)\)/);
          if (match) {
            enumValues = match[1].split(',').map(v => v.replace(/'/g, '').trim());
          }
        }

        fields[col.name] = {
          type: col.type,
          primary: isPrimary,
          nullable: col.nullable === 'YES',
          autoIncrement: isAutoIncrement,
          default: col.defaultValue,
          enumValues: enumValues,
          // Default settings for UI
          showInTable: true,
          filterable: !isPrimary,
          editable: !isPrimary && !isAutoIncrement,
          creatable: !isPrimary && !isAutoIncrement,
          visible: true
        };
      });

    } else if (conn.type === 'mssql') {
      const result = await conn.connection.query(
        `SELECT
          c.COLUMN_NAME as name,
          c.DATA_TYPE as type,
          c.IS_NULLABLE as nullable,
          c.COLUMN_DEFAULT as defaultValue,
          CASE WHEN pk.COLUMN_NAME IS NOT NULL THEN 'PRI' ELSE '' END as columnKey,
          CASE WHEN c.COLUMN_DEFAULT LIKE '%identity%' THEN 'auto_increment' ELSE '' END as extra
         FROM INFORMATION_SCHEMA.COLUMNS c
         LEFT JOIN (
           SELECT ku.TABLE_NAME, ku.COLUMN_NAME
           FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
           JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE ku
             ON tc.CONSTRAINT_NAME = ku.CONSTRAINT_NAME
           WHERE tc.CONSTRAINT_TYPE = 'PRIMARY KEY'
         ) pk ON c.TABLE_NAME = pk.TABLE_NAME AND c.COLUMN_NAME = pk.COLUMN_NAME
         WHERE c.TABLE_NAME = '${tableName}'
         ORDER BY c.ORDINAL_POSITION`
      );

      result.recordset.forEach(col => {
        const isPrimary = col.columnKey === 'PRI';
        const isAutoIncrement = col.extra.includes('auto_increment');

        fields[col.name] = {
          type: col.type,
          primary: isPrimary,
          nullable: col.nullable === 'YES',
          autoIncrement: isAutoIncrement,
          default: col.defaultValue,
          enumValues: null,
          // Default settings for UI
          showInTable: true,
          filterable: !isPrimary,
          editable: !isPrimary && !isAutoIncrement,
          creatable: !isPrimary && !isAutoIncrement,
          visible: true
        };
      });
    }

    res.json({
      success: true,
      table: tableName,
      fields
    });

  } catch (error) {
    console.error('Error fetching schema:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch schema',
      message: error.message
    });
  }
});

/**
 * Disconnect from database
 * DELETE /api/db/:connectionId
 */
router.delete('/:connectionId', async (req, res) => {
  const { connectionId } = req.params;

  const conn = connections.get(connectionId);
  if (!conn) {
    return res.status(404).json({
      success: false,
      error: 'Connection not found'
    });
  }

  try {
    if (conn.type === 'mysql') {
      await conn.connection.end();
    } else if (conn.type === 'mssql') {
      await conn.connection.close();
    }

    connections.delete(connectionId);

    res.json({
      success: true,
      message: 'Disconnected successfully'
    });

  } catch (error) {
    console.error('Error disconnecting:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to disconnect',
      message: error.message
    });
  }
});

module.exports = router;
