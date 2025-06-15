const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;

// Mock user store
const users = [{ id: 1, username: 'admin', password: 'password' }];

passport.use(new LocalStrategy((username, password, done) => {
  const user = users.find(u => u.username === username);
  if (!user || user.password !== password) {
    return done(null, false, { message: 'Invalid credentials' });
  }
  return done(null, user);
}));

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser((id, done) => {
  const user = users.find(u => u.id === id);
  done(null, user || false);
});

module.exports = passport;