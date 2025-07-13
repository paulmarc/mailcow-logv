// parsers/pflogsummParser.js

/**
 * Parses raw pflogsumm output into structured JSON.
 * @param {string} raw - The raw text from pflogsumm.
 * @returns {object} Parsed report.
 */
function parsePflogsumm(raw) {
  const lines = raw.split(/\r?\n/);
  const result = { hourly: [], hosts: [], senders: [], recipients: [], totals: {} };
  let state = null;

  lines.forEach(line => {
    const trimmed = line.trim();

    // Section headers
    if (/^Hourly traffic summary/i.test(trimmed)) { state = 'hourly'; return; }
    if (/^Host\/domain summary/i.test(trimmed)) { state = 'hosts'; return; }
    if (/^(Top )?Senders by message count/i.test(trimmed)) { state = 'senders'; return; }
    if (/^(Top )?Recipients by message count/i.test(trimmed)) { state = 'recipients'; return; }

    // Totals (always parse regardless of state)
    let m;
    if ((m = trimmed.match(/^Messages received:?[\s]+(\d+)/i))) {
      result.totals.received = parseInt(m[1], 10);
      return;
    }
    if ((m = trimmed.match(/^(Messages delivered|Messages sent):?[\s]+(\d+)/i))) {
      result.totals.sent = parseInt(m[2], 10);
      return;
    }

    // Section data parsing
    if (state === 'hourly') {
      m = trimmed.match(/^(\d{2}:\d{2}-\d{2}:\d{2})[\s]+(\d+)[\s]+(\d+)/);
      if (m) {
        result.hourly.push({ period: m[1], received: +m[2], sent: +m[3] });
      }
      return;
    }

    if (state === 'hosts') {
      m = trimmed.match(/^(\S+)[\s]+(\d+)/);
      if (m) {
        result.hosts.push({ host: m[1], count: +m[2] });
      }
      return;
    }

    if (state === 'senders') {
      m = trimmed.match(/^(\S+)[\s]+(\d+)/);
      if (m) {
        result.senders.push({ sender: m[1], count: +m[2] });
      }
      return;
    }

    if (state === 'recipients') {
      m = trimmed.match(/^(\S+)[\s]+(\d+)/);
      if (m) {
        result.recipients.push({ recipient: m[1], count: +m[2] });
      }
      return;
    }
  });

  return result;
}

module.exports = { parsePflogsumm };
