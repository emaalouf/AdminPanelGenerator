const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const dbRoutes = require('./routes/db');
const configRoutes = require('./routes/config');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Developer Panel Backend API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      database: {
        'POST /connect': 'Connect to a database (MySQL/MSSQL)',
        'GET /schema/:table': 'Get schema information for a table',
        'GET /tables': 'Get list of all tables',
        'POST /disconnect': 'Close database connection'
      },
      config: {
        'POST /config/:table': 'Save configuration for a table',
        'GET /config/:table': 'Get configuration for a table',
        'GET /config': 'List all saved configurations',
        'DELETE /config/:table': 'Delete configuration for a table'
      }
    }
  });
});

// Mount routes
app.use('/', dbRoutes);
app.use('/', configRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: `Route ${req.method} ${req.path} not found`
  });
});

// Start server
app.listen(PORT, () => {
  console.log('========================================');
  console.log('  Developer Panel Backend API');
  console.log('========================================');
  console.log(`Server running on port ${PORT}`);
  console.log(`API URL: http://localhost:${PORT}`);
  console.log('========================================');
  console.log('\nAvailable endpoints:');
  console.log('  Database:');
  console.log('    POST /connect');
  console.log('    GET /schema/:table');
  console.log('    GET /tables');
  console.log('    POST /disconnect');
  console.log('  Configuration:');
  console.log('    POST /config/:table');
  console.log('    GET /config/:table');
  console.log('    GET /config');
  console.log('    DELETE /config/:table');
  console.log('========================================\n');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing server');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\nSIGINT signal received: closing server');
  process.exit(0);
});

module.exports = app;
