require('dotenv').config();
const express = require('express');
const { exec } = require('child_process');
const path = require('path');

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

// Stub parser: transform raw pflogsumm text into JSON
function parsePflogsumm(raw) {
  const lines = raw.split('\n');
  const result = { hourly: [], hosts: [], senders: [], recipients: [], totals: {} };
  let state = null;

  lines.forEach(line => {
    // State transitions
    if (/^Hourly traffic summary/i.test(line)) { state = 'hourly'; return; }
    if (/^Host\/domain summary/i.test(line)) { state = 'hosts'; return; }
    if (/^(Top )?Senders by message count/i.test(line)) { state = 'senders'; return; }
    if (/^(Top )?Recipients by message count/i.test(line)) { state = 'recipients'; return; }

    // Totals
    let m;
    if ((m = line.match(/^Messages received\s+(\d+)/i))) {
      result.totals.received = parseInt(m[1], 10);
      return;
    }
    if ((m = line.match(/^(Messages delivered|Messages sent)\s+(\d+)/i))) {
      result.totals.sent = parseInt(m[2] || m[1], 10);
      return;
    }

    // Parsing based on current state
    if (state === 'hourly') {
      m = line.match(/^(\d{2}:\d{2}-\d{2}:\d{2})\s+(\d+)\s+(\d+)/);
      if (m) {
        result.hourly.push({ period: m[1], received: parseInt(m[2], 10), sent: parseInt(m[3], 10) });
      } else if (!line.trim()) {
        state = null;
      }
      return;
    }

    if (state === 'hosts') {
      m = line.match(/^(\S+)\s+(\d+)/);
      if (m) {
        result.hosts.push({ host: m[1], count: parseInt(m[2], 10) });
      } else if (!line.trim()) {
        state = null;
      }
      return;
    }

    if (state === 'senders') {
      m = line.match(/^(\S+)\s+(\d+)/);
      if (m) {
        result.senders.push({ sender: m[1], count: parseInt(m[2], 10) });
      } else if (!line.trim()) {
        state = null;
      }
      return;
    }

    if (state === 'recipients') {
      m = line.match(/^(\S+)\s+(\d+)/);
      if (m) {
        result.recipients.push({ recipient: m[1], count: parseInt(m[2], 10) });
      } else if (!line.trim()) {
        state = null;
      }
      return;
    }
  });

  return result;
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

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});