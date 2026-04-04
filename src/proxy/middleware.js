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

module.exports = {
  detectProject,
  checkBudgets
};
