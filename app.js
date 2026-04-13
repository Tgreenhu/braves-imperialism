const STORAGE_KEY = "braves-imperialism-tracker-supabase-v5";
const REDIRECT_URL = "https://tgreenhu.github.io/braves-imperialism/";

const SUPABASE_URL = "https://tufbhjwkaizogwocggcz.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR1ZmJoandrYWl6b2d3b2NnZ2N6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwNzQ0NTIsImV4cCI6MjA5MTY1MDQ1Mn0.LzRTgsSATpEmNvQH1meXeGtZfZ5Nu0yc5_GF4_TUntM";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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

let state = loadLocalState();
let editingTransactionId = null;
let draggingBox = null;
let rosterDrag = null;
let currentUser = null;
let cloudSaveTimer = null;
let suppressCloudSave = false;

document.addEventListener("DOMContentLoaded", async () => {
  setSyncStatus("Sync: starting...");

  hydrateTransactionPositionSelect();
  bindTabs();
  bindTransactionForm();
  bindDownload();
  bindLayoutReset();
  bindAuthControls();

  renderAll();
  initDepthBoxDragging();

  try {
    const { data, error } = await supabaseClient.auth.getSession();

    if (error) {
      console.error("Session load failed:", error);
      setSyncStatus(`Sync failed: ${error.message}`);
      return;
    }

    currentUser = data.session?.user ?? null;
    updateAuthUI();

    if (currentUser) {
      await loadStateFromSupabase();
      renderAll();
    }
  } catch (err) {
    console.error("Startup failed:", err);
    setSyncStatus(`Sync failed: ${err.message || "startup error"}`);
  }

  supabaseClient.auth.onAuthStateChange(async (_event, session) => {
    currentUser = session?.user ?? null;
    updateAuthUI();

    if (currentUser) {
      await loadStateFromSupabase();
      renderAll();
    }
  });
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

function loadLocalState() {
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
        primaryPos: p.primaryPos || defaultPrimaryPos(group),
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

function saveLocalState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function setSyncStatus(message) {
  const el = document.getElementById("syncStatus");
  if (el) el.textContent = message;
}

function queueCloudSave() {
  saveLocalState();

  if (suppressCloudSave) {
    return;
  }

  if (!currentUser) {
    setSyncStatus("Sync: local only");
    return;
  }

  clearTimeout(cloudSaveTimer);
  cloudSaveTimer = setTimeout(async () => {
    await saveStateToSupabase();
  }, 500);
}

async function saveStateToSupabase() {
  if (!currentUser) {
    setSyncStatus("Sync: local only");
    return;
  }

  setSyncStatus("Sync: saving...");

  const payload = {
    roster: state.roster,
    transactions: state.transactions,
    boxLayout: state.boxLayout
  };

  const { error } = await supabaseClient
    .from("tracker_states")
    .upsert(
      {
        user_id: currentUser.id,
        name: "default",
        data: payload
      },
      { onConflict: "user_id,name" }
    );

  if (error) {
    console.error("Supabase save failed:", error);
    setSyncStatus(`Sync failed: ${error.message}`);
    return;
  }

  setSyncStatus("Sync: saved");
}

async function loadStateFromSupabase() {
  if (!currentUser) return;

  suppressCloudSave = true;
  setSyncStatus("Sync: loading...");

  try {
    const { data, error } = await supabaseClient
      .from("tracker_states")
      .select("data")
      .eq("user_id", currentUser.id)
      .eq("name", "default")
      .maybeSingle();

    if (error) {
      console.error("Supabase load failed:", error);
      setSyncStatus(`Sync failed: ${error.message}`);
      return;
    }

    if (data?.data) {
      state = {
        roster: normalizeRoster(data.data.roster || defaultState.roster),
        transactions: normalizeTransactions(data.data.transactions || defaultState.transactions),
        boxLayout: normalizeBoxLayout(data.data.boxLayout || DEFAULT_BOX_LAYOUT)
      };
      saveLocalState();
      setSyncStatus("Sync: loaded");
    } else {
      setSyncStatus("Sync: first save...");
      await saveStateToSupabase();
    }
  } catch (err) {
    console.error("loadStateFromSupabase exception:", err);
    setSyncStatus(`Sync failed: ${err.message || "load error"}`);
  } finally {
    suppressCloudSave = false;
  }
}

function updateAuthUI() {
  const authStatus = document.getElementById("authStatus");
  const signOutBtn = document.getElementById("signOutBtn");

  if (currentUser) {
    authStatus.textContent = `Signed in as ${currentUser.email}`;
    signOutBtn.classList.remove("hidden");
    setSyncStatus("Sync: connected");
  } else {
    authStatus.textContent = "Not signed in";
    signOutBtn.classList.add("hidden");
    setSyncStatus("Sync: local only");
  }
}

function bindAuthControls() {
  document.getElementById("signInBtn").addEventListener("click", async () => {
    const email = document.getElementById("authEmail").value.trim();
    if (!email) {
      alert("Enter your email first.");
      return;
    }

    const { error } = await supabaseClient.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: REDIRECT_URL
      }
    });

    if (error) {
      alert(error.message);
      return;
    }

    alert("Check your email for the sign-in link.");
  });

  document.getElementById("signOutBtn").addEventListener("click", async () => {
    const { error } = await supabaseClient.auth.signOut();
    if (error) {
      alert(error.message);
      return;
    }
    currentUser = null;
    updateAuthUI();
  });
}

function hydrateTransactionPositionSelect() {
  const select = document.getElementById("txAcquiredSlot");
  select.innerHTML =
    `<option value="">Select position</option>` +
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
    applyDepthBoxPositions();
    queueCloudSave();
  });
}

function renderAll() {
  renderCounts();
  renderDepthChart();
  renderRosterEditor();
  renderTransactions();
  queueCloudSave();
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
      map[primary].push({ ...player, orderKey: index, isSecondary: false });
    } else {
      if (primary === "INF") {
        ["2B", "3B", "SS"].forEach((pos) => {
          map[pos].push({ ...player, orderKey: index + 1000, isSecondary: true });
        });
      }
      if (primary === "OF") {
        ["LF", "CF", "RF"].forEach((pos) => {
          map[pos].push({ ...player, orderKey: index + 1000, isSecondary: true });
        });
      }
      if (primary === "UTIL") {
        ["1B", "2B", "3B", "SS"].forEach((pos) => {
          map[pos].push({ ...player, orderKey: index + 1000, isSecondary: true });
        });
      }
      if (primary === "DH") {
        map["1B"].push({ ...player, orderKey: index + 1000, isSecondary: true });
      }
    }

    secondary.forEach((pos) => {
      if (FIELD_POSITIONS.includes(pos)) {
        map[pos].push({ ...player, orderKey: index + 1000, isSecondary: true });
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
    ${visible.map((player) => `
      <div class="depth-row">
        <div class="row-pos">${escapeHtml(player.primaryPos)}</div>
        <div class="row-name" title="${escapeAttr(player.name)}">${escapeHtml(player.name)}</div>
      </div>
    `).join("")}
    ${extra > 0 ? `<div class="pos-more">+${extra} more</div>` : ""}
  `;
}

function applyDepthBoxPositions() {
  const isMobile = window.innerWidth <= 760;
  if (isMobile) return;

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
      if (window.innerWidth <= 760) return;

      const boxRect = box.getBoundingClientRect();

      draggingBox = {
        el: box,
        key: box.dataset.box,
        offsetX: e.clientX - boxRect.left,
        offsetY: e.clientY - boxRect.top
      };

      box.classList.add("dragging");
      box.setPointerCapture(e.pointerId);
    });

    box.addEventListener("pointermove", (e) => {
      if (!draggingBox || draggingBox.el !== box) return;
      if (window.innerWidth <= 760) return;

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
      draggingBox = null;
      queueCloudSave();
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
      queueCloudSave();
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
      queueCloudSave();
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
  if (group === "rotation") return "SP1";
  if (group === "bullpen") return "RP";
  if (group === "bench") return "UTIL";
  return "UTIL";
}

function bindTransactionFormValues(tx = null) {
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
    const existing = state.transactions.find((item) => item.id === editingTransactionId);
    reverseTransactionFromRoster(existing);

    state.transactions = state.transactions.map((item) =>
      item.id === editingTransactionId
        ? { ...item, ...tx }
        : item
    );

    applyTransactionToRoster(tx);
  } else {
    const fullTx = {
      id: makeId(),
      createdAt: Date.now(),
      ...tx
    };
    state.transactions.push(fullTx);
    applyTransactionToRoster(fullTx);
  }

  state.transactions = getSortedTransactions();
  cancelTransactionEdit();
  renderAll();
}

function applyTransactionToRoster(tx) {
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

function reverseTransactionFromRoster(tx) {
  if (!tx) return;

  if (String(tx.result).toLowerCase() === "win" && tx.acquiredPlayer) {
    for (const group of Object.keys(state.roster)) {
      state.roster[group] = state.roster[group].filter(
        (player) => normalize(player.name) !== normalize(tx.acquiredPlayer)
      );
    }
  }

  if (tx.removedPlayer) {
    state.roster = rebuildRosterWithoutTransaction(tx.id);
  }
}

function rebuildRosterWithoutTransaction(excludedId) {
  const roster = deepClone(defaultState.roster);
  const sorted = getSortedTransactions().filter((t) => (excludedId ? t.id !== excludedId : true));

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
      const id = btn.dataset.id;
      state.transactions = state.transactions.filter((t) => t.id !== id);
      state.roster = rebuildRosterWithoutTransaction(null);
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
  bindTransactionFormValues();
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
