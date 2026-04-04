/**
 * Anthropic Proxy Handler
 * Intercepts Claude API calls, logs them, calculates costs, and forwards to Anthropic
 */

const axios = require('axios');

/**
 * Handle Anthropic API proxy requests
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Object} db - Database instance
 * @param {Object} vault - Key vault instance
 * @param {Object} pricing - Pricing engine instance
 */
async function handleAnthropic(req, res, db, vault, pricing) {
  const startTime = Date.now();

  try {
    // Extract the API path after /anthropic/
    const apiPath = req.url.replace(/^\/anthropic/, '');

    // Get API key from vault
    const apiKey = await vault.getKey('anthropic', 'default');

    if (!apiKey) {
      await logFailure(db, req, 500, Date.now() - startTime, 'API key not found in vault');
      return res.status(500).json({
        error: {
          type: 'configuration_error',
          message: 'Anthropic API key not configured. Please add a key using the vault.'
        }
      });
    }

    // Build full URL to Anthropic API
    const fullUrl = `https://api.anthropic.com${apiPath}`;

    // Prepare headers for Anthropic
    const headers = {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json'
    };

    // Copy specific headers from original request if present
    if (req.headers['anthropic-beta']) {
      headers['anthropic-beta'] = req.headers['anthropic-beta'];
    }

    // Make request to Anthropic
    let anthropicResponse;
    try {
      anthropicResponse = await axios({
        method: req.method,
        url: fullUrl,
        headers: headers,
        data: req.body,
        params: req.query,
        validateStatus: () => true // Don't throw on any status code
      });
    } catch (error) {
      // Network or connection error
      const latency = Date.now() - startTime;
      await logFailure(db, req, 502, latency, `Anthropic API connection error: ${error.message}`);

      return res.status(502).json({
        error: {
          type: 'connection_error',
          message: 'Failed to connect to Anthropic API'
        }
      });
    }

    // Calculate latency
    const latency = Date.now() - startTime;

    // Extract token usage from Anthropic response
    // Anthropic format: usage.input_tokens and usage.output_tokens
    const usage = anthropicResponse.data?.usage || {};
    const inputTokens = usage.input_tokens || 0;
    const outputTokens = usage.output_tokens || 0;
    const model = req.body?.model || 'unknown';

    // Calculate cost
    const cost = pricing.calculateCost('anthropic', model, inputTokens, outputTokens);

    // Log to database
    try {
      await db.logApiCall({
        provider: 'anthropic',
        endpoint: apiPath,
        project: req.toastykey?.project || null,
        session_id: req.toastykey?.session_id || null,
        model: model,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        cost_usd: cost.usd,
        cost_inr: cost.inr,
        status: anthropicResponse.status,
        latency_ms: latency,
        request_data: JSON.stringify({
          method: req.method,
          path: apiPath,
          body: req.body
        }),
        response_data: JSON.stringify({
          status: anthropicResponse.status,
          data: anthropicResponse.data
        })
      });
    } catch (dbError) {
      // Log error but don't fail the request
      console.error('Failed to log API call to database:', dbError.message);
    }

    // Return Anthropic response to caller
    res.status(anthropicResponse.status).json(anthropicResponse.data);

  } catch (error) {
    // Unexpected error in handler
    const latency = Date.now() - startTime;
    console.error('Anthropic proxy handler error:', error);

    try {
      await logFailure(db, req, 500, latency, `Handler error: ${error.message}`);
    } catch (dbError) {
      console.error('Failed to log error to database:', dbError.message);
    }

    res.status(500).json({
      error: {
        type: 'proxy_error',
        message: 'Internal proxy error'
      }
    });
  }
}

/**
 * Log a failed request to the database
 */
async function logFailure(db, req, status, latency, errorMessage) {
  try {
    const apiPath = req.url.replace(/^\/anthropic/, '');

    await db.logApiCall({
      provider: 'anthropic',
      endpoint: apiPath,
      project: req.toastykey?.project || null,
      session_id: req.toastykey?.session_id || null,
      model: req.body?.model || 'unknown',
      input_tokens: 0,
      output_tokens: 0,
      cost_usd: 0,
      cost_inr: 0,
      status: status,
      latency_ms: latency,
      request_data: JSON.stringify({
        method: req.method,
        path: apiPath,
        body: req.body
      }),
      response_data: JSON.stringify({
        error: errorMessage
      })
    });
  } catch (error) {
    console.error('Failed to log failure to database:', error.message);
  }
}

module.exports = {
  handleAnthropic
};