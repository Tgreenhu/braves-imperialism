const STORAGE_KEY = "braves-imperialism-tracker-v2";

const baseRosterDefault = {
  lineup: [
    { id: makeId(), name: "Drake Baldwin", slot: "C" },
    { id: makeId(), name: "Matt Olson", slot: "1B" },
    { id: makeId(), name: "Ozzie Albies", slot: "2B" },
    { id: makeId(), name: "Austin Riley", slot: "3B" },
    { id: makeId(), name: "Bobby Witt Jr.", slot: "SS" },
    { id: makeId(), name: "Mike Yastrzemski", slot: "LF" },
    { id: makeId(), name: "Michael Harris II", slot: "CF" },
    { id: makeId(), name: "Ronald Acuña Jr.", slot: "RF" }
  ],
  bench: [
    { id: makeId(), name: "Jonah Heim", slot: "C" },
    { id: makeId(), name: "Dominic Smith", slot: "DH/1B" },
    { id: makeId(), name: "Mauricio Dubón", slot: "UTIL" },
    { id: makeId(), name: "Jorge Mateo", slot: "INF" },
    { id: makeId(), name: "Eli White", slot: "OF" }
  ],
  rotation: [
    { id: makeId(), name: "Chris Sale", slot: "SP1" },
    { id: makeId(), name: "Jose Soriano", slot: "SP2" },
    { id: makeId(), name: "Reynaldo Lopez", slot: "SP3" },
    { id: makeId(), name: "Luis Severino", slot: "SP4" },
    { id: makeId(), name: "Bryce Elder", slot: "SP5" }
  ],
  bullpen: [
    { id: makeId(), name: "Robert Suarez", slot: "CL" },
    { id: makeId(), name: "Raisel Iglesias", slot: "SU" },
    { id: makeId(), name: "Aaron Bummer", slot: "LHP" },
    { id: makeId(), name: "Dylan Lee", slot: "LHP" },
    { id: makeId(), name: "Tyler Kinley", slot: "RHP" },
    { id: makeId(), name: "Joel Payamps", slot: "RHP" },
    { id: makeId(), name: "Osvaldo Bido", slot: "RHP" },
    { id: makeId(), name: "Grant Holmes", slot: "RHP" }
  ]
};

const transactionsDefault = [
  {
    id: makeId(),
    date: "2026-04-01",
    opponent: "Royals",
    result: "Win",
    acquiredPlayer: "Bobby Witt Jr.",
    acquiredSlot: "SS",
    acquiredGroup: "lineup",
    removedPlayer: "Orlando Arcia",
    notes: "Installed Bobby Witt Jr. at shortstop."
  },
  {
    id: makeId(),
    date: "2026-04-03",
    opponent: "Athletics",
    result: "Win",
    acquiredPlayer: "Luis Severino",
    acquiredSlot: "SP4",
    acquiredGroup: "rotation",
    removedPlayer: "Jose Suarez",
    notes: "Severino added to the rotation."
  },
  {
    id: makeId(),
    date: "2026-04-05",
    opponent: "Angels",
    result: "Win",
    acquiredPlayer: "Jose Soriano",
    acquiredSlot: "SP2",
    acquiredGroup: "rotation",
    removedPlayer: "Martin Perez",
    notes: "Soriano added to the rotation."
  }
];

const rosterMeta = {
  lineup: "Starting 8",
  bench: "Bench",
  rotation: "Rotation",
  bullpen: "Bullpen"
};

let state = loadState();
let editingTransactionId = null;

document.addEventListener("DOMContentLoaded", () => {
  bindTabs();
  bindTransactionForm();
  bindDownload();
  renderAll();
});

function makeId() {
  return Math.random().toString(36).slice(2, 10);
}

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        baseRoster: deepClone(baseRosterDefault),
        transactions: deepClone(transactionsDefault)
      };
    }
    const parsed = JSON.parse(raw);
    return {
      baseRoster: parsed.baseRoster || deepClone(baseRosterDefault),
      transactions: parsed.transactions || deepClone(transactionsDefault)
    };
  } catch {
    return {
      baseRoster: deepClone(baseRosterDefault),
      transactions: deepClone(transactionsDefault)
    };
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
    const original = document.getElementById("depthChartExport");
    const clone = original.cloneNode(true);

    clone.style.width = "1080px";
    clone.style.height = "1080px";
    clone.style.aspectRatio = "unset";
    clone.style.position = "fixed";
    clone.style.left = "-99999px";
    clone.style.top = "0";
    document.body.appendChild(clone);

    const canvas = await html2canvas(clone, {
      backgroundColor: null,
      scale: 2,
      useCORS: true
    });

    document.body.removeChild(clone);

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

function getSortedTransactions() {
  return [...state.transactions].sort((a, b) => {
    const da = a.date || "";
    const db = b.date || "";
    if (da !== db) return da.localeCompare(db);
    return a.id.localeCompare(b.id);
  });
}

function getCurrentRoster() {
  const roster = deepClone(state.baseRoster);
  const transactions = getSortedTransactions();

  for (const tx of transactions) {
    const acquired = (tx.acquiredPlayer || "").trim();
    const removed = (tx.removedPlayer || "").trim();
    const acquiredSlot = (tx.acquiredSlot || "").trim();
    const acquiredGroup = tx.acquiredGroup || inferGroupFromSlot(acquiredSlot);

    if (removed) {
      for (const group of Object.keys(roster)) {
        roster[group] = roster[group].filter(
          (player) => normalize(player.name) !== normalize(removed)
        );
      }
    }

    if (acquired && tx.result === "Win") {
      if (!roster[acquiredGroup]) roster.bench.push({ id: makeId(), name: acquired, slot: acquiredSlot || "UTIL" });
      else {
        const exists = Object.values(roster).flat().some(
          (player) => normalize(player.name) === normalize(acquired)
        );
        if (!exists) {
          roster[acquiredGroup].push({
            id: makeId(),
            name: acquired,
            slot: acquiredSlot || defaultSlotForGroup(acquiredGroup)
          });
        }
      }
    }
  }

  return roster;
}

function inferGroupFromSlot(slot) {
  const s = (slot || "").toUpperCase();
  if (s.startsWith("SP")) return "rotation";
  if (["CL", "SU", "LHP", "RHP", "RP"].some((x) => s.includes(x))) return "bullpen";
  if (["C", "1B", "2B", "3B", "SS", "LF", "CF", "RF"].includes(s)) return "lineup";
  return "bench";
}

function defaultSlotForGroup(group) {
  if (group === "rotation") return "SP";
  if (group === "bullpen") return "RP";
  if (group === "lineup") return "UTIL";
  return "UTIL";
}

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function renderAll() {
  const currentRoster = getCurrentRoster();
  renderCounts(currentRoster);
  renderDepthChart(currentRoster);
  renderRosterEditor();
  renderTransactions();
  saveState();
}

function renderCounts(currentRoster) {
  const total = Object.values(currentRoster).flat().length;
  document.getElementById("totalPlayersBadge").textContent = `${total} Players Loaded`;
  document.getElementById("chartFooterCount").textContent = `${total} Players Loaded`;
}

function getCombinedHitters(roster) {
  return [...roster.lineup, ...roster.bench];
}

function exactPlayers(roster, slot) {
  return getCombinedHitters(roster).filter((p) => p.slot.toUpperCase() === slot.toUpperCase());
}

function includesPlayers(roster, keys) {
  return getCombinedHitters(roster).filter((p) =>
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

function capPlayers(arr, max = 4) {
  return arr.slice(0, max);
}

function renderDepthChart(roster) {
  const lf = capPlayers(uniqPlayers([...exactPlayers(roster, "LF"), ...exactPlayers(roster, "OF")]));
  const cf = capPlayers(uniqPlayers([...exactPlayers(roster, "CF"), ...exactPlayers(roster, "OF")]));
  const rf = capPlayers(uniqPlayers([...exactPlayers(roster, "RF"), ...exactPlayers(roster, "OF")]));

  const third = capPlayers(uniqPlayers([...exactPlayers(roster, "3B"), ...exactPlayers(roster, "INF"), ...exactPlayers(roster, "UTIL")]));
  const ss = capPlayers(uniqPlayers([...exactPlayers(roster, "SS"), ...exactPlayers(roster, "INF"), ...exactPlayers(roster, "UTIL")]));
  const second = capPlayers(uniqPlayers([...exactPlayers(roster, "2B"), ...exactPlayers(roster, "INF"), ...exactPlayers(roster, "UTIL")]));
  const first = capPlayers(uniqPlayers([...exactPlayers(roster, "1B"), ...includesPlayers(roster, ["DH"]), ...exactPlayers(roster, "UTIL")]));
  const catcher = capPlayers(uniqPlayers(exactPlayers(roster, "C")), 3);

  document.getElementById("pos-lf").className = "pos-card pos-lf green";
  document.getElementById("pos-cf").className = "pos-card pos-cf green";
  document.getElementById("pos-rf").className = "pos-card pos-rf purple";
  document.getElementById("pos-3b").className = "pos-card pos-3b purple";
  document.getElementById("pos-ss").className = "pos-card pos-ss navy";
  document.getElementById("pos-2b").className = "pos-card pos-2b green";
  document.getElementById("pos-1b").className = "pos-card pos-1b navy";
  document.getElementById("pos-c").className = "pos-card pos-c red";

  document.getElementById("pos-lf").innerHTML = buildPositionCard("LF", lf);
  document.getElementById("pos-cf").innerHTML = buildPositionCard("CF", cf);
  document.getElementById("pos-rf").innerHTML = buildPositionCard("RF", rf);
  document.getElementById("pos-3b").innerHTML = buildPositionCard("3B", third);
  document.getElementById("pos-ss").innerHTML = buildPositionCard("SS", ss);
  document.getElementById("pos-2b").innerHTML = buildPositionCard("2B", second);
  document.getElementById("pos-1b").innerHTML = buildPositionCard("1B", first);
  document.getElementById("pos-c").innerHTML = buildPositionCard("C", catcher);

  document.getElementById("rotationList").innerHTML = roster.rotation
    .slice(0, 5)
    .map(
      (p) => `
        <div class="staff-row rotation-row">
          <div class="row-pos">${escapeHtml(p.slot)}</div>
          <div class="row-name">${escapeHtml(p.name)}</div>
        </div>
      `
    )
    .join("");

  document.getElementById("bullpenList").innerHTML = roster.bullpen
    .slice(0, 8)
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

function buildPositionCard(label, players) {
  const rows = players.length
    ? players.map((player, index) => `
      <div class="pos-row">
        <div class="row-pos">${index === 0 ? label : escapeHtml(player.slot)}</div>
        <div class="row-name" title="${escapeAttr(player.name)}">${escapeHtml(player.name)}</div>
      </div>
    `).join("")
    : `
      <div class="pos-row">
        <div class="row-pos">${label}</div>
        <div class="row-name">—</div>
      </div>
    `;

  return `
    <div class="pos-head">
      <div class="pos-label">${label}</div>
    </div>
    <div class="pos-mini-head">
      <div>POS</div>
      <div>NAME</div>
    </div>
    ${rows}
  `;
}

function renderRosterEditor() {
  const container = document.getElementById("rosterEditorGrid");

  container.innerHTML = Object.entries(state.baseRoster)
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
      state.baseRoster[group].push({
        id: makeId(),
        name: "",
        slot: defaultSlotForGroup(group)
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
      const player = state.baseRoster[group].find((p) => p.id === id);
      if (!player) return;
      player[field] = e.target.value;
      renderAll();
    });
  });

  container.querySelectorAll('[data-action="delete-player"]').forEach((btn) => {
    btn.addEventListener("click", () => {
      const row = btn.closest(".player-row");
      const group = row.dataset.group;
      const id = row.dataset.id;
      state.baseRoster[group] = state.baseRoster[group].filter((p) => p.id !== id);
      renderAll();
    });
  });
}

function renderTransactions() {
  const list = document.getElementById("transactionList");
  const transactions = getSortedTransactions();

  list.innerHTML = transactions
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
            <div><strong>Acquired Slot:</strong> ${escapeHtml(t.acquiredSlot || "—")}</div>
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
      if (editingTransactionId === id) cancelTransactionEdit();
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
    acquiredSlot: document.getElementById("txAcquiredPlayer").dataset.slot || "",
    acquiredGroup: document.getElementById("txAcquiredPlayer").dataset.group || "",
    removedPlayer: document.getElementById("txRemovedPlayer").value.trim(),
    notes: document.getElementById("txNotes").value.trim()
  };

  if (!tx.opponent || !tx.result || !tx.date) {
    alert("Add a date, opponent, and result.");
    return;
  }

  if (tx.acquiredPlayer && !tx.acquiredSlot) {
    tx.acquiredSlot = prompt("What position/slot should the acquired player have? Example: SS, LF, SP4, RP") || "";
    tx.acquiredGroup = inferGroupFromSlot(tx.acquiredSlot);
  }

  if (editingTransactionId) {
    state.transactions = state.transactions.map((item) =>
      item.id === editingTransactionId ? { ...item, ...tx } : item
    );
  } else {
    state.transactions.push({
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
  document.getElementById("txAcquiredPlayer").dataset.slot = tx.acquiredSlot || "";
  document.getElementById("txAcquiredPlayer").dataset.group = tx.acquiredGroup || "";
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
  document.getElementById("txAcquiredPlayer").dataset.slot = "";
  document.getElementById("txAcquiredPlayer").dataset.group = "";
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
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(value) {
  return escapeHtml(value);
}
