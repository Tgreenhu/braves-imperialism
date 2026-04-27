/* =============================================
   BRAVES IMPERIALISM — app.js
   =============================================
   All rendering logic lives here.
   Update the `players` array below with
   real roster data as the season progresses.
   ============================================= */

// ─── ROSTER DATA ──────────────────────────────
// Each player object:
//   name:      string  — player's full name
//   position:  string  — e.g. "RF", "SP", "RP"
//   ops:       number  — hitters only (e.g. 0.945)
//   era:       number  — pitchers only (e.g. 2.95)
//               NOTE: use null or omit for "no stat yet"
//               (do NOT use 0 for "no ERA" — 0.00 is a real, valid ERA)
//   protected: boolean — marks player with ★

const players = [
  // — LINEUP —
  { name: "Ronald Acuña Jr.", position: "RF",  ops: 0.945, protected: true  },
  { name: "Ozzie Albies",     position: "2B",  ops: 0.820                   },
  { name: "Matt Olson",       position: "1B",  ops: 0.900                   },
  { name: "Austin Riley",     position: "3B",  ops: 0.875                   },
  { name: "Michael Harris II",position: "CF",  ops: 0.810                   },
  { name: "Sean Murphy",      position: "C",   ops: 0.780                   },
  { name: "Orlando Arcia",    position: "SS",  ops: 0.700                   },

  // — ROTATION —
  { name: "Spencer Strider",     position: "SP", era: 2.95                   },
  { name: "Max Fried",           position: "SP", era: 3.20, protected: true  },
  { name: "AJ Smith-Shawver",    position: "SP", era: 3.75                   },

  // — BULLPEN —
  { name: "Raisel Iglesias",     position: "RP", era: 2.80                   },
  { name: "Joe Jiménez",         position: "RP", era: 3.50                   },
  { name: "Dylan Lee",           position: "RP", era: 4.10                   },
];

// ─── GROUP HELPERS ────────────────────────────
const HITTER_POSITIONS  = ["C","1B","2B","3B","SS","LF","CF","RF","DH"];
const STARTER_POSITIONS = ["SP"];
const BULLPEN_POSITIONS = ["RP","CL"];

function isHitter(p)  { return HITTER_POSITIONS.includes(p.position);  }
function isStarter(p) { return STARTER_POSITIONS.includes(p.position); }
function isBullpen(p) { return BULLPEN_POSITIONS.includes(p.position); }

// ─── CARD BUILDER ─────────────────────────────
function createCard(player) {
  const box = document.createElement("div");
  box.className = "player-box" + (player.protected ? " is-protected" : "");

  // Position tag
  const pos = document.createElement("div");
  pos.className = "position-tag";
  pos.textContent = player.position || "—";

  // Name
  const name = document.createElement("div");
  name.className = "player-name";
  name.textContent = player.name;

  // Stat row
  const statRow = document.createElement("div");
  statRow.className = "stat-row";

  // BUG FIX: use !== undefined so ERA of 0.00 still renders
  if (player.era !== undefined && player.era !== null) {
    const key = document.createElement("span");
    key.className = "stat-key era-color";
    key.textContent = "ERA";

    const val = document.createElement("span");
    val.className = "stat-value";
    val.textContent = player.era.toFixed(2);

    statRow.appendChild(key);
    statRow.appendChild(val);
  } else if (player.ops !== undefined && player.ops !== null) {
    const key = document.createElement("span");
    key.className = "stat-key ops-color";
    key.textContent = "OPS";

    const val = document.createElement("span");
    val.className = "stat-value";
    // OPS is stored as a decimal (0.945) — display as .945
    val.textContent = player.ops.toFixed(3).replace(/^0/, "");

    statRow.appendChild(key);
    statRow.appendChild(val);
  }

  box.appendChild(pos);
  box.appendChild(name);
  box.appendChild(statRow);

  // Protected star
  if (player.protected) {
    const star = document.createElement("span");
    star.className = "star-badge";
    star.textContent = "★";
    box.appendChild(star);
  }

  return box;
}

// ─── RENDER ───────────────────────────────────
function render() {
  const hittersEl  = document.getElementById("hitters-field");
  const rotationEl = document.getElementById("rotation-field");
  const bullpenEl  = document.getElementById("bullpen-field");

  if (!hittersEl || !rotationEl || !bullpenEl) {
    console.error("Missing one or more field containers in index.html.");
    return;
  }

  hittersEl.innerHTML  = "";
  rotationEl.innerHTML = "";
  bullpenEl.innerHTML  = "";

  players.forEach(player => {
    const card = createCard(player);
    if      (isHitter(player))  hittersEl.appendChild(card);
    else if (isStarter(player)) rotationEl.appendChild(card);
    else if (isBullpen(player)) bullpenEl.appendChild(card);
    else {
      // Fallback: unknown position goes into hitters section
      console.warn(`Unknown position "${player.position}" for ${player.name} — placed in lineup.`);
      hittersEl.appendChild(card);
    }
  });

  // Stamp last-updated time
  const updated = document.getElementById("last-updated");
  if (updated) {
    const now = new Date();
    updated.textContent = "Updated " + now.toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric"
    });
  }
}

// Run on load
render();
