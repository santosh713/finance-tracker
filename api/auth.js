import express from "express";
import session from "express-session";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import cookieParser from "cookie-parser";

const app = express();

app.use(cookieParser());
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false },
  })
);

app.use(passport.initialize());
app.use(passport.session());

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    function (accessToken, refreshToken, profile, done) {
      return done(null, profile);
    }
  )
);

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

app.get("/api/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }));

app.get(
  "/api/auth/callback",
  passport.authenticate("google", { failureRedirect: "/public/index.html" }),
  (req, res) => {
    res.redirect("/public/dashboard.html");
  }
);

app.get("/api/auth/logout", (req, res) => {
  req.logout(() => {
    res.redirect("/public/index.html");
  });
});

export default app;


// 📁 public/script.js
async function markPaid(i) {
  await fetch("/api/updateDebt", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: user.email, rowIndex: i }),
  });

  loadDebts();
}

document.getElementById("debtForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = new FormData(e.target);
  const body = Object.fromEntries(form.entries());
  body.email = user.email;

  await fetch("/api/addDebt", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  e.target.reset();
  loadDebts();
});

async function loadDebts() {
  const res = await fetch(`/api/getDebts?email=${user.email}`);
  const data = await res.json();
  const table = document.getElementById("debtTable");
  table.innerHTML = "";
  debts.length = 0;

  data.forEach(([person, amount, due, direction, status], i) => {
    const entry = { person, amount, due, direction, status };
    debts.push(entry);
    table.innerHTML += `
      <tr class="text-center">
        <td>${person}</td>
        <td>$${parseFloat(amount).toFixed(2)}</td>
        <td>${due}</td>
        <td>${direction}</td>
        <td>${status || "Pending"}</td>
        <td>
          ${
            status !== "Paid"
              ? `<button onclick="markPaid(${i})" class="text-green-500 hover:underline">Mark Paid</button>`
              : `✅`
          }
        </td>
      </tr>
    `;
  });

  updateDebtChart();
}

loadDebts();
