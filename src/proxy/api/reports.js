const express = require('express');
const router = express.Router();

function createReportsRouter(db, generator) {
  // GET /api/reports - List all reports
  router.get('/', async (req, res) => {
    try {
      const { type, limit = 10, offset = 0 } = req.query;

      let query = 'SELECT id, period, generated_at FROM reports WHERE 1=1';
      const params = [];

      if (type) {
        query += ' AND period LIKE ?';
        params.push(`%${type}%`);
      }

      query += ' ORDER BY generated_at DESC LIMIT ? OFFSET ?';
      params.push(parseInt(limit), parseInt(offset));

      const reports = await db.all(query, params);

      const total = await db.get('SELECT COUNT(*) as count FROM reports');

      res.json({
        reports,
        total: total.count
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // POST /api/reports/generate - Generate on demand
  router.post('/generate', async (req, res) => {
    try {
      const { type, start_date, end_date } = req.body;

      if (!type || !start_date || !end_date) {
        return res.status(400).json({
          error: 'Missing required fields',
          required: ['type', 'start_date', 'end_date']
        });
      }

      const { html, json, report } = await generator.generateReport(type, start_date, end_date);
      const saved = await generator.saveReport(report, html, json);

      res.json({
        success: true,
        report_id: saved.report_id,
        html_path: saved.html_path
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // GET /api/reports/:id - Get specific report
  router.get('/:id', async (req, res) => {
    try {
      const { id } = req.params;

      const report = await db.get('SELECT * FROM reports WHERE id = ?', [id]);

      if (!report) {
        return res.status(404).json({ error: 'Report not found' });
      }

      // Parse JSON
      report.summary_json = JSON.parse(report.summary_json);

      res.json({ report });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // DELETE /api/reports/:id - Delete report
  router.delete('/:id', async (req, res) => {
    try {
      const { id } = req.params;

      await db.run('DELETE FROM reports WHERE id = ?', [id]);

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}

module.exports = createReportsRouter;
