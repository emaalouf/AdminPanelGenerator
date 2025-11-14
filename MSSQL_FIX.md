# MSSQL Configuration Fix

## Issue
If you generated admin panels for **MS SQL Server** tables before this fix, you may encounter this error:

```
TypeError: The "config.server" property is required and must be of type string.
```

This happens because the MSSQL library requires `server` instead of `host` in the database configuration.

## Solution

You have **two options** to fix this:

### Option 1: Regenerate Your Tables (Recommended)

1. Go to the Developer Panel: http://localhost:5000
2. Connect to your database again
3. Select the same tables you configured before
4. Click "Generate Admin Panel" again

The new code generator has been fixed and will create the correct configuration.

### Option 2: Run the Fix Script

If you don't want to regenerate everything, run this automated fix script:

```bash
cd AdminPanelGenerator
node scripts/fix-mssql-config.js
```

This will automatically update all your MSSQL route files with the correct configuration.

**After running the script, restart your backend server:**

```bash
# Stop the server (Ctrl+C)
# Then restart:
cd generated/backend
npm start
```

## Verification

After applying the fix, your generated route files should have a config like this:

```javascript
const dbConfig = {
  "server": "your-server-name",  // ✅ Note: "server" not "host"
  "port": 1433,
  "user": "your-username",
  "password": "your-password",
  "database": "your-database",
  "options": {
    "encrypt": true,
    "trustServerCertificate": true
  }
};
```

Instead of the old (broken) format:

```javascript
const dbConfig = {
  "type": "mssql",
  "host": "your-server-name",  // ❌ Wrong property name for MSSQL
  "port": 1433,
  // ...
};
```

## MySQL Users

If you're using MySQL, you don't need to do anything. This fix only affects MS SQL Server connections.

## Future Generations

All future code generations will automatically use the correct configuration format. The fix is permanent in the code generator.
