const STORAGE_KEY = "braves-imperialism-tracker-supabase-v10";
const REDIRECT_URL = "https://tgreenhu.github.io/braves-imperialism/";
const MLB_API_BASE = "https://statsapi.mlb.com/api/v1";
const CURRENT_SEASON = new Date().getFullYear();
const BRAVES_TEAM_ID = 144;

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
const HITTER_PRIMARY_POSITIONS = new Set(["C", "1B", "2B", "3B", "SS", "LF", "CF", "RF", "DH", "UTIL", "INF", "OF"]);
const PITCHER_PRIMARY_POSITIONS = new Set(["SP1", "SP2", "SP3", "SP4", "SP5", "CL", "SU", "RP", "LHP", "RHP"]);

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

const HITTER_COLUMNS = [
  { key: "name", label: "Player" },
  { key: "type", label: "Type" },
  { key: "team", label: "Team" },
  { key: "G", label: "G" },
  { key: "PA", label: "PA" },
  { key: "AB", label: "AB" },
  { key: "R", label: "R" },
  { key: "H", label: "H" },
  { key: "2B", label: "2B" },
  { key: "3B", label: "3B" },
  { key: "HR", label: "HR" },
  { key: "RBI", label: "RBI" },
  { key: "BB", label: "BB" },
  { key: "SO", label: "SO" },
  { key: "SB", label: "SB" },
  { key: "CS", label: "CS" },
  { key: "AVG", label: "AVG" },
  { key: "OBP", label: "OBP" },
  { key: "SLG", label: "SLG" },
  { key: "OPS", label: "OPS" }
];

const PITCHER_COLUMNS = [
  { key: "name", label: "Player" },
  { key: "type", label: "Type" },
  { key: "team", label: "Team" },
  { key: "G", label: "G" },
  { key: "GS", label: "GS" },
  { key: "IP", label: "IP" },
  { key: "ERA", label: "ERA" },
  { key: "WHIP", label: "WHIP" },
  { key: "H", label: "H" },
  { key: "ER", label: "ER" },
  { key: "HR", label: "HR" },
  { key: "BB", label: "BB" },
  { key: "SO", label: "SO" },
  { key: "SV", label: "SV" },
  { key: "K9", label: "K/9" },
  { key: "BB9", label: "BB/9" },
  { key: "HR9", label: "HR/9" }
];

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
  transactions: [],
  boxLayout: structuredClone(DEFAULT_BOX_LAYOUT),
  playerHistory: []
};

let state = loadLocalState();
ensurePlayerHistory();

let editingTransactionId = null;
let draggingBox = null;
let rosterDrag = null;
let currentUser = null;
let cloudSaveTimer = null;
let suppressCloudSave = false;
let isHydratingFromCloud = false;

let statsDirectory = null;
let realAtlIds = new Set();
let statsCache = new Map();
let statsView = [];
let statsSort = { key: "name", direction: "asc" };
let statsLoadedOnce = false;
let statsTypeView = "hitters";
let mlbTeamStatsCache = {
  hitters: null,
  pitchers: null
};

document.addEventListener("DOMContentLoaded", async () => {
  setSyncStatus("Sync: starting...");

  hydrateTransactionPositionSelect();
  bindTabs();
  bindTransactionForm();
  bindDownload();
  bindLayoutReset();
  bindAuthControls();
  bindStatsControls();

  renderAll();
  initDepthBoxDragging();
  updateStatsToggleUI();

  await initializeSession();

  supabaseClient.auth.onAuthStateChange((event, session) => {
    currentUser = session?.user ?? null;
    updateAuthUI();

    if (event === "SIGNED_IN") {
      setTimeout(async () => {
        await loadStateFromSupabase();
        renderAll();
      }, 0);
    }

    if (event === "SIGNED_OUT") {
      setSyncStatus("Sync: local only");
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
      transactions: normalizeTransactions(parsed.transactions || []),
      boxLayout: normalizeBoxLayout(parsed.boxLayout || DEFAULT_BOX_LAYOUT),
      playerHistory: normalizePlayerHistory(parsed.playerHistory || [])
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

function normalizePlayerHistory(history) {
  return (Array.isArray(history) ? history : []).map((p) => ({
    id: p.id || makeId(),
    name: p.name || "",
    primaryPos: p.primaryPos || "UTIL",
    mlbId: p.mlbId || null
  }));
}

function ensurePlayerHistory() {
  if (!Array.isArray(state.playerHistory)) state.playerHistory = [];
  const seen = new Set(state.playerHistory.map((p) => normalize(p.name)));

  for (const player of Object.values(state.roster).flat()) {
    const key = normalize(player.name);
    if (!key) continue;
    if (!seen.has(key)) {
      state.playerHistory.push({
        id: makeId(),
        name: player.name,
        primaryPos: player.primaryPos,
        mlbId: null
      });
      seen.add(key);
    }
  }

  for (const tx of state.transactions) {
    const name = (tx.acquiredPlayer || "").trim();
    if (!name) continue;
    const key = normalize(name);
    if (!seen.has(key)) {
      state.playerHistory.push({
        id: makeId(),
        name,
        primaryPos: tx.acquiredSlot || "UTIL",
        mlbId: null
      });
      seen.add(key);
    }
  }
}

function rememberPlayer(player) {
  const key = normalize(player.name);
  if (!key) return;
  const existing = state.playerHistory.find((p) => normalize(p.name) === key);
  if (existing) {
    if (!existing.primaryPos && player.primaryPos) existing.primaryPos = player.primaryPos;
    if (!existing.mlbId && player.mlbId) existing.mlbId = player.mlbId;
    return;
  }

  state.playerHistory.push({
    id: makeId(),
    name: player.name,
    primaryPos: player.primaryPos || "UTIL",
    mlbId: player.mlbId || null
  });
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
  if (suppressCloudSave || isHydratingFromCloud) return;

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
    boxLayout: state.boxLayout,
    playerHistory: state.playerHistory
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

  isHydratingFromCloud = true;
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
        transactions: normalizeTransactions(data.data.transactions || []),
        boxLayout: normalizeBoxLayout(data.data.boxLayout || DEFAULT_BOX_LAYOUT),
        playerHistory: normalizePlayerHistory(data.data.playerHistory || [])
      };
      ensurePlayerHistory();
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
    isHydratingFromCloud = false;
  }
}

async function initializeSession() {
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

function bindTabs() {
  const buttons = document.querySelectorAll(".tab-button");
  const panels = document.querySelectorAll(".tab-panel");

  buttons.forEach((button) => {
    button.addEventListener("click", async () => {
      const tab = button.dataset.tab;
      buttons.forEach((b) => b.classList.remove("active"));
      panels.forEach((p) => p.classList.remove("active"));
      button.classList.add("active");
      document.getElementById(`tab-${tab}`).classList.add("active");

      if (tab === "stats" && !statsLoadedOnce) {
        await refreshStats();
      }
    });
  });
}

function hydrateTransactionPositionSelect() {
  const select = document.getElementById("txAcquiredSlot");
  select.innerHTML =
    `<option value="">Select position</option>` +
    POSITION_OPTIONS.map((pos) => `<option value="${pos}">${pos}</option>`).join("");
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

function bindStatsControls() {
  document.getElementById("refreshStatsBtn").addEventListener("click", refreshStats);
  document.getElementById("statsScopeFilter").addEventListener("change", renderStatsTable);

  document.getElementById("statsHittersBtn").addEventListener("click", () => {
    statsTypeView = "hitters";
    updateStatsToggleUI();
    renderStatsTable();
  });

  document.getElementById("statsPitchersBtn").addEventListener("click", () => {
    statsTypeView = "pitchers";
    updateStatsToggleUI();
    renderStatsTable();
  });
}

function updateStatsToggleUI() {
  document.getElementById("statsHittersBtn").classList.toggle("active", statsTypeView === "hitters");
  document.getElementById("statsPitchersBtn").classList.toggle("active", statsTypeView === "pitchers");
}

function renderAll() {
  ensurePlayerHistory();
  renderCounts();
  renderDepthChart();
  renderRosterEditor();
  renderTransactions();
  renderStatsTable();
  queueCloudSave();
}

function renderCounts() {
  const total = Object.values(state.roster).flat().length;
  document.getElementById("totalPlayersBadge").textContent = `${total} Players Loaded`;
}

function buildDepthMap() {
  const map = {
    C: [], "1B": [], "2B": [], "3B": [], SS: [], LF: [], CF: [], RF: []
  };

  const hitters = [...state.roster.lineup, ...state.roster.bench];

  hitters.forEach((player, index) => {
    const primary = player.primaryPos;
    const secondary = Array.isArray(player.secondaryPositions) ? player.secondaryPositions : [];

    if (FIELD_POSITIONS.includes(primary)) {
      map[primary].push({ ...player, orderKey: index });
    } else {
      if (primary === "INF") ["2B", "3B", "SS"].forEach((pos) => map[pos].push({ ...player, orderKey: index + 1000 }));
      if (primary === "OF") ["LF", "CF", "RF"].forEach((pos) => map[pos].push({ ...player, orderKey: index + 1000 }));
      if (primary === "UTIL") ["1B", "2B", "3B", "SS"].forEach((pos) => map[pos].push({ ...player, orderKey: index + 1000 }));
      if (primary === "DH") map["1B"].push({ ...player, orderKey: index + 1000 });
    }

    secondary.forEach((pos) => {
      if (FIELD_POSITIONS.includes(pos)) {
        map[pos].push({ ...player, orderKey: index + 1000 });
      }
    });
  });

  Object.keys(map).forEach((key) => {
    const seen = new Set();
    map[key] = map[key]
      .sort((a, b) => a.orderKey - b.orderKey)
      .filter((player) => {
        if (seen.has(player.id)) return false;
        seen.add(player.id);
        return true;
      });
  });

  return map;
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

  document.getElementById("rotationList").innerHTML = state.roster.rotation.map((p) => `
    <div class="staff-row">
      <div class="row-pos">${escapeHtml(p.primaryPos)}</div>
      <div class="row-name" title="${escapeAttr(p.name)}">${escapeHtml(p.name)}</div>
    </div>
  `).join("");

  document.getElementById("bullpenList").innerHTML = state.roster.bullpen.map((p) => `
    <div class="staff-row">
      <div class="row-pos">${escapeHtml(p.primaryPos)}</div>
      <div class="row-name" title="${escapeAttr(p.name)}">${escapeHtml(p.name)}</div>
    </div>
  `).join("");

  applyDepthBoxPositions();
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
  if (window.innerWidth <= 760) return;

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
      if (!draggingBox || draggingBox.el !== box || window.innerWidth <= 760) return;
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

  container.innerHTML = Object.entries(state.roster).map(([groupKey, players]) => `
    <div class="editor-card">
      <div class="editor-card-head">
        <h3>${rosterMeta[groupKey]}</h3>
        <button class="add-row-btn" data-group="${groupKey}">Add Player</button>
      </div>
      <div class="editor-card-body" data-group-body="${groupKey}">
        ${players.map((player) => renderPlayerRow(player, groupKey)).join("")}
      </div>
    </div>
  `).join("");

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
              <input type="checkbox" data-secondary="${pos}" ${player.secondaryPositions.includes(pos) ? "checked" : ""} />
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
      const player = makePlayer("", defaultPrimaryPos(group));
      state.roster[group].push(player);
      rememberPlayer(player);
      renderAll();
    });
  });

  document.querySelectorAll(".player-row input[data-field='name']").forEach((input) => {
    input.addEventListener("input", (e) => {
      const row = e.target.closest(".player-row");
      const player = findRosterPlayer(row.dataset.group, row.dataset.id);
      if (!player) return;
      player.name = e.target.value;
      rememberPlayer(player);
      renderDepthChart();
      renderStatsTable();
      queueCloudSave();
    });
  });

  document.querySelectorAll(".player-row select[data-field='primaryPos']").forEach((select) => {
    select.addEventListener("change", (e) => {
      const row = e.target.closest(".player-row");
      const player = findRosterPlayer(row.dataset.group, row.dataset.id);
      if (!player) return;
      player.primaryPos = e.target.value;
      rememberPlayer(player);
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
      const targetGroup = row.dataset.group;
      const sourceGroup = rosterDrag.group;

      if (targetId === rosterDrag.id && targetGroup === sourceGroup) return;

      const sourceArr = state.roster[sourceGroup];
      const targetArr = state.roster[targetGroup];

      const fromIndex = sourceArr.findIndex((p) => p.id === rosterDrag.id);
      const toIndex = targetArr.findIndex((p) => p.id === targetId);

      if (fromIndex === -1 || toIndex === -1) return;

      const [moved] = sourceArr.splice(fromIndex, 1);
      targetArr.splice(toIndex, 0, moved);

      renderAll();
    });
  });

  document.querySelectorAll("[data-group-body]").forEach((body) => {
    body.addEventListener("dragover", (e) => {
      e.preventDefault();
    });

    body.addEventListener("drop", (e) => {
      e.preventDefault();
      if (!rosterDrag) return;

      const targetGroup = body.dataset.groupBody;
      const sourceGroup = rosterDrag.group;

      const sourceArr = state.roster[sourceGroup];
      const targetArr = state.roster[targetGroup];

      const fromIndex = sourceArr.findIndex((p) => p.id === rosterDrag.id);
      if (fromIndex === -1) return;

      const [moved] = sourceArr.splice(fromIndex, 1);
      targetArr.push(moved);

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
      item.id === editingTransactionId ? { ...item, ...tx } : item
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

  if (tx.acquiredPlayer) {
    rememberPlayer({ name: tx.acquiredPlayer, primaryPos: tx.acquiredSlot || "UTIL" });
  }

  state.transactions = getTransactionsChronological();
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
      const player = makePlayer(tx.acquiredPlayer, tx.acquiredSlot || defaultPrimaryPos(group));
      state.roster[group].push(player);
      rememberPlayer(player);
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
  const sorted = getTransactionsChronological().filter((t) => excludedId ? t.id !== excludedId : true);

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

function getTransactionsChronological() {
  return [...state.transactions].sort((a, b) => {
    const byDate = String(a.date || "").localeCompare(String(b.date || ""));
    if (byDate !== 0) return byDate;
    return (a.createdAt || 0) - (b.createdAt || 0);
  });
}

function getTransactionsForDisplay() {
  return [...state.transactions].sort((a, b) => {
    const byDate = String(b.date || "").localeCompare(String(a.date || ""));
    if (byDate !== 0) return byDate;
    return (b.createdAt || 0) - (a.createdAt || 0);
  });
}

function renderTransactions() {
  const list = document.getElementById("transactionList");
  const txs = getTransactionsForDisplay();

  list.innerHTML = txs.map((t) => `
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
  `).join("");

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

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function setStatsStatus(message) {
  const el = document.getElementById("statsStatus");
  if (el) el.textContent = message;
}

function currentRosterNamesSet() {
  return new Set(Object.values(state.roster).flat().map((p) => normalize(p.name)).filter(Boolean));
}

function historyTypeForPlayer(player) {
  const pos = String(player.primaryPos || "").toUpperCase();
  return PITCHER_PRIMARY_POSITIONS.has(pos) ? "pitcher" : "hitter";
}

async function ensureStatsDirectory() {
  if (statsDirectory) return statsDirectory;
  setStatsStatus("Loading MLB player directory...");
  const data = await fetchJson(`${MLB_API_BASE}/sports/1/players?season=${CURRENT_SEASON}`);
  const map = new Map();

  for (const player of data.people || []) {
    const key = normalize(player.fullName);
    if (!key) continue;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(player);
  }

  statsDirectory = map;
  return statsDirectory;
}

async function ensureRealAtlIds() {
  if (realAtlIds.size) return realAtlIds;
  const data = await fetchJson(`${MLB_API_BASE}/teams/${BRAVES_TEAM_ID}/roster?rosterType=active`);
  realAtlIds = new Set((data.roster || []).map((p) => p.person?.id).filter(Boolean));
  return realAtlIds;
}

async function ensureMlbTeamStats(type) {
  if (mlbTeamStatsCache[type]) return mlbTeamStatsCache[type];

  const group = type === "pitchers" ? "pitching" : "hitting";
  const data = await fetchJson(`${MLB_API_BASE}/teams/stats?stats=season&group=${group}&season=${CURRENT_SEASON}&sportIds=1`);

  const splits = data?.stats?.[0]?.splits || [];
  const rows = splits.map((split) => {
    const stat = split.stat || {};
    const team = split.team || {};
    return type === "pitchers"
      ? {
          teamId: team.id,
          teamName: team.abbreviation || team.name || "",
          G: numOrZero(stat.gamesPlayed),
          GS: numOrZero(stat.gamesStarted),
          IP: stat.inningsPitched || "0.0",
          ERA: toNumberOrNull(stat.era),
          WHIP: toNumberOrNull(stat.whip),
          H: numOrZero(stat.hits),
          ER: numOrZero(stat.earnedRuns),
          HR: numOrZero(stat.homeRuns),
          BB: numOrZero(stat.baseOnBalls),
          SO: numOrZero(stat.strikeOuts),
          SV: numOrZero(stat.saves),
          K9: toNumberOrNull(stat.strikeoutsPer9Inn),
          BB9: toNumberOrNull(stat.walksPer9Inn),
          HR9: toNumberOrNull(stat.homeRunsPer9)
        }
      : {
          teamId: team.id,
          teamName: team.abbreviation || team.name || "",
          G: numOrZero(stat.gamesPlayed),
          PA: numOrZero(stat.plateAppearances),
          AB: numOrZero(stat.atBats),
          R: numOrZero(stat.runs),
          H: numOrZero(stat.hits),
          "2B": numOrZero(stat.doubles),
          "3B": numOrZero(stat.triples),
          HR: numOrZero(stat.homeRuns),
          RBI: numOrZero(stat.rbi),
          BB: numOrZero(stat.baseOnBalls),
          SO: numOrZero(stat.strikeOuts),
          SB: numOrZero(stat.stolenBases),
          CS: numOrZero(stat.caughtStealing),
          AVG: toNumberOrNull(stat.avg),
          OBP: toNumberOrNull(stat.obp),
          SLG: toNumberOrNull(stat.slg),
          OPS: toNumberOrNull(stat.ops)
        };
  });

  mlbTeamStatsCache[type] = rows;
  return rows;
}

function choosePlayerRecordByType(records, preferredType) {
  if (!records?.length) return null;
  let candidates = [...records];

  if (preferredType === "pitcher") {
    const filtered = candidates.filter((p) => (p.primaryPosition?.abbreviation || "").includes("P"));
    if (filtered.length) candidates = filtered;
  } else {
    const filtered = candidates.filter((p) => !(p.primaryPosition?.abbreviation || "").includes("P"));
    if (filtered.length) candidates = filtered;
  }

  return candidates[0] || records[0];
}

async function resolveHistoryIds() {
  await ensureStatsDirectory();
  let changed = false;

  for (const player of state.playerHistory) {
    if (player.mlbId) continue;
    const records = statsDirectory.get(normalize(player.name));
    const chosen = choosePlayerRecordByType(records, historyTypeForPlayer(player));
    if (chosen?.id) {
      player.mlbId = chosen.id;
      changed = true;
    }
  }

  if (changed) queueCloudSave();
}

function extractStatSplit(data) {
  const splits = data?.stats?.[0]?.splits || [];
  return splits[0]?.stat || {};
}

function numOrZero(value) {
  const num = Number(value);
  return Number.isNaN(num) ? 0 : num;
}

function toNumberOrNull(value) {
  if (value === null || value === undefined || value === "") return null;
  const num = Number(value);
  return Number.isNaN(num) ? null : num;
}

async function fetchPlayerSeasonStats(player) {
  const type = historyTypeForPlayer(player);
  if (!player.mlbId) {
    return {
      id: player.id,
      mlbId: null,
      name: player.name,
      team: "",
      type,
      isRealAtl: false,
      ...emptyStatsForType(type)
    };
  }

  const cacheKey = `${player.mlbId}-${type}`;
  if (statsCache.has(cacheKey)) return statsCache.get(cacheKey);

  const group = type === "pitcher" ? "pitching" : "hitting";
  const data = await fetchJson(`${MLB_API_BASE}/people/${player.mlbId}/stats?stats=season&group=${group}&season=${CURRENT_SEASON}&hydrate=currentTeam`);
  const stat = extractStatSplit(data);
  const personData = data?.people?.[0] || {};
  const teamName = personData?.currentTeam?.abbreviation || personData?.currentTeam?.name || "";

  const row = type === "pitcher"
    ? buildPitcherRow(player, stat, teamName)
    : buildHitterRow(player, stat, teamName);

  statsCache.set(cacheKey, row);
  return row;
}

function emptyStatsForType(type) {
  if (type === "pitcher") {
    return { G: 0, GS: 0, IP: "0.0", ERA: "", WHIP: "", H: 0, ER: 0, HR: 0, BB: 0, SO: 0, SV: 0, K9: "", BB9: "", HR9: "" };
  }
  return { G: 0, PA: 0, AB: 0, R: 0, H: 0, "2B": 0, "3B": 0, HR: 0, RBI: 0, BB: 0, SO: 0, SB: 0, CS: 0, AVG: "", OBP: "", SLG: "", OPS: "" };
}

function buildHitterRow(player, stat, teamName) {
  return {
    id: player.id,
    mlbId: player.mlbId,
    name: player.name,
    team: teamName,
    type: "hitter",
    isRealAtl: realAtlIds.has(player.mlbId),
    G: numOrZero(stat.gamesPlayed),
    PA: numOrZero(stat.plateAppearances),
    AB: numOrZero(stat.atBats),
    R: numOrZero(stat.runs),
    H: numOrZero(stat.hits),
    "2B": numOrZero(stat.doubles),
    "3B": numOrZero(stat.triples),
    HR: numOrZero(stat.homeRuns),
    RBI: numOrZero(stat.rbi),
    BB: numOrZero(stat.baseOnBalls),
    SO: numOrZero(stat.strikeOuts),
    SB: numOrZero(stat.stolenBases),
    CS: numOrZero(stat.caughtStealing),
    AVG: stat.avg || "",
    OBP: stat.obp || "",
    SLG: stat.slg || "",
    OPS: stat.ops || ""
  };
}

function buildPitcherRow(player, stat, teamName) {
  return {
    id: player.id,
    mlbId: player.mlbId,
    name: player.name,
    team: teamName,
    type: "pitcher",
    isRealAtl: realAtlIds.has(player.mlbId),
    G: numOrZero(stat.gamesPlayed),
    GS: numOrZero(stat.gamesStarted),
    IP: stat.inningsPitched || "0.0",
    ERA: stat.era || "",
    WHIP: stat.whip || "",
    H: numOrZero(stat.hits),
    ER: numOrZero(stat.earnedRuns),
    HR: numOrZero(stat.homeRuns),
    BB: numOrZero(stat.baseOnBalls),
    SO: numOrZero(stat.strikeOuts),
    SV: numOrZero(stat.saves),
    K9: stat.strikeoutsPer9Inn || "",
    BB9: stat.walksPer9Inn || "",
    HR9: stat.homeRunsPer9 || ""
  };
}

async function refreshStats() {
  setStatsStatus("Refreshing stats...");
  try {
    ensurePlayerHistory();
    await ensureStatsDirectory();
    await ensureRealAtlIds();
    await ensureMlbTeamStats("hitters");
    await ensureMlbTeamStats("pitchers");
    await resolveHistoryIds();

    const history = [...state.playerHistory].filter((p) => normalize(p.name));
    const rows = [];
    for (const player of history) {
      rows.push(await fetchPlayerSeasonStats(player));
    }

    statsView = rows;
    statsLoadedOnce = true;
    setStatsStatus(`Loaded ${rows.length} players`);
    renderStatsTable();
  } catch (err) {
    console.error("refreshStats failed:", err);
    setStatsStatus(`Failed: ${err.message || "stats error"}`);
  }
}

function getFilteredStatsRows() {
  const scope = document.getElementById("statsScopeFilter")?.value || "our_team";
  const ourTeamNames = currentRosterNamesSet();

  let rows = [...statsView];

  if (scope === "our_team") {
    rows = rows.filter((row) => ourTeamNames.has(normalize(row.name)));
  } else if (scope === "real_atl") {
    rows = rows.filter((row) => row.isRealAtl);
  }

  rows = rows.filter((row) => row.type === (statsTypeView === "hitters" ? "hitter" : "pitcher"));
  rows.sort((a, b) => compareStatsRows(a, b, statsSort.key, statsSort.direction));
  return rows;
}

function compareStatsRows(a, b, key, direction) {
  const dir = direction === "asc" ? 1 : -1;
  const av = a[key];
  const bv = b[key];

  const an = Number(av);
  const bn = Number(bv);
  const bothNumeric = !Number.isNaN(an) && !Number.isNaN(bn) && av !== "" && bv !== "";

  if (bothNumeric) return (an - bn) * dir;
  return String(av ?? "").localeCompare(String(bv ?? "")) * dir;
}

function ipStringToDecimal(ipString) {
  const s = String(ipString || "0.0");
  const parts = s.split(".");
  const whole = Number(parts[0] || 0);
  const frac = Number(parts[1] || 0);
  if (frac === 1) return whole + 1 / 3;
  if (frac === 2) return whole + 2 / 3;
  return whole;
}

function decimalToIpString(ip) {
  const whole = Math.floor(ip);
  const frac = ip - whole;
  if (frac < 0.17) return `${whole}.0`;
  if (frac < 0.5) return `${whole}.1`;
  return `${whole}.2`;
}

function buildTeamTotals(rows) {
  if (!rows.length) return null;

  if (statsTypeView === "hitters") {
    const totals = {
      name: "TEAM",
      type: "hitter",
      team: "",
      G: 0, PA: 0, AB: 0, R: 0, H: 0,
      "2B": 0, "3B": 0, HR: 0, RBI: 0,
      BB: 0, SO: 0, SB: 0, CS: 0
    };

    rows.forEach((r) => {
      totals.G += Number(r.G || 0);
      totals.PA += Number(r.PA || 0);
      totals.AB += Number(r.AB || 0);
      totals.R += Number(r.R || 0);
      totals.H += Number(r.H || 0);
      totals["2B"] += Number(r["2B"] || 0);
      totals["3B"] += Number(r["3B"] || 0);
      totals.HR += Number(r.HR || 0);
      totals.RBI += Number(r.RBI || 0);
      totals.BB += Number(r.BB || 0);
      totals.SO += Number(r.SO || 0);
      totals.SB += Number(r.SB || 0);
      totals.CS += Number(r.CS || 0);
    });

    const singles = totals.H - totals["2B"] - totals["3B"] - totals.HR;
    const totalBases = singles + totals["2B"] * 2 + totals["3B"] * 3 + totals.HR * 4;

    totals.AVG = totals.AB ? (totals.H / totals.AB).toFixed(3) : "";
    totals.OBP = (totals.AB + totals.BB) ? ((totals.H + totals.BB) / (totals.AB + totals.BB)).toFixed(3) : "";
    totals.SLG = totals.AB ? (totalBases / totals.AB).toFixed(3) : "";
    totals.OPS = (totals.OBP && totals.SLG) ? (Number(totals.OBP) + Number(totals.SLG)).toFixed(3) : "";

    return totals;
  }

  const totals = {
    name: "TEAM",
    type: "pitcher",
    team: "",
    G: 0, GS: 0, H: 0, ER: 0, HR: 0, BB: 0, SO: 0, SV: 0
  };

  let ipTotal = 0;

  rows.forEach((r) => {
    totals.G += Number(r.G || 0);
    totals.GS += Number(r.GS || 0);
    totals.H += Number(r.H || 0);
    totals.ER += Number(r.ER || 0);
    totals.HR += Number(r.HR || 0);
    totals.BB += Number(r.BB || 0);
    totals.SO += Number(r.SO || 0);
    totals.SV += Number(r.SV || 0);
    ipTotal += ipStringToDecimal(r.IP || "0.0");
  });

  totals.IP = decimalToIpString(ipTotal);
  totals.ERA = ipTotal ? ((totals.ER * 9) / ipTotal).toFixed(2) : "";
  totals.WHIP = ipTotal ? ((totals.H + totals.BB) / ipTotal).toFixed(2) : "";
  totals.K9 = ipTotal ? ((totals.SO * 9) / ipTotal).toFixed(1) : "";
  totals.BB9 = ipTotal ? ((totals.BB * 9) / ipTotal).toFixed(1) : "";
  totals.HR9 = ipTotal ? ((totals.HR * 9) / ipTotal).toFixed(1) : "";

  return totals;
}

function rankMetric(rows, key, value, lowerIsBetter = false) {
  const values = rows
    .map((r) => Number(r[key]))
    .filter((v) => !Number.isNaN(v));

  if (!values.length || value === "" || value === null || value === undefined) return null;

  values.sort((a, b) => lowerIsBetter ? a - b : b - a);

  const target = Number(value);
  const index = values.findIndex((v) => v === target);
  return index === -1 ? null : index + 1;
}

function buildRankCards(teamTotals) {
  const container = document.getElementById("statsRankCards");
  if (!container) return;

  const scope = document.getElementById("statsScopeFilter")?.value || "our_team";

  if (!teamTotals || scope === "all_players") {
    container.innerHTML = "";
    return;
  }

  const leagueRows = mlbTeamStatsCache[statsTypeView] || [];
  let comparisonRow = teamTotals;

  if (scope === "real_atl") {
    const realBraves = leagueRows.find((r) => r.teamId === BRAVES_TEAM_ID);
    if (realBraves) comparisonRow = realBraves;
  }

  const configs = statsTypeView === "hitters"
    ? [
        { label: "HR Rank", key: "HR", lower: false, display: comparisonRow.HR },
        { label: "OPS Rank", key: "OPS", lower: false, display: comparisonRow.OPS },
        { label: "AVG Rank", key: "AVG", lower: false, display: comparisonRow.AVG },
        { label: "RBI Rank", key: "RBI", lower: false, display: comparisonRow.RBI }
      ]
    : [
        { label: "ERA Rank", key: "ERA", lower: true, display: comparisonRow.ERA },
        { label: "WHIP Rank", key: "WHIP", lower: true, display: comparisonRow.WHIP },
        { label: "SO Rank", key: "SO", lower: false, display: comparisonRow.SO },
        { label: "SV Rank", key: "SV", lower: false, display: comparisonRow.SV }
      ];

  container.innerHTML = configs.map((cfg) => {
    const rank = rankMetric(leagueRows, cfg.key, comparisonRow[cfg.key], cfg.lower);
    const sourceLabel = scope === "real_atl" ? "Real ATL vs MLB" : "Our Team vs MLB";
    return `
      <div class="rank-card">
        <div class="rank-card-label">${escapeHtml(cfg.label)}</div>
        <div class="rank-card-value">${rank ? `#${rank}` : "—"}</div>
        <div class="rank-card-sub">${escapeHtml(sourceLabel)} • ${escapeHtml(String(cfg.display ?? "—"))}</div>
      </div>
    `;
  }).join("");
}

function renderStatsTable() {
  const thead = document.getElementById("statsThead");
  const tbody = document.getElementById("statsTbody");
  if (!thead || !tbody) return;

  const rows = getFilteredStatsRows();
  const teamRow = buildTeamTotals(rows);
  buildRankCards(teamRow);

  const columns = statsTypeView === "hitters" ? HITTER_COLUMNS : PITCHER_COLUMNS;

  thead.innerHTML = `
    <tr>
      ${columns.map((col) => `
        <th data-sort-key="${col.key}">
          ${escapeHtml(col.label)}${statsSort.key === col.key ? (statsSort.direction === "asc" ? " ▲" : " ▼") : ""}
        </th>
      `).join("")}
    </tr>
  `;

  const displayRows = teamRow ? [teamRow, ...rows] : rows;

  tbody.innerHTML = displayRows.length
    ? displayRows.map((row, i) => `
        <tr class="${i === 0 && teamRow ? "team-row" : ""}">
          ${columns.map((col) => renderStatsCell(row, col.key)).join("")}
        </tr>
      `).join("")
    : `<tr><td colspan="${columns.length}">No players match the current filter.</td></tr>`;

  thead.querySelectorAll("[data-sort-key]").forEach((th) => {
    th.addEventListener("click", () => {
      const key = th.dataset.sortKey;
      if (statsSort.key === key) {
        statsSort.direction = statsSort.direction === "asc" ? "desc" : "asc";
      } else {
        statsSort.key = key;
        statsSort.direction = key === "name" ? "asc" : "desc";
      }
      renderStatsTable();
    });
  });
}

function renderStatsCell(row, key) {
  if (key === "type") {
    const cls = row.type === "pitcher" ? "pitcher" : "hitter";
    const label = row.name === "TEAM" ? "team" : row.type;
    return `<td><span class="stats-type-pill ${cls}">${escapeHtml(label)}</span></td>`;
  }
  return `<td>${escapeHtml(row[key] ?? "")}</td>`;
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
