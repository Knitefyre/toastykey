const BaseHandler = require('./base');

class ElevenLabsHandler extends BaseHandler {
  constructor(vault, pricing) {
    super('elevenlabs', 'https://api.elevenlabs.io', vault, pricing);
  }

  buildHeaders(apiKey, req) {
    return {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json'
    };
  }

  extractModel(req, responseData) {
    return req.body?.model_id || 'eleven_multilingual_v2';
  }

  calculateCost(model, requestData, responseData) {
    const text = requestData?.text || '';
    const characters = text.length;

    const priceData = this.pricing.getPrice('elevenlabs', model);
    if (!priceData) {
      return { usd: 0, inr: 0 };
    }

    const costUsd = (characters / 1000) * priceData.price;
    const costInr = costUsd * 83.5; // USD to INR

    return { usd: costUsd, inr: costInr };
  }
}

module.exports = ElevenLabsHandler;
