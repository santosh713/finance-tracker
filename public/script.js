let user = null;
let debts = [];
let transactions = [];

async function getSessionUser() {
  try {
    const res = await fetch("/api/auth/session");
    const data = await res.json();
    user = data?.user;

    if (!user?.email) {
      alert("Not logged in.");
      return;
    }

    document.getElementById("username").innerText = user.name;
    document.getElementById("avatar").src = user.picture;

    loadDebts();
    loadTransactions();
  } catch (err) {
    console.error("Error fetching session user:", err);
  }
}

getSessionUser();

document.getElementById("debtForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = new FormData(e.target);
  const body = Object.fromEntries(form.entries());
  body.email = user.email;

  try {
    const res = await fetch("/api/addDebt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) throw new Error("Failed to add debt");

    e.target.reset();
    loadDebts();
  } catch (err) {
    console.error(err);
    alert("Could not add debt");
  }
});

async function markPaid(i) {
  try {
    await fetch("/api/updateDebt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: user.email, rowIndex: i }),
    });

    loadDebts();
  } catch (err) {
    console.error("Error marking paid:", err);
  }
}

async function loadDebts() {
  try {
    const res = await fetch(`/api/getDebts?email=${user.email}`);
    const data = await res.json();
    if (!Array.isArray(data)) throw new Error("Invalid debts response");

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
  } catch (err) {
    console.error("Error loading debts:", err);
  }
}

async function loadTransactions() {
  try {
    const res = await fetch(`/api/getTransactions?email=${user.email}`);
    const data = await res.json();
    if (!Array.isArray(data)) throw new Error("Invalid transactions response");

    const table = document.getElementById("transactionTable");
    table.innerHTML = "";
    transactions.length = 0;

    data.forEach(([category, amount, date]) => {
      const entry = { category, amount, date };
      transactions.push(entry);
      table.innerHTML += `
        <tr class="text-center">
          <td>${category}</td>
          <td>$${parseFloat(amount).toFixed(2)}</td>
          <td>${date}</td>
        </tr>
      `;
    });

    updateTransactionChart();
  } catch (err) {
    console.error("Error loading transactions:", err);
  }
}

function updateDebtChart() {
  const ctx = document.getElementById("debtChart").getContext("2d");
  const owed = debts.filter(d => d.direction === "Owe").length;
  const lent = debts.filter(d => d.direction === "Lend").length;

  new Chart(ctx, {
    type: "pie",
    data: {
      labels: ["You Owe", "You Lent"],
      datasets: [{
        data: [owed, lent],
        backgroundColor: ["#f87171", "#34d399"],
      }],
    },
    options: {
      responsive: true,
    }
  });
}

function updateTransactionChart() {
  const ctx = document.getElementById("transactionChart").getContext("2d");
  const categorySums = {};

  transactions.forEach(t => {
    const category = t.category || "Other";
    categorySums[category] = (categorySums[category] || 0) + parseFloat(t.amount);
  });

  const labels = Object.keys(categorySums);
  const data = Object.values(categorySums);

  new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: "Expenses by Category",
        data,
        backgroundColor: "#60a5fa",
      }],
    },
    options: {
      responsive: true,
      indexAxis: "y",
    }
  });
}
