<template>
  <div class="field-editor">
    <table class="field-table">
      <thead>
        <tr>
          <th>Field Name</th>
          <th>Type</th>
          <th>Primary</th>
          <th>Show in Table</th>
          <th>Filterable</th>
          <th>Editable</th>
          <th>Creatable</th>
          <th>Visible</th>
          <th>Enum Values</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(field, fieldName) in localFields" :key="fieldName">
          <td class="field-name">{{ fieldName }}</td>
          <td>
            <span class="field-type">{{ field.type }}</span>
          </td>
          <td>
            <input
              type="checkbox"
              :checked="field.primary"
              disabled
              class="checkbox"
            />
          </td>
          <td>
            <input
              type="checkbox"
              v-model="field.showInTable"
              @change="emitUpdate"
              class="checkbox"
            />
          </td>
          <td>
            <input
              type="checkbox"
              v-model="field.filterable"
              @change="emitUpdate"
              class="checkbox"
            />
          </td>
          <td>
            <input
              type="checkbox"
              v-model="field.editable"
              @change="emitUpdate"
              :disabled="field.primary || field.autoIncrement"
              class="checkbox"
            />
          </td>
          <td>
            <input
              type="checkbox"
              v-model="field.creatable"
              @change="emitUpdate"
              :disabled="field.primary || field.autoIncrement"
              class="checkbox"
            />
          </td>
          <td>
            <input
              type="checkbox"
              v-model="field.visible"
              @change="emitUpdate"
              class="checkbox"
            />
          </td>
          <td>
            <div v-if="field.enumValues && field.enumValues.length > 0" class="enum-values">
              <span v-for="(value, index) in field.enumValues" :key="index" class="enum-tag">
                {{ value }}
              </span>
            </div>
            <div v-else>
              <input
                type="text"
                v-model="field.enumValuesInput"
                @blur="updateEnumValues(fieldName)"
                placeholder="value1,value2,..."
                class="enum-input"
              />
            </div>
          </td>
        </tr>
      </tbody>
    </table>

    <div class="help-text">
      <p><strong>Field Configuration Guide:</strong></p>
      <ul>
        <li><strong>Show in Table:</strong> Display this field in the list view</li>
        <li><strong>Filterable:</strong> Allow filtering by this field</li>
        <li><strong>Editable:</strong> Allow editing this field in edit form</li>
        <li><strong>Creatable:</strong> Include this field in create form</li>
        <li><strong>Visible:</strong> Show this field in forms (can be hidden for sensitive data)</li>
        <li><strong>Enum Values:</strong> Comma-separated values for dropdown (e.g., admin,editor,viewer)</li>
      </ul>
    </div>
  </div>
</template>

<script>
import { ref, watch } from 'vue';

export default {
  name: 'TableFieldEditor',
  props: {
    fields: {
      type: Object,
      required: true
    }
  },
  emits: ['update'],
  setup(props, { emit }) {
    const localFields = ref({ ...props.fields });

    // Watch for changes from parent
    watch(() => props.fields, (newFields) => {
      localFields.value = { ...newFields };
    }, { deep: true });

    function emitUpdate() {
      emit('update', localFields.value);
    }

    function updateEnumValues(fieldName) {
      const field = localFields.value[fieldName];
      if (field.enumValuesInput) {
        field.enumValues = field.enumValuesInput
          .split(',')
          .map(v => v.trim())
          .filter(v => v.length > 0);
      }
      emitUpdate();
    }

    return {
      localFields,
      emitUpdate,
      updateEnumValues
    };
  }
};
</script>

<style scoped>
.field-editor {
  width: 100%;
}

.field-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 20px;
  background: white;
}

.field-table th,
.field-table td {
  padding: 12px;
  text-align: left;
  border: 1px solid #e9ecef;
}

.field-table th {
  background: #f8f9fa;
  font-weight: 600;
  color: #495057;
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.field-table tbody tr:hover {
  background: #f8f9fa;
}

.field-name {
  font-weight: 600;
  color: #333;
  font-family: 'Courier New', monospace;
}

.field-type {
  display: inline-block;
  padding: 4px 8px;
  background: #e7f3ff;
  color: #0066cc;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  font-family: 'Courier New', monospace;
}

.checkbox {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.checkbox:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.enum-values {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.enum-tag {
  display: inline-block;
  padding: 3px 8px;
  background: #d4edda;
  color: #155724;
  border-radius: 3px;
  font-size: 11px;
  font-weight: 500;
}

.enum-input {
  width: 100%;
  padding: 6px 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 12px;
}

.help-text {
  background: #f8f9fa;
  padding: 15px;
  border-radius: 6px;
  border-left: 4px solid #667eea;
}

.help-text p {
  margin-bottom: 10px;
  color: #333;
}

.help-text ul {
  margin-left: 20px;
  color: #666;
  font-size: 14px;
  line-height: 1.8;
}

.help-text li {
  margin-bottom: 5px;
}

.help-text strong {
  color: #333;
}
</style>
