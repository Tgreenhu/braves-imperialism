const STORAGE_KEY = "braves-imperialism-tracker-v4";

const POSITION_OPTIONS = [
  "C", "1B", "2B", "3B", "SS", "LF", "CF", "RF",
  "DH", "UTIL", "INF", "OF",
  "SP1", "SP2", "SP3", "SP4", "SP5",
  "CL", "SU", "RP", "LHP", "RHP"
];

const FIELD_POSITIONS = ["C", "1B", "2B", "3B", "SS", "LF", "CF", "RF"];

const DEFAULT_BOX_LAYOUT = {
  LF: { x: 28, y: 188 },
  CF: { x: 420, y: 128 },
  RF: { x: 842, y: 188 },
  "3B": { x: 32, y: 482 },
  SS: { x: 236, y: 382 },
  "2B": { x: 624, y: 382 },
  "1B": { x: 838, y: 482 },
  C: { x: 390, y: 876 },
  BULLPEN: { x: 34, y: 702 },
  ROTATION: { x: 726, y: 702 }
};

const rosterMeta = {
  lineup: "Starting 8",
  bench: "Bench",
  rotation: "Rotation",
  bullpen: "Bullpen"
};

const defaultState = {
  roster: {
    lineup: [
      makePlayer("Drake Baldwin", "C"),
      makePlayer("Matt Olson", "1B"),
      makePlayer("Ozzie Albies", "2B"),
      makePlayer("Austin Riley", "3B"),
      makePlayer("Bobby Witt Jr.", "SS"),
      makePlayer("Mike Yastrzemski", "LF"),
      makePlayer("Michael Harris II", "CF"),
      makePlayer("Ronald Acuña Jr.", "RF")
    ],
    bench: [
      makePlayer("Jonah Heim", "C"),
      makePlayer("Dominic Smith", "DH"),
      makePlayer("Mauricio Dubón", "SS", ["1B", "2B", "3B", "LF", "CF", "RF"]),
      makePlayer("Jorge Mateo", "INF", ["SS", "2B", "3B"]),
      makePlayer("Eli White", "OF", ["LF", "CF", "RF"])
    ],
    rotation: [
      makePlayer("Chris Sale", "SP1"),
      makePlayer("Jose Soriano", "SP2"),
      makePlayer("Reynaldo Lopez", "SP3"),
      makePlayer("Luis Severino", "SP4"),
      makePlayer("Bryce Elder", "SP5")
    ],
    bullpen: [
      makePlayer("Robert Suarez", "CL"),
      makePlayer("Raisel Iglesias", "SU"),
      makePlayer("Aaron Bummer", "LHP"),
      makePlayer("Dylan Lee", "LHP"),
      makePlayer("Tyler Kinley", "RHP"),
      makePlayer("Joel Payamps", "RHP"),
      makePlayer("Osvaldo Bido", "RHP"),
      makePlayer("Grant Holmes", "RHP")
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
  ],
  boxLayout: structuredClone(DEFAULT_BOX_LAYOUT)
};

let state = loadState();
let editingTransactionId = null;
let draggingBox = null;
let rosterDrag = null;

document.addEventListener("DOMContentLoaded", () => {
  hydrateTransactionPositionSelect();
  bindTabs();
  bindTransactionForm();
  bindDownload();
  bindLayoutReset();
  renderAll();
  initDepthBoxDragging();
});

function makeId() {
  return Math.random().toString(36).slice(2, 10);
}

function makePlayer(name, primaryPos, secondaryPositions = []) {
  return {
    id: makeId(),
    name,
    primaryPos,
    secondaryPositions: [...secondaryPositions]
  };
}

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return deepClone(defaultState);
    const parsed = JSON.parse(raw);

    return {
      roster: normalizeRoster(parsed.roster || defaultState.roster),
      transactions: normalizeTransactions(parsed.transactions || defaultState.transactions),
      boxLayout: normalizeBoxLayout(parsed.boxLayout || DEFAULT_BOX_LAYOUT)
    };
  } catch {
    return deepClone(defaultState);
  }
}

function normalizeRoster(roster) {
  const normalized = deepClone(defaultState.roster);

  for (const group of Object.keys(normalized)) {
    if (Array.isArray(roster[group])) {
      normalized[group] = roster[group].map((p) => ({
        id: p.id || makeId(),
        name: p.name || "",
        primaryPos: p.primaryPos || p.slot || defaultPrimaryPos(group),
        secondaryPositions: Array.isArray(p.secondaryPositions) ? p.secondaryPositions : []
      }));
    }
  }

  return normalized;
}

function normalizeTransactions(transactions) {
  return (Array.isArray(transactions) ? transactions : []).map((tx, index) => ({
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

function normalizeBoxLayout(layout) {
  const normalized = structuredClone(DEFAULT_BOX_LAYOUT);
  for (const key of Object.keys(normalized)) {
    if (layout[key] && typeof layout[key].x === "number" && typeof layout[key].y === "number") {
      normalized[key] = { x: layout[key].x, y: layout[key].y };
    }
  }
  return normalized;
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function hydrateTransactionPositionSelect() {
  const select = document.getElementById("txAcquiredSlot");
  select.innerHTML = `<option value="">Select position</option>` +
    POSITION_OPTIONS.map((pos) => `<option value="${pos}">${pos}</option>`).join("");
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
  document.getElementById("saveTransactionBtn").addEventListener("click", saveTransactionFromForm);
  document.getElementById("cancelEditBtn").addEventListener("click", cancelTransactionEdit);
  document.getElementById("txAcquiredSlot").addEventListener("change", (e) => {
    document.getElementById("txAcquiredGroup").value = inferGroupFromPrimaryPos(e.target.value);
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

function bindLayoutReset() {
  document.getElementById("resetDepthLayoutBtn").addEventListener("click", () => {
    state.boxLayout = structuredClone(DEFAULT_BOX_LAYOUT);
    saveState();
    applyDepthBoxPositions();
  });
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

function renderDepthChart() {
  const map = buildDepthMap();

  renderPositionBox("LF", map.LF, 4);
  renderPositionBox("CF", map.CF, 4);
  renderPositionBox("RF", map.RF, 4);
  renderPositionBox("3B", map["3B"], 4);
  renderPositionBox("SS", map.SS, 4);
  renderPositionBox("2B", map["2B"], 4);
  renderPositionBox("1B", map["1B"], 4);
  renderPositionBox("C", map.C, 3);

  document.getElementById("rotationList").innerHTML = state.roster.rotation
    .map((p) => `
      <div class="staff-row">
        <div class="row-pos">${escapeHtml(p.primaryPos)}</div>
        <div class="row-name" title="${escapeAttr(p.name)}">${escapeHtml(p.name)}</div>
      </div>
    `)
    .join("");

  document.getElementById("bullpenList").innerHTML = state.roster.bullpen
    .map((p) => `
      <div class="staff-row">
        <div class="row-pos">${escapeHtml(p.primaryPos)}</div>
        <div class="row-name" title="${escapeAttr(p.name)}">${escapeHtml(p.name)}</div>
      </div>
    `)
    .join("");

  applyDepthBoxPositions();
}

function buildDepthMap() {
  const map = {
    C: [],
    "1B": [],
    "2B": [],
    "3B": [],
    SS: [],
    LF: [],
    CF: [],
    RF: []
  };

  const hitters = [...state.roster.lineup, ...state.roster.bench];

  hitters.forEach((player, index) => {
    const primary = player.primaryPos;
    const secondary = Array.isArray(player.secondaryPositions) ? player.secondaryPositions : [];

    if (FIELD_POSITIONS.includes(primary)) {
      map[primary].push({ ...player, depthType: "primary", orderKey: index });
    } else {
      if (primary === "INF") {
        ["2B", "3B", "SS"].forEach((pos) => {
          map[pos].push({ ...player, depthType: "secondary", orderKey: index + 1000 });
        });
      }
      if (primary === "OF") {
        ["LF", "CF", "RF"].forEach((pos) => {
          map[pos].push({ ...player, depthType: "secondary", orderKey: index + 1000 });
        });
      }
      if (primary === "UTIL") {
        ["1B", "2B", "3B", "SS"].forEach((pos) => {
          map[pos].push({ ...player, depthType: "secondary", orderKey: index + 1000 });
        });
      }
      if (primary === "DH") {
        map["1B"].push({ ...player, depthType: "secondary", orderKey: index + 1000 });
      }
    }

    secondary.forEach((pos) => {
      if (FIELD_POSITIONS.includes(pos)) {
        map[pos].push({ ...player, depthType: "secondary", orderKey: index + 1000 });
      }
    });
  });

  for (const key of Object.keys(map)) {
    const seen = new Set();
    map[key] = map[key]
      .sort((a, b) => a.orderKey - b.orderKey)
      .filter((player) => {
        if (seen.has(player.id)) return false;
        seen.add(player.id);
        return true;
      });
  }

  return map;
}

function renderPositionBox(pos, players, maxVisible) {
  const target = document.getElementById(`box-${pos}`);
  const visible = players.slice(0, maxVisible);
  const extra = Math.max(0, players.length - maxVisible);

  target.innerHTML = `
    <div class="depth-title">${pos}</div>
    ${visible.map((player, i) => `
      <div class="depth-row">
        <div class="row-pos">${i === 0 ? pos : escapeHtml(player.primaryPos)}</div>
        <div class="row-name" title="${escapeAttr(player.name)}">${escapeHtml(player.name)}</div>
      </div>
    `).join("")}
    ${extra > 0 ? `<div class="pos-more">+${extra} more</div>` : ""}
  `;
}

function applyDepthBoxPositions() {
  document.querySelectorAll("[data-box]").forEach((box) => {
    const key = box.dataset.box;
    const pos = state.boxLayout[key];
    if (!pos) return;
    box.style.left = `${pos.x}px`;
    box.style.top = `${pos.y}px`;
  });
}

function initDepthBoxDragging() {
  const chart = document.getElementById("depthChartExport");

  document.querySelectorAll("[data-box]").forEach((box) => {
    box.addEventListener("pointerdown", (e) => {
      const chartRect = chart.getBoundingClientRect();
      const boxRect = box.getBoundingClientRect();

      draggingBox = {
        el: box,
        key: box.dataset.box,
        offsetX: e.clientX - boxRect.left,
        offsetY: e.clientY - boxRect.top,
        chartWidth: chartRect.width,
        chartHeight: chartRect.height
      };

      box.classList.add("dragging");
      box.setPointerCapture(e.pointerId);
    });

    box.addEventListener("pointermove", (e) => {
      if (!draggingBox || draggingBox.el !== box) return;

      const chartRect = chart.getBoundingClientRect();
      const nextX = e.clientX - chartRect.left - draggingBox.offsetX;
      const nextY = e.clientY - chartRect.top - draggingBox.offsetY;

      const clampedX = Math.max(0, Math.min(nextX, chartRect.width - box.offsetWidth));
      const clampedY = Math.max(96, Math.min(nextY, chartRect.height - box.offsetHeight - 24));

      box.style.left = `${clampedX}px`;
      box.style.top = `${clampedY}px`;
    });

    const endDrag = () => {
      if (!draggingBox || draggingBox.el !== box) return;
      box.classList.remove("dragging");

      state.boxLayout[draggingBox.key] = {
        x: parseFloat(box.style.left),
        y: parseFloat(box.style.top)
      };
      saveState();
      draggingBox = null;
    };

    box.addEventListener("pointerup", endDrag);
    box.addEventListener("pointercancel", endDrag);
  });
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
        <div class="editor-card-body" data-group-body="${groupKey}">
          ${players.map((player) => renderPlayerRow(player, groupKey)).join("")}
        </div>
      </div>
    `)
    .join("");

  bindRosterEditorControls();
}

function renderPlayerRow(player, groupKey) {
  return `
    <div class="player-row" draggable="true" data-group="${groupKey}" data-id="${player.id}">
      <div class="drag-handle">⋮⋮</div>

      <div class="field-wrap">
        <input type="text" data-field="name" value="${escapeAttr(player.name)}" placeholder="Player" />
      </div>

      <div class="field-wrap">
        <select data-field="primaryPos">
          ${POSITION_OPTIONS.map((pos) => `
            <option value="${pos}" ${player.primaryPos === pos ? "selected" : ""}>${pos}</option>
          `).join("")}
        </select>
      </div>

      <div class="secondary-wrap">
        <div class="secondary-positions">
          ${FIELD_POSITIONS.map((pos) => `
            <label class="secondary-pill">
              <input 
                type="checkbox" 
                data-secondary="${pos}" 
                ${player.secondaryPositions.includes(pos) ? "checked" : ""}
              />
              <span>${pos}</span>
            </label>
          `).join("")}
        </div>
      </div>

      <div class="delete-wrap">
        <button class="delete-row-btn" data-action="delete-player">Delete</button>
      </div>
    </div>
  `;
}

function bindRosterEditorControls() {
  document.querySelectorAll(".add-row-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const group = btn.dataset.group;
      state.roster[group].push(makePlayer("", defaultPrimaryPos(group)));
      renderAll();
    });
  });

  document.querySelectorAll(".player-row input[data-field='name']").forEach((input) => {
    input.addEventListener("input", (e) => {
      const row = e.target.closest(".player-row");
      const player = findRosterPlayer(row.dataset.group, row.dataset.id);
      if (!player) return;
      player.name = e.target.value;
      renderDepthChart();
      saveState();
    });
  });

  document.querySelectorAll(".player-row select[data-field='primaryPos']").forEach((select) => {
    select.addEventListener("change", (e) => {
      const row = e.target.closest(".player-row");
      const player = findRosterPlayer(row.dataset.group, row.dataset.id);
      if (!player) return;
      player.primaryPos = e.target.value;
      renderAll();
    });
  });

  document.querySelectorAll(".player-row input[data-secondary]").forEach((checkbox) => {
    checkbox.addEventListener("change", (e) => {
      const row = e.target.closest(".player-row");
      const player = findRosterPlayer(row.dataset.group, row.dataset.id);
      if (!player) return;

      const pos = e.target.dataset.secondary;
      const next = new Set(player.secondaryPositions);
      if (e.target.checked) next.add(pos);
      else next.delete(pos);
      player.secondaryPositions = [...next];
      renderDepthChart();
      saveState();
    });
  });

  document.querySelectorAll("[data-action='delete-player']").forEach((btn) => {
    btn.addEventListener("click", () => {
      const row = btn.closest(".player-row");
      state.roster[row.dataset.group] = state.roster[row.dataset.group].filter((p) => p.id !== row.dataset.id);
      renderAll();
    });
  });

  initRosterDragAndDrop();
}

function initRosterDragAndDrop() {
  document.querySelectorAll(".player-row").forEach((row) => {
    row.addEventListener("dragstart", () => {
      rosterDrag = { id: row.dataset.id, group: row.dataset.group };
      row.classList.add("dragging");
    });

    row.addEventListener("dragend", () => {
      row.classList.remove("dragging");
      rosterDrag = null;
    });

    row.addEventListener("dragover", (e) => {
      e.preventDefault();
    });

    row.addEventListener("drop", (e) => {
      e.preventDefault();
      if (!rosterDrag) return;

      const targetId = row.dataset.id;
      const group = row.dataset.group;
      if (group !== rosterDrag.group) return;
      if (targetId === rosterDrag.id) return;

      const arr = state.roster[group];
      const fromIndex = arr.findIndex((p) => p.id === rosterDrag.id);
      const toIndex = arr.findIndex((p) => p.id === targetId);
      if (fromIndex === -1 || toIndex === -1) return;

      const [moved] = arr.splice(fromIndex, 1);
      arr.splice(toIndex, 0, moved);

      renderAll();
    });
  });
}

function findRosterPlayer(group, id) {
  return state.roster[group].find((p) => p.id === id);
}

function defaultPrimaryPos(group) {
  if (group === "rotation") return "SP";
  if (group === "bullpen") return "RP";
  if (group === "bench") return "UTIL";
  return "UTIL";
}

function bindTransactionFormValues(tx) {
  document.getElementById("txDate").value = tx?.date || new Date().toISOString().slice(0, 10);
  document.getElementById("txOpponent").value = tx?.opponent || "";
  document.getElementById("txResult").value = tx?.result || "";
  document.getElementById("txAcquiredPlayer").value = tx?.acquiredPlayer || "";
  document.getElementById("txAcquiredSlot").value = tx?.acquiredSlot || "";
  document.getElementById("txAcquiredGroup").value = tx?.acquiredGroup || "lineup";
  document.getElementById("txRemovedPlayer").value = tx?.removedPlayer || "";
  document.getElementById("txNotes").value = tx?.notes || "";
}

function saveTransactionFromForm() {
  const tx = {
    date: document.getElementById("txDate").value,
    opponent: document.getElementById("txOpponent").value.trim(),
    result: document.getElementById("txResult").value,
    acquiredPlayer: document.getElementById("txAcquiredPlayer").value.trim(),
    acquiredSlot: document.getElementById("txAcquiredSlot").value,
    acquiredGroup: document.getElementById("txAcquiredGroup").value,
    removedPlayer: document.getElementById("txRemovedPlayer").value.trim(),
    notes: document.getElementById("txNotes").value.trim()
  };

  if (!tx.date || !tx.opponent || !tx.result) {
    alert("Add a date, opponent, and result.");
    return;
  }

  if (editingTransactionId) {
    state.transactions = state.transactions.map((item) =>
      item.id === editingTransactionId ? { ...item, ...tx } : item
    );
  } else {
    state.transactions.push({
      id: makeId(),
      createdAt: Date.now(),
      ...tx
    });
  }

  applyTransactionToRoster(tx, editingTransactionId);
  state.transactions = getSortedTransactions();
  cancelTransactionEdit();
  renderAll();
}

function applyTransactionToRoster(tx, editingId = null) {
  if (editingId) {
    state.roster = rebuildRosterFromTransactions();
    return;
  }

  if (tx.removedPlayer) {
    for (const group of Object.keys(state.roster)) {
      state.roster[group] = state.roster[group].filter(
        (player) => normalize(player.name) !== normalize(tx.removedPlayer)
      );
    }
  }

  if (String(tx.result).toLowerCase() === "win" && tx.acquiredPlayer) {
    const group = tx.acquiredGroup || inferGroupFromPrimaryPos(tx.acquiredSlot);
    const exists = Object.values(state.roster).flat().some(
      (player) => normalize(player.name) === normalize(tx.acquiredPlayer)
    );

    if (!exists) {
      state.roster[group].push(makePlayer(tx.acquiredPlayer, tx.acquiredSlot || defaultPrimaryPos(group)));
    }
  }
}

function rebuildRosterFromTransactions() {
  const roster = deepClone(defaultState.roster);
  const sorted = getSortedTransactions();

  for (const tx of sorted) {
    if (tx.removedPlayer) {
      for (const group of Object.keys(roster)) {
        roster[group] = roster[group].filter(
          (player) => normalize(player.name) !== normalize(tx.removedPlayer)
        );
      }
    }

    if (String(tx.result).toLowerCase() === "win" && tx.acquiredPlayer) {
      const group = tx.acquiredGroup || inferGroupFromPrimaryPos(tx.acquiredSlot);
      const exists = Object.values(roster).flat().some(
        (player) => normalize(player.name) === normalize(tx.acquiredPlayer)
      );

      if (!exists) {
        roster[group].push(makePlayer(tx.acquiredPlayer, tx.acquiredSlot || defaultPrimaryPos(group)));
      }
    }
  }

  return roster;
}

function getSortedTransactions() {
  return [...state.transactions].sort((a, b) => {
    const byDate = String(a.date || "").localeCompare(String(b.date || ""));
    if (byDate !== 0) return byDate;
    return (a.createdAt || 0) - (b.createdAt || 0);
  });
}

function renderTransactions() {
  const list = document.getElementById("transactionList");
  const txs = getSortedTransactions();

  list.innerHTML = txs
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
            <div><strong>Primary Position:</strong> ${escapeHtml(t.acquiredSlot || "—")}</div>
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

  list.querySelectorAll("[data-action='edit-transaction']").forEach((btn) => {
    btn.addEventListener("click", () => startTransactionEdit(btn.dataset.id));
  });

  list.querySelectorAll("[data-action='delete-transaction']").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.transactions = state.transactions.filter((t) => t.id !== btn.dataset.id);
      state.roster = rebuildRosterFromTransactions();
      if (editingTransactionId === btn.dataset.id) cancelTransactionEdit();
      renderAll();
    });
  });
}

function startTransactionEdit(id) {
  const tx = state.transactions.find((item) => item.id === id);
  if (!tx) return;
  editingTransactionId = id;
  document.getElementById("transactionFormTitle").textContent = "Edit Transaction";
  document.getElementById("cancelEditBtn").classList.remove("hidden");
  bindTransactionFormValues(tx);
}

function cancelTransactionEdit() {
  editingTransactionId = null;
  document.getElementById("transactionFormTitle").textContent = "Add Transaction";
  document.getElementById("cancelEditBtn").classList.add("hidden");
  bindTransactionFormValues(null);
}

function inferGroupFromPrimaryPos(pos) {
  const s = String(pos || "").toUpperCase();
  if (s.startsWith("SP")) return "rotation";
  if (["CL", "SU", "RP", "LHP", "RHP"].some((x) => s.includes(x))) return "bullpen";
  if (["C", "1B", "2B", "3B", "SS", "LF", "CF", "RF"].includes(s)) return "lineup";
  return "bench";
}

function normalize(value) {
  return String(value || "").trim().toLowerCase();
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