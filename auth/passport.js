// auth/passport.js (MariaDB-backed)

const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const pool = require('../config/db');
const bcrypt = require('bcrypt');

passport.use(new LocalStrategy(async (username, password, done) => {
  try {
    // Look up user by username
    const [rows] = await pool.execute(
      'SELECT id, username, password_hash FROM users WHERE username = ?',
      [username]
    );
    if (rows.length === 0) {
      return done(null, false, { message: 'Invalid credentials' });
    }

    const user = rows[0];
    // Compare provided password with stored hash
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return done(null, false, { message: 'Invalid credentials' });
    }

    // Authentication succeeded
    return done(null, { id: user.id, username: user.username });
  } catch (err) {
    return done(err);
  }
}));

// Persist user ID to session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Retrieve full user object from session-stored ID
passport.deserializeUser(async (id, done) => {
  try {
    const [rows] = await pool.execute(
      'SELECT id, username FROM users WHERE id = ?',
      [id]
    );
    if (rows.length === 0) {
      return done(null, false);
    }
    done(null, rows[0]);
  } catch (err) {
    done(err);
  }
});

module.exports = passport;
