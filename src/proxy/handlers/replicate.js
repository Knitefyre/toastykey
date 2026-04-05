const BaseHandler = require('./base');

class ReplicateHandler extends BaseHandler {
  constructor(vault, pricing) {
    super('replicate', 'https://api.replicate.com', vault, pricing);
  }

  extractModel(req, responseData) {
    return req.body?.version || 'unknown';
  }

  calculateCost(model, requestData, responseData) {
    // Replicate pricing is per prediction
    const priceData = this.pricing.getPrice('replicate', 'prediction');
    if (!priceData) {
      return { usd: 0, inr: 0 };
    }

    const costUsd = priceData.price;
    const costInr = costUsd * 83.5;

    return { usd: costUsd, inr: costInr };
  }
}

module.exports = ReplicateHandler;
