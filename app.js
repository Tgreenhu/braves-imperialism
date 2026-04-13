const STORAGE_KEY = "braves-imperialism-tracker-v1";

const defaultState = {
  roster: {
    lineup: [
      { id: makeId(), name: "Drake Baldwin", slot: "C", tc: "MLB" },
      { id: makeId(), name: "Matt Olson", slot: "1B", tc: "MLB" },
      { id: makeId(), name: "Ozzie Albies", slot: "2B", tc: "MLB" },
      { id: makeId(), name: "Austin Riley", slot: "3B", tc: "MLB" },
      { id: makeId(), name: "Bobby Witt Jr.", slot: "SS", tc: "MLB" },
      { id: makeId(), name: "Mike Yastrzemski", slot: "LF", tc: "MLB" },
      { id: makeId(), name: "Michael Harris II", slot: "CF", tc: "MLB" },
      { id: makeId(), name: "Ronald Acuña Jr.", slot: "RF", tc: "MLB" }
    ],
    bench: [
      { id: makeId(), name: "Jonah Heim", slot: "C", tc: "MLB" },
      { id: makeId(), name: "Dominic Smith", slot: "DH/1B", tc: "MLB" },
      { id: makeId(), name: "Mauricio Dubón", slot: "UTIL", tc: "MLB" },
      { id: makeId(), name: "Jorge Mateo", slot: "INF", tc: "MLB" },
      { id: makeId(), name: "Eli White", slot: "OF", tc: "MLB" }
    ],
    rotation: [
      { id: makeId(), name: "Chris Sale", slot: "SP1", tc: "MLB" },
      { id: makeId(), name: "Jose Soriano", slot: "SP2", tc: "MLB" },
      { id: makeId(), name: "Reynaldo Lopez", slot: "SP3", tc: "MLB" },
      { id: makeId(), name: "Luis Severino", slot: "SP4", tc: "MLB" },
      { id: makeId(), name: "Bryce Elder", slot: "SP5", tc: "MLB" }
    ],
    bullpen: [
      { id: makeId(), name: "Robert Suarez", slot: "CL", tc: "MLB" },
      { id: makeId(), name: "Raisel Iglesias", slot: "SU", tc: "MLB" },
      { id: makeId(), name: "Aaron Bummer", slot: "LHP", tc: "MLB" },
      { id: makeId(), name: "Dylan Lee", slot: "LHP", tc: "MLB" },
      { id: makeId(), name: "Tyler Kinley", slot: "RHP", tc: "MLB" },
      { id: makeId(), name: "Joel Payamps", slot: "RHP", tc: "MLB" },
      { id: makeId(), name: "Osvaldo Bido", slot: "RHP", tc: "MLB" },
      { id: makeId(), name: "Grant Holmes", slot: "RHP", tc: "MLB" }
    ]
  },
  transactions: [
    {
      id: makeId(),
      date: "2026-04-01",
      opponent: "Royals",
      result: "Win",
      acquiredPlayer: "Bobby Witt Jr.",
      removedPlayer: "Kyle Farmer",
      notes: "Installed Bobby Witt Jr. at shortstop."
    },
    {
      id: makeId(),
      date: "2026-04-03",
      opponent: "Athletics",
      result: "Win",
      acquiredPlayer: "Luis Severino",
      removedPlayer: "Jose Suarez",
      notes: "Severino added to the rotation."
    },
    {
      id: makeId(),
      date: "2026-04-05",
      opponent: "Angels",
      result: "Win",
      acquiredPlayer: "Jose Soriano",
      removedPlayer: "Martin Perez",
      notes: "Soriano added to the rotation."
    }
  ]
};

let state = loadState();
let editingTransactionId = null;

const rosterMeta = {
  lineup: "Starting 8",
  bench: "Bench",
  rotation: "Rotation",
  bullpen: "Bullpen"
};

document.addEventListener("DOMContentLoaded", () => {
  bindTabs();
  bindTransactionForm();
  bindDownload();
  renderAll();
});

function makeId() {
  return Math.random().toString(36).slice(2, 10);
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(defaultState);
    const parsed = JSON.parse(raw);
    return {
      roster: parsed.roster || structuredClone(defaultState.roster),
      transactions: parsed.transactions || structuredClone(defaultState.transactions)
    };
  } catch {
    return structuredClone(defaultState);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function bindTabs() {
  const buttons = document.querySelectorAll(".tab-button");
  const panels = document.querySelectorAll(".tab-panel");

  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      const tab = button.dataset.tab;

      buttons.forEach((b) => b.classList.remove("active"));
      panels.forEach((p) => p.classList.remove("active"));

      button.classList.add("active");
      document.getElementById(`tab-${tab}`).classList.add("active");
    });
  });
}

function bindDownload() {
  document.getElementById("downloadChartBtn").addEventListener("click", async () => {
    const el = document.getElementById("depthChartExport");
    const canvas = await html2canvas(el, {
      backgroundColor: null,
      scale: 2,
      useCORS: true
    });

    const link = document.createElement("a");
    link.download = "braves-imperialism-depth-chart.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  });
}

function bindTransactionForm() {
  document.getElementById("saveTransactionBtn").addEventListener("click", saveTransactionFromForm);
  document.getElementById("cancelEditBtn").addEventListener("click", cancelTransactionEdit);
}

function renderAll() {
  renderCounts();
  renderDepthChart();
  renderRosterEditor();
  renderTransactions();
  saveState();
}

function renderCounts() {
  const total = Object.values(state.roster).flat().length;
  document.getElementById("totalPlayersBadge").textContent = `${total} Players Loaded`;
  document.getElementById("chartFooterCount").textContent = `${total} Players Loaded`;
}

function getCombinedHitters() {
  return [...state.roster.lineup, ...state.roster.bench];
}

function exactPlayers(slot) {
  return getCombinedHitters().filter((p) => p.slot.toUpperCase() === slot.toUpperCase());
}

function includesPlayers(keys) {
  return getCombinedHitters().filter((p) =>
    keys.some((key) => p.slot.toUpperCase().includes(key.toUpperCase()))
  );
}

function uniqPlayers(arr) {
  const seen = new Set();
  return arr.filter((p) => {
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });
}

function renderDepthChart() {
  const lf = uniqPlayers([...exactPlayers("LF"), ...exactPlayers("OF")]);
  const cf = uniqPlayers([...exactPlayers("CF"), ...exactPlayers("OF")]);
  const rf = uniqPlayers([...exactPlayers("RF"), ...exactPlayers("OF")]);

  const third = uniqPlayers([...exactPlayers("3B"), ...exactPlayers("INF"), ...exactPlayers("UTIL")]);
  const ss = uniqPlayers([...exactPlayers("SS"), ...exactPlayers("INF"), ...exactPlayers("UTIL")]);
  const second = uniqPlayers([...exactPlayers("2B"), ...exactPlayers("INF"), ...exactPlayers("UTIL")]);
  const first = uniqPlayers([...exactPlayers("1B"), ...includesPlayers(["DH"]), ...exactPlayers("UTIL")]);
  const catcher = uniqPlayers(exactPlayers("C"));

  document.getElementById("pos-lf").innerHTML = buildPositionCard("LF", lf, "green");
  document.getElementById("pos-cf").innerHTML = buildPositionCard("CF", cf, "green");
  document.getElementById("pos-rf").innerHTML = buildPositionCard("RF", rf, "purple");

  document.getElementById("pos-3b").innerHTML = buildPositionCard("3B", third, "purple");
  document.getElementById("pos-ss").innerHTML = buildPositionCard("SS", ss, "navy");
  document.getElementById("pos-2b").innerHTML = buildPositionCard("2B", second, "green");
  document.getElementById("pos-1b").innerHTML = buildPositionCard("1B", first, "navy");

  document.getElementById("pos-c").innerHTML = buildPositionCard("C", catcher, "red");

  document.getElementById("rotationList").innerHTML = state.roster.rotation
    .map(
      (p) => `
        <div class="staff-row rotation-row">
          <div class="row-pos">${escapeHtml(p.slot)}</div>
          <div class="row-name">${escapeHtml(p.name)}</div>
          <div class="row-tc">${escapeHtml(p.tc || "")}</div>
        </div>
      `
    )
    .join("");

  document.getElementById("bullpenList").innerHTML = state.roster.bullpen
    .map(
      (p) => `
        <div class="staff-row bullpen-row">
          <div class="row-pos">${escapeHtml(p.slot)}</div>
          <div class="row-name">${escapeHtml(p.name)}</div>
        </div>
      `
    )
    .join("");
}

function buildPositionCard(label, players, colorClass) {
  return `
    <div class="pos-head">
      <div class="pos-label">${label}</div>
    </div>
    <div class="pos-mini-head">
      <div>POS</div>
      <div>NAME</div>
      <div>TC</div>
    </div>
    <div class="pos-card ${colorClass}"></div>
    ${players.length ? players.map((player, index) => `
      <div class="pos-row">
        <div class="row-pos">${index === 0 ? label : escapeHtml(player.slot)}</div>
        <div class="row-name">${escapeHtml(player.name)}</div>
        <div class="row-tc">${escapeHtml(player.tc || "")}</div>
      </div>
    `).join("") : `
      <div class="pos-row">
        <div class="row-pos">${label}</div>
        <div class="row-name">—</div>
        <div class="row-tc"></div>
      </div>
    `}
  `;
}

function renderRosterEditor() {
  const container = document.getElementById("rosterEditorGrid");

  container.innerHTML = Object.entries(state.roster)
    .map(([groupKey, players]) => `
      <div class="editor-card">
        <div class="editor-card-head">
          <h3>${rosterMeta[groupKey]}</h3>
          <button class="add-row-btn" data-group="${groupKey}">Add Player</button>
        </div>
        <div class="editor-card-body">
          ${players.map((player) => `
            <div class="player-row" data-group="${groupKey}" data-id="${player.id}">
              <input type="text" data-field="name" value="${escapeAttr(player.name)}" placeholder="Player" />
              <input type="text" data-field="slot" value="${escapeAttr(player.slot)}" placeholder="POS" />
              <input type="text" data-field="tc" value="${escapeAttr(player.tc || "")}" placeholder="TC" />
              <button class="delete-row-btn" data-action="delete-player">Delete</button>
            </div>
          `).join("")}
        </div>
      </div>
    `)
    .join("");

  container.querySelectorAll(".add-row-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const group = btn.dataset.group;
      state.roster[group].push({
        id: makeId(),
        name: "",
        slot: "",
        tc: ""
      });
      renderAll();
    });
  });

  container.querySelectorAll(".player-row input").forEach((input) => {
    input.addEventListener("input", (e) => {
      const row = e.target.closest(".player-row");
      const group = row.dataset.group;
      const id = row.dataset.id;
      const field = e.target.dataset.field;
      const player = state.roster[group].find((p) => p.id === id);
      if (!player) return;
      player[field] = e.target.value;
      renderCounts();
      renderDepthChart();
      saveState();
    });
  });

  container.querySelectorAll('[data-action="delete-player"]').forEach((btn) => {
    btn.addEventListener("click", () => {
      const row = btn.closest(".player-row");
      const group = row.dataset.group;
      const id = row.dataset.id;
      state.roster[group] = state.roster[group].filter((p) => p.id !== id);
      renderAll();
    });
  });
}

function renderTransactions() {
  const list = document.getElementById("transactionList");

  list.innerHTML = state.transactions
    .map((t) => `
      <div class="transaction-card">
        <div class="transaction-main">
          <div class="transaction-topline">
            <div class="transaction-opponent">${escapeHtml(t.opponent || "Unknown Opponent")}</div>
            <div class="result-badge ${resultClass(t.result)}">${escapeHtml(t.result || "—")}</div>
            <div class="transaction-date">${escapeHtml(t.date || "")}</div>
          </div>
          <div class="transaction-details">
            <div><strong>Acquired:</strong> ${escapeHtml(t.acquiredPlayer || "—")}</div>
            <div><strong>Removed:</strong> ${escapeHtml(t.removedPlayer || "—")}</div>
            <div><strong>Notes:</strong> ${escapeHtml(t.notes || "—")}</div>
          </div>
        </div>
        <div class="transaction-actions">
          <button class="edit-btn" data-action="edit-transaction" data-id="${t.id}">Edit</button>
          <button class="delete-btn" data-action="delete-transaction" data-id="${t.id}">Delete</button>
        </div>
      </div>
    `)
    .join("");

  list.querySelectorAll('[data-action="edit-transaction"]').forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.id;
      startTransactionEdit(id);
    });
  });

  list.querySelectorAll('[data-action="delete-transaction"]').forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.id;
      state.transactions = state.transactions.filter((t) => t.id !== id);
      if (editingTransactionId === id) {
        cancelTransactionEdit();
      }
      renderAll();
    });
  });
}

function saveTransactionFromForm() {
  const tx = {
    date: document.getElementById("txDate").value,
    opponent: document.getElementById("txOpponent").value.trim(),
    result: document.getElementById("txResult").value,
    acquiredPlayer: document.getElementById("txAcquiredPlayer").value.trim(),
    removedPlayer: document.getElementById("txRemovedPlayer").value.trim(),
    notes: document.getElementById("txNotes").value.trim()
  };

  if (!tx.opponent || !tx.result) {
    alert("Add at least an opponent and a result.");
    return;
  }

  if (editingTransactionId) {
    state.transactions = state.transactions.map((item) =>
      item.id === editingTransactionId ? { ...item, ...tx } : item
    );
  } else {
    state.transactions.unshift({
      id: makeId(),
      ...tx
    });
  }

  cancelTransactionEdit(false);
  renderAll();
}

function startTransactionEdit(id) {
  const tx = state.transactions.find((item) => item.id === id);
  if (!tx) return;

  editingTransactionId = id;
  document.getElementById("transactionFormTitle").textContent = "Edit Transaction";
  document.getElementById("cancelEditBtn").classList.remove("hidden");

  document.getElementById("txDate").value = tx.date || "";
  document.getElementById("txOpponent").value = tx.opponent || "";
  document.getElementById("txResult").value = tx.result || "";
  document.getElementById("txAcquiredPlayer").value = tx.acquiredPlayer || "";
  document.getElementById("txRemovedPlayer").value = tx.removedPlayer || "";
  document.getElementById("txNotes").value = tx.notes || "";

  document.getElementById("tab-transactions").scrollIntoView({ behavior: "smooth", block: "start" });
}

function cancelTransactionEdit(resetFields = true) {
  editingTransactionId = null;
  document.getElementById("transactionFormTitle").textContent = "Add Transaction";
  document.getElementById("cancelEditBtn").classList.add("hidden");

  if (resetFields) return;

  document.getElementById("txDate").value = new Date().toISOString().slice(0, 10);
  document.getElementById("txOpponent").value = "";
  document.getElementById("txResult").value = "";
  document.getElementById("txAcquiredPlayer").value = "";
  document.getElementById("txRemovedPlayer").value = "";
  document.getElementById("txNotes").value = "";
}

function resultClass(result) {
  const normalized = (result || "").toLowerCase();
  if (normalized === "win") return "win";
  if (normalized === "loss") return "loss";
  return "tie";
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(value) {
  return escapeHtml(value);
}
