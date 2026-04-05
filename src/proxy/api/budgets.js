const express = require('express');
const router = express.Router();

function createBudgetsRouter(db) {
  // GET /api/budgets - All budgets with status
  router.get('/', async (req, res) => {
    try {
      const budgets = await db.db.all(`
        SELECT * FROM budgets ORDER BY created_at DESC
      `);

      // Calculate current spend for each budget
      const withStatus = await Promise.all(budgets.map(async (budget) => {
        let currentSpend = 0;

        if (budget.scope === 'global') {
          if (budget.period === 'day') {
            currentSpend = await db.getTotalSpend('today');
          } else if (budget.period === 'week') {
            currentSpend = await db.getTotalSpend('week');
          } else if (budget.period === 'month') {
            currentSpend = await db.getTotalSpend('month');
          }
        } else if (budget.scope === 'project' && budget.scope_id) {
          // Project-specific budget
          const result = await db.db.get(`
            SELECT SUM(cost_inr) as spend
            FROM api_calls
            WHERE project = ?
            AND timestamp >= datetime('now', 'start of ${budget.period}')
          `, [budget.scope_id]);

          currentSpend = result?.spend || 0;
        }

        const percentage = budget.limit_amount > 0
          ? Math.round((currentSpend / budget.limit_amount) * 100)
          : 0;

        let status = 'ok';
        if (percentage >= 80) status = 'exceeded';
        else if (percentage >= 60) status = 'warning';

        return {
          ...budget,
          current_spend: currentSpend,
          percentage,
          status
        };
      }));

      res.json({ budgets: withStatus });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // POST /api/budgets - Create/update budget
  router.post('/', async (req, res) => {
    try {
      const { scope, period, limit_amount, scope_id } = req.body;

      if (!scope || !period || !limit_amount) {
        return res.status(400).json({
          error: 'Missing required fields',
          required: ['scope', 'period', 'limit_amount']
        });
      }

      // Check if budget exists
      const existing = await db.db.get(`
        SELECT id FROM budgets
        WHERE scope = ? AND period = ? AND scope_id ${scope_id ? '= ?' : 'IS NULL'}
      `, scope_id ? [scope, period, scope_id] : [scope, period]);

      if (existing) {
        // Update
        await db.db.run(`
          UPDATE budgets
          SET limit_amount = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [limit_amount, existing.id]);

        res.json({ success: true, budget_id: existing.id, action: 'updated' });
      } else {
        // Create
        const result = await db.db.run(`
          INSERT INTO budgets (scope, period, limit_amount, scope_id)
          VALUES (?, ?, ?, ?)
        `, [scope, period, limit_amount, scope_id || null]);

        res.json({ success: true, budget_id: result.lastID, action: 'created' });
      }
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // POST /api/budgets/override/:id - Temporary limit increase
  router.post('/override/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { new_limit_usd, expires_in_hours = 24 } = req.body;

      if (!new_limit_usd) {
        return res.status(400).json({
          error: 'Missing required field: new_limit_usd'
        });
      }

      const budget = await db.db.get('SELECT * FROM budgets WHERE id = ?', [id]);
      if (!budget) {
        return res.status(404).json({ error: 'Budget not found' });
      }

      // Create budget override
      const expiresAt = new Date(Date.now() + expires_in_hours * 60 * 60 * 1000).toISOString();

      const result = await db.db.run(`
        INSERT INTO budget_overrides (budget_id, new_limit_usd, expires_at)
        VALUES (?, ?, ?)
      `, [id, new_limit_usd, expiresAt]);

      res.json({
        success: true,
        override_id: result.lastID,
        expires_at: expiresAt,
        message: `Budget limit temporarily increased to $${new_limit_usd} until ${expiresAt}`
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}

module.exports = createBudgetsRouter;
