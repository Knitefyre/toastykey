const BaseHandler = require('./base');

class CartesiaHandler extends BaseHandler {
  constructor(vault, pricing) {
    super('cartesia', 'https://api.cartesia.ai', vault, pricing);
  }

  buildHeaders(apiKey, req) {
    return {
      'X-API-Key': apiKey,
      'Content-Type': 'application/json'
    };
  }

  extractModel(req, responseData) {
    return req.body?.model || 'sonic-2';
  }

  calculateCost(model, requestData, responseData) {
    const text = requestData?.transcript || '';
    const characters = text.length;

    const priceData = this.pricing.getPrice('cartesia', model);
    if (!priceData) {
      return { usd: 0, inr: 0 };
    }

    const costUsd = (characters / 1000) * priceData.price;
    const costInr = costUsd * 83.5;

    return { usd: costUsd, inr: costInr };
  }
}

module.exports = CartesiaHandler;
