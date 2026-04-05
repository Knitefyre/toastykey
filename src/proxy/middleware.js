function detectProject(db) {
  return (req, res, next) => {
    // Check custom header first
    let project = req.headers['x-toastykey-project'];

    // If no header, use working directory
    if (!project) {
      project = process.cwd();
    }

    // Store in request for use by proxy handlers
    req.toastykey = {
      project: project
    };

    next();
  };
}

function checkBudgets(db, wsServer) {
  return async (req, res, next) => {
    try {
      // Get active budgets with enforcement enabled
      const budgets = await db.all('SELECT * FROM budgets WHERE active = 1 AND enforce = 1');

      if (budgets.length === 0) {
        // No enforcement, just track
        const todaySpend = await db.getTotalSpend('today');
        req.toastykey = req.toastykey || {};
        req.toastykey.currentSpend = todaySpend;
        return next();
      }

      // Check each budget
      for (const budget of budgets) {
        let spend;
        if (budget.period === 'daily') {
          spend = await db.getTotalSpend('today');
        } else if (budget.period === 'weekly') {
          spend = await db.getTotalSpend('week');
        } else if (budget.period === 'monthly') {
          spend = await db.getTotalSpend('month');
        } else {
          continue;
        }

        const percentage = (spend / budget.limit_usd) * 100;

        // Check for budget override
        const override = await db.getActiveBudgetOverride(budget.id);
        const effectiveLimit = override ? override.new_limit_usd : budget.limit_usd;
        const effectivePercentage = (spend / effectiveLimit) * 100;

        // Emit warnings
        if (effectivePercentage >= budget.notify_at_percent && effectivePercentage < 100 && wsServer) {
          wsServer.emit('budget_warning', {
            budget_id: budget.id,
            period: budget.period,
            spent: spend,
            limit: effectiveLimit,
            percentage: effectivePercentage,
            threshold: budget.notify_at_percent
          });
        }

        // Block at 100%
        if (effectivePercentage >= 100) {
          if (wsServer) {
            wsServer.emit('budget_exceeded', {
              budget_id: budget.id,
              period: budget.period,
              spent: spend,
              limit: effectiveLimit,
              percentage: effectivePercentage
            });
          }

          return res.status(429).json({
            error: 'ToastyKey: Budget limit exceeded',
            budget: {
              period: budget.period,
              limit_usd: effectiveLimit,
              spent_usd: spend,
              percentage: effectivePercentage.toFixed(1)
            },
            message: `Your ${budget.period} budget of $${effectiveLimit} has been exceeded. Current spend: $${spend.toFixed(2)}`,
            override_endpoint: `/api/budgets/override/${budget.id}`
          });
        }
      }

      req.toastykey = req.toastykey || {};
      req.toastykey.currentSpend = await db.getTotalSpend('today');
      next();
    } catch (error) {
      console.error('[checkBudgets] Error:', error.message);
      next(); // Don't block on error
    }
  };
}

function checkPauseState(db) {
  return async (req, res, next) => {
    // Extract provider from URL path
    const provider = req.path.split('/')[1]; // /openai/* -> 'openai'
    req.toastykey = req.toastykey || {};
    req.toastykey.provider = provider;

    // Check if provider is paused
    const providerPause = await db.get(`
      SELECT * FROM pause_states
      WHERE entity_type = 'provider' AND entity_id = ?
    `, [provider]);

    if (providerPause) {
      return res.status(429).json({
        error: 'ToastyKey: API calls paused',
        reason: 'anomaly_detected',
        trigger: providerPause.reason,
        paused_at: providerPause.paused_at,
        resume_endpoint: `POST /api/triggers/resume/provider/${provider}`
      });
    }

    // Check if project is paused (if project detected)
    if (req.toastykey.project) {
      const projectPause = await db.get(`
        SELECT * FROM pause_states
        WHERE entity_type = 'project' AND entity_id = ?
      `, [req.toastykey.project]);

      if (projectPause) {
        return res.status(429).json({
          error: 'ToastyKey: API calls paused',
          reason: 'anomaly_detected',
          trigger: projectPause.reason,
          paused_at: projectPause.paused_at,
          project: req.toastykey.project,
          resume_endpoint: `POST /api/triggers/resume/project/${encodeURIComponent(req.toastykey.project)}`
        });
      }
    }

    next();
  };
}

module.exports = {
  detectProject,
  checkBudgets,
  checkPauseState
};
