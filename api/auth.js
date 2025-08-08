import express from "express";
import session from "express-session";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import cookieParser from "cookie-parser";

// 🔧 Create Express app
const app = express();

// 🛡 Trust proxy (required for Vercel + secure cookies)
app.set("trust proxy", 1);

// 🍪 Cookie parser
app.use(cookieParser());

// 🧠 Session middleware
app.use(
  session({
    secret: process.env.SESSION_SECRET || "default-secret", // REQUIRED
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: true,         // HTTPS cookies on Vercel
      sameSite: "lax",      // important for OAuth redirects
    },
  })
);

// 🔌 Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// 🔐 Google Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    (accessToken, refreshToken, profile, done) => {
      return done(null, profile);
    }
  )
);

// 🧾 Serialize / deserialize user for session
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

// 🚪 Auth Routes

// 🔁 Start Google OAuth
app.get("/api/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }));

// 🔁 OAuth Callback
app.get(
  "/api/auth/callback",
  passport.authenticate("google", {
    failureRedirect: "/public/index.html",
  }),
  (req, res) => {
    res.redirect("/public/dashboard.html");
  }
);

// 🚪 Logout route
app.get("/api/auth/logout", (req, res) => {
  req.logout(() => {
    res.redirect("/public/index.html");
  });
});
// Who am I? (used by dashboard to get the session user)
app.get("/api/auth/user", (req, res) => {
  res.json(req.user || null);
});

// ✅ Export handler for Vercel
export default (req, res) => app(req, res);

