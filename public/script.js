let user = null;
const transactions = [];
const debts = [];

async function getUser() {
  const res = await fetch("/api/auth/user", { credentials: "include" });
  user = await res.json();
  if (!user) {
    window.location.href = "/public/index.html";
    return false;
  }

  const nameEl = document.getElementById("userName");
  const picEl = document.getElementById("userPic");
  if (nameEl) nameEl.textContent = user.displayName || user.name?.givenName || "User";
  if (picEl) picEl.src = user.photos?.[0]?.value || "https://www.gravatar.com/avatar?d=mp";

  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      window.location.href = "/api/auth/logout";
    });
  }

  return true;
}

async function loadTransactions() {
  const res = await fetch(`/api/getTransactions?email=${user.email}`);
  const data = await res.json();
  const table = document.getElementById("transactionTable");
  table.innerHTML = "";
  transactions.length = 0;

  data.forEach(([date, type, category, amount, note]) => {
    transactions.push({ date, type, category, amount, note });
    table.innerHTML += `
      <tr class="text-center">
        <td>${date}</td>
        <td>${type}</td>
        <td>${category}</td>
        <td>$${parseFloat(amount).toFixed(2)}</td>
        <td>${note}</td>
      </tr>
    `;
  });

  updateTransactionChart();
}

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

async function markPaid(i) {
  await fetch("/api/updateDebt", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: user.email, rowIndex: i }),
  });

  loadDebts();
}

document.getElementById("transactionForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = new FormData(e.target);
  const body = Object.fromEntries(form.entries());
  body.email = user.email;

  await fetch("/api/addTransaction", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  e.target.reset();
  loadTransactions();
});

document.getElementById("debtForm")?.addEventListener("submit", async (e) => {
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

function updateTransactionChart() {
  const canvas = document.getElementById("transactionChart");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  const summary = {};
  transactions.forEach(t => {
    if (!summary[t.category]) summary[t.category] = 0;
    summary[t.category] += parseFloat(t.amount);
  });

  new Chart(ctx, {
    type: "pie",
    data: {
      labels: Object.keys(summary),
      datasets: [
        {
          data: Object.values(summary),
        },
      ],
    },
  });
}

function updateDebtChart() {
  const canvas = document.getElementById("debtChart");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  let toGive = 0;
  let toReceive = 0;
  debts.forEach(d => {
    const amt = parseFloat(d.amount);
    if (d.direction === "Give") toGive += amt;
    else if (d.direction === "Receive") toReceive += amt;
  });

  new Chart(ctx, {
    type: "pie",
    data: {
      labels: ["Give", "Receive"],
      datasets: [
        {
          data: [toGive, toReceive],
        },
      ],
    },
  });
}

// Dark mode toggle
document.getElementById("darkToggle")?.addEventListener("click", () => {
  document.body.classList.toggle("dark");
});

(async () => {
  const ok = await getUser();
  if (!ok) return;

  loadTransactions();
  loadDebts();
})();
