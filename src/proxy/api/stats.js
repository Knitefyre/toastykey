const express = require('express');
const router = express.Router();

function createStatsRouter(db) {
  // GET /api/stats - Overview stats
  router.get('/', async (req, res) => {
    try {
      const today = await db.getTotalSpend('today');
      const yesterday = await db.getTotalSpend('yesterday');
      const month = await db.getTotalSpend('month');

      const todayCallCount = await db.getCallCount('today');
      const activeProjects = await db.getActiveProjectCount();
      const activeKeys = await db.getActiveKeyCount();

      // Calculate delta vs yesterday
      const deltaVsYesterday = yesterday > 0
        ? (today - yesterday) / yesterday
        : 0;

      res.json({
        today: {
          total_inr: today,
          total_usd: today / 85, // Approximate conversion
          delta_vs_yesterday: deltaVsYesterday,
          call_count: todayCallCount
        },
        month: {
          total_inr: month,
          total_usd: month / 85,
          call_count: await db.getCallCount('month')
        },
        active_projects: activeProjects,
        active_keys: activeKeys
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // GET /api/stats/daily - Daily spend array
  router.get('/daily', async (req, res) => {
    try {
      const days = parseInt(req.query.days) || 30;
      const dailyData = await db.getDailySpend(days);

      res.json({ daily: dailyData });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // GET /api/stats/providers - Provider breakdown
  router.get('/providers', async (req, res) => {
    try {
      const providers = await db.getSpendByProvider();
      const total = providers.reduce((sum, p) => sum + p.total_inr, 0);

      const withPercentages = providers.map(p => ({
        ...p,
        percentage: total > 0 ? Math.round((p.total_inr / total) * 100) : 0,
        total_usd: p.total_inr / 85
      }));

      res.json({ providers: withPercentages });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // GET /api/stats/tangible - Human-readable outputs
  router.get('/tangible', async (req, res) => {
    try {
      const calls = await db.getAllApiCalls();

      const outputs = {
        images: { count: 0, cost: 0 },
        llm_calls: { count: 0, cost: 0 },
        audio: { count: 0, cost: 0 }
      };

      calls.forEach(call => {
        // Images: DALL-E, Stability AI, Replicate image models
        if (call.provider === 'stability' ||
            call.endpoint.includes('/images') ||
            (call.model && (call.model.includes('dall-e') || call.model.includes('stable-diffusion')))) {
          outputs.images.count += 1;
          outputs.images.cost += call.cost_inr || 0;
        }

        // LLM calls: OpenAI chat, Anthropic messages
        if ((call.provider === 'openai' || call.provider === 'anthropic') &&
            (call.endpoint.includes('/chat') || call.endpoint.includes('/messages'))) {
          outputs.llm_calls.count += 1;
          outputs.llm_calls.cost += call.cost_inr || 0;
        }

        // Audio: ElevenLabs, Cartesia, OpenAI Whisper/TTS
        if (call.provider === 'elevenlabs' || call.provider === 'cartesia' ||
            call.endpoint.includes('/audio') ||
            (call.model && (call.model.includes('whisper') || call.model.includes('tts')))) {
          outputs.audio.count += 1; // Count each call as 1 minute
          outputs.audio.cost += call.cost_inr || 0;
        }
      });

      res.json(outputs);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // GET /api/stats/calls - Recent API calls
  router.get('/calls', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 20;
      const offset = parseInt(req.query.offset) || 0;

      const calls = await db.getRecentCalls(limit, offset);
      const total = await db.getTotalCallCount();

      res.json({ calls, total });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}

module.exports = createStatsRouter;
