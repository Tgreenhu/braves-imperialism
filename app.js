const STORAGE_KEY = "braves-imperialism-tracker-v3";
const LEGACY_KEYS = [
  "braves-imperialism-tracker-v3",
  "braves-imperialism-tracker-v2",
  "braves-imperialism-final",
  "braves-imperialism-tracker-v1"
];

const rosterMeta = {
  lineup: "Starting 8",
  bench: "Bench",
  rotation: "Rotation",
  bullpen: "Bullpen"
};

const defaultState = {
  baseRoster: {
    lineup: [
      { id: makeId(), name: "Drake Baldwin", slot: "C" },
      { id: makeId(), name: "Matt Olson", slot: "1B" },
      { id: makeId(), name: "Ozzie Albies", slot: "2B" },
      { id: makeId(), name: "Austin Riley", slot: "3B" },
      { id: makeId(), name: "Kyle Farmer", slot: "SS" },
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
      { id: makeId(), name: "Martin Perez", slot: "SP2" },
      { id: makeId(), name: "Reynaldo Lopez", slot: "SP3" },
      { id: makeId(), name: "Jose Suarez", slot: "SP4" },
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
  },
  transactions: [
    {
      id: makeId(),
      createdAt: Date.now() - 3000,
      date: "2026-04-01",
      opponent: "Royals",
      result: "Win",
      acquiredPlayer: "Bobby Witt Jr.",
      acquiredSlot: "SS",
      acquiredGroup: "lineup",
      removedPlayer: "Kyle Farmer",
      notes: "Installed Bobby Witt Jr. at shortstop."
    },
    {
      id: makeId(),
      createdAt: Date.now() - 2000,
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
      createdAt: Date.now() - 1000,
      date: "2026-04-05",
      opponent: "Angels",
      result: "Win",
      acquiredPlayer: "Jose Soriano",
      acquiredSlot: "SP2",
      acquiredGroup: "rotation",
      removedPlayer: "Martin Perez",
      notes: "Soriano added to the rotation."
    }
  ]
};

let state = loadState();
let editingTransactionId = null;

document.addEventListener("DOMContentLoaded", () => {
  injectLogos();
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
    for (const key of LEGACY_KEYS) {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);

      if (parsed.baseRoster && parsed.transactions) {
        return normalizeLoadedState(parsed);
      }

      if (parsed.roster && parsed.transactions) {
        return {
          baseRoster: normalizeRoster(parsed.roster),
          transactions: normalizeTransactions(parsed.transactions)
        };
      }
    }
  } catch (err) {
    console.error("Failed loading saved state:", err);
  }

  return deepClone(defaultState);
}

function normalizeLoadedState(parsed) {
  return {
    baseRoster: normalizeRoster(parsed.baseRoster),
    transactions: normalizeTransactions(parsed.transactions)
  };
}

function normalizeRoster(roster) {
  const safe = deepClone(defaultState.baseRoster);
  if (!roster || typeof roster !== "object") return safe;

  for (const group of Object.keys(safe)) {
    if (Array.isArray(roster[group])) {
      safe[group] = roster[group].map((player) => ({
        id: player.id || makeId(),
        name: player.name || "",
        slot: player.slot || defaultSlotForGroup(group)
      }));
    }
  }

  return safe;
}

function normalizeTransactions(transactions) {
  if (!Array.isArray(transactions)) return deepClone(defaultState.transactions);

  return transactions.map((tx, index) => ({
    id: tx.id || makeId(),
    createdAt: typeof tx.createdAt === "number" ? tx.createdAt : Date.now() + index,
    date: tx.date || "",
    opponent: tx.opponent || "",
    result: tx.result || "",
    acquiredPlayer: tx.acquiredPlayer || "",
    acquiredSlot: tx.acquiredSlot || "",
    acquiredGroup: tx.acquiredGroup || "",
    removedPlayer: tx.removedPlayer || "",
    notes: tx.notes || ""
  }));
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

function bindTransactionForm() {
  const saveBtn = document.getElementById("saveTransactionBtn");
  const cancelBtn = document.getElementById("cancelEditBtn");

  saveBtn.addEventListener("click", saveTransactionFromForm);
  cancelBtn.addEventListener("click", () => cancelTransactionEdit(true));
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

function injectLogos() {
  const hero = document.querySelector(".app-hero > div:first-child");
  if (hero && !document.querySelector(".hero-left")) {
    const originalContent = hero.innerHTML;
    hero.innerHTML = `
      <div class="hero-left">
        <img src="./logo.png" alt="Braves Today logo" class="hero-logo" />
        <div class="hero-copy">${originalContent}</div>
      </div>
    `;
  }

  const chartHeader = document.querySelector(".chart-header");
  const titleBlock = document.querySelector(".chart-title-block");
  if (chartHeader && titleBlock && !document.querySelector(".chart-header-left")) {
    titleBlock.parentNode.insertBefore(
      htmlToElement(`
        <div class="chart-header-left">
          <img src="./logo.png" alt="Braves Today logo" class="chart-logo" />
        </div>
      `),
      titleBlock
    );
    document.querySelector(".chart-header-left").appendChild(titleBlock);
  }
}

function htmlToElement(html) {
  const template = document.createElement("template");
  template.innerHTML = html.trim();
  return template.content.firstChild;
}

function renderAll() {
  const currentRoster = getCurrentRoster();
  renderCounts(currentRoster);
  renderDepthChart(currentRoster);
  renderRosterEditor(currentRoster);
  renderTransactions();
  saveState();
}

function getSortedTransactions() {
  return [...state.transactions].sort((a, b) => {
    const byDate = String(a.date || "").localeCompare(String(b.date || ""));
    if (byDate !== 0) return byDate;
    return (a.createdAt || 0) - (b.createdAt || 0);
  });
}

function getCurrentRoster() {
  const roster = deepClone(state.baseRoster);

  for (const group of Object.keys(roster)) {
    roster[group] = roster[group].map((player) => ({
      ...player,
      __sourceType: "base",
      __sourceGroup: group,
      __sourceId: player.id
    }));
  }

  const txs = getSortedTransactions();

  for (const tx of txs) {
    const removed = normalize(tx.removedPlayer);
    const acquired = normalize(tx.acquiredPlayer);

    if (removed) {
      for (const group of Object.keys(roster)) {
        roster[group] = roster[group].filter((player) => normalize(player.name) !== removed);
      }
    }

    if (String(tx.result || "").toLowerCase() === "win" && acquired) {
      const group = tx.acquiredGroup || inferGroupFromSlot(tx.acquiredSlot);
      const slot = tx.acquiredSlot || defaultSlotForGroup(group);

      const exists = Object.values(roster).flat().some((player) => normalize(player.name) === acquired);
      if (!exists) {
        if (!roster[group]) roster[group] = [];
        roster[group].push({
          id: `tx-${tx.id}`,
          name: tx.acquiredPlayer,
          slot,
          __sourceType: "tx",
          __sourceGroup: group,
          __sourceId: tx.id
        });
      }
    }
  }

  return roster;
}

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function inferGroupFromSlot(slot) {
  const s = String(slot || "").toUpperCase();
  if (s.startsWith("SP")) return "rotation";
  if (["CL", "SU", "RP", "LHP", "RHP"].some((x) => s.includes(x))) return "bullpen";
  if (["C", "1B", "2B", "3B", "SS", "LF", "CF", "RF"].includes(s)) return "lineup";
  return "bench";
}

function defaultSlotForGroup(group) {
  if (group === "rotation") return "SP";
  if (group === "bullpen") return "RP";
  if (group === "lineup") return "UTIL";
  return "UTIL";
}

function renderCounts(currentRoster) {
  const total = Object.values(currentRoster).flat().length;
  document.getElementById("totalPlayersBadge").textContent = `${total} Players Loaded`;
  document.getElementById("chartFooterCount").textContent = `${total} Players Loaded`;
}

function combinedHitters(roster) {
  return [...roster.lineup, ...roster.bench];
}

function exactPlayers(roster, slot) {
  return combinedHitters(roster).filter((p) => String(p.slot).toUpperCase() === String(slot).toUpperCase());
}

function includesPlayers(roster, keys) {
  return combinedHitters(roster).filter((p) =>
    keys.some((key) => String(p.slot).toUpperCase().includes(String(key).toUpperCase()))
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

function limitPlayers(arr, max) {
  return {
    visible: arr.slice(0, max),
    extra: Math.max(0, arr.length - max)
  };
}

function renderDepthChart(roster) {
  const lf = limitPlayers(uniqPlayers([...exactPlayers(roster, "LF"), ...exactPlayers(roster, "OF")]), 3);
  const cf = limitPlayers(uniqPlayers([...exactPlayers(roster, "CF"), ...exactPlayers(roster, "OF")]), 3);
  const rf = limitPlayers(uniqPlayers([...exactPlayers(roster, "RF"), ...exactPlayers(roster, "OF")]), 3);

  const third = limitPlayers(uniqPlayers([...exactPlayers(roster, "3B"), ...exactPlayers(roster, "INF"), ...exactPlayers(roster, "UTIL")]), 3);
  const ss = limitPlayers(uniqPlayers([...exactPlayers(roster, "SS"), ...exactPlayers(roster, "INF"), ...exactPlayers(roster, "UTIL")]), 3);
  const second = limitPlayers(uniqPlayers([...exactPlayers(roster, "2B"), ...exactPlayers(roster, "INF"), ...exactPlayers(roster, "UTIL")]), 3);
  const first = limitPlayers(uniqPlayers([...exactPlayers(roster, "1B"), ...includesPlayers(roster, ["DH"]), ...exactPlayers(roster, "UTIL")]), 3);
  const catcher = limitPlayers(uniqPlayers(exactPlayers(roster, "C")), 2);

  setPositionCard("pos-lf", "LF", lf.visible, lf.extra, "green");
  setPositionCard("pos-cf", "CF", cf.visible, cf.extra, "green");
  setPositionCard("pos-rf", "RF", rf.visible, rf.extra, "purple");
  setPositionCard("pos-3b", "3B", third.visible, third.extra, "purple");
  setPositionCard("pos-ss", "SS", ss.visible, ss.extra, "navy");
  setPositionCard("pos-2b", "2B", second.visible, second.extra, "green");
  setPositionCard("pos-1b", "1B", first.visible, first.extra, "navy");
  setPositionCard("pos-c", "C", catcher.visible, catcher.extra, "red");

  document.getElementById("rotationList").innerHTML = roster.rotation
    .slice(0, 5)
    .map(
      (p) => `
        <div class="staff-row rotation-row">
          <div class="row-pos">${escapeHtml(p.slot)}</div>
          <div class="row-name" title="${escapeAttr(p.name)}">${escapeHtml(p.name)}</div>
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
          <div class="row-name" title="${escapeAttr(p.name)}">${escapeHtml(p.name)}</div>
        </div>
      `
    )
    .join("");
}

function setPositionCard(id, label, players, extra, colorClass) {
  const el = document.getElementById(id);
  el.className = `pos-card ${id.replace("pos-", "pos-")} ${colorClass}`;
  el.innerHTML = buildPositionCard(label, players, extra);
}

function buildPositionCard(label, players, extra) {
  const rows = players.length
    ? players
        .map(
          (player, index) => `
            <div class="pos-row">
              <div class="row-pos">${index === 0 ? label : escapeHtml(player.slot)}</div>
              <div class="row-name" title="${escapeAttr(player.name)}">${escapeHtml(player.name)}</div>
            </div>
          `
        )
        .join("")
    : `
      <div class="pos-row">
        <div class="row-pos">${label}</div>
        <div class="row-name">—</div>
      </div>
    `;

  const extraHtml = extra > 0 ? `<div class="pos-more">+${extra} more</div>` : "";

  return `
    <div class="pos-head">
      <div class="pos-label">${label}</div>
    </div>
    <div class="pos-mini-head">
      <div>POS</div>
      <div>NAME</div>
    </div>
    ${rows}
    ${extraHtml}
  `;
}

function renderRosterEditor(currentRoster) {
  const container = document.getElementById("rosterEditorGrid");

  container.innerHTML = Object.entries(currentRoster)
    .map(([groupKey, players]) => `
      <div class="editor-card">
        <div class="editor-card-head">
          <h3>${rosterMeta[groupKey]}</h3>
          <button class="add-row-btn" data-group="${groupKey}">Add Player</button>
        </div>
        <div class="editor-card-body">
          ${players
            .map(
              (player) => `
                <div 
                  class="player-row" 
                  data-group="${groupKey}" 
                  data-id="${player.id}"
                  data-source-type="${player.__sourceType || "base"}"
                  data-source-id="${player.__sourceId || player.id}"
                  data-source-group="${player.__sourceGroup || groupKey}"
                >
                  <input type="text" data-field="name" value="${escapeAttr(player.name)}" placeholder="Player" />
                  <input type="text" data-field="slot" value="${escapeAttr(player.slot)}" placeholder="POS" />
                  <button class="delete-row-btn" data-action="delete-player">Delete</button>
                </div>
              `
            )
            .join("")}
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
      updateSourceFromEditorRow(row, e.target.dataset.field, e.target.value, false);
    });

    input.addEventListener("blur", (e) => {
      const row = e.target.closest(".player-row");
      updateSourceFromEditorRow(row, e.target.dataset.field, e.target.value, true);
    });
  });

  container.querySelectorAll('[data-action="delete-player"]').forEach((btn) => {
    btn.addEventListener("click", () => {
      const row = btn.closest(".player-row");
      const sourceType = row.dataset.sourceType;
      const sourceId = row.dataset.sourceId;
      const sourceGroup = row.dataset.sourceGroup;

      if (sourceType === "base") {
        state.baseRoster[sourceGroup] = state.baseRoster[sourceGroup].filter((p) => p.id !== sourceId);
      } else {
        const tx = state.transactions.find((item) => item.id === sourceId);
        if (tx) {
          tx.acquiredPlayer = "";
          tx.acquiredSlot = "";
          tx.acquiredGroup = "";
        }
      }

      renderAll();
    });
  });
}

function updateSourceFromEditorRow(row, field, value, rerenderAfter) {
  const sourceType = row.dataset.sourceType;
  const sourceId = row.dataset.sourceId;
  const sourceGroup = row.dataset.sourceGroup;

  if (sourceType === "base") {
    const player = state.baseRoster[sourceGroup].find((p) => p.id === sourceId);
    if (!player) return;
    player[field] = value;
  } else {
    const tx = state.transactions.find((item) => item.id === sourceId);
    if (!tx) return;

    if (field === "name") tx.acquiredPlayer = value;
    if (field === "slot") {
      tx.acquiredSlot = value;
      tx.acquiredGroup = inferGroupFromSlot(value);
    }
  }

  if (rerenderAfter) {
    renderAll();
  } else {
    const roster = getCurrentRoster();
    renderCounts(roster);
    renderDepthChart(roster);
    saveState();
  }
}

function renderTransactions() {
  const list = document.getElementById("transactionList");
  const txs = getSortedTransactions();

  list.innerHTML = txs
    .map(
      (t) => `
        <div class="transaction-card">
          <div class="transaction-main">
            <div class="transaction-topline">
              <div class="transaction-opponent">${escapeHtml(t.opponent || "Unknown Opponent")}</div>
              <div class="result-badge ${resultClass(t.result)}">${escapeHtml(t.result || "—")}</div>
              <div class="transaction-date">${escapeHtml(t.date || "")}</div>
            </div>
            <div class="transaction-details">
              <div><strong>Acquired:</strong> ${escapeHtml(t.acquiredPlayer || "—")}</div>
              <div><strong>Slot:</strong> ${escapeHtml(t.acquiredSlot || "—")}</div>
              <div><strong>Removed:</strong> ${escapeHtml(t.removedPlayer || "—")}</div>
              <div><strong>Notes:</strong> ${escapeHtml(t.notes || "—")}</div>
            </div>
          </div>
          <div class="transaction-actions">
            <button class="edit-btn" data-action="edit-transaction" data-id="${t.id}">Edit</button>
            <button class="delete-btn" data-action="delete-transaction" data-id="${t.id}">Delete</button>
          </div>
        </div>
      `
    )
    .join("");

  list.querySelectorAll('[data-action="edit-transaction"]').forEach((btn) => {
    btn.addEventListener("click", () => startTransactionEdit(btn.dataset.id));
  });

  list.querySelectorAll('[data-action="delete-transaction"]').forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.id;
      state.transactions = state.transactions.filter((t) => t.id !== id);
      if (editingTransactionId === id) cancelTransactionEdit(true);
      renderAll();
    });
  });
}

function saveTransactionFromForm() {
  const acquiredInput = document.getElementById("txAcquiredPlayer");

  const tx = {
    date: document.getElementById("txDate").value,
    opponent: document.getElementById("txOpponent").value.trim(),
    result: document.getElementById("txResult").value,
    acquiredPlayer: acquiredInput.value.trim(),
    acquiredSlot: acquiredInput.dataset.slot || "",
    acquiredGroup: acquiredInput.dataset.group || "",
    removedPlayer: document.getElementById("txRemovedPlayer").value.trim(),
    notes: document.getElementById("txNotes").value.trim()
  };

  if (!tx.date || !tx.opponent || !tx.result) {
    alert("Add a date, opponent, and result.");
    return;
  }

  if (String(tx.result).toLowerCase() === "win" && tx.acquiredPlayer && !tx.acquiredSlot) {
    const guessed = guessSlotForPlayer(tx.acquiredPlayer);
    const slot = guessed || prompt("Enter the acquired player's slot/position. Example: SS, LF, SP4, RP");
    if (!slot) return;
    tx.acquiredSlot = slot.trim();
    tx.acquiredGroup = inferGroupFromSlot(tx.acquiredSlot);
  }

  if (editingTransactionId) {
    state.transactions = state.transactions.map((item) =>
      item.id === editingTransactionId
        ? { ...item, ...tx }
        : item
    );
  } else {
    state.transactions.push({
      id: makeId(),
      createdAt: Date.now(),
      ...tx
    });
  }

  cancelTransactionEdit(false);
  renderAll();
}

function guessSlotForPlayer(name) {
  const roster = getCurrentRoster();
  const found = Object.values(roster)
    .flat()
    .find((player) => normalize(player.name) === normalize(name));
  return found ? found.slot : "";
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

function cancelTransactionEdit(resetOnly = true) {
  editingTransactionId = null;
  document.getElementById("transactionFormTitle").textContent = "Add Transaction";
  document.getElementById("cancelEditBtn").classList.add("hidden");

  if (!resetOnly) {
    clearTransactionForm();
    return;
  }

  clearTransactionForm();
}

function clearTransactionForm() {
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
  const normalized = String(result || "").toLowerCase();
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
