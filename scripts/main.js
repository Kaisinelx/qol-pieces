// scripts/main.js
import { dispatch, dispatchFromUi } from "./router.js";

const MODULE_ID = "qol-pieces";
const FLAG_SCOPE = "qol-pieces";
const FLAG_KEY = "harmony";

Hooks.once("init", () => {});

Hooks.once("ready", () => {
  const mod = game.modules.get(MODULE_ID);

  mod.api = { dispatch, run: dispatchFromUi };
  globalThis.qolPieces = { dispatch, run: dispatchFromUi };

  const HAS_MIDI = game.modules.get("midi-qol")?.active;

  if (HAS_MIDI) {
    console.log("QoL Pieces | Midi-QOL detected");
  }
});

// ─────────────────────────────────────────────
// Harmony automation hooks
// ─────────────────────────────────────────────
// ─────────────────────────────────────────────
// Silent Scripture automation
// ─────────────────────────────────────────────

// L3 part 1: use bonus action item to mark up to 2 enemies
Hooks.on("dnd5e.useItem", async (item) => {
  if (!item) return;

  const actor = item.actor;
  if (!actor) return;

  const harmony = getHarmony(actor);
  if (!harmony) return;
  if (harmony.pieceKey !== "silent_scripture") return;
  if (harmony.level < 3) return;

  // Change this exact item name if your feature item is named differently
  if (item.name !== "Silent Scripture — Curse") return;

  const sourceTok = getTokenByActor(actor);
  if (!sourceTok) return;

  const selected = Array.from(game.user.targets ?? []);
  if (!selected.length) {
    ui.notifications.warn("Target up to 2 enemies first.");
    return;
  }

  const validTargets = selected
    .filter(t => isEnemyToken(sourceTok, t))
    .slice(0, 2);

  if (!validTargets.length) {
    ui.notifications.warn("No valid enemy targets selected.");
    return;
  }

  await updateHarmony(actor, {
    markedTargets: validTargets.map(t => t.id),
    pendingCurse: true
  });

  ui.notifications.info(`Silent Scripture: ${validTargets.length} target(s) marked for your next spell.`);
});

// L3 part 2: next spell fires a reminder, then clears the curse state immediately
Hooks.on("dnd5e.useItem", async (item) => {
  if (!item) return;

  const actor = item.actor;
  if (!actor) return;
  if (item.type !== "spell") return;

  const harmony = getHarmony(actor);
  if (!harmony) return;
  if (harmony.pieceKey !== "silent_scripture") return;
  if (harmony.level < 3) return;
  if (!harmony.pendingCurse) return;

  // Don't let the curse-item itself count as the "next spell"
  if (item.name === "Silent Scripture — Curse") return;

  const marked = harmony.markedTargets ?? [];
  const names = marked
    .map(id => canvas.tokens.placeables.find(t => t.id === id)?.name ?? id)
    .join(", ");

  ui.notifications.info(
    `Silent Scripture: ${item.name} cast — marked target(s) [${names || "none"}] have disadvantage on their first save. Apply manually.`
  );

  await clearSilentScriptureCurse(actor);
});

// L1: Reaction — add 1d4 to ally save within 30 ft
Hooks.on("dnd5e.preRollAbilitySave", (savingActor, rollData) => {
  if (!savingActor) return;

  const targetTok = canvas.tokens.placeables.find(t => t.actor?.id === savingActor.id);
  if (!targetTok) return;

  const perfTok = canvas.tokens.placeables.find(t => {
    const h = t.actor?.getFlag(FLAG_SCOPE, FLAG_KEY);
    return h?.pieceKey === "silent_scripture" && h.level >= 1;
  });
  if (!perfTok) return;

  // ally only
  if (perfTok.document.disposition !== targetTok.document.disposition) return;

  const distFt = canvas.grid.measureDistance(perfTok.center, targetTok.center);
  if (distFt > 30) return;

  new Dialog({
    title: "Silent Scripture — Guiding Verse",
    content: `<p>Use reaction to add <strong>+1d4</strong> to ${savingActor.name}'s save?</p>`,
    buttons: {
      yes: {
        label: "Yes",
        callback: () => {
          rollData.parts = rollData.parts ?? [];
          rollData.parts.push("+1d4");
          ui.notifications.info("Guiding Verse applied.");
        }
      },
      no: { label: "No" }
    },
    default: "yes"
  }).render(true);
});

// L2: After casting a spell, move up to 10 ft without opportunity attacks
Hooks.on("dnd5e.useItem", async (item) => {
  if (!item) return;

  const actor = item.actor;
  if (!actor) return;

  // only spells
  if (item.type !== "spell") return;

  const harmony = actor.getFlag(FLAG_SCOPE, FLAG_KEY);
  if (!harmony) return;

  if (harmony.pieceKey !== "silent_scripture") return;
  if (harmony.level < 2) return;

  const token = canvas.tokens.placeables.find(t => t.actor?.id === actor.id);
  if (!token) return;

  const gridSize = canvas.grid.size;
  const moveDist = gridSize * 2; // 10 ft

  const directions = {
    N:  { dx: 0, dy: -moveDist },
    NE: { dx: moveDist, dy: -moveDist },
    E:  { dx: moveDist, dy: 0 },
    SE: { dx: moveDist, dy: moveDist },
    S:  { dx: 0, dy: moveDist },
    SW: { dx: -moveDist, dy: moveDist },
    W:  { dx: -moveDist, dy: 0 },
    NW: { dx: -moveDist, dy: -moveDist }
  };

  new Dialog({
    title: "Silent Scripture — Reposition",
    content: "<p>Move up to 10 ft after casting this spell?</p>",
    buttons: Object.fromEntries(Object.entries(directions).map(([dir, vec]) => [
      dir,
      {
        label: dir,
        callback: async () => {
          const x = token.document.x + vec.dx;
          const y = token.document.y + vec.dy;

          const snapped = canvas.grid.getSnappedPosition(x, y);

          await token.document.update({
            x: snapped.x,
            y: snapped.y
          });
        }
      }
    ]).concat([
      ["stay", { label: "Stay" }]
    ])),
    default: "stay"
  }).render(true);
});

function getHarmony(actor) {
  return actor?.getFlag(FLAG_SCOPE, FLAG_KEY) ?? null;
}

function getTokenByActor(actor) {
  return canvas.tokens.placeables.find(t => t.actor?.id === actor?.id) ?? null;
}

function isEnemyToken(sourceTok, targetTok) {
  if (!sourceTok || !targetTok) return false;
  if (targetTok.document.disposition === 0) return false;
  return sourceTok.document.disposition !== targetTok.document.disposition;
}

async function updateHarmony(actor, patch) {
  const current = actor.getFlag(FLAG_SCOPE, FLAG_KEY) ?? {};
  await actor.setFlag(FLAG_SCOPE, FLAG_KEY, { ...current, ...patch });
}

async function clearSilentScriptureCurse(actor) {
  const current = actor.getFlag(FLAG_SCOPE, FLAG_KEY) ?? {};
  await actor.setFlag(FLAG_SCOPE, FLAG_KEY, {
    ...current,
    markedTargets: [],
    pendingCurse: false
  });
}

// River Lantern L1: allies within 15ft get +1 to saves
Hooks.on("dnd5e.preRollAbilitySave", (savingActor, rollData) => {
  const perfTok = canvas.tokens.placeables.find(t => {
    const h = t.actor?.getFlag(FLAG_SCOPE, FLAG_KEY);
    return h?.pieceKey === "river_lantern" && h.level >= 1;
  });
  if (!perfTok) return;

  const targetTok = canvas.tokens.placeables.find(t => t.actor?.id === savingActor.id);
  if (!targetTok) return;

  // allies only (same disposition)
  if (perfTok.document.disposition !== targetTok.document.disposition) return;

  const distFt = canvas.grid.measureDistance(perfTok.center, targetTok.center);
  if (distFt > 15) return;

  rollData.parts = rollData.parts ?? [];
  rollData.parts.push("+1");
});

// River Lantern L2: enemy attacks within 30ft take -1d4
Hooks.on("dnd5e.preAttackRoll", (item, rollData) => {
  const attacker = item?.actor;
  if (!attacker) return;

  const attackerToken = canvas.tokens.placeables.find(t => t.actor?.id === attacker.id);
  if (!attackerToken) return;

  const perfTok = canvas.tokens.placeables.find(t => {
    const h = t.actor?.getFlag(FLAG_SCOPE, FLAG_KEY);
    return h?.pieceKey === "river_lantern" && h.level >= 2;
  });
  if (!perfTok) return;

  if (perfTok.document.disposition === attackerToken.document.disposition) return;

  const distFt = canvas.grid.measureDistance(perfTok.center, attackerToken.center);
  if (distFt > 30) return;

  new Dialog({
    title: "River Lantern — Drifting Oars",
    content: `<p>Use reaction to impose <strong>-1d4</strong> on ${attacker.name}'s attack?</p>`,
    buttons: {
      yes: {
        label: "Yes",
        callback: () => {
          rollData.parts = rollData.parts ?? [];
          rollData.parts.push("-1d4");
          ui.notifications.info("Drifting Oars applied.");
        }
      },
      no: { label: "No" }
    },
    default: "yes"
  }).render(true);
});

// River Lantern L3: on mist cloud creation, resolve saves and debuff failed enemies
Hooks.on("createMeasuredTemplate", async (templateDoc) => {
  if (!canvas?.tokens?.placeables?.length) return;

  // Find a River Lantern L3 performer on this scene
  const perfTok = canvas.tokens.placeables.find(t => {
    const h = t.actor?.getFlag(FLAG_SCOPE, FLAG_KEY);
    return h?.pieceKey === "river_lantern" && h.level >= 3;
  });
  if (!perfTok) return;

  // The guidingMist script stores cloudTemplate uuid immediately after creation.
  // Yield briefly so the flag write can complete before we read it.
  await new Promise(resolve => setTimeout(resolve, 150));

  const harmony = perfTok.actor.getFlag(FLAG_SCOPE, FLAG_KEY);
  if (!harmony?.cloudTemplate) return;

  let storedId;
  try {
    storedId = (await fromUuid(harmony.cloudTemplate))?.id;
  } catch { return; }
  if (storedId !== templateDoc.id) return;

  const center   = templateDoc.object?.center ?? { x: templateDoc.x, y: templateDoc.y };
  const radiusFt = Number(templateDoc.distance ?? 15);

  // Calculate save DC: 8 + proficiency + WIS mod
  const dc = 8
    + (perfTok.actor.system?.attributes?.prof ?? 2)
    + (perfTok.actor.system?.abilities?.wis?.mod ?? 0);

  const enemies = canvas.tokens.placeables.filter(t => {
    if (!t.actor) return false;
    if (t.document.disposition === 0) return false; // ignore neutrals
    if (t.document.disposition === perfTok.document.disposition) return false;
    const distFt = canvas.grid.measureDistance(center, t.center);
    return distFt <= radiusFt;
  });

  if (!enemies.length) {
    ui.notifications.info("Guiding Mist: no enemies in range.");
    return;
  }

  for (const tok of enemies) {
    const a = tok.actor;
    let saveFailed = false;

    try {
      const saveRoll = await a.rollAbilitySave("con", { fastForward: true });
      saveFailed = (saveRoll?.total ?? 0) < dc;
    } catch {
      // rollAbilitySave unavailable — remind table to resolve manually
      ui.notifications.warn(`Guiding Mist: roll CON save (DC ${dc}) for ${tok.name} manually.`);
      continue;
    }

    if (!saveFailed) {
      ui.notifications.info(`Guiding Mist: ${tok.name} succeeded (DC ${dc}) — unaffected.`);
      continue;
    }

    // Remove any existing debuff before re-applying
    const existing = a.effects.find(e => e.name === "Guiding Mist Debuff");
    if (existing) await existing.delete();

    await a.createEmbeddedDocuments("ActiveEffect", [{
      name:     "Guiding Mist Debuff",
      icon:     "icons/magic/air/fog-gas-smoke-dense-gray.webp",
      changes:  [{ key: "system.attributes.movement.walk", mode: 2, value: "-10" }],
      duration: { rounds: 1 },
      flags:    { [MODULE_ID]: { harmony: true } }
    }]);

    ui.notifications.info(
      `Guiding Mist: ${tok.name} failed save (DC ${dc}) — movement -10 ft for 1 round. Apply attack disadvantage manually.`
    );
  }
});