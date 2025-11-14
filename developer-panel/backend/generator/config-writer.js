const fs = require('fs').promises;
const path = require('path');

class ConfigWriter {
  constructor(config) {
    this.config = config;
    this.outputDir = path.join(__dirname, '../../../generated/backend/config');
  }

  /**
   * Save configuration to generated folder
   */
  async save() {
    try {
      // Ensure output directory exists
      await fs.mkdir(this.outputDir, { recursive: true });

      // Write config file
      const configPath = path.join(this.outputDir, `${this.config.table}.json`);
      await fs.writeFile(configPath, JSON.stringify(this.config, null, 2));

      return configPath;
    } catch (error) {
      throw new Error(`Failed to save config: ${error.message}`);
    }
  }

  /**
   * Validate configuration
   */
  validate() {
    const errors = [];

    if (!this.config.table) {
      errors.push('Table name is required');
    }

    if (!this.config.fields || Object.keys(this.config.fields).length === 0) {
      errors.push('At least one field is required');
    }

    if (this.config.auth) {
      if (!['none', 'apikey', 'basic'].includes(this.config.auth.type)) {
        errors.push('Invalid auth type. Must be: none, apikey, or basic');
      }

      if (this.config.auth.type === 'apikey' && !this.config.auth.apiKey) {
        errors.push('API key is required when auth type is apikey');
      }

      if (this.config.auth.type === 'basic') {
        if (!this.config.auth.username || !this.config.auth.password) {
          errors.push('Username and password are required when auth type is basic');
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

module.exports = ConfigWriter;
