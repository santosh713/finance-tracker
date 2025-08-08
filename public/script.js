let user = JSON.parse(localStorage.getItem("user"));
let debts = [];

document.getElementById("logoutBtn").addEventListener("click", () => {
  localStorage.removeItem("user");
  window.location.href = "/api/auth/logout";
});

document.addEventListener("DOMContentLoaded", () => {
  if (!user) {
    window.location.href = "/";
  } else {
    document.getElementById("userName").textContent = user.name;
    loadDebts();
  }
});

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
  debts = [];

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

function updateDebtChart() {
  const ctx = document.getElementById("debtChart").getContext("2d");

  const give = debts
    .filter((d) => d.direction === "give" && d.status !== "Paid")
    .reduce((sum, d) => sum + parseFloat(d.amount), 0);
  const receive = debts
    .filter((d) => d.direction === "receive" && d.status !== "Paid")
    .reduce((sum, d) => sum + parseFloat(d.amount), 0);

  if (window.debtPie) window.debtPie.destroy(); // prevent duplicate chart

  window.debtPie = new Chart(ctx, {
    type: "pie",
    data: {
      labels: ["To Give", "To Receive"],
      datasets: [
        {
          label: "Debt",
          data: [give, receive],
          backgroundColor: ["#f87171", "#34d399"],
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: "bottom",
        },
        title: {
          display: true,
          text: "Debt Overview",
        },
      },
    },
  });
}
