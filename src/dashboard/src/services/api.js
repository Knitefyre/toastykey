const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

/**
 * Generic fetch wrapper with error handling
 */
async function apiFetch(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;

  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(url, config);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`API Error [${endpoint}]:`, error);
    throw error;
  }
}

/**
 * Stats API
 */
export const statsAPI = {
  getOverview: () => apiFetch('/api/stats'),
  getDaily: (days = 30) => apiFetch(`/api/stats/daily?days=${days}`),
  getProviders: () => apiFetch('/api/stats/providers'),
  getTangible: () => apiFetch('/api/stats/tangible'),
  getCalls: (limit = 20, offset = 0) =>
    apiFetch(`/api/stats/calls?limit=${limit}&offset=${offset}`),
};

/**
 * Projects API
 */
export const projectsAPI = {
  getAll: () => apiFetch('/api/projects'),
  getById: (id) => apiFetch(`/api/projects/${id}`),
};

/**
 * Vault API
 */
export const vaultAPI = {
  getKeys: () => apiFetch('/api/vault/keys'),

  addKey: (provider, label, key) =>
    apiFetch('/api/vault/keys', {
      method: 'POST',
      body: JSON.stringify({ provider, label, key }),
    }),

  deleteKey: (id) =>
    apiFetch(`/api/vault/keys/${id}`, {
      method: 'DELETE',
    }),

  revealKey: (id) =>
    apiFetch(`/api/vault/keys/${id}/reveal`, {
      method: 'POST',
    }),

  importEnv: (content) =>
    apiFetch('/api/vault/import-env', {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),
};

/**
 * Budgets API
 */
export const budgetsAPI = {
  getAll: () => apiFetch('/api/budgets'),

  createOrUpdate: (scope, period, limit_amount, entity_id = null) =>
    apiFetch('/api/budgets', {
      method: 'POST',
      body: JSON.stringify({ scope, period, limit_amount, entity_id }),
    }),
};

/**
 * Setup API
 */
export const setupAPI = {
  getStatus: () => apiFetch('/api/setup/status'),

  scanDirectories: (directories) =>
    apiFetch('/api/setup/scan', {
      method: 'POST',
      body: JSON.stringify({ directories }),
    }),
};

/**
 * Health API
 */
export const healthAPI = {
  check: () => apiFetch('/api/health'),
};

// Convenience exports for direct function imports
export const getStats = () => statsAPI.getOverview();
export const getDailySpend = (days = 30) => statsAPI.getDaily(days);
export const getProviderBreakdown = () => statsAPI.getProviders();
export const getTangibleOutputs = () => statsAPI.getTangible();
export const getRecentCalls = (limit = 20, offset = 0) => statsAPI.getCalls(limit, offset);

export const getProjects = () => projectsAPI.getAll();
export const getProject = (id) => projectsAPI.getById(id);

export const getKeys = () => vaultAPI.getKeys();
export const addKey = (data) => vaultAPI.addKey(data.provider, data.label, data.key);
export const deleteKey = (id) => vaultAPI.deleteKey(id);
export const revealKey = (id) => vaultAPI.revealKey(id);
export const importEnv = (content) => vaultAPI.importEnv(content);

export const getBudgets = () => budgetsAPI.getAll();
export const setBudget = (data) => budgetsAPI.createOrUpdate(data.scope, data.period, data.limit, data.entity_id);

export const getSetupStatus = () => setupAPI.getStatus();
export const scanForEnv = (directories) => setupAPI.scanDirectories(directories);

// Export all APIs as default
export default {
  stats: statsAPI,
  projects: projectsAPI,
  vault: vaultAPI,
  budgets: budgetsAPI,
  setup: setupAPI,
  health: healthAPI,
};
