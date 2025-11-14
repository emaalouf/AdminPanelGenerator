# Developer Panel Backend API

A Node.js backend API for connecting to remote SQL databases (MySQL/MSSQL), fetching schema information, and managing table configurations.

## Features

- **Database Connection**: Connect to MySQL or MSSQL databases
- **Schema Inspection**: Fetch detailed column metadata for any table
- **Configuration Management**: Save and manage per-table configuration JSON files
- **Multi-Database Support**: Seamlessly switch between MySQL and MSSQL

## Tech Stack

- **Node.js** with **Express**
- **mysql2** for MySQL connections
- **mssql** for MSSQL connections
- **CORS** enabled for cross-origin requests

## Installation

```bash
# Install dependencies
npm install

# Start the server
npm start

# Development mode (with auto-reload)
npm run dev
```

The server will start on `http://localhost:3000` by default.

## API Endpoints

### Database Operations

#### POST /connect

Connect to a database and retrieve list of tables.

**Request Body:**
```json
{
  "host": "localhost",
  "user": "root",
  "password": "your_password",
  "database": "mydb",
  "type": "mysql"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Connected to MYSQL database successfully",
  "database": "mydb",
  "type": "mysql",
  "tables": ["users", "products", "orders"]
}
```

#### GET /schema/:table

Get detailed schema information for a specific table.

**Response:**
```json
{
  "success": true,
  "table": "users",
  "dbType": "mysql",
  "schema": [
    {
      "name": "id",
      "type": "int",
      "nullable": false,
      "default": null,
      "primary": true,
      "unique": false,
      "autoIncrement": true
    },
    {
      "name": "username",
      "type": "varchar",
      "nullable": false,
      "default": null,
      "primary": false,
      "unique": true,
      "autoIncrement": false
    },
    {
      "name": "role",
      "type": "enum",
      "nullable": false,
      "default": "user",
      "primary": false,
      "unique": false,
      "autoIncrement": false,
      "enumValues": ["admin", "user", "editor"]
    }
  ]
}
```

#### GET /tables

Get list of all tables in the connected database.

**Response:**
```json
{
  "success": true,
  "dbType": "mysql",
  "tables": ["users", "products", "orders"]
}
```

#### POST /disconnect

Close the current database connection.

**Response:**
```json
{
  "success": true,
  "message": "Database connection closed successfully"
}
```

### Configuration Management

#### POST /config/:table

Save configuration for a specific table.

**Request Body:**
```json
{
  "table": "users",
  "auth": {
    "type": "apikey",
    "apiKey": "XYZ-SECURE-KEY"
  },
  "fields": {
    "id": {
      "type": "int",
      "primary": true,
      "showInTable": true,
      "editable": false,
      "creatable": false,
      "filterable": false,
      "visible": true
    },
    "username": {
      "type": "varchar",
      "showInTable": true,
      "editable": true,
      "creatable": true,
      "filterable": true,
      "visible": true
    },
    "email": {
      "type": "varchar",
      "showInTable": true,
      "editable": true,
      "creatable": true,
      "filterable": true,
      "visible": true
    },
    "role": {
      "type": "enum",
      "enumValues": ["admin", "editor", "user"],
      "showInTable": true,
      "editable": true,
      "creatable": true,
      "filterable": true,
      "visible": true
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Configuration saved successfully for table \"users\"",
  "table": "users",
  "configPath": "/path/to/configs/users.json"
}
```

#### GET /config/:table

Retrieve saved configuration for a specific table.

**Response:**
```json
{
  "success": true,
  "table": "users",
  "config": {
    "table": "users",
    "auth": { ... },
    "fields": { ... }
  }
}
```

#### GET /config

List all saved configurations.

**Response:**
```json
{
  "success": true,
  "count": 3,
  "tables": ["users", "products", "orders"]
}
```

#### DELETE /config/:table

Delete configuration for a specific table.

**Response:**
```json
{
  "success": true,
  "message": "Configuration deleted successfully for table \"users\""
}
```

## Project Structure

```
developer-panel/backend/
├── index.js              # Main Express server
├── routes/
│   ├── db.js            # Database connection & schema routes
│   └── config.js        # Configuration management routes
├── services/
│   ├── mysql.js         # MySQL database service
│   └── mssql.js         # MSSQL database service
├── configs/             # Saved table configurations (JSON files)
│   └── .gitkeep
├── package.json
├── .gitignore
└── README.md
```

## Error Handling

All endpoints return errors in the following format:

```json
{
  "error": "Error type",
  "message": "Detailed error message"
}
```

Common HTTP status codes:
- `200` - Success
- `400` - Bad request (missing/invalid parameters)
- `404` - Resource not found
- `500` - Internal server error

## Security Considerations

- Config files are gitignored by default (may contain sensitive data)
- Path traversal protection on config file operations
- Connection credentials are not persisted
- CORS enabled (configure as needed for production)

## Example Usage

### Using cURL

```bash
# Connect to MySQL database
curl -X POST http://localhost:3000/connect \
  -H "Content-Type: application/json" \
  -d '{
    "host": "localhost",
    "user": "root",
    "password": "password",
    "database": "mydb",
    "type": "mysql"
  }'

# Get schema for users table
curl http://localhost:3000/schema/users

# Save configuration
curl -X POST http://localhost:3000/config/users \
  -H "Content-Type: application/json" \
  -d @users-config.json
```

### Using JavaScript (fetch)

```javascript
// Connect to database
const response = await fetch('http://localhost:3000/connect', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    host: 'localhost',
    user: 'root',
    password: 'password',
    database: 'mydb',
    type: 'mysql'
  })
});
const data = await response.json();
console.log('Tables:', data.tables);

// Get schema
const schema = await fetch('http://localhost:3000/schema/users')
  .then(r => r.json());
console.log('Schema:', schema);
```

## Environment Variables

- `PORT` - Server port (default: 3000)

## License

ISC
