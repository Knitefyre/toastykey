const BaseHandler = require('./base');

class GenericHandler extends BaseHandler {
  constructor(config, vault, pricing) {
    super(config.name, config.base_url, vault, pricing);
    this.config = config;
  }

  buildHeaders(apiKey, req) {
    const headers = {
      'Content-Type': 'application/json'
    };

    // Support different auth patterns
    if (this.config.auth_type === 'bearer') {
      headers['Authorization'] = `Bearer ${apiKey}`;
    } else if (this.config.auth_type === 'header') {
      headers[this.config.auth_header || 'X-API-Key'] = apiKey;
    }

    return headers;
  }

  extractModel(req, responseData) {
    return req.body?.model || this.config.default_model || 'unknown';
  }

  calculateCost(model, requestData, responseData) {
    // Generic providers use flat rate or custom pricing
    const priceData = this.pricing.getPrice(this.provider, model);
    if (!priceData) {
      return { usd: 0, inr: 0 };
    }

    const costUsd = priceData.price;
    const costInr = costUsd * 83.5;

    return { usd: costUsd, inr: costInr };
  }
}

module.exports = GenericHandler;
