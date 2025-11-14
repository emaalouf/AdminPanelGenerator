const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const ConfigWriter = require('../generator/config-writer');
const CodeWriter = require('../generator/code-writer');

/**
 * Save table configuration
 * POST /api/generator/config
 * Body: { table, auth, fields, dbConfig }
 */
router.post('/config', async (req, res) => {
  const { table, auth, fields, dbConfig } = req.body;

  if (!table || !fields) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: table, fields'
    });
  }

  try {
    const config = {
      table,
      auth: auth || { type: 'none' },
      fields,
      dbConfig: dbConfig || {}
    };

    // Save config to file
    const configPath = path.join(__dirname, '../config', `${table}.json`);
    await fs.mkdir(path.dirname(configPath), { recursive: true });
    await fs.writeFile(configPath, JSON.stringify(config, null, 2));

    res.json({
      success: true,
      message: `Configuration saved for table: ${table}`,
      configPath
    });

  } catch (error) {
    console.error('Error saving config:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save configuration',
      message: error.message
    });
  }
});

/**
 * Load table configuration
 * GET /api/generator/config/:table
 */
router.get('/config/:table', async (req, res) => {
  const { table } = req.params;

  try {
    const configPath = path.join(__dirname, '../config', `${table}.json`);
    const configData = await fs.readFile(configPath, 'utf-8');
    const config = JSON.parse(configData);

    res.json({
      success: true,
      config
    });

  } catch (error) {
    if (error.code === 'ENOENT') {
      res.status(404).json({
        success: false,
        error: 'Configuration not found'
      });
    } else {
      console.error('Error loading config:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to load configuration',
        message: error.message
      });
    }
  }
});

/**
 * Get list of all saved configurations
 * GET /api/generator/configs
 */
router.get('/configs', async (req, res) => {
  try {
    const configDir = path.join(__dirname, '../config');

    // Create directory if it doesn't exist
    await fs.mkdir(configDir, { recursive: true });

    const files = await fs.readdir(configDir);
    const configs = files
      .filter(file => file.endsWith('.json'))
      .map(file => file.replace('.json', ''));

    res.json({
      success: true,
      configs
    });

  } catch (error) {
    console.error('Error listing configs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list configurations',
      message: error.message
    });
  }
});

/**
 * Generate code for a specific table
 * POST /api/generator/generate/:table
 */
router.post('/generate/:table', async (req, res) => {
  const { table } = req.params;

  try {
    // Load config
    const configPath = path.join(__dirname, '../config', `${table}.json`);
    const configData = await fs.readFile(configPath, 'utf-8');
    const config = JSON.parse(configData);

    // Generate code
    const codeWriter = new CodeWriter(config);
    const generatedFiles = await codeWriter.generateAll();

    res.json({
      success: true,
      message: `Code generated for table: ${table}`,
      files: generatedFiles
    });

  } catch (error) {
    console.error('Error generating code:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate code',
      message: error.message
    });
  }
});

/**
 * Generate code for all configured tables
 * POST /api/generator/generate-all
 */
router.post('/generate-all', async (req, res) => {
  try {
    const configDir = path.join(__dirname, '../config');
    const files = await fs.readdir(configDir);
    const configFiles = files.filter(file => file.endsWith('.json'));

    const results = [];

    for (const file of configFiles) {
      const configPath = path.join(configDir, file);
      const configData = await fs.readFile(configPath, 'utf-8');
      const config = JSON.parse(configData);

      const codeWriter = new CodeWriter(config);
      const generatedFiles = await codeWriter.generateAll();

      results.push({
        table: config.table,
        files: generatedFiles
      });
    }

    res.json({
      success: true,
      message: `Code generated for ${results.length} tables`,
      results
    });

  } catch (error) {
    console.error('Error generating all code:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate code',
      message: error.message
    });
  }
});

/**
 * Delete table configuration
 * DELETE /api/generator/config/:table
 */
router.delete('/config/:table', async (req, res) => {
  const { table } = req.params;

  try {
    const configPath = path.join(__dirname, '../config', `${table}.json`);
    await fs.unlink(configPath);

    res.json({
      success: true,
      message: `Configuration deleted for table: ${table}`
    });

  } catch (error) {
    console.error('Error deleting config:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete configuration',
      message: error.message
    });
  }
});

module.exports = router;
