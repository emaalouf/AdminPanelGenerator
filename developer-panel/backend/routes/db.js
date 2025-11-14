const express = require('express');
const router = express.Router();
const mysqlService = require('../services/mysql');
const mssqlService = require('../services/mssql');

// Store current database service
let currentDbService = null;
let currentDbType = null;

/**
 * POST /connect
 * Connects to a database and returns list of tables
 *
 * Request body:
 * {
 *   "host": "localhost",
 *   "user": "root",
 *   "password": "password",
 *   "database": "mydb",
 *   "type": "mysql" | "mssql"
 * }
 */
router.post('/connect', async (req, res) => {
  try {
    const { host, user, password, database, type } = req.body;

    // Validate required fields
    if (!host || !user || !database || !type) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['host', 'user', 'database', 'type']
      });
    }

    // Validate database type
    if (type !== 'mysql' && type !== 'mssql') {
      return res.status(400).json({
        error: 'Invalid database type',
        message: 'Type must be either "mysql" or "mssql"'
      });
    }

    // Select appropriate service
    currentDbService = type === 'mysql' ? mysqlService : mssqlService;
    currentDbType = type;

    // Create connection
    await currentDbService.createConnection({
      host,
      user,
      password,
      database
    });

    // Get list of tables
    const tables = await currentDbService.getTables();

    res.json({
      success: true,
      message: `Connected to ${type.toUpperCase()} database successfully`,
      database: database,
      type: type,
      tables: tables
    });

  } catch (error) {
    console.error('Connection error:', error);
    res.status(500).json({
      error: 'Database connection failed',
      message: error.message
    });
  }
});

/**
 * GET /schema/:table
 * Returns schema information for a specific table
 *
 * Response:
 * {
 *   "success": true,
 *   "table": "users",
 *   "schema": [
 *     {
 *       "name": "id",
 *       "type": "int",
 *       "nullable": false,
 *       "default": null,
 *       "primary": true,
 *       "unique": false,
 *       "autoIncrement": true
 *     },
 *     ...
 *   ]
 * }
 */
router.get('/schema/:table', async (req, res) => {
  try {
    const { table } = req.params;

    // Check if connection exists
    if (!currentDbService) {
      return res.status(400).json({
        error: 'No active database connection',
        message: 'Please connect to a database first using POST /connect'
      });
    }

    // Get schema information
    const schema = await currentDbService.getSchema(table);

    res.json({
      success: true,
      table: table,
      dbType: currentDbType,
      schema: schema
    });

  } catch (error) {
    console.error('Schema fetch error:', error);
    res.status(500).json({
      error: 'Failed to fetch schema',
      message: error.message
    });
  }
});

/**
 * GET /tables
 * Returns list of all tables in the connected database
 */
router.get('/tables', async (req, res) => {
  try {
    // Check if connection exists
    if (!currentDbService) {
      return res.status(400).json({
        error: 'No active database connection',
        message: 'Please connect to a database first using POST /connect'
      });
    }

    // Get list of tables
    const tables = await currentDbService.getTables();

    res.json({
      success: true,
      dbType: currentDbType,
      tables: tables
    });

  } catch (error) {
    console.error('Tables fetch error:', error);
    res.status(500).json({
      error: 'Failed to fetch tables',
      message: error.message
    });
  }
});

/**
 * POST /disconnect
 * Closes the current database connection
 */
router.post('/disconnect', async (req, res) => {
  try {
    if (!currentDbService) {
      return res.status(400).json({
        error: 'No active database connection'
      });
    }

    await currentDbService.closeConnection();
    currentDbService = null;
    currentDbType = null;

    res.json({
      success: true,
      message: 'Database connection closed successfully'
    });

  } catch (error) {
    console.error('Disconnect error:', error);
    res.status(500).json({
      error: 'Failed to disconnect',
      message: error.message
    });
  }
});

module.exports = router;
