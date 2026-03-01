// scripts/router.js
import { engine } from "./engine.js";

import { run as runBeans } from "./actions/bag_of_many_beans.js";
import { run as runChrono } from "./actions/chrono_casket.js";
import { run as runAwaken } from "./actions/blitz_barrier_awaken.js";
import { run as runToggleLight } from "./actions/blitz_barrier_toggle_light.js";
import { run as runBlindingBlitz } from "./actions/blitz_barrier_blinding_blitz.js";
import { run as runHope } from "./actions/hope_tracker.js";
import { run as runHarmony } from "./actions/heavenly_harmony.js";
import { run as runNatureSpirit } from "./actions/nature_spirit.js";

const ACTIONS = {
  bag_of_many_beans: runBeans,
  chrono_casket: runChrono,
  blitz_barrier_awaken: runAwaken,
  blitz_barrier_toggle_light: runToggleLight,
  blitz_barrier_blinding_blitz: runBlindingBlitz,
  hope_tracker: runHope,
  heavenly_harmony: runHarmony,
  nature_spirit: runNatureSpirit
};

function firstControlledToken() {
  const tokens = canvas?.tokens?.controlled ?? [];
  return tokens.length ? tokens[0] : null;
}

async function actorFromUuid(actorUuid) {
  if (!actorUuid) return null;
  try {
    const doc = await fromUuid(actorUuid);
    return doc?.actor ?? doc ?? null;
  } catch {
    return null;
  }
}

/**
 * UI-friendly runner:
 * - resolves actor/token automatically
 * - accepts ctx.actorUuid, ctx.tokenUuid, ctx.itemUuid, etc.
 */
export async function dispatchFromUi(actionId, ctx = {}) {
  // 1) explicit actorUuid
  const actorFromCtx = await actorFromUuid(ctx.actorUuid);
  if (actorFromCtx) return dispatch(actionId, actorFromCtx, ctx);

  // 2) tokenUuid -> token.actor
  if (ctx.tokenUuid) {
    try {
      const tokenDoc = await fromUuid(ctx.tokenUuid);
      const tok = tokenDoc?.object ?? tokenDoc;
      const act = tok?.actor ?? null;
      if (act) return dispatch(actionId, act, { ...ctx, token: tok });
    } catch {
      // fall through
    }
  }

  // 3) controlled token
  const controlled = firstControlledToken();
  if (controlled?.actor) return dispatch(actionId, controlled.actor, { ...ctx, token: controlled });

  // 4) user character
  if (game.user?.character) return dispatch(actionId, game.user.character, ctx);

  return engine.error("qol-pieces: No actor context (provide ctx.actorUuid, select a token, or set User Character).");
}

/**
 * Core dispatcher: actionId + actor required.
 * @param {string} actionId
 * @param {Actor} actor
 * @param {object} ctx
 */
export async function dispatch(actionId, actor, ctx = {}) {
  const fn = ACTIONS[actionId];
  if (!fn) return engine.error(`qol-pieces: Unknown actionId: ${actionId}`);
  if (!actor) return engine.error("qol-pieces: No actor provided.");

  try {
    return await fn(actor, ctx);
  } catch (err) {
    console.error("qol-pieces dispatch error:", err);
    return engine.error(`qol-pieces: Action failed: ${actionId}`);
  }
}
