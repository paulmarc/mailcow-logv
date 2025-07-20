// parsers/pflogsummParser.js

/**
 * Parses raw pflogsumm output into structured JSON.
 * @param {string} raw - The raw text from pflogsumm.
 * @returns {object} Parsed report without grand totals.
 */
function parsePflogsumm(raw) {
  const lines = raw.split(/\r?\n/);
  const result = {
    hourly: [],
    hosts: [],
    senders: [],
    recipients: []
  };
  let state = null;

  lines.forEach(line => {
    const trimmed = line.trim();
    if (!trimmed) { state = null; return; }

    // Section headers
    if (/^Per-?Day Traffic Summary/i.test(trimmed) ||
        /^Per-?Hour Traffic Daily Average/i.test(trimmed)) {
      state = 'hourly';
      return;
    }
    if (/^Host\/Domain Summary: Message Delivery/i.test(trimmed) ||
        /^Host\/Domain Summary: Messages Received/i.test(trimmed)) {
      state = 'hosts';
      return;
    }
    if (/^Senders by message count/i.test(trimmed)) {
      state = 'senders';
      return;
    }
    if (/^Recipients by message count/i.test(trimmed)) {
      state = 'recipients';
      return;
    }

    let m;
    switch (state) {
      case 'hourly':
        // "Jun 15 2025   7   9 ..." or "0000-0100   1   1 ..."
        if ((m = trimmed.match(/^(\S+\s+\d+\s+\d{4}|\d{4}-\d{4})\s+(\d+)\s+(\d+)/))) {
          result.hourly.push({
            period:   m[1],
            received: +m[2],
            sent:     +m[3]
          });
        }
        break;
      case 'hosts':
        // "688    32517k  host1.domain"
        if ((m = trimmed.match(/^(\d+)\s+\S+\s+(\S+)$/))) {
          result.hosts.push({ host: m[2], count: +m[1] });
        }
        break;
      case 'senders':
        // "135   user@example.com"
        if ((m = trimmed.match(/^(\d+)\s+(\S+)/))) {
          result.senders.push({ sender: m[2], count: +m[1] });
        }
        break;
      case 'recipients':
        // "465   user@example.com"
        if ((m = trimmed.match(/^(\d+)\s+(\S+)/))) {
          result.recipients.push({ recipient: m[2], count: +m[1] });
        }
        break;
    }
  });

  return result;
}

module.exports = { parsePflogsumm };
