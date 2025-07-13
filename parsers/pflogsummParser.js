// parsers/pflogsummParser.js

/**
 * Parses pflogsumm output into structured JSON.
 * Adapted for pflogsumm v3.7.11 headers.
 * @param {string} raw - Raw pflogsumm text
 * @returns {object} Parsed report
 */
function parsePflogsumm(raw) {
  const lines = raw.split(/\r?\n/);
  const result = { hourly: [], hosts: [], senders: [], recipients: [], totals: {} };
  let state = null;

  for (let line of lines) {
    const trimmed = line.trim();
    if (!trimmed) { state = null; continue; }

    // Section headers
    if (/^Per-Day Traffic Summary/i.test(trimmed)) {
      state = 'daily';
      continue;
    }
    if (/^Per-?Hour Traffic Daily Average/i.test(trimmed)) {
      state = 'hourly';
      continue;
    }
    if (/^Host\/Domain Summary: Message Delivery/i.test(trimmed)) {
      state = 'hosts_delivery';
      continue;
    }
    if (/^Host\/Domain Summary: Messages Received/i.test(trimmed)) {
      state = 'hosts_received';
      continue;
    }
    if (/^Senders by message count/i.test(trimmed)) {
      state = 'senders';
      continue;
    }
    if (/^Recipients by message count/i.test(trimmed)) {
      state = 'recipients';
      continue;
    }
    if (/^Grand Totals/i.test(trimmed)) {
      state = 'grandtotals';
      continue;
    }

    // Parse totals
    if (state === 'grandtotals') {
      let m;
      if ((m = trimmed.match(/^messages[\s]+(\d+)\s+received/i))) {
        result.totals.received = +m[1];
        continue;
      }
      if ((m = trimmed.match(/^messages[\s]+(\d+)\s+delivered/i))) {
        result.totals.sent = +m[1];
        continue;
      }
      continue;
    }

    // Section parsing
    let m;
    if (state === 'hourly') {
      // e.g. 0000-0100   1  1 0 0 0
      m = trimmed.match(/^(\d{4}-\d{4})\s+(\d+)\s+(\d+)/);
      if (m) {
        result.hourly.push({ period: m[1], received: +m[2], sent: +m[3] });
      }
      continue;
    }

    if (state === 'hosts_delivery' || state === 'hosts_received') {
      // Capture count (first number) and host (last token)
      m = trimmed.match(/^(\d+)\s+[\d\.kMGT%\s]+\s+(\S+)$/);
      if (m) {
        const count = +m[1];
        const host = m[2];
        result.hosts.push({ host, count });
      }
      continue;
    }

    if (state === 'senders') {
      m = trimmed.match(/^(\d+)\s+(\S+)$/);
      if (m) {
        result.senders.push({ sender: m[2], count: +m[1] });
      }
      continue;
    }

    if (state === 'recipients') {
      m = trimmed.match(/^(\d+)\s+(\S+)$/);
      if (m) {
        result.recipients.push({ recipient: m[2], count: +m[1] });
      }
      continue;
    }
  }

  return result;
}

module.exports = { parsePflogsumm };
