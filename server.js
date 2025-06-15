require('dotenv').config();
const express = require('express');
const { exec } = require('child_process');
const path = require('path');

// Import parsing logic
const { parsePflogsumm } = require('./parsers/pflogsummParser');

const app = express();
const PORT = process.env.PORT || 20333;
const LOG_PATH = process.env.LOG_PATH || '/var/log/mail.log';

// Utility: map range to pflogsumm args
function getPflogsummCommand(range) {
  switch (range) {
    case 'day':
      // Last 24 hours
      return `pflogsumm --detail -u -d today ${LOG_PATH}`;
    case 'week':
      // Last 7 days
      return `pflogsumm --detail -u -l 7d ${LOG_PATH}`;
    case 'week':
      // Last 30 days
      return `pflogsumm --detail -u -l 30d ${LOG_PATH}`;
    default:
      return null;
  }
}

// API endpoint: /api/report/:range (day, week, month)
app.get('/api/report/:range', (req, res) => {
  const range = req.params.range;
  const cmd = getPflogsummCommand(range);

  if (!cmd) {
    return res.status(400).json({ error: 'Invalid range. Use day, week or month.'});
  }

  exec(cmd, (error, stdout, stderr) => {
    if (error) {
      console.error('Error executing pflogsumm:', stderr);
      return res.status(500).json({error: 'Failed to generate report.'});
    }

    const report = parsePflogsumm(stdout);
    res.json(report);
  });
});

app.use(express.static(path.join(__dirname, 'public')));

// Export app for testing and start server if run directly
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
} else {
  module.exports = app;
}
