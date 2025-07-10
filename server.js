require('dotenv').config();
const express = require('express');
const session = require('express-session');
const passport = require('./auth/passport');
const webAuthn = require('./auth/webAuthn');
const { exec } = require('child_process');
const path = require('path');

// Import parsing logic
const { parsePflogsumm } = require('./parsers/pflogsummParser');

const app = express();
const PORT = process.env.PORT;
const HOST = process.env.HOST;
const LOG_PATH = process.env.LOG_PATH || '/var/log/mail.log';

// Session & Auth setup
app.use(session({
  secret: process.env.AUTH_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: process.env.NODE_ENV === 'production' }
}));
app.use(express.urlencoded({ extended: true }));
app.use(passport.initialize());
app.use(passport.session());

// Auth guard
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.redirect('/login');
}

// Routes: Login/Logout
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

app.post('/login',
  passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: '/login'
  })
);

app.post('/logout', (req, res) => {
  req.logout(err => {
    if (err) return next(err);
    res.redirect('/login');
  });
});

// WebAuthn 2FA endpoints
app.post('/webauthn/registerRequest', ensureAuthenticated, webAuthn.generateRegistrationOptions);
app.post('/webauthn/registerResponse', ensureAuthenticated, webAuthn.verifyRegistrationResponse);
app.post('/webauthn/authenticateRequest', webAuthn.generateAuthenticationOptions);
app.post('/webauthn/authenticateResponse', webAuthn.verifyAuthenticationResponse);

// Protect UI and API
app.use(ensureAuthenticated);
app.use(express.static(path.join(__dirname, 'public')));
app.use('/api', express.json(), (req, res, next) => next()); // API uses same auth guard above

// Utility: map range to pflogsumm args
function getPflogsummCommand(range) {
  switch (range) {
    case 'day':
      return `pflogsumm --detail -u -d today ${LOG_PATH}`;
    case 'week':
      return `pflogsumm --detail -u -l 7d ${LOG_PATH}`;
    case 'month':
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
    return res.status(400).json({ error: 'Invalid range. Use day, week, or month.' });
  }

  exec(cmd, (error, stdout, stderr) => {
    if (error) {
      console.error('Error executing pflogsumm:', stderr);
      return res.status(500).json({ error: 'Failed to generate report.' });
    }

    const report = parsePflogsumm(stdout);
    res.json(report);
  });
});

// Export or start server
if (require.main === module) {
  app.listen(PORT, HOST, () => {
    console.log(`Server listening on http://${HOST}:${PORT}`);
  });
} else {
  module.exports = app;
}