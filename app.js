const STORAGE_KEY = "braves-imperialism-final";

let state = loadState();

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    return JSON.parse(raw);
  } catch {
    return defaultState();
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function defaultState() {
  return {
    baseRoster: {
      lineup: [
        { id: id(), name: "Ronald Acuña Jr.", slot: "RF" },
        { id: id(), name: "Michael Harris II", slot: "CF" },
        { id: id(), name: "Austin Riley", slot: "3B" },
        { id: id(), name: "Matt Olson", slot: "1B" },
        { id: id(), name: "Ozzie Albies", slot: "2B" },
        { id: id(), name: "Drake Baldwin", slot: "C" },
        { id: id(), name: "Bobby Witt Jr.", slot: "SS" },
        { id: id(), name: "Yastrzemski", slot: "LF" }
      ],
      bench: [],
      rotation: [],
      bullpen: []
    },
    transactions: []
  };
}

function id() {
  return Math.random().toString(36).substring(2, 9);
}

document.addEventListener("DOMContentLoaded", () => {
  injectLogo();
  renderAll();
});

/* =========================
   LOGO
========================= */
function injectLogo() {
  const header = document.querySelector(".app-hero");
  const img = document.createElement("img");
  img.src = "logo.png"; // 👈 YOU will upload this
  img.className = "app-logo";
  header.prepend(img);
}

/* =========================
   TRANSACTIONS (FIXED)
========================= */
function addTransaction(tx) {
  state.transactions.push(tx);
  state.transactions.sort((a, b) => a.date.localeCompare(b.date));
  saveState();
  renderAll();
}

/* =========================
   RENDER
========================= */
function renderAll() {
  renderDepthChart();
  renderTransactions();
}

/* =========================
   DEPTH CHART + LOGO EXPORT
========================= */
function renderDepthChart() {
  const chart = document.getElementById("depthChartExport");

  if (!chart.querySelector(".logo-watermark")) {
    const img = document.createElement("img");
    img.src = "logo.png";
    img.className = "logo-watermark";
    img.style.position = "absolute";
    img.style.bottom = "10px";
    img.style.right = "10px";
    img.style.height = "50px";
    img.style.opacity = "0.9";
    chart.appendChild(img);
  }
}

/* =========================
   DOWNLOAD (LOGO INCLUDED)
========================= */
document.getElementById("downloadChartBtn").addEventListener("click", async () => {
  const chart = document.getElementById("depthChartExport");

  const canvas = await html2canvas(chart, {
    scale: 2
  });

  const link = document.createElement("a");
  link.download = "braves-chart.png";
  link.href = canvas.toDataURL();
  link.click();
});

/* =========================
   TRANSACTION LIST
========================= */
function renderTransactions() {
  const list = document.getElementById("transactionList");

  list.innerHTML = state.transactions
    .map(t => `
      <div class="transaction-card">
        <strong>${t.date}</strong> — ${t.opponent} (${t.result})
        <div>+ ${t.acquiredPlayer}</div>
        <div>- ${t.removedPlayer}</div>
      </div>
    `)
    .join("");
}
