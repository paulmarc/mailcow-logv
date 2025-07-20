// server.js
require('dotenv').config();
const express    = require('express');
const path       = require('path');
const session    = require('express-session');
const flash      = require('connect-flash');
const passport   = require('./auth/passport');
const webAuthn   = require('./auth/webAuthn');
const csurf      = require('csurf');
const { exec }   = require('child_process');
const { parsePflogsumm } = require('./parsers/pflogsummParser');

const app = express();
const PORT     = process.env.PORT;
const HOST     = process.env.HOST;
const LOG_PATH = process.env.LOG_PATH;
const DASHBOARD_TITLE = process.env.DASHBOARD_TITLE || 'Mail Dashboard';

// View engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
  secret: process.env.AUTH_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: process.env.NODE_ENV === 'production' }
}));
app.use(flash());
app.use(csurf());

app.use(passport.initialize());
app.use(passport.session());

// Auth guard
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.redirect('/login');
}

// Routes

// Login form
app.get('/login', (req, res) => {
  res.render('login', {
    csrfToken: req.csrfToken(),
    error: req.flash('error'),
    dashboardTitle: DASHBOARD_TITLE
  });
});

// Handle login
app.post('/login',
  passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: '/login',
    failureFlash: true
  })
);

// Handle logout
app.post('/logout', (req, res, next) => {
  req.logout(err => {
    if (err) return next(err);
    res.redirect('/login');
  });
});

// WebAuthn endpoints
app.post('/webauthn/registerRequest',
  ensureAuthenticated,
  webAuthn.generateRegistrationOptions
);
app.post('/webauthn/registerResponse',
  ensureAuthenticated,
  webAuthn.verifyRegistrationResponse
);
app.post('/webauthn/authenticateRequest',
  webAuthn.generateAuthenticationOptions
);
app.post('/webauthn/authenticateResponse',
  webAuthn.verifyAuthenticationResponse
);

// Dashboard page
app.get('/', ensureAuthenticated, (req, res) => {
  res.render('dashboard', {
    csrfToken: req.csrfToken(),
    user: req.user,
    dashboardTitle: DASHBOARD_TITLE
  });
});

// API auth guard (returns JSON 401 on unauthenticated)
app.use('/api', (req, res, next) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
});

// Build pflogsumm command based on range
function getPflogsummCommand(range) {
  switch (range) {
    case 'day':
      return `cat ${LOG_PATH} | cut -d ' ' -f 6- | pflogsumm`;
    case 'week':
      return `cat ${LOG_PATH} | cut -d ' ' -f 6- | pflogsumm`;
    case 'month':
      return `cat ${LOG_PATH} | cut -d ' ' -f 6- | pflogsumm`;
    default:
      return null;
  }
}

// Report API
app.get('/api/report/:range', (req, res) => {
  const cmd = getPflogsummCommand(req.params.range);
  if (!cmd) {
    return res.status(400).json({ error: 'Invalid range' });
  }

  exec(cmd, (err, stdout, stderr) => {
    if (err) {
      console.error('pflogsumm error:', stderr);
      return res.status(500).json({ error: 'pflogsumm failed' });
    }
    res.json(parsePflogsumm(stdout));
  });
});

// Start server
if (require.main === module) {
  app.listen(PORT, HOST, () => {
    console.log(`Server listening at http://${HOST}:${PORT}`);
  });
} else {
  module.exports = app;
}
