#!/usr/bin/env node

/**
 * Fix MSSQL Configuration in Generated Routes
 *
 * This script fixes the database configuration in generated route files
 * to use 'server' instead of 'host' for MSSQL connections.
 */

const fs = require('fs');
const path = require('path');

const GENERATED_ROUTES_DIR = path.join(__dirname, '../generated/backend/routes');
const GENERATED_CONFIG_DIR = path.join(__dirname, '../generated/backend/config');

console.log('🔧 Fixing MSSQL configuration in generated routes...\n');

// Read all route files
if (!fs.existsSync(GENERATED_ROUTES_DIR)) {
  console.log('❌ Generated routes directory not found. No files to fix.');
  process.exit(0);
}

const routeFiles = fs.readdirSync(GENERATED_ROUTES_DIR)
  .filter(file => file.endsWith('.js'));

if (routeFiles.length === 0) {
  console.log('❌ No route files found. Generate some tables first.');
  process.exit(0);
}

let fixedCount = 0;

routeFiles.forEach(file => {
  const routePath = path.join(GENERATED_ROUTES_DIR, file);
  const tableName = file.replace('.js', '');
  const configPath = path.join(GENERATED_CONFIG_DIR, `${tableName}.json`);

  console.log(`\n📄 Processing: ${file}`);

  // Read the config to check if it's MSSQL
  if (!fs.existsSync(configPath)) {
    console.log(`   ⚠️  Config file not found, skipping`);
    return;
  }

  const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

  if (config.dbConfig.type !== 'mssql') {
    console.log(`   ✓  MySQL database, no fix needed`);
    return;
  }

  // Read the route file
  let routeContent = fs.readFileSync(routePath, 'utf-8');

  // Check if it already has 'server' property (already fixed)
  if (routeContent.includes('"server":')) {
    console.log(`   ✓  Already fixed`);
    return;
  }

  // Transform the dbConfig
  const transformedConfig = {
    server: config.dbConfig.host,
    port: config.dbConfig.port || 1433,
    user: config.dbConfig.user,
    password: config.dbConfig.password,
    database: config.dbConfig.database,
    options: {
      encrypt: true,
      trustServerCertificate: true
    }
  };

  // Find and replace the dbConfig in the route file
  const dbConfigRegex = /const dbConfig = \{[\s\S]*?\};/;
  const newDbConfig = `const dbConfig = ${JSON.stringify(transformedConfig, null, 2)};`;

  routeContent = routeContent.replace(dbConfigRegex, newDbConfig);

  // Write the fixed file
  fs.writeFileSync(routePath, routeContent, 'utf-8');

  console.log(`   ✅ Fixed MSSQL configuration`);
  fixedCount++;
});

console.log(`\n\n✨ Done! Fixed ${fixedCount} file(s).`);

if (fixedCount > 0) {
  console.log('\n⚠️  Please restart your generated backend server for changes to take effect.');
}
