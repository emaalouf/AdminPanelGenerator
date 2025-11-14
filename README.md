# Admin Panel Generator

A production-grade code generator that creates complete admin panels from remote SQL database schemas. This tool generates both the developer UI for configuration and the actual admin panel with full CRUD operations, authentication, and CSV export capabilities.

## Features

### Developer Panel
- 🔌 **Database Connectivity**: Connect to MySQL and MS SQL Server databases
- 🔍 **Schema Discovery**: Automatically fetch and analyze table structures
- ⚙️ **Field Configuration**: Granular control over each field's behavior
- 🔐 **Authentication Setup**: Configure API Key or Basic Auth for generated panels
- 💾 **Config Management**: Save and load table configurations
- 🚀 **Code Generation**: One-click generation of complete admin panels

### Generated Admin Panel
- 📊 **CRUD Operations**: Complete Create, Read, Update, Delete functionality
- 🔍 **Advanced Filtering**: Search and filter by any configured field
- 📄 **Pagination**: Efficient data browsing with customizable page sizes
- 📤 **CSV Export**: Export filtered data to CSV files
- 🎨 **Modern UI**: Clean, responsive Vue.js 3 interface
- 🔒 **Secure**: Built-in authentication middleware
- 🔄 **RESTful API**: Clean, documented API endpoints

## Project Structure

```
AdminPanelGenerator/
├── developer-panel/          # Tool to configure and generate admin panels
│   ├── backend/
│   │   ├── routes/
│   │   │   ├── db.js        # Database connection & schema fetching
│   │   │   └── generator.js # Config save/load & code generation
│   │   ├── generator/
│   │   │   ├── config-writer.js
│   │   │   └── code-writer.js
│   │   ├── config/          # Saved table configurations
│   │   └── server.js
│   └── frontend/
│       └── src/
│           ├── views/
│           │   └── Configurator.vue   # Main configuration UI
│           └── components/
│               └── TableFieldEditor.vue
├── generated/               # Output directory for generated code
│   ├── backend/
│   │   ├── routes/         # Generated API routes (one per table)
│   │   ├── middleware/     # Generated auth middleware
│   │   ├── config/         # Table configurations
│   │   └── server.js       # Express server
│   └── frontend/
│       └── src/
│           ├── views/      # Generated List/Create/Edit views
│           ├── components/ # Generated FormEditor component
│           └── router.js   # Generated Vue Router config
└── examples/               # Example configurations
    └── users-config.json
```

## Installation

### Prerequisites
- Node.js 16+ and npm
- MySQL or MS SQL Server database

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/emaalouf/AdminPanelGenerator.git
   cd AdminPanelGenerator
   ```

2. **Install Developer Panel Backend**
   ```bash
   cd developer-panel/backend
   npm install
   ```

3. **Install Developer Panel Frontend**
   ```bash
   cd ../frontend
   npm install
   ```

4. **Install Generated Backend Dependencies**
   ```bash
   cd ../../generated/backend
   npm install
   ```

5. **Install Generated Frontend Dependencies**
   ```bash
   cd ../frontend
   npm install
   ```

## Usage

### Step 1: Start the Developer Panel

**Terminal 1 - Backend:**
```bash
cd developer-panel/backend
npm start
# Runs on http://localhost:3000
```

**Terminal 2 - Frontend:**
```bash
cd developer-panel/frontend
npm run dev
# Runs on http://localhost:5000
```

Open your browser to `http://localhost:5000`

### Step 2: Connect to Your Database

1. Select database type (MySQL or MS SQL)
2. Enter connection details:
   - Host
   - Port
   - Username
   - Password
   - Database name
3. Click "Connect to Database"

### Step 3: Configure Your Table

1. **Select a table** from the list
2. **Configure authentication** (optional):
   - None
   - API Key
   - Basic Auth (Username/Password)
3. **Configure each field**:
   - **Show in Table**: Display in list view
   - **Filterable**: Enable filtering
   - **Editable**: Allow editing
   - **Creatable**: Include in create form
   - **Visible**: Show in forms (can hide sensitive fields)
   - **Enum Values**: For dropdown fields (comma-separated)

4. Click **"Save Configuration"** to save settings
5. Click **"Generate Admin Panel"** to create the code

### Step 4: Run the Generated Admin Panel

**Terminal 3 - Generated Backend:**
```bash
cd generated/backend
npm start
# Runs on http://localhost:4000
```

**Terminal 4 - Generated Frontend:**
```bash
cd generated/frontend
npm run dev
# Runs on http://localhost:8080
```

Open `http://localhost:8080` to access your generated admin panel!

## Configuration Example

Here's an example configuration for a `users` table:

```json
{
  "table": "users",
  "auth": {
    "type": "apikey",
    "apiKey": "XYZ-SECURE-KEY-12345"
  },
  "fields": {
    "id": {
      "type": "int",
      "primary": true,
      "showInTable": true,
      "filterable": false,
      "editable": false,
      "creatable": false,
      "visible": true
    },
    "username": {
      "type": "varchar",
      "showInTable": true,
      "filterable": true,
      "editable": true,
      "creatable": true,
      "visible": true
    },
    "email": {
      "type": "varchar",
      "showInTable": true,
      "filterable": true,
      "editable": true,
      "creatable": true,
      "visible": true
    },
    "password": {
      "type": "varchar",
      "showInTable": false,
      "filterable": false,
      "editable": true,
      "creatable": true,
      "visible": false
    },
    "role": {
      "type": "enum",
      "enumValues": ["admin", "editor", "viewer"],
      "showInTable": true,
      "filterable": true,
      "editable": true,
      "creatable": true,
      "visible": true
    },
    "created_at": {
      "type": "datetime",
      "showInTable": true,
      "filterable": true,
      "editable": false,
      "creatable": false,
      "visible": true
    }
  },
  "dbConfig": {
    "type": "mysql",
    "host": "localhost",
    "port": 3306,
    "user": "root",
    "password": "password",
    "database": "myapp"
  }
}
```

## Generated API Endpoints

For each table (e.g., `users`), the following endpoints are generated:

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users` | List all records (with pagination, filtering, sorting) |
| GET | `/api/users/export` | Export records to CSV |
| GET | `/api/users/:id` | Get single record |
| POST | `/api/users` | Create new record |
| PUT | `/api/users/:id` | Update existing record |
| DELETE | `/api/users/:id` | Delete record |

### Query Parameters for List Endpoint

- `page` - Page number (default: 1)
- `limit` - Items per page (default: 10)
- `sort` - Field to sort by (default: id)
- `order` - Sort order: ASC or DESC (default: ASC)
- `search` - Global search across visible fields
- `{fieldName}` - Filter by specific field value

### Authentication Headers

**API Key:**
```
Authorization: Bearer YOUR-API-KEY
```

**Basic Auth:**
```
Authorization: Basic base64(username:password)
```

## Generated Frontend Features

### List View
- Sortable columns
- Search functionality
- Field-specific filters
- Pagination controls
- Export to CSV button
- Create/Edit/Delete actions

### Create/Edit Views
- Dynamic forms based on field configuration
- Enum fields render as dropdowns
- Date fields use date pickers
- Read-only fields are disabled
- Form validation

### Export Feature
- Exports current filtered results
- CSV format with headers
- Timestamped filenames
- Downloads automatically

## Advanced Usage

### Configuring Multiple Tables

Generate admin panels for multiple tables:

1. Configure and generate the first table
2. Click "Change Table" to select another
3. Configure and generate
4. Both tables will be available in the generated admin panel

### Custom Database Configurations

Edit the generated config files in `generated/backend/config/{table}.json` to:
- Modify field settings
- Change authentication
- Update database credentials

After editing, regenerate the code or manually update the generated files.

### Extending Generated Code

The generated code is clean and modular. You can:
- Add custom validation in backend routes
- Extend Vue components with additional features
- Add custom middleware
- Implement business logic

## Architecture

### Backend (Express.js)
- RESTful API design
- Parameterized queries (SQL injection prevention)
- Authentication middleware
- JSON2CSV for exports
- Dynamic route loading

### Frontend (Vue.js 3)
- Composition API
- Vue Router for navigation
- Axios for HTTP requests
- Responsive CSS
- Component-based architecture

### Code Generation
- Template-based generation
- Field-level configuration
- Type-safe SQL queries
- Modular file structure

## Security Considerations

1. **Authentication**: Always enable authentication for production
2. **Database Credentials**: Never commit real credentials to version control
3. **API Keys**: Use strong, random keys
4. **SQL Injection**: Generated code uses parameterized queries
5. **CORS**: Configure appropriately for production
6. **HTTPS**: Use HTTPS in production environments

## Troubleshooting

### Database Connection Failed
- Verify database credentials
- Check if database server is running
- Ensure network access to database host
- Check firewall settings

### Generated Code Not Working
- Run `npm install` in both generated/backend and generated/frontend
- Verify port numbers are not in use
- Check console for errors
- Ensure database connection details are correct in config

### MSSQL Error: "config.server property is required"
If you see this error with MS SQL Server:
- The config uses the wrong property name (`host` instead of `server`)
- **Quick fix**: Run `node scripts/fix-mssql-config.js` from the project root
- **Or**: Regenerate your tables using the Developer Panel
- See [MSSQL_FIX.md](MSSQL_FIX.md) for detailed instructions
- This only affects tables generated before the fix was applied

### Frontend Can't Connect to Backend
- Verify backend is running
- Check proxy settings in vite.config.js
- Ensure ports match (backend: 4000, frontend: 8080)
- Check CORS configuration

## Development

### Tech Stack
- **Backend**: Node.js, Express, MySQL2, MSSQL, JSON2CSV
- **Frontend**: Vue.js 3, Vue Router, Axios, Vite
- **Code Generation**: Template strings, fs/promises

### Contributing
Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

ISC

## Author

Emanuel Alouf

## Support

For issues and questions:
- GitHub Issues: https://github.com/emaalouf/AdminPanelGenerator/issues

## Roadmap

- [ ] PostgreSQL support
- [ ] SQLite support
- [ ] Multi-table relationships
- [ ] File upload support
- [ ] Advanced validation rules
- [ ] Role-based access control
- [ ] API documentation generation
- [ ] Docker support
- [ ] Test generation
- [ ] TypeScript support

---

**Built with ❤️ by Emanuel Alouf**
