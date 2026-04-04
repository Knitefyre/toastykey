const path = require('path');
const os = require('os');

module.exports = {
  proxy: {
    port: 4000,
    host: 'localhost'
  },
  database: {
    path: path.join(__dirname, '..', 'toastykey.db')
  },
  vault: {
    algorithm: 'aes-256-gcm',
    // Machine-specific salt derived from hostname
    machineId: os.hostname()
  },
  pricing: {
    directory: path.join(__dirname, '..', 'pricing'),
    inrRate: 85 // USD to INR conversion rate
  },
  mcp: {
    name: 'toastykey',
    version: '0.1.0'
  }
};
