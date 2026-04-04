/**
 * OpenAI Proxy Handler
 * Intercepts OpenAI API calls, logs them, calculates costs, and forwards to OpenAI
 */

const axios = require('axios');

/**
 * Handle OpenAI API proxy requests
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Object} db - Database instance
 * @param {Object} vault - Key vault instance
 * @param {Object} pricing - Pricing engine instance
 */
async function handleOpenAI(req, res, db, vault, pricing, wsServer) {
  const startTime = Date.now();

  try {
    // Extract the API path after /openai/
    const apiPath = req.url.replace(/^\/openai/, '');

    // Get API key from vault
    const apiKey = await vault.getKey('openai', 'default');

    if (!apiKey) {
      await logFailure(db, req, 500, Date.now() - startTime, 'API key not found in vault');
      return res.status(500).json({
        error: {
          message: 'OpenAI API key not configured. Please add a key using the vault.',
          type: 'configuration_error',
          code: 'missing_api_key'
        }
      });
    }

    // Build full URL to OpenAI API
    const fullUrl = `https://api.openai.com${apiPath}`;

    // Prepare headers for OpenAI
    const headers = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    };

    // Copy specific headers from original request if present
    if (req.headers['openai-organization']) {
      headers['OpenAI-Organization'] = req.headers['openai-organization'];
    }
    if (req.headers['openai-project']) {
      headers['OpenAI-Project'] = req.headers['openai-project'];
    }

    // Make request to OpenAI
    let openaiResponse;
    try {
      openaiResponse = await axios({
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
      await logFailure(db, req, 502, latency, `OpenAI API connection error: ${error.message}`);

      return res.status(502).json({
        error: {
          message: 'Failed to connect to OpenAI API',
          type: 'connection_error',
          code: 'upstream_connection_failed'
        }
      });
    }

    // Calculate latency
    const latency = Date.now() - startTime;

    // Extract token usage and model from response
    const usage = openaiResponse.data?.usage || {};
    const inputTokens = usage.prompt_tokens || 0;
    const outputTokens = usage.completion_tokens || 0;
    const model = openaiResponse.data?.model || req.body?.model || 'unknown';

    // Calculate cost
    const cost = pricing.calculateCost('openai', model, inputTokens, outputTokens);

    // Log to database
    try {
      await db.logApiCall({
        provider: 'openai',
        endpoint: apiPath,
        project: req.toastykey?.project || null,
        session_id: req.toastykey?.session_id || null,
        model: model,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        cost_usd: cost.usd,
        cost_inr: cost.inr,
        status: openaiResponse.status,
        latency_ms: latency,
        request_data: JSON.stringify({
          method: req.method,
          path: apiPath,
          body: req.body
        }),
        response_data: JSON.stringify({
          status: openaiResponse.status,
          data: openaiResponse.data
        })
      });

      // Emit WebSocket event for real-time updates
      if (wsServer) {
        wsServer.emitApiCall({
          provider: 'openai',
          endpoint: apiPath,
          model,
          cost_inr: cost.inr,
          cost_usd: cost.usd,
          status: openaiResponse.status,
          latency_ms: latency,
          timestamp: new Date().toISOString(),
          project: req.toastykey?.project || null
        });
      }
    } catch (dbError) {
      // Log error but don't fail the request
      console.error('Failed to log API call to database:', dbError.message);
    }

    // Return OpenAI response to caller
    res.status(openaiResponse.status).json(openaiResponse.data);

  } catch (error) {
    // Unexpected error in handler
    const latency = Date.now() - startTime;
    console.error('OpenAI proxy handler error:', error);

    try {
      await logFailure(db, req, 500, latency, `Handler error: ${error.message}`);
    } catch (dbError) {
      console.error('Failed to log error to database:', dbError.message);
    }

    res.status(500).json({
      error: {
        message: 'Internal proxy error',
        type: 'proxy_error',
        code: 'internal_error'
      }
    });
  }
}

/**
 * Log a failed request to the database
 */
async function logFailure(db, req, status, latency, errorMessage) {
  try {
    const apiPath = req.url.replace(/^\/openai/, '');

    await db.logApiCall({
      provider: 'openai',
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
  handleOpenAI
};
