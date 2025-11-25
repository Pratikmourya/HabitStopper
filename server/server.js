
/**
 * HabitStopper Backend
 */
const express = require('express');
const mongoose = require('mongoose');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const cors = require('cors');
const cookieSession = require('cookie-session');
require('dotenv').config();

const app = express();

// --- DATABASE MODELS ---

const UserSchema = new mongoose.Schema({
  googleId: String,
  appleId: String,
  name: String,
  email: String,
  joined: { type: Date, default: Date.now }
});

const LogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  date: String, // Format "YYYY-MM-DD"
  status: { type: String, enum: ['success', 'failed'], default: 'success' }
});

// Ensure one log per user per day
LogSchema.index({ userId: 1, date: 1 }, { unique: true });

const User = mongoose.model('User', UserSchema);
const Log = mongoose.model('Log', LogSchema);

// --- PASSPORT CONFIG ---

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  User.findById(id).then(user => done(null, user));
});

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: '/auth/google/callback'
    },
    async (accessToken, refreshToken, profile, done) => {
      const existingUser = await User.findOne({ googleId: profile.id });
      if (existingUser) {
        return done(null, existingUser);
      }
      const user = await new User({
        googleId: profile.id,
        name: profile.displayName,
        email: profile.emails[0].value
      }).save();
      done(null, user);
    }
  )
);

// --- MIDDLEWARE ---

app.use(cors({ origin: 'http://localhost:3000', credentials: true })); 
app.use(express.json());
app.use(
  cookieSession({
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    keys: [process.env.COOKIE_KEY]
  })
);
app.use(passport.initialize());
app.use(passport.session());

// --- ROUTES ---

app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

app.get(
  '/auth/google/callback',
  passport.authenticate('google'),
  (req, res) => {
    res.redirect('http://localhost:3000'); 
  }
);

app.get('/auth/logout', (req, res) => {
  req.logout();
  res.redirect('/');
});

app.get('/api/current_user', (req, res) => {
  res.send(req.user);
});

app.get('/api/logs', async (req, res) => {
  if (!req.user) return res.status(401).send({ error: 'Login required' });
  const logs = await Log.find({ userId: req.user._id });
  res.send(logs);
});

app.post('/api/log', async (req, res) => {
  if (!req.user) return res.status(401).send({ error: 'Login required' });
  const { date, status } = req.body;
  try {
    const log = await Log.findOneAndUpdate(
      { userId: req.user._id, date: date },
      { status },
      { upsert: true, new: true }
    );
    res.send(log);
  } catch (err) {
    res.status(500).send(err);
  }
});

const PORT = process.env.PORT || 5000;
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/habitstopper')
  .then(() => {
    console.log('Connected to MongoDB');
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch(err => console.log(err));
