<template>
  <div class="configurator">
    <!-- Step 1: Database Connection -->
    <section class="section" v-if="!connected">
      <h2>Step 1: Connect to Database</h2>
      <div class="card">
        <div class="form-group">
          <label>Database Type:</label>
          <select v-model="dbConnection.type">
            <option value="mysql">MySQL</option>
            <option value="mssql">MS SQL Server</option>
          </select>
        </div>

        <div class="form-group">
          <label>Host:</label>
          <input v-model="dbConnection.host" type="text" placeholder="localhost" />
        </div>

        <div class="form-group">
          <label>Port:</label>
          <input v-model="dbConnection.port" type="number" :placeholder="dbConnection.type === 'mysql' ? '3306' : '1433'" />
        </div>

        <div class="form-group">
          <label>Username:</label>
          <input v-model="dbConnection.user" type="text" />
        </div>

        <div class="form-group">
          <label>Password:</label>
          <input v-model="dbConnection.password" type="password" />
        </div>

        <div class="form-group">
          <label>Database Name:</label>
          <input v-model="dbConnection.database" type="text" />
        </div>

        <button @click="connectToDatabase" class="btn btn-primary" :disabled="connecting">
          {{ connecting ? 'Connecting...' : 'Connect to Database' }}
        </button>
      </div>
    </section>

    <!-- Step 2: Select Table -->
    <section class="section" v-if="connected && !selectedTable">
      <h2>Step 2: Select Table</h2>
      <div class="card">
        <div class="table-list">
          <div
            v-for="table in tables"
            :key="table"
            @click="selectTable(table)"
            class="table-item"
          >
            {{ table }}
          </div>
        </div>
      </div>
    </section>

    <!-- Step 3: Configure Table -->
    <section class="section" v-if="selectedTable && schema">
      <div class="section-header">
        <h2>Step 3: Configure Table - {{ selectedTable }}</h2>
        <button @click="resetSelection" class="btn btn-secondary">Change Table</button>
      </div>

      <!-- Authentication Settings -->
      <div class="card">
        <h3>Authentication Settings</h3>
        <div class="form-group">
          <label>Auth Type:</label>
          <select v-model="config.auth.type">
            <option value="none">None</option>
            <option value="apikey">API Key</option>
            <option value="basic">Basic Auth (Username/Password)</option>
          </select>
        </div>

        <div v-if="config.auth.type === 'apikey'" class="form-group">
          <label>API Key:</label>
          <input v-model="config.auth.apiKey" type="text" placeholder="Enter API key" />
        </div>

        <div v-if="config.auth.type === 'basic'">
          <div class="form-group">
            <label>Username:</label>
            <input v-model="config.auth.username" type="text" />
          </div>
          <div class="form-group">
            <label>Password:</label>
            <input v-model="config.auth.password" type="password" />
          </div>
        </div>
      </div>

      <!-- Field Configuration -->
      <div class="card">
        <h3>Field Configuration</h3>
        <TableFieldEditor
          :fields="config.fields"
          @update="updateFieldConfig"
        />
      </div>

      <!-- Actions -->
      <div class="actions">
        <button @click="saveConfig" class="btn btn-success" :disabled="saving">
          {{ saving ? 'Saving...' : 'Save Configuration' }}
        </button>
        <button @click="generateCode" class="btn btn-primary" :disabled="generating">
          {{ generating ? 'Generating...' : 'Generate Admin Panel' }}
        </button>
      </div>
    </section>

    <!-- Success Message -->
    <div v-if="successMessage" class="success-message">
      {{ successMessage }}
    </div>

    <!-- Error Message -->
    <div v-if="errorMessage" class="error-message">
      {{ errorMessage }}
    </div>
  </div>
</template>

<script>
import { ref } from 'vue';
import axios from 'axios';
import TableFieldEditor from '../components/TableFieldEditor.vue';

export default {
  name: 'Configurator',
  components: {
    TableFieldEditor
  },
  setup() {
    const connected = ref(false);
    const connecting = ref(false);
    const connectionId = ref(null);
    const tables = ref([]);
    const selectedTable = ref(null);
    const schema = ref(null);
    const saving = ref(false);
    const generating = ref(false);
    const successMessage = ref('');
    const errorMessage = ref('');

    const dbConnection = ref({
      type: 'mysql',
      host: 'localhost',
      port: '',
      user: '',
      password: '',
      database: ''
    });

    const config = ref({
      table: '',
      auth: {
        type: 'none',
        apiKey: '',
        username: '',
        password: ''
      },
      fields: {},
      dbConfig: {}
    });

    async function connectToDatabase() {
      connecting.value = true;
      errorMessage.value = '';

      try {
        const response = await axios.post('/api/db/connect', dbConnection.value);

        if (response.data.success) {
          connected.value = true;
          connectionId.value = response.data.connectionId;
          successMessage.value = 'Connected successfully!';
          setTimeout(() => successMessage.value = '', 3000);

          // Fetch tables
          await fetchTables();
        }
      } catch (error) {
        console.error('Connection error:', error);
        errorMessage.value = error.response?.data?.message || 'Failed to connect to database';
      } finally {
        connecting.value = false;
      }
    }

    async function fetchTables() {
      try {
        const response = await axios.get(`/api/db/${connectionId.value}/tables`);

        if (response.data.success) {
          tables.value = response.data.tables;
        }
      } catch (error) {
        console.error('Error fetching tables:', error);
        errorMessage.value = 'Failed to fetch tables';
      }
    }

    async function selectTable(tableName) {
      selectedTable.value = tableName;

      try {
        const response = await axios.get(`/api/db/${connectionId.value}/tables/${tableName}/schema`);

        if (response.data.success) {
          schema.value = response.data.fields;
          config.value.table = tableName;
          config.value.fields = response.data.fields;
          config.value.dbConfig = {
            type: dbConnection.value.type,
            host: dbConnection.value.host,
            port: dbConnection.value.port || (dbConnection.value.type === 'mysql' ? 3306 : 1433),
            user: dbConnection.value.user,
            password: dbConnection.value.password,
            database: dbConnection.value.database
          };
        }
      } catch (error) {
        console.error('Error fetching schema:', error);
        errorMessage.value = 'Failed to fetch table schema';
      }
    }

    function resetSelection() {
      selectedTable.value = null;
      schema.value = null;
      config.value = {
        table: '',
        auth: {
          type: 'none',
          apiKey: '',
          username: '',
          password: ''
        },
        fields: {},
        dbConfig: {}
      };
    }

    function updateFieldConfig(updatedFields) {
      config.value.fields = updatedFields;
    }

    async function saveConfig() {
      saving.value = true;
      errorMessage.value = '';

      try {
        const response = await axios.post('/api/generator/config', config.value);

        if (response.data.success) {
          successMessage.value = 'Configuration saved successfully!';
          setTimeout(() => successMessage.value = '', 3000);
        }
      } catch (error) {
        console.error('Error saving config:', error);
        errorMessage.value = 'Failed to save configuration';
      } finally {
        saving.value = false;
      }
    }

    async function generateCode() {
      // Save config first
      await saveConfig();

      generating.value = true;
      errorMessage.value = '';

      try {
        const response = await axios.post(`/api/generator/generate/${config.value.table}`);

        if (response.data.success) {
          successMessage.value = 'Admin panel generated successfully! Check the /generated folder.';
          setTimeout(() => successMessage.value = '', 5000);
        }
      } catch (error) {
        console.error('Error generating code:', error);
        errorMessage.value = 'Failed to generate code';
      } finally {
        generating.value = false;
      }
    }

    return {
      connected,
      connecting,
      connectionId,
      tables,
      selectedTable,
      schema,
      saving,
      generating,
      successMessage,
      errorMessage,
      dbConnection,
      config,
      connectToDatabase,
      selectTable,
      resetSelection,
      updateFieldConfig,
      saveConfig,
      generateCode
    };
  }
};
</script>

<style scoped>
.configurator {
  max-width: 1200px;
  margin: 0 auto;
}

.section {
  margin-bottom: 30px;
}

.section h2 {
  margin-bottom: 20px;
  color: #667eea;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.card {
  background: white;
  padding: 25px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
}

.card h3 {
  margin-bottom: 20px;
  color: #333;
  font-size: 18px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  color: #555;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 10px 15px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  transition: border-color 0.2s;
}

.form-group input:focus,
.form-group select:focus {
  outline: none;
  border-color: #667eea;
}

.table-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 15px;
}

.table-item {
  padding: 15px;
  background: #f8f9fa;
  border: 2px solid #e9ecef;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  text-align: center;
  font-weight: 500;
}

.table-item:hover {
  background: #667eea;
  color: white;
  border-color: #667eea;
  transform: translateY(-2px);
}

.actions {
  display: flex;
  gap: 15px;
  margin-top: 20px;
}

.btn {
  padding: 12px 24px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 15px;
  font-weight: 600;
  transition: all 0.2s;
}

.btn-primary {
  background: #667eea;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #5568d3;
}

.btn-secondary {
  background: #6c757d;
  color: white;
}

.btn-secondary:hover:not(:disabled) {
  background: #5a6268;
}

.btn-success {
  background: #28a745;
  color: white;
}

.btn-success:hover:not(:disabled) {
  background: #218838;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.success-message {
  position: fixed;
  top: 20px;
  right: 20px;
  background: #28a745;
  color: white;
  padding: 15px 25px;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  animation: slideIn 0.3s ease-out;
}

.error-message {
  position: fixed;
  top: 20px;
  right: 20px;
  background: #dc3545;
  color: white;
  padding: 15px 25px;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}
</style>
