// tests/pflogsummParser.test.js
const { parsePflogsumm } = require('../parsers/pflogsummParser');

describe('parsePflogsumm()', () => {
  const sampleRaw = `
Hourly traffic summary
00:00-01:00     10  5
01:00-02:00     8   6

Host/domain summary
mail.example.com   12
smtp.another.net   4

Senders by message count
alice@example.com  7
bob@example.com    3

Recipients by message count
carol@example.org  6
dave@example.org   4

Messages received 22
Messages sent 11
`;

  it('parses hourly traffic correctly', () => {
    const result = parsePflogsumm(sampleRaw);
    expect(result.hourly).toEqual([
      { period: '00:00-01:00', received: 10, sent: 5 },
      { period: '01:00-02:00', received: 8, sent: 6 }
    ]);
  });

  it('parses hosts correctly', () => {
    const result = parsePflogsumm(sampleRaw);
    expect(result.hosts).toEqual([
      { host: 'mail.example.com', count: 12 },
      { host: 'smtp.another.net', count: 4 }
    ]);
  });

  it('parses senders correctly', () => {
    const result = parsePflogsumm(sampleRaw);
    expect(result.senders).toEqual([
      { sender: 'alice@example.com', count: 7 },
      { sender: 'bob@example.com', count: 3 }
    ]);
  });

  it('parses recipients correctly', () => {
    const result = parsePflogsumm(sampleRaw);
    expect(result.recipients).toEqual([
      { recipient: 'carol@example.org', count: 6 },
      { recipient: 'dave@example.org', count: 4 }
    ]);
  });

  it('parses totals correctly', () => {
    const result = parsePflogsumm(sampleRaw);
    expect(result.totals).toEqual({ received: 22, sent: 11 });
  });
});
