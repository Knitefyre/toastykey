class BaselineStorage {
  constructor(db) {
    this.db = db;
  }

  async getRate(scope, scopeId, windowMinutes) {
    const baseline = await this.db.getBaseline(scope, scopeId, 'call_rate', 7);
    if (!baseline) return null;

    return {
      value: baseline.value,
      sample_size: baseline.sample_size
    };
  }

  async getCost(scope, scopeId) {
    const baseline = await this.db.getBaseline(scope, scopeId, 'cost_rate', 7);
    if (!baseline) return null;

    return {
      value: baseline.value,
      sample_size: baseline.sample_size
    };
  }

  async getErrorRate(scope, scopeId) {
    const baseline = await this.db.getBaseline(scope, scopeId, 'error_rate', 7);
    if (!baseline) return null;

    return {
      value: baseline.value,
      sample_size: baseline.sample_size
    };
  }

  async getTokenAverage(scope, scopeId) {
    const baseline = await this.db.getBaseline(scope, scopeId, 'token_avg', 7);
    if (!baseline) return null;

    return {
      value: baseline.value,
      sample_size: baseline.sample_size
    };
  }

  async storeRate(scope, scopeId, value, sampleSize) {
    const today = new Date().toISOString().split('T')[0];
    return await this.db.createBaseline(today, scope, scopeId, 'call_rate', value, sampleSize);
  }

  async storeCost(scope, scopeId, value, sampleSize) {
    const today = new Date().toISOString().split('T')[0];
    return await this.db.createBaseline(today, scope, scopeId, 'cost_rate', value, sampleSize);
  }

  async storeErrorRate(scope, scopeId, value, sampleSize) {
    const today = new Date().toISOString().split('T')[0];
    return await this.db.createBaseline(today, scope, scopeId, 'error_rate', value, sampleSize);
  }

  async storeTokenAverage(scope, scopeId, value, sampleSize) {
    const today = new Date().toISOString().split('T')[0];
    return await this.db.createBaseline(today, scope, scopeId, 'token_avg', value, sampleSize);
  }
}

module.exports = BaselineStorage;
