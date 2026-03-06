import { engine } from "../engine.js";

const FLAG_SCOPE = "qol-pieces";
const FLAG_KEY   = "harmony";

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


/**
 * @param {Actor5e} actor
 * @param {object} ctx
 * @param {Token} [ctx.token]
 */
export async function run(actor, ctx = {}) {
  const token = ctx.token ?? canvas.tokens?.controlled[0];
  if (!token) return engine.warn("Select your token first.");

  const state = actor.getFlag(FLAG_SCOPE, "harmony") ?? null;
  const current = state?.pieceKey ? PIECES[state.pieceKey] : null;

  const content = `
    <div style="padding:10px;">
      ${current ? `
        <p style="margin:0 0 10px 0;">
          Active: <strong>${current.shortName}</strong> (L${state.level})
        </p>
      ` : `<p style="margin:0 0 10px 0;">Active: <strong>None</strong></p>`}
      <p style="margin:0;">Choose a piece/level:</p>
    </div>
  `;

  const buttons = {
    river1:  { label: "River Lantern L1", callback: async () => setHarmony(actor, "river_lantern", 1) },
    river2:  { label: "River Lantern L2", callback: async () => setHarmony(actor, "river_lantern", 2) },
    river3:  { label: "River Lantern L3", callback: async () => setHarmony(actor, "river_lantern", 3) },
    script1: { label: "Silent Scripture L1", callback: async () => setHarmony(actor, "silent_scripture", 1) },
    script2: { label: "Silent Scripture L2", callback: async () => setHarmony(actor, "silent_scripture", 2) },
    script3: { label: "Silent Scripture L3", callback: async () => setHarmony(actor, "silent_scripture", 3) },
    off:     { label: "Disable", callback: async () => {
      await actor.unsetFlag(FLAG_SCOPE, "harmony");
      ui.notifications.info("Harmony disabled");
    }}
  };

  new Dialog({
    title: "Heavenly Harmony",
    content,
    buttons
  }).render(true);
}

async function setHarmony(actor, pieceKey, level) {
  const def = PIECES[pieceKey];
  if (!def) return ui.notifications.error(`Unknown pieceKey: ${pieceKey}`);
  if (level < 1 || level > def.maxLevel) return ui.notifications.error("Invalid level");

  const prev = actor.getFlag(FLAG_SCOPE, FLAG_KEY) ?? {};

  const next = {
    ...prev,
    pieceKey,
    level,
    cloudTemplate:  prev.cloudTemplate ?? null,
    markedTargets:  Array.isArray(prev.markedTargets) ? prev.markedTargets : [],
    pendingCurse:   prev.pendingCurse ?? false
  };

  // if leaving river lantern, drop cloud reference
  if (prev.pieceKey === "river_lantern" && pieceKey !== "river_lantern") {
    next.cloudTemplate = null;
  }

  await actor.setFlag(FLAG_SCOPE, FLAG_KEY, next);
  ui.notifications.info(`Harmony: ${def.shortName} L${level}`);
}