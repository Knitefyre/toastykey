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

function checkBudgets(db) {
  return async (req, res, next) => {
    // For Session 1, basic checking
    const todaySpend = await db.getTotalSpend('today');

    req.toastykey.currentSpend = todaySpend;

    next();
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
