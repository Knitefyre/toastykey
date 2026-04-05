const express = require('express');
const router = express.Router();

function createProjectsRouter(db) {
  // GET /api/projects - All projects
  router.get('/', async (req, res) => {
    try {
      const projects = await db.db.all(`
        SELECT
          p.id,
          p.name,
          p.directory_path,
          p.total_cost as total_cost_inr,
          p.total_cost / 85 as total_cost_usd,
          p.created_at,
          (
            SELECT SUM(cost_inr)
            FROM api_calls
            WHERE project = p.name
            AND timestamp >= datetime('now', 'start of month')
          ) as cost_this_month,
          (
            SELECT MAX(timestamp)
            FROM api_calls
            WHERE project = p.name
          ) as last_active,
          (
            SELECT COUNT(*)
            FROM api_calls
            WHERE project = p.name
          ) as call_count
        FROM projects p
        ORDER BY last_active DESC
      `);

      res.json({ projects });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // GET /api/projects/:id - Single project detail
  router.get('/:id', async (req, res) => {
    try {
      const { id } = req.params;

      const project = await db.db.get(`
        SELECT
          p.*,
          (SELECT COUNT(*) FROM api_calls WHERE project = p.name) as call_count
        FROM projects p
        WHERE p.id = ?
      `, [id]);

      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      // Cost by provider
      const costByProvider = await db.db.all(`
        SELECT
          provider,
          SUM(cost_inr) as cost_inr,
          SUM(cost_usd) as cost_usd
        FROM api_calls
        WHERE project = ?
        GROUP BY provider
      `, [project.name]);

      // Cost over time (last 30 days)
      const costOverTime = await db.db.all(`
        SELECT
          DATE(timestamp) as date,
          SUM(cost_inr) as cost_inr,
          SUM(cost_usd) as cost_usd
        FROM api_calls
        WHERE project = ?
        AND timestamp >= datetime('now', '-30 days')
        GROUP BY DATE(timestamp)
        ORDER BY date ASC
      `, [project.name]);

      // Sessions
      const sessions = await db.db.all(`
        SELECT
          s.id,
          s.total_cost as cost_inr,
          s.started_at,
          (
            SELECT COUNT(*)
            FROM api_calls
            WHERE session_id = s.id
          ) as call_count
        FROM sessions s
        WHERE s.project_id = ?
        ORDER BY s.started_at DESC
        LIMIT 10
      `, [id]);

      // Recent calls
      const recentCalls = await db.db.all(`
        SELECT * FROM api_calls
        WHERE project = ?
        ORDER BY timestamp DESC
        LIMIT 20
      `, [project.name]);

      res.json({
        project,
        cost_by_provider: costByProvider,
        cost_over_time: costOverTime,
        sessions,
        recent_calls: recentCalls
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}

module.exports = createProjectsRouter;
