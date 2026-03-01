import { engine } from "../engine.js";

const FLAG_SCOPE = "qol-pieces";
const FLAG_KEY   = "flowingRhythm";

// ── Piece registry ────────────────────────────────────────────────────────
// Key = stable snake_case id. Never rename a key after data exists in flags.
const PIECES = {
  river_lantern: {
    name:      "River Lantern — Guiding Mist",
    shortName: "River Lantern",
    tier:      "Basic (1–3)",
    maxLevel:  3,
    hint:      "Support/Control — Protect allies, mess with enemy attacks, create debuff zones",
    level: {
      1: "<strong>L1 — Inviting Light:</strong> You + friends get +1 to saves (resist bad stuff).",
      2: "<strong>L2 — Drifting Oars:</strong> Bad guy swings. You say 'nah' (reaction). They roll -1d4.",
      3: "<strong>L3 — Guiding Mist:</strong> You make cloud (bonus action). Bad guys in cloud = slow + miss more.",
    },
  },
  silent_scripture: {
    name:      "Silent Scripture of the Silent Hall",
    shortName: "Silent Scripture",
    tier:      "Basic (1–3)",
    maxLevel:  3,
    hint:      "Caster Utility — Boost ally saves, reposition safely, curse enemies to fail your spells",
    level: {
      1: "<strong>L1 — Measured Breath:</strong> Friend about to fail a save? You yell 'resist!' (reaction). They get +1d4 to save.",
      2: "<strong>L2 — Fading Step:</strong> You cast spell → you teleport 10 feet. No one gets to hit you.",
      3: "<strong>L3 — Inevitable Refrain:</strong> You point at 2 bad guys (bonus action). Your next spell? They fail easier (disadvantage on save).",
    },
  },
};

// ── Sub-functions ─────────────────────────────────────────────────────────

async function rhythmCheck(actor, token) {
  const flow = actor.getFlag(FLAG_SCOPE, FLAG_KEY);
  if (!flow?.active) return engine.warn("You're not performing a piece!");

  const pb           = actor.system.attributes.prof ?? 2;
  const chaMod       = actor.system.abilities?.cha?.mod ?? 0;
  const currentLevel = flow.performanceLevel ?? 1;
  const maxLevel     = pb; // capped by proficiency bonus
  const nextLevel    = currentLevel + 1;
  const dc           = 10 + (2 * nextLevel);

  // Roll: 1d20 + CHA only. PB is NOT added — matches original macro exactly.
  const adv     = !!flow.lastCheckSucceeded;
  const d20     = adv ? "2d20kh" : "1d20";
  const formula = `${d20} + ${chaMod}`;

  const roll = await (new Roll(formula)).evaluate();
  await roll.toMessage({
    speaker: ChatMessage.getSpeaker({ token }),
    flavor:  `Flowing Rhythm Check (${adv ? "Advantage" : "Normal"}) vs DC ${dc} — 1d20 + CHA`,
  });

  const success  = roll.total >= dc;
  const newLevel = success
    ? Math.min(currentLevel + 1, maxLevel)
    : Math.max(currentLevel - 1, 1);

  await actor.setFlag(FLAG_SCOPE, FLAG_KEY, {
    ...flow,
    performanceLevel:   newLevel,
    lastCheckSucceeded: success,
  });

  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ token }),
    content:
      `<b>Flowing Rhythm Result</b><br>` +
      `Roll: <b>${roll.total}</b> vs DC <b>${dc}</b> — ${success ? "✅ Success" : "❌ Failure"}<br>` +
      `Performance Level: <b>${currentLevel} → ${newLevel}</b>`,
  });
}

async function viewCurrentPiece(actor, token) {
  const flow = actor.getFlag(FLAG_SCOPE, FLAG_KEY);
  if (!flow) return engine.warn("You are not performing a Piece.");

  const pb     = actor.system.attributes.prof ?? 2;
  const chaMod = actor.system.abilities?.cha?.mod ?? 0;

  const piece            = flow.activePiece ? PIECES[flow.activePiece] : null;
  const pieceName        = piece?.name ?? flow.pieceName ?? null;
  const levels           = piece?.level ?? null;
  const maxLevel         = piece ? Math.min(piece.maxLevel, pb) : (flow.maxLevel ?? pb);
  const performanceLevel = Math.max(1, flow.performanceLevel ?? 1);

  if (!pieceName || !levels) return engine.error("Could not resolve active Piece data.");

  let effectsHTML = "";
  for (let i = 1; i <= maxLevel; i++) {
    const effectText = levels[i] ?? "<em>No effect text set.</em>";
    const isActive   = i <= performanceLevel;
    effectsHTML += `
      <div style="margin:8px 0; padding:10px;
        background:${isActive ? "rgba(107,140,174,0.15)" : "rgba(0,0,0,0.12)"};
        border-radius:4px;
        border-left:3px solid ${isActive ? "#6b8cae" : "#444"};">
        <p style="margin:0; font-size:18px; color:${isActive ? "#9fb8d4" : "#777"}; font-weight:600;">LEVEL ${i}</p>
        <p style="margin:4px 0 0 0; font-size:20px; color:${isActive ? "#d8cbb8" : "#888"};">${effectText}</p>
      </div>`;
  }

  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ token }),
    content: `
      <div style="background:linear-gradient(to right,#2a2438,#1f1a2e);
        border:2px solid #6b8cae; border-radius:8px; padding:15px; color:#e8dcc8;">
        <h3 style="margin:0 0 10px 0; color:#9fb8d4; text-align:center; font-size:26px;">🎵 ${pieceName}</h3>
        <p style="margin:0; text-align:center; font-size:22px; color:#b8a98f; font-style:italic;">
          Performance Level <b>${performanceLevel}</b> / <b>${maxLevel}</b>
        </p>
        <hr style="border:0; height:1px; background:#6b8cae; margin:10px 0;">
        ${effectsHTML}
        <hr style="border:0; height:1px; background:#6b8cae; margin:10px 0;">
        <p style="margin:0; font-size:18px; color:#7a8fa8; text-align:center; font-style:italic;">
          Rhythm Check: <b>1d20 + CHA (${chaMod})</b><br>
          Success last check = Advantage • Failure = Normal
        </p>
      </div>`,
  });
}

function startSwitchPiece(actor, token) {
  // Re-read live flag state here — do not close over run()'s fr/isPerforming
  const fr           = actor.getFlag(FLAG_SCOPE, FLAG_KEY) ?? {};
  const isPerforming = !!fr.active;

  const pieceOptions = Object.entries(PIECES)
    .map(([key, data]) => `<option value="${key}">${data.shortName}</option>`)
    .join("");

  const content = `
    <form>
      <div class="form-group">
        <label style="font-size:14px; font-weight:bold;">Choose a Piece to perform:</label>
        <select id="piece-select" style="width:100%; min-width:350px; padding:12px 8px; margin-top:8px; font-size:16px; line-height:1.8; height:auto; box-sizing:border-box;">
          ${pieceOptions}
        </select>
      </div>
      <div id="piece-hint" style="margin-top:15px; padding:12px; background:rgba(107,140,174,0.1); border-left:4px solid #6b8cae; border-radius:4px;">
        <p style="margin:0; font-size:13px; font-style:italic; color:#555;">Select a piece to see what it does.</p>
      </div>
      ${isPerforming
        ? `<p style="margin-top:15px; padding:10px; background:rgba(155,184,212,0.15); border-radius:4px; color:#6b8cae; font-style:italic; font-size:13px;">
             Currently performing: <strong>${PIECES[fr.activePiece]?.name || "Unknown"}</strong> (Level ${fr.performanceLevel})
           </p>`
        : ""}
    </form>`;

  new Dialog({
    title:   "🎵 Start/Switch Piece",
    content,
    buttons: {
      perform: {
        icon:  '<i class="fas fa-music"></i>',
        label: "Begin Performance",
        callback: async (html) => {
          // Re-read flags at callback time — avoids stale state from dialog open
          const liveFr      = actor.getFlag(FLAG_SCOPE, FLAG_KEY) ?? {};
          const selectedKey = html.find("#piece-select").val();
          const piece       = PIECES[selectedKey];
          if (!piece) return engine.error("Invalid piece selection.");

          if (liveFr?.active && liveFr.activePiece === selectedKey) {
            return engine.info(`🎵 ${piece.name} is already active (Level ${liveFr.performanceLevel}).`);
          }

          if (liveFr?.active) {
            await actor.unsetFlag(FLAG_SCOPE, FLAG_KEY);
            engine.info(`🎵 Ended ${PIECES[liveFr.activePiece]?.name || "previous piece"}.`);
          }

          await actor.setFlag(FLAG_SCOPE, FLAG_KEY, {
            active:             true,
            activePiece:        selectedKey,
            performanceLevel:   1,
            lastCheckSucceeded: false,
          });

          await ChatMessage.create({
            speaker: ChatMessage.getSpeaker({ token }),
            content: `
              <div style="background:linear-gradient(to right,#2a2438,#1f1a2e);
                border:2px solid #6b8cae; border-radius:8px; padding:15px; color:#e8dcc8;">
                <h3 style="margin:0 0 10px 0; color:#9fb8d4; text-align:center;">🎵 ${piece.name}</h3>
                <p style="margin:0; text-align:center; font-style:italic; color:#b8a98f; font-size:12px;">
                  ${piece.tier} Piece • Performance Level <b>1</b> (max ${piece.maxLevel})
                </p>
                <hr style="border:0; height:1px; background:#6b8cae; margin:10px 0;">
                <div style="margin:10px 0; padding:10px; background:rgba(107,140,174,0.1); border-radius:4px;">
                  <p style="margin:0; font-size:13px;">${piece.level[1]}</p>
                </div>
                <p style="margin:10px 0 0 0; font-size:11px; color:#7a8fa8; text-align:center;">
                  <em>Apply effects manually. Use Rhythm Check to escalate.</em>
                </p>
              </div>`,
          });

          engine.info(`🎵 Started ${piece.name} at Level 1.`);
        },
      },
      cancel: {
        icon:  '<i class="fas fa-times"></i>',
        label: "Cancel",
      },
    },
    default: "perform",
    render: (html) => {
      const select   = html.find("#piece-select");
      const hintBox  = html.find("#piece-hint");
      const updateHint = () => {
        const piece = PIECES[select.val()];
        if (piece?.hint) {
          hintBox.html(
            `<p style="margin:0; font-size:14px; color:#333; line-height:1.5;">` +
            `<strong style="color:#6b8cae;">${piece.name}:</strong><br>${piece.hint}</p>`
          );
        }
      };
      select.on("change", updateHint);
      updateHint();
    },
  }, { width: 450 }).render(true);
}

async function endPerformance(actor, token) {
  const flow      = actor.getFlag(FLAG_SCOPE, FLAG_KEY) ?? {};
  const pieceName = PIECES[flow.activePiece]?.name || "current piece";
  await actor.unsetFlag(FLAG_SCOPE, FLAG_KEY);

  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ token }),
    content: `
      <div style="background:linear-gradient(to right,#2a2438,#1f1a2e);
        border:2px solid #6b8cae; border-radius:8px; padding:15px; color:#e8dcc8; text-align:center;">
        <h3 style="margin:0; color:#9fb8d4;">🎵 Performance Ended</h3>
        <p style="margin:10px 0 0 0; font-style:italic; color:#b8a98f;">${pieceName} has concluded.</p>
      </div>`,
  });

  engine.info(`🎵 Ended ${pieceName}.`);
}

function showReference() {
  let content = '<div style="font-family:Palatino,serif; color:#e8dcc8; max-height:600px; overflow-y:auto; padding:10px;">';

  for (const [, data] of Object.entries(PIECES)) {
    content += `
      <div style="margin-bottom:20px; padding:15px;
        background:linear-gradient(to bottom,#2a2438,#1f1a2e);
        border:2px solid #6b8cae; border-radius:8px;">
        <h3 style="margin:0 0 5px 0; color:#9fb8d4; font-size:20px;">${data.name}</h3>
        <p style="margin:0 0 10px 0; font-size:17px; color:#7a8fa8; font-style:italic;">${data.tier}</p>
        ${Object.values(data.level).map(e => `<p style="margin:8px 0; font-size:16px; line-height:1.6;">${e}</p>`).join("")}
      </div>`;
  }

  content += `
    <div style="padding:15px; background:rgba(107,140,174,0.15); border-radius:6px; margin-top:10px; border-left:4px solid #6b8cae;">
      <h4 style="margin:0 0 10px 0; color:#9fb8d4; font-size:24px;">How song work:</h4>
      <p style="margin:8px 0; font-size:22px; line-height:1.6; color:#2a2438;"><strong>1. You pick a harmony.</strong> You start level 1.</p>
      <p style="margin:8px 0; font-size:22px; line-height:1.6; color:#2a2438;"><strong>2. You roll to level up.</strong> (1d20 + charisma modifier)</p>
      <p style="margin:8px 0; font-size:22px; line-height:1.6; color:#2a2438;"><strong>3. You win roll?</strong> → Level goes up. Next roll = advantage.</p>
      <p style="margin:8px 0; font-size:22px; line-height:1.6; color:#2a2438;"><strong>4. You lose roll?</strong> → Level goes down. Next roll = normal.</p>
      <p style="margin:15px 0 5px 0; font-size:24px; color:#9fb8d4; font-weight:bold; text-align:center;">Higher level = cooler power = harder roll</p>
      <p style="margin:5px 0 0 0; font-size:20px; color:#b8a98f; font-style:italic; text-align:center;">DC = 10 + (2 × next level) | Max level = your proficiency bonus</p>
    </div>
  </div>`;

  new Dialog({
    title:   "📖 Quick Reference — Heavenly Harmony",
    content,
    buttons: { close: { icon: '<i class="fas fa-check"></i>', label: "Got it!" } },
    default: "close",
  }, { width: 600, height: 700 }).render(true);
}

// ── Main ──────────────────────────────────────────────────────────────────
/**
 * @param {Actor5e} actor
 * @param {object}  ctx
 * @param {Token}   [ctx.token]
 */
export async function run(actor, ctx = {}) {
  const token = ctx.token ?? canvas.tokens?.controlled[0];
  if (!token) return engine.warn("Select your token first.");

  // Read flag state for menu rendering only.
  // Every sub-function re-reads independently before acting.
  const fr           = actor.getFlag(FLAG_SCOPE, FLAG_KEY) ?? {};
  const isPerforming = !!fr.active;
  const currentPiece = isPerforming ? PIECES[fr.activePiece] : null;

  const menuContent = `
    <div style="text-align:center; padding:10px;">
      <h3 style="margin:0 0 15px 0; color:#6b8cae;">What do you want to do?</h3>
      ${isPerforming ? `
        <p style="margin:10px 0; padding:10px; background:rgba(107,140,174,0.15); border-radius:4px; color:#6b8cae; font-style:italic;">
          Currently playing: <strong>${currentPiece?.name || "Unknown"}</strong><br>
          Level ${fr.performanceLevel} / ${fr.maxLevel ?? 3}
        </p>` : ""}
    </div>`;

  const buttons = {};
  if (isPerforming) {
    buttons.rhythmCheck = { icon: '<i class="fas fa-dice-d20"></i>', label: "Make Rhythm Check", callback: () => rhythmCheck(actor, token)      };
    buttons.viewCurrent = { icon: '<i class="fas fa-eye"></i>',      label: "View Current Piece", callback: () => viewCurrentPiece(actor, token) };
  }
  buttons.startSwitch   = { icon: '<i class="fas fa-music"></i>',   label: isPerforming ? "Switch Piece" : "Start Piece", callback: () => startSwitchPiece(actor, token) };
  if (isPerforming) {
    buttons.endPiece    = { icon: '<i class="fas fa-stop"></i>',    label: "End Performance",    callback: () => endPerformance(actor, token)   };
  }
  buttons.reference     = { icon: '<i class="fas fa-book"></i>',    label: "Quick Reference",    callback: () => showReference()                };

  new Dialog({
    title:   "🎵 Heavenly Harmony",
    content: menuContent,
    buttons,
    default: isPerforming ? "rhythmCheck" : "startSwitch",
  }).render(true);
}
