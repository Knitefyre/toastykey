const BaseHandler = require('./base');

class StabilityHandler extends BaseHandler {
  constructor(vault, pricing) {
    super('stability', 'https://api.stability.ai', vault, pricing);
  }

  extractModel(req, responseData) {
    // Extract model from path like /v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image
    const parts = req.path.split('/');
    return parts[3] || 'stable-diffusion-xl';
  }

  calculateCost(model, requestData, responseData) {
    const priceData = this.pricing.getPrice('stability', model);
    if (!priceData) {
      return { usd: 0, inr: 0 };
    }

    const costUsd = priceData.price; // Per image
    const costInr = costUsd * 83.5;

    return { usd: costUsd, inr: costInr };
  }
}

module.exports = StabilityHandler;
