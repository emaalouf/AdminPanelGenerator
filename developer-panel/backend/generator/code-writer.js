const fs = require('fs').promises;
const path = require('path');

class CodeWriter {
  constructor(config) {
    this.config = config;
    this.table = config.table;
    this.backendDir = path.join(__dirname, '../../../generated/backend');
    this.frontendDir = path.join(__dirname, '../../../generated/frontend');
  }

  /**
   * Generate all files (backend + frontend)
   */
  async generateAll() {
    const files = [];

    // Generate backend files
    files.push(await this.generateBackendRoute());
    files.push(await this.generateAuthMiddleware());

    // Generate frontend files
    files.push(await this.generateListView());
    files.push(await this.generateCreateView());
    files.push(await this.generateEditView());
    files.push(await this.generateFormEditor());
    files.push(await this.generateRouter());

    // Save config
    files.push(await this.saveConfig());

    return files;
  }

  /**
   * Save config to generated folder
   */
  async saveConfig() {
    const configDir = path.join(this.backendDir, 'config');
    await fs.mkdir(configDir, { recursive: true });

    const configPath = path.join(configDir, `${this.table}.json`);
    await fs.writeFile(configPath, JSON.stringify(this.config, null, 2));

    return configPath;
  }

  /**
   * Generate backend route file
   */
  async generateBackendRoute() {
    const routeCode = this.generateBackendRouteCode();
    const routeDir = path.join(this.backendDir, 'routes');
    await fs.mkdir(routeDir, { recursive: true });

    const routePath = path.join(routeDir, `${this.table}.js`);
    await fs.writeFile(routePath, routeCode);

    return routePath;
  }

  /**
   * Generate backend route code
   */
  generateBackendRouteCode() {
    const { table, fields, dbConfig } = this.config;
    const dbType = dbConfig.type || 'mysql';

    // Get field names for different operations
    const allFields = Object.keys(fields);
    const creatableFields = allFields.filter(f => fields[f].creatable);
    const editableFields = allFields.filter(f => fields[f].editable);
    const filterableFields = allFields.filter(f => fields[f].filterable);
    const showInTableFields = allFields.filter(f => fields[f].showInTable);

    // Transform config for MSSQL (use 'server' instead of 'host')
    let finalDbConfig = { ...dbConfig };
    if (dbType === 'mssql') {
      finalDbConfig = {
        server: dbConfig.host,
        port: dbConfig.port || 1433,
        user: dbConfig.user,
        password: dbConfig.password,
        database: dbConfig.database,
        options: {
          encrypt: true,
          trustServerCertificate: true
        }
      };
    }

    return `const express = require('express');
const router = express.Router();
${dbType === 'mysql' ? "const mysql = require('mysql2/promise');" : "const sql = require('mssql');"}
const { Parser } = require('json2csv');
const authMiddleware = require('../middleware/auth');

// Database configuration
const dbConfig = ${JSON.stringify(finalDbConfig, null, 2)};

// Apply auth middleware to all routes
router.use(authMiddleware);

/**
 * Create database connection
 */
async function getConnection() {
${dbType === 'mysql' ? `  return await mysql.createConnection(dbConfig);` : `  return await sql.connect(dbConfig);`}
}

/**
 * GET /api/${table}
 * List all records with pagination, filtering, and sorting
 */
router.get('/', async (req, res) => {
  const { page = 1, limit = 10, sort = 'id', order = 'ASC', search, ...filters } = req.query;

  try {
    const connection = await getConnection();

    // Build WHERE clause
    const whereClauses = [];
    const params = [];

    // Search functionality
    if (search) {
      const searchFields = ${JSON.stringify(showInTableFields)};
      const searchClauses = searchFields.map(field => \`\${field} LIKE ?\`);
      whereClauses.push(\`(\${searchClauses.join(' OR ')})\`);
      searchFields.forEach(() => params.push(\`%\${search}%\`));
    }

    // Filter by specific fields
    ${filterableFields.map(field => `if (filters.${field}) {
      whereClauses.push('${field} = ?');
      params.push(filters.${field});
    }`).join('\n    ')}

    const whereSQL = whereClauses.length > 0 ? \`WHERE \${whereClauses.join(' AND ')}\` : '';

    // Get total count
    const countQuery = \`SELECT COUNT(*) as total FROM ${table} \${whereSQL}\`;
${dbType === 'mysql' ? `    const [countResult] = await connection.query(countQuery, params);
    const total = countResult[0].total;` : `    const countResult = await connection.query(countQuery);
    const total = countResult.recordset[0].total;`}

    // Get paginated data
    const offset = (page - 1) * limit;
    const dataQuery = \`SELECT ${showInTableFields.join(', ')} FROM ${table} \${whereSQL} ORDER BY \${sort} \${order} LIMIT ? OFFSET ?\`;
    params.push(parseInt(limit), parseInt(offset));

${dbType === 'mysql' ? `    const [rows] = await connection.query(dataQuery, params);
    await connection.end();` : `    const result = await connection.query(dataQuery);
    const rows = result.recordset;
    await connection.close();`}

    res.json({
      success: true,
      data: rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching ${table}:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch records',
      message: error.message
    });
  }
});

/**
 * GET /api/${table}/export
 * Export records to CSV
 */
router.get('/export', async (req, res) => {
  const { search, ...filters } = req.query;

  try {
    const connection = await getConnection();

    // Build WHERE clause (same as list endpoint)
    const whereClauses = [];
    const params = [];

    if (search) {
      const searchFields = ${JSON.stringify(showInTableFields)};
      const searchClauses = searchFields.map(field => \`\${field} LIKE ?\`);
      whereClauses.push(\`(\${searchClauses.join(' OR ')})\`);
      searchFields.forEach(() => params.push(\`%\${search}%\`));
    }

    ${filterableFields.map(field => `if (filters.${field}) {
      whereClauses.push('${field} = ?');
      params.push(filters.${field});
    }`).join('\n    ')}

    const whereSQL = whereClauses.length > 0 ? \`WHERE \${whereClauses.join(' AND ')}\` : '';

    const query = \`SELECT ${showInTableFields.join(', ')} FROM ${table} \${whereSQL}\`;
${dbType === 'mysql' ? `    const [rows] = await connection.query(query, params);
    await connection.end();` : `    const result = await connection.query(query);
    const rows = result.recordset;
    await connection.close();`}

    // Convert to CSV
    const parser = new Parser({ fields: ${JSON.stringify(showInTableFields)} });
    const csv = parser.parse(rows);

    const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
    const filename = \`${table}-export-\${timestamp}.csv\`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', \`attachment; filename="\${filename}"\`);
    res.send(csv);

  } catch (error) {
    console.error('Error exporting ${table}:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export records',
      message: error.message
    });
  }
});

/**
 * GET /api/${table}/:id
 * Get single record by ID
 */
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const connection = await getConnection();
    const query = \`SELECT * FROM ${table} WHERE id = ?\`;
${dbType === 'mysql' ? `    const [rows] = await connection.query(query, [id]);
    await connection.end();

    if (rows.length === 0) {` : `    const result = await connection.query(query);
    await connection.close();

    if (result.recordset.length === 0) {`}
      return res.status(404).json({
        success: false,
        error: 'Record not found'
      });
    }

    res.json({
      success: true,
${dbType === 'mysql' ? '      data: rows[0]' : '      data: result.recordset[0]'}
    });

  } catch (error) {
    console.error('Error fetching ${table} record:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch record',
      message: error.message
    });
  }
});

/**
 * POST /api/${table}
 * Create new record
 */
router.post('/', async (req, res) => {
  const data = req.body;

  // Validate required fields
  const creatableFields = ${JSON.stringify(creatableFields)};
  const fields = Object.keys(data).filter(key => creatableFields.includes(key));

  if (fields.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'No valid fields provided'
    });
  }

  try {
    const connection = await getConnection();
    const values = fields.map(field => data[field]);
    const placeholders = fields.map(() => '?').join(', ');

    const query = \`INSERT INTO ${table} (\${fields.join(', ')}) VALUES (\${placeholders})\`;
${dbType === 'mysql' ? `    const [result] = await connection.query(query, values);
    await connection.end();

    res.status(201).json({
      success: true,
      message: 'Record created successfully',
      id: result.insertId
    });` : `    const result = await connection.query(query);
    await connection.close();

    res.status(201).json({
      success: true,
      message: 'Record created successfully',
      id: result.recordset.insertId
    });`}

  } catch (error) {
    console.error('Error creating ${table} record:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create record',
      message: error.message
    });
  }
});

/**
 * PUT /api/${table}/:id
 * Update existing record
 */
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const data = req.body;

  // Validate editable fields
  const editableFields = ${JSON.stringify(editableFields)};
  const fields = Object.keys(data).filter(key => editableFields.includes(key));

  if (fields.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'No valid fields provided'
    });
  }

  try {
    const connection = await getConnection();
    const values = fields.map(field => data[field]);
    const setClause = fields.map(field => \`\${field} = ?\`).join(', ');

    const query = \`UPDATE ${table} SET \${setClause} WHERE id = ?\`;
    values.push(id);

${dbType === 'mysql' ? `    const [result] = await connection.query(query, values);
    await connection.end();

    if (result.affectedRows === 0) {` : `    const result = await connection.query(query);
    await connection.close();

    if (result.rowsAffected[0] === 0) {`}
      return res.status(404).json({
        success: false,
        error: 'Record not found'
      });
    }

    res.json({
      success: true,
      message: 'Record updated successfully'
    });

  } catch (error) {
    console.error('Error updating ${table} record:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update record',
      message: error.message
    });
  }
});

/**
 * DELETE /api/${table}/:id
 * Delete record
 */
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const connection = await getConnection();
    const query = \`DELETE FROM ${table} WHERE id = ?\`;

${dbType === 'mysql' ? `    const [result] = await connection.query(query, [id]);
    await connection.end();

    if (result.affectedRows === 0) {` : `    const result = await connection.query(query);
    await connection.close();

    if (result.rowsAffected[0] === 0) {`}
      return res.status(404).json({
        success: false,
        error: 'Record not found'
      });
    }

    res.json({
      success: true,
      message: 'Record deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting ${table} record:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete record',
      message: error.message
    });
  }
});

module.exports = router;
`;
  }

  /**
   * Generate auth middleware
   */
  async generateAuthMiddleware() {
    const authCode = this.generateAuthMiddlewareCode();
    const middlewareDir = path.join(this.backendDir, 'middleware');
    await fs.mkdir(middlewareDir, { recursive: true });

    const middlewarePath = path.join(middlewareDir, 'auth.js');
    await fs.writeFile(middlewarePath, authCode);

    return middlewarePath;
  }

  /**
   * Generate auth middleware code
   */
  generateAuthMiddlewareCode() {
    const { auth } = this.config;

    return `const authConfig = ${JSON.stringify(auth, null, 2)};

/**
 * Authentication middleware
 * Supports API Key and Basic Auth
 */
function authMiddleware(req, res, next) {
  // Skip auth if type is none
  if (authConfig.type === 'none') {
    return next();
  }

  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      success: false,
      error: 'Authorization header required'
    });
  }

  try {
    if (authConfig.type === 'apikey') {
      // API Key authentication
      const token = authHeader.replace('Bearer ', '');

      if (token !== authConfig.apiKey) {
        return res.status(401).json({
          success: false,
          error: 'Invalid API key'
        });
      }

    } else if (authConfig.type === 'basic') {
      // Basic authentication
      const base64Credentials = authHeader.replace('Basic ', '');
      const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
      const [username, password] = credentials.split(':');

      if (username !== authConfig.username || password !== authConfig.password) {
        return res.status(401).json({
          success: false,
          error: 'Invalid credentials'
        });
      }

    } else {
      return res.status(401).json({
        success: false,
        error: 'Invalid auth configuration'
      });
    }

    next();

  } catch (error) {
    console.error('Auth error:', error);
    res.status(401).json({
      success: false,
      error: 'Authentication failed',
      message: error.message
    });
  }
}

module.exports = authMiddleware;
`;
  }

  /**
   * Generate List view
   */
  async generateListView() {
    const listViewCode = this.generateListViewCode();
    const viewDir = path.join(this.frontendDir, 'views', this.table);
    await fs.mkdir(viewDir, { recursive: true });

    const viewPath = path.join(viewDir, 'List.vue');
    await fs.writeFile(viewPath, listViewCode);

    return viewPath;
  }

  /**
   * Generate List view code
   */
  generateListViewCode() {
    const { table, fields, auth } = this.config;
    const showInTableFields = Object.keys(fields).filter(f => fields[f].showInTable);
    const filterableFields = Object.keys(fields).filter(f => fields[f].filterable);

    return `<template>
  <div class="list-view">
    <div class="header">
      <h1>${table.charAt(0).toUpperCase() + table.slice(1)} List</h1>
      <div class="actions">
        <button @click="exportToCSV" class="btn btn-secondary">Export to CSV</button>
        <button @click="goToCreate" class="btn btn-primary">Create New</button>
      </div>
    </div>

    <!-- Search and Filters -->
    <div class="filters">
      <input
        v-model="search"
        type="text"
        placeholder="Search..."
        class="search-input"
        @input="fetchData"
      />

      ${filterableFields.map(field => `<div class="filter-field">
        <label>${field}:</label>
        ${fields[field].enumValues ? `<select v-model="filters.${field}" @change="fetchData">
          <option value="">All</option>
          ${fields[field].enumValues.map(val => `<option value="${val}">${val}</option>`).join('\n          ')}
        </select>` : `<input v-model="filters.${field}" type="text" @input="fetchData" />`}
      </div>`).join('\n\n      ')}

      <button @click="clearFilters" class="btn btn-link">Clear Filters</button>
    </div>

    <!-- Data Table -->
    <div class="table-container">
      <table v-if="!loading && data.length > 0" class="data-table">
        <thead>
          <tr>
            ${showInTableFields.map(field => `<th @click="sortBy('${field}')">${field} ${field === 'id' ? '↕' : ''}</th>`).join('\n            ')}
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in data" :key="item.id">
            ${showInTableFields.map(field => `<td>{{ item.${field} }}</td>`).join('\n            ')}
            <td class="actions-cell">
              <button @click="goToEdit(item.id)" class="btn btn-sm btn-info">Edit</button>
              <button @click="deleteItem(item.id)" class="btn btn-sm btn-danger">Delete</button>
            </td>
          </tr>
        </tbody>
      </table>

      <div v-if="loading" class="loading">Loading...</div>
      <div v-if="!loading && data.length === 0" class="no-data">No records found</div>
    </div>

    <!-- Pagination -->
    <div v-if="pagination.pages > 1" class="pagination">
      <button
        @click="changePage(pagination.page - 1)"
        :disabled="pagination.page === 1"
        class="btn btn-sm"
      >
        Previous
      </button>

      <span class="page-info">
        Page {{ pagination.page }} of {{ pagination.pages }}
      </span>

      <button
        @click="changePage(pagination.page + 1)"
        :disabled="pagination.page === pagination.pages"
        class="btn btn-sm"
      >
        Next
      </button>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import axios from 'axios';

export default {
  name: '${table}List',
  setup() {
    const router = useRouter();
    const data = ref([]);
    const loading = ref(false);
    const search = ref('');
    const filters = ref({
      ${filterableFields.map(f => `${f}: ''`).join(',\n      ')}
    });
    const pagination = ref({
      page: 1,
      limit: 10,
      total: 0,
      pages: 0
    });
    const sort = ref('id');
    const order = ref('ASC');

    const API_URL = 'http://localhost:4000/api/${table}';
    const AUTH_CONFIG = ${JSON.stringify(auth, null, 2)};

    function getAuthHeaders() {
      if (AUTH_CONFIG.type === 'apikey') {
        return { Authorization: \`Bearer \${AUTH_CONFIG.apiKey}\` };
      } else if (AUTH_CONFIG.type === 'basic') {
        const credentials = btoa(\`\${AUTH_CONFIG.username}:\${AUTH_CONFIG.password}\`);
        return { Authorization: \`Basic \${credentials}\` };
      }
      return {};
    }

    async function fetchData() {
      loading.value = true;
      try {
        const params = {
          page: pagination.value.page,
          limit: pagination.value.limit,
          sort: sort.value,
          order: order.value,
          search: search.value,
          ...Object.fromEntries(
            Object.entries(filters.value).filter(([_, v]) => v !== '')
          )
        };

        const response = await axios.get(API_URL, {
          params,
          headers: getAuthHeaders()
        });

        data.value = response.data.data;
        pagination.value = response.data.pagination;
      } catch (error) {
        console.error('Error fetching data:', error);
        alert('Failed to fetch data');
      } finally {
        loading.value = false;
      }
    }

    async function exportToCSV() {
      try {
        const params = {
          search: search.value,
          ...Object.fromEntries(
            Object.entries(filters.value).filter(([_, v]) => v !== '')
          )
        };

        const response = await axios.get(\`\${API_URL}/export\`, {
          params,
          headers: getAuthHeaders(),
          responseType: 'blob'
        });

        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', \`${table}-export-\${new Date().toISOString()}.csv\`);
        document.body.appendChild(link);
        link.click();
        link.remove();
      } catch (error) {
        console.error('Error exporting data:', error);
        alert('Failed to export data');
      }
    }

    function sortBy(field) {
      if (sort.value === field) {
        order.value = order.value === 'ASC' ? 'DESC' : 'ASC';
      } else {
        sort.value = field;
        order.value = 'ASC';
      }
      fetchData();
    }

    function changePage(page) {
      pagination.value.page = page;
      fetchData();
    }

    function clearFilters() {
      search.value = '';
      ${filterableFields.map(f => `filters.value.${f} = '';`).join('\n      ')}
      fetchData();
    }

    function goToCreate() {
      router.push('/${table}/create');
    }

    function goToEdit(id) {
      router.push(\`/${table}/edit/\${id}\`);
    }

    async function deleteItem(id) {
      if (!confirm('Are you sure you want to delete this record?')) {
        return;
      }

      try {
        await axios.delete(\`\${API_URL}/\${id}\`, {
          headers: getAuthHeaders()
        });
        alert('Record deleted successfully');
        fetchData();
      } catch (error) {
        console.error('Error deleting record:', error);
        alert('Failed to delete record');
      }
    }

    onMounted(() => {
      fetchData();
    });

    return {
      data,
      loading,
      search,
      filters,
      pagination,
      fetchData,
      exportToCSV,
      sortBy,
      changePage,
      clearFilters,
      goToCreate,
      goToEdit,
      deleteItem
    };
  }
};
</script>

<style scoped>
.list-view {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.actions {
  display: flex;
  gap: 10px;
}

.filters {
  display: flex;
  gap: 15px;
  margin-bottom: 20px;
  flex-wrap: wrap;
  padding: 15px;
  background: #f5f5f5;
  border-radius: 4px;
}

.search-input {
  flex: 1;
  min-width: 200px;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.filter-field {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.filter-field label {
  font-size: 12px;
  font-weight: 600;
  text-transform: capitalize;
}

.filter-field input,
.filter-field select {
  padding: 6px 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.table-container {
  overflow-x: auto;
  background: white;
  border-radius: 4px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table th,
.data-table td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid #eee;
}

.data-table th {
  background: #f8f9fa;
  font-weight: 600;
  cursor: pointer;
  user-select: none;
}

.data-table th:hover {
  background: #e9ecef;
}

.data-table tbody tr:hover {
  background: #f8f9fa;
}

.actions-cell {
  display: flex;
  gap: 8px;
}

.loading,
.no-data {
  padding: 40px;
  text-align: center;
  color: #666;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 15px;
  margin-top: 20px;
}

.page-info {
  font-size: 14px;
  color: #666;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
}

.btn-primary {
  background: #007bff;
  color: white;
}

.btn-primary:hover {
  background: #0056b3;
}

.btn-secondary {
  background: #6c757d;
  color: white;
}

.btn-secondary:hover {
  background: #545b62;
}

.btn-info {
  background: #17a2b8;
  color: white;
}

.btn-info:hover {
  background: #117a8b;
}

.btn-danger {
  background: #dc3545;
  color: white;
}

.btn-danger:hover {
  background: #c82333;
}

.btn-sm {
  padding: 4px 12px;
  font-size: 13px;
}

.btn-link {
  background: none;
  color: #007bff;
  text-decoration: underline;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
`;
  }

  /**
   * Generate Create view
   */
  async generateCreateView() {
    const createViewCode = this.generateCreateViewCode();
    const viewDir = path.join(this.frontendDir, 'views', this.table);
    await fs.mkdir(viewDir, { recursive: true });

    const viewPath = path.join(viewDir, 'Create.vue');
    await fs.writeFile(viewPath, createViewCode);

    return viewPath;
  }

  /**
   * Generate Create view code
   */
  generateCreateViewCode() {
    const { table } = this.config;

    return `<template>
  <div class="create-view">
    <div class="header">
      <h1>Create ${table.charAt(0).toUpperCase() + table.slice(1)}</h1>
      <button @click="goBack" class="btn btn-secondary">Back to List</button>
    </div>

    <FormEditor
      :table="${table}"
      :mode="create"
      @save="handleSave"
      @cancel="goBack"
    />
  </div>
</template>

<script>
import { useRouter } from 'vue-router';
import FormEditor from '../../components/FormEditor.vue';

export default {
  name: '${table}Create',
  components: {
    FormEditor
  },
  setup() {
    const router = useRouter();

    function goBack() {
      router.push('/${table}/list');
    }

    function handleSave() {
      alert('Record created successfully');
      goBack();
    }

    return {
      goBack,
      handleSave
    };
  }
};
</script>

<style scoped>
.create-view {
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
}

.btn-secondary {
  background: #6c757d;
  color: white;
}

.btn-secondary:hover {
  background: #545b62;
}
</style>
`;
  }

  /**
   * Generate Edit view
   */
  async generateEditView() {
    const editViewCode = this.generateEditViewCode();
    const viewDir = path.join(this.frontendDir, 'views', this.table);
    await fs.mkdir(viewDir, { recursive: true });

    const viewPath = path.join(viewDir, 'Edit.vue');
    await fs.writeFile(viewPath, editViewCode);

    return viewPath;
  }

  /**
   * Generate Edit view code
   */
  generateEditViewCode() {
    const { table } = this.config;

    return `<template>
  <div class="edit-view">
    <div class="header">
      <h1>Edit ${table.charAt(0).toUpperCase() + table.slice(1)}</h1>
      <button @click="goBack" class="btn btn-secondary">Back to List</button>
    </div>

    <FormEditor
      :table="${table}"
      :mode="edit"
      :recordId="id"
      @save="handleSave"
      @cancel="goBack"
    />
  </div>
</template>

<script>
import { computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import FormEditor from '../../components/FormEditor.vue';

export default {
  name: '${table}Edit',
  components: {
    FormEditor
  },
  setup() {
    const router = useRouter();
    const route = useRoute();
    const id = computed(() => route.params.id);

    function goBack() {
      router.push('/${table}/list');
    }

    function handleSave() {
      alert('Record updated successfully');
      goBack();
    }

    return {
      id,
      goBack,
      handleSave
    };
  }
};
</script>

<style scoped>
.edit-view {
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
}

.btn-secondary {
  background: #6c757d;
  color: white;
}

.btn-secondary:hover {
  background: #545b62;
}
</style>
`;
  }

  /**
   * Generate FormEditor component
   */
  async generateFormEditor() {
    const formEditorCode = this.generateFormEditorCode();
    const componentDir = path.join(this.frontendDir, 'components');
    await fs.mkdir(componentDir, { recursive: true });

    const componentPath = path.join(componentDir, 'FormEditor.vue');
    await fs.writeFile(componentPath, formEditorCode);

    return componentPath;
  }

  /**
   * Generate FormEditor component code
   */
  generateFormEditorCode() {
    const { table, fields, auth } = this.config;
    const visibleFields = Object.entries(fields).filter(([_, config]) => config.visible);

    return `<template>
  <div class="form-editor">
    <form @submit.prevent="handleSubmit" class="editor-form">
      ${visibleFields.map(([fieldName, fieldConfig]) => {
        const isEditable = fieldConfig.editable;
        const isCreatable = fieldConfig.creatable;
        const isEnum = fieldConfig.enumValues && fieldConfig.enumValues.length > 0;

        return `<div class="form-group">
        <label for="${fieldName}">${fieldName}:</label>
        ${isEnum ? `<select
          id="${fieldName}"
          v-model="formData.${fieldName}"
          :disabled="mode === 'edit' && !${isEditable} || mode === 'create' && !${isCreatable}"
          ${fieldConfig.primary ? 'required' : ''}
        >
          <option value="">Select...</option>
          ${fieldConfig.enumValues.map(val => `<option value="${val}">${val}</option>`).join('\n          ')}
        </select>` : `<input
          id="${fieldName}"
          v-model="formData.${fieldName}"
          type="${fieldConfig.type === 'datetime' ? 'datetime-local' : fieldConfig.type === 'int' ? 'number' : 'text'}"
          :disabled="mode === 'edit' && !${isEditable} || mode === 'create' && !${isCreatable}"
          ${fieldConfig.primary ? 'required' : ''}
        />`}
      </div>`;
      }).join('\n\n      ')}

      <div class="form-actions">
        <button type="submit" class="btn btn-primary" :disabled="loading">
          {{ loading ? 'Saving...' : mode === 'create' ? 'Create' : 'Update' }}
        </button>
        <button type="button" @click="$emit('cancel')" class="btn btn-secondary" :disabled="loading">
          Cancel
        </button>
      </div>
    </form>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';
import axios from 'axios';

export default {
  name: 'FormEditor',
  props: {
    table: {
      type: String,
      required: true
    },
    mode: {
      type: String,
      required: true,
      validator: (value) => ['create', 'edit'].includes(value)
    },
    recordId: {
      type: [String, Number],
      default: null
    }
  },
  emits: ['save', 'cancel'],
  setup(props, { emit }) {
    const formData = ref({
      ${visibleFields.map(([fieldName]) => `${fieldName}: ''`).join(',\n      ')}
    });
    const loading = ref(false);

    const API_URL = \`http://localhost:4000/api/\${props.table}\`;
    const AUTH_CONFIG = ${JSON.stringify(auth, null, 2)};

    function getAuthHeaders() {
      if (AUTH_CONFIG.type === 'apikey') {
        return { Authorization: \`Bearer \${AUTH_CONFIG.apiKey}\` };
      } else if (AUTH_CONFIG.type === 'basic') {
        const credentials = btoa(\`\${AUTH_CONFIG.username}:\${AUTH_CONFIG.password}\`);
        return { Authorization: \`Basic \${credentials}\` };
      }
      return {};
    }

    async function fetchRecord() {
      if (props.mode !== 'edit' || !props.recordId) {
        return;
      }

      loading.value = true;
      try {
        const response = await axios.get(\`\${API_URL}/\${props.recordId}\`, {
          headers: getAuthHeaders()
        });

        formData.value = response.data.data;
      } catch (error) {
        console.error('Error fetching record:', error);
        alert('Failed to fetch record');
      } finally {
        loading.value = false;
      }
    }

    async function handleSubmit() {
      loading.value = true;
      try {
        if (props.mode === 'create') {
          await axios.post(API_URL, formData.value, {
            headers: getAuthHeaders()
          });
        } else {
          await axios.put(\`\${API_URL}/\${props.recordId}\`, formData.value, {
            headers: getAuthHeaders()
          });
        }

        emit('save');
      } catch (error) {
        console.error('Error saving record:', error);
        alert(\`Failed to \${props.mode} record\`);
      } finally {
        loading.value = false;
      }
    }

    onMounted(() => {
      fetchRecord();
    });

    return {
      formData,
      loading,
      handleSubmit
    };
  }
};
</script>

<style scoped>
.form-editor {
  background: white;
  padding: 20px;
  border-radius: 4px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.editor-form {
  max-width: 600px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: 600;
  text-transform: capitalize;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.form-group input:disabled,
.form-group select:disabled {
  background: #f5f5f5;
  cursor: not-allowed;
}

.form-actions {
  display: flex;
  gap: 10px;
  margin-top: 30px;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
}

.btn-primary {
  background: #007bff;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #0056b3;
}

.btn-secondary {
  background: #6c757d;
  color: white;
}

.btn-secondary:hover:not(:disabled) {
  background: #545b62;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
`;
  }

  /**
   * Generate Vue Router configuration
   */
  async generateRouter() {
    const routerCode = this.generateRouterCode();
    const frontendDir = this.frontendDir;
    await fs.mkdir(frontendDir, { recursive: true });

    const routerPath = path.join(frontendDir, 'router.js');

    // Check if router already exists, if so, append routes
    let existingRouter = '';
    try {
      existingRouter = await fs.readFile(routerPath, 'utf-8');
    } catch (error) {
      // File doesn't exist, create new one
    }

    if (existingRouter) {
      // Append new routes to existing router
      // This is a simplified version - in production, you'd parse and merge properly
      await fs.writeFile(routerPath, routerCode);
    } else {
      await fs.writeFile(routerPath, routerCode);
    }

    return routerPath;
  }

  /**
   * Generate Vue Router code
   */
  generateRouterCode() {
    const { table } = this.config;

    return `import { createRouter, createWebHistory } from 'vue-router';
import ${table}List from './views/${table}/List.vue';
import ${table}Create from './views/${table}/Create.vue';
import ${table}Edit from './views/${table}/Edit.vue';

const routes = [
  {
    path: '/${table}/list',
    name: '${table}List',
    component: ${table}List
  },
  {
    path: '/${table}/create',
    name: '${table}Create',
    component: ${table}Create
  },
  {
    path: '/${table}/edit/:id',
    name: '${table}Edit',
    component: ${table}Edit
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

export default router;
`;
  }
}

module.exports = CodeWriter;
