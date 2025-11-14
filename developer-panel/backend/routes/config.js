const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');

// Config directory path
const CONFIG_DIR = path.join(__dirname, '../configs');

/**
 * Ensures config directory exists
 */
async function ensureConfigDir() {
  try {
    await fs.access(CONFIG_DIR);
  } catch {
    await fs.mkdir(CONFIG_DIR, { recursive: true });
  }
}

/**
 * POST /config/:table
 * Saves configuration for a specific table
 *
 * Request body:
 * {
 *   "table": "users",
 *   "auth": {
 *     "type": "apikey",
 *     "apiKey": "XYZ-SECURE-KEY"
 *   },
 *   "fields": {
 *     "id": {
 *       "type": "int",
 *       "primary": true,
 *       "showInTable": true,
 *       "editable": false,
 *       "creatable": false,
 *       "filterable": false,
 *       "visible": true
 *     },
 *     ...
 *   }
 * }
 */
router.post('/config/:table', async (req, res) => {
  try {
    const { table } = req.params;
    const config = req.body;

    // Validate table name (prevent path traversal)
    if (!table || table.includes('..') || table.includes('/') || table.includes('\\')) {
      return res.status(400).json({
        error: 'Invalid table name',
        message: 'Table name must not contain path separators or relative paths'
      });
    }

    // Validate config structure
    if (!config.table || !config.fields) {
      return res.status(400).json({
        error: 'Invalid configuration',
        message: 'Configuration must include "table" and "fields" properties'
      });
    }

    // Ensure config directory exists
    await ensureConfigDir();

    // Save config to file
    const configPath = path.join(CONFIG_DIR, `${table}.json`);
    await fs.writeFile(
      configPath,
      JSON.stringify(config, null, 2),
      'utf8'
    );

    res.json({
      success: true,
      message: `Configuration saved successfully for table "${table}"`,
      table: table,
      configPath: configPath
    });

  } catch (error) {
    console.error('Config save error:', error);
    res.status(500).json({
      error: 'Failed to save configuration',
      message: error.message
    });
  }
});

/**
 * GET /config/:table
 * Retrieves configuration for a specific table
 */
router.get('/config/:table', async (req, res) => {
  try {
    const { table } = req.params;

    // Validate table name (prevent path traversal)
    if (!table || table.includes('..') || table.includes('/') || table.includes('\\')) {
      return res.status(400).json({
        error: 'Invalid table name'
      });
    }

    const configPath = path.join(CONFIG_DIR, `${table}.json`);

    // Check if config file exists
    try {
      await fs.access(configPath);
    } catch {
      return res.status(404).json({
        error: 'Configuration not found',
        message: `No configuration file exists for table "${table}"`
      });
    }

    // Read and parse config file
    const configData = await fs.readFile(configPath, 'utf8');
    const config = JSON.parse(configData);

    res.json({
      success: true,
      table: table,
      config: config
    });

  } catch (error) {
    console.error('Config read error:', error);
    res.status(500).json({
      error: 'Failed to read configuration',
      message: error.message
    });
  }
});

/**
 * GET /config
 * Lists all saved configurations
 */
router.get('/config', async (req, res) => {
  try {
    // Ensure config directory exists
    await ensureConfigDir();

    // Read all files in config directory
    const files = await fs.readdir(CONFIG_DIR);

    // Filter for JSON files only
    const configFiles = files.filter(file => file.endsWith('.json'));

    // Get table names (remove .json extension)
    const tables = configFiles.map(file => file.replace('.json', ''));

    res.json({
      success: true,
      count: tables.length,
      tables: tables
    });

  } catch (error) {
    console.error('Config list error:', error);
    res.status(500).json({
      error: 'Failed to list configurations',
      message: error.message
    });
  }
});

/**
 * DELETE /config/:table
 * Deletes configuration for a specific table
 */
router.delete('/config/:table', async (req, res) => {
  try {
    const { table } = req.params;

    // Validate table name (prevent path traversal)
    if (!table || table.includes('..') || table.includes('/') || table.includes('\\')) {
      return res.status(400).json({
        error: 'Invalid table name'
      });
    }

    const configPath = path.join(CONFIG_DIR, `${table}.json`);

    // Check if config file exists
    try {
      await fs.access(configPath);
    } catch {
      return res.status(404).json({
        error: 'Configuration not found',
        message: `No configuration file exists for table "${table}"`
      });
    }

    // Delete config file
    await fs.unlink(configPath);

    res.json({
      success: true,
      message: `Configuration deleted successfully for table "${table}"`
    });

  } catch (error) {
    console.error('Config delete error:', error);
    res.status(500).json({
      error: 'Failed to delete configuration',
      message: error.message
    });
  }
});

module.exports = router;
