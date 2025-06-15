/**
 * Parses raw pflogsumm output into structured JSON.
 * @param {string} raw - The raw text from pflogsumm.
 * @returns {object} Parsed report.
 */
function parsePflogsumm(raw) {
  const lines = raw.split('\n');
  const result = { hourly: [], hosts: [], senders: [], recipients: [], totals: {} };
  let state = null;

  lines.forEach(line => {
    // Header detection
    if (/^Hourly traffic summary/i.test(line)) { state = 'hourly'; return; }
    if (/^Host\/domain summary/i.test(line)) { state = 'hosts'; return; }
    if (/^(Top )?Senders by message count/i.test(line)) { state = 'senders'; return; }
    if (/^(Top )?Recipients by message count/i.test(line)) { state = 'recipients'; return; }

    let m;
    // Totals
    if ((m = line.match(/^Messages received\s+(\d+)/i))) {
      result.totals.received = parseInt(m[1], 10);
      return;
    }
    if ((m = line.match(/^(Messages delivered|Messages sent)\s+(\d+)/i))) {
      result.totals.sent = parseInt(m[2], 10);
      return;
    }

    // Section parsing
    if (state === 'hourly') {
      m = line.match(/^(\d{2}:\d{2}-\d{2}:\d{2})\s+(\d+)\s+(\d+)/);
      if (m) {
        result.hourly.push({ period: m[1], received: +m[2], sent: +m[3] });
      } else if (!line.trim()) { state = null; }
      return;
    }
    if (state === 'hosts') {
      m = line.match(/^([^\s]+)\s+(\d+)/);
      if (m) { result.hosts.push({ host: m[1], count: +m[2] }); }
      else if (!line.trim()) { state = null; }
      return;
    }
    if (state === 'senders') {
      m = line.match(/^([^\s]+)\s+(\d+)/);
      if (m) { result.senders.push({ sender: m[1], count: +m[2] }); }
      else if (!line.trim()) { state = null; }
      return;
    }
    if (state === 'recipients') {
      m = line.match(/^([^\s]+)\s+(\d+)/);
      if (m) { result.recipients.push({ recipient: m[1], count: +m[2] }); }
      else if (!line.trim()) { state = null; }
      return;
    }
  });

  return result;
}

module.exports = { parsePflogsumm };
