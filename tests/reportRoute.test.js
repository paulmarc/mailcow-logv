// tests/reportRoute.test.js
const request = require('supertest');
const express = require('express');
const { parsePflogsumm } = require('../parsers/pflogsummParser');
jest.mock('child_process');

const { exec } = require('child_process');
const app = require('../server'); // make sure server exports the Express app

describe('GET /api/report/:range', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('returns 400 on invalid range', async () => {
    const res = await request(app).get('/api/report/year');
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Invalid range/);
  });

  it('returns parsed JSON on valid range', async () => {
    const fakeOutput = 'Messages received 1\nMessages sent 2\n';
    exec.mockImplementation((cmd, cb) => cb(null, fakeOutput, ''));

    const res = await request(app).get('/api/report/day');
    expect(res.status).toBe(200);
    expect(res.body.totals).toEqual({ received: 1, sent: 2 });
  });

  it('handles exec errors gracefully', async () => {
    exec.mockImplementation((cmd, cb) => cb(new Error('fail'), '', 'error'));
    const res = await request(app).get('/api/report/day');
    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/Failed to generate report/);
  });
});
