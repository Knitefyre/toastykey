const fs = require('fs');
const path = require('path');

class PricingEngine {
  constructor(pricingDir, inrRate = 85) {
    this.pricingDir = pricingDir;
    this.inrRate = inrRate;
    this.pricing = {};
    this.loadPricing();
  }

  loadPricing() {
    const files = fs.readdirSync(this.pricingDir);

    for (const file of files) {
      if (file.endsWith('.json')) {
        const data = JSON.parse(
          fs.readFileSync(path.join(this.pricingDir, file), 'utf8')
        );
        this.pricing[data.provider] = data;
      }
    }
  }

  calculateCost(provider, model, inputTokens = 0, outputTokens = 0) {
    const providerPricing = this.pricing[provider];

    if (!providerPricing) {
      return { usd: 0, inr: 0, details: 'Unknown provider' };
    }

    const modelPricing = providerPricing.models[model];

    if (!modelPricing) {
      // Try to find a partial match
      const modelKey = Object.keys(providerPricing.models).find(key =>
        model.includes(key) || key.includes(model)
      );

      if (!modelKey) {
        return { usd: 0, inr: 0, details: 'Unknown model' };
      }

      return this._calculateFromPricing(
        providerPricing.models[modelKey],
        inputTokens,
        outputTokens
      );
    }

    return this._calculateFromPricing(modelPricing, inputTokens, outputTokens);
  }

  _calculateFromPricing(pricing, inputTokens, outputTokens) {
    let costUsd = 0;

    if (pricing.unit === '1k_tokens') {
      // LLM pricing
      costUsd = (
        (pricing.input * inputTokens / 1000) +
        (pricing.output * outputTokens / 1000)
      );
    } else if (pricing.unit === 'per_minute') {
      // Audio pricing (inputTokens represents seconds)
      costUsd = pricing.price * (inputTokens / 60);
    } else if (pricing.unit === '1k_characters') {
      // TTS pricing
      costUsd = pricing.price * (inputTokens / 1000);
    } else if (pricing.unit === 'per_image') {
      // Image pricing (would need more context about which tier)
      costUsd = pricing.standard_1024 || 0;
    }

    return {
      usd: Number(costUsd.toFixed(6)),
      inr: Number((costUsd * this.inrRate).toFixed(2)),
      details: `${inputTokens} input, ${outputTokens} output tokens`
    };
  }

  getSupportedProviders() {
    return Object.keys(this.pricing);
  }

  getSupportedModels(provider) {
    const providerPricing = this.pricing[provider];
    return providerPricing ? Object.keys(providerPricing.models) : [];
  }
}

module.exports = PricingEngine;
