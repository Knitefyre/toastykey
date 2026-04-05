const cron = require('node-cron');

class ReportScheduler {
  constructor(db, generator) {
    this.db = db;
    this.generator = generator;
    this.jobs = [];
  }

  start(config = {}) {
    const {
      auto_generate = true,
      daily = '0 0 * * *',        // Midnight
      weekly = '0 0 * * 1',       // Monday midnight
      monthly = '0 0 1 * *'       // 1st of month
    } = config;

    if (!auto_generate) return;

    // Daily report
    this.jobs.push(
      cron.schedule(daily, () => this.generateDaily())
    );

    // Weekly report
    this.jobs.push(
      cron.schedule(weekly, () => this.generateWeekly())
    );

    // Monthly report
    this.jobs.push(
      cron.schedule(monthly, () => this.generateMonthly())
    );

    console.log('[ReportScheduler] Started');
  }

  stop() {
    this.jobs.forEach(job => job.stop());
    this.jobs = [];
    console.log('[ReportScheduler] Stopped');
  }

  async generateDaily() {
    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);

      const startDate = yesterday.toISOString();
      const endDate = new Date(yesterday.getTime() + 24 * 60 * 60 * 1000).toISOString();

      const { html, json, report } = await this.generator.generateReport('daily', startDate, endDate);
      await this.generator.saveReport(report, html, json);

      console.log(`[ReportScheduler] Daily report generated for ${yesterday.toDateString()}`);
    } catch (error) {
      console.error('[ReportScheduler] Failed to generate daily report:', error);
    }
  }

  async generateWeekly() {
    try {
      const lastWeek = new Date();
      lastWeek.setDate(lastWeek.getDate() - 7);
      lastWeek.setHours(0, 0, 0, 0);

      const startDate = lastWeek.toISOString();
      const endDate = new Date(lastWeek.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

      const { html, json, report } = await this.generator.generateReport('weekly', startDate, endDate);
      await this.generator.saveReport(report, html, json);

      console.log('[ReportScheduler] Weekly report generated');
    } catch (error) {
      console.error('[ReportScheduler] Failed to generate weekly report:', error);
    }
  }

  async generateMonthly() {
    try {
      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      lastMonth.setDate(1);
      lastMonth.setHours(0, 0, 0, 0);

      const startDate = lastMonth.toISOString();
      const nextMonth = new Date(lastMonth);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      const endDate = nextMonth.toISOString();

      const { html, json, report } = await this.generator.generateReport('monthly', startDate, endDate);
      await this.generator.saveReport(report, html, json);

      console.log('[ReportScheduler] Monthly report generated');
    } catch (error) {
      console.error('[ReportScheduler] Failed to generate monthly report:', error);
    }
  }
}

module.exports = ReportScheduler;
