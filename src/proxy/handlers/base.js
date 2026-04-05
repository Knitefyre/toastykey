const axios = require('axios');

class BaseHandler {
  constructor(provider, baseUrl, vault, pricing) {
    this.provider = provider;
    this.baseUrl = baseUrl;
    this.vault = vault;
    this.pricing = pricing;
  }

  // Override in subclasses
  async getApiKey(label = 'default') {
    return await this.vault.getKey(this.provider, label);
  }

  // Override in subclasses
  buildHeaders(apiKey, req) {
    return {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    };
  }

  // Override in subclasses
  extractModel(req, responseData) {
    return req.body?.model || 'unknown';
  }

  // Override in subclasses
  calculateCost(model, requestData, responseData) {
    return { usd: 0, inr: 0 };
  }

  extractPath(req) {
    // Extract path after /{provider}/
    const parts = req.path.split('/');
    parts.shift(); // Remove empty string from leading /
    parts.shift(); // Remove provider name
    return '/' + parts.join('/');
  }

  async handle(req, res, db, wsServer) {
    const startTime = Date.now();

    try {
      // 1. Get API key
      const apiKey = await this.getApiKey();
      if (!apiKey) {
        return res.status(500).json({
          error: `${this.provider} API key not configured`
        });
      }

      // 2. Extract path
      const apiPath = this.extractPath(req);

      // 3. Build headers
      const headers = this.buildHeaders(apiKey, req);

      // 4. Forward request
      const fullUrl = `${this.baseUrl}${apiPath}`;
      const response = await axios({
        method: req.method,
        url: fullUrl,
        headers: headers,
        data: req.body,
        params: req.query,
        validateStatus: () => true
      });

      // 5. Calculate latency
      const latency = Date.now() - startTime;

      // 6. Extract model
      const model = this.extractModel(req, response.data);

      // 7. Calculate cost
      const cost = this.calculateCost(model, req.body, response.data);

      // 8. Log to database
      await db.logApiCall({
        provider: this.provider,
        endpoint: apiPath,
        project: req.toastykey?.project || null,
        session_id: req.toastykey?.session_id || null,
        model: model,
        input_tokens: 0,
        output_tokens: 0,
        cost_usd: cost.usd,
        cost_inr: cost.inr,
        status: response.status,
        latency_ms: latency,
        request_data: JSON.stringify({
          method: req.method,
          path: apiPath,
          body: req.body
        }),
        response_data: JSON.stringify({
          status: response.status,
          data: response.data
        })
      });

      // 9. Emit WebSocket
      if (wsServer) {
        wsServer.emitApiCall({
          provider: this.provider,
          endpoint: apiPath,
          model,
          cost_inr: cost.inr,
          cost_usd: cost.usd,
          status: response.status,
          latency_ms: latency,
          timestamp: new Date().toISOString(),
          project: req.toastykey?.project || null
        });
      }

      // 10. Return response
      return res.status(response.status).json(response.data);

    } catch (error) {
      const latency = Date.now() - startTime;
      console.error(`[${this.provider}] Handler error:`, error.message);

      // Log failure
      try {
        await db.logApiCall({
          provider: this.provider,
          endpoint: this.extractPath(req),
          project: req.toastykey?.project || null,
          session_id: req.toastykey?.session_id || null,
          model: 'unknown',
          input_tokens: 0,
          output_tokens: 0,
          cost_usd: 0,
          cost_inr: 0,
          status: 500,
          latency_ms: latency,
          request_data: JSON.stringify({ error: error.message }),
          response_data: JSON.stringify({ error: error.message })
        });
      } catch (dbError) {
        console.error(`[${this.provider}] Failed to log error:`, dbError.message);
      }

      return res.status(500).json({
        error: {
          type: 'proxy_error',
          message: 'Internal proxy error'
        }
      });
    }
  }
}

module.exports = BaseHandler;
