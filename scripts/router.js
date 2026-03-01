import { engine } from "./engine.js";
import { run as runBeans }         from "./actions/bag_of_many_beans.js";
import { run as runChrono }        from "./actions/chrono_casket.js";
import { run as runAwaken }        from "./actions/blitz_barrier_awaken.js";
import { run as runToggleLight }   from "./actions/blitz_barrier_toggle_light.js";
import { run as runBlindingBlitz } from "./actions/blitz_barrier_blinding_blitz.js";
import { run as runHope }          from "./actions/hope_tracker.js";
import { run as runHarmony }       from "./actions/heavenly_harmony.js";
import { run as runNatureSpirit }  from "./actions/nature_spirit.js";

const ACTIONS = {
  bag_of_many_beans:            runBeans,
  chrono_casket:                runChrono,
  blitz_barrier_awaken:         runAwaken,
  blitz_barrier_toggle_light:   runToggleLight,
  blitz_barrier_blinding_blitz: runBlindingBlitz,
  hope_tracker:                 runHope,
  heavenly_harmony:             runHarmony,
  nature_spirit:                runNatureSpirit,
};

/**
 * Dispatch an action by id.
 * @param {string}   actionId
 * @param {Actor5e}  actor
 * @param {object}   ctx
 */
export async function dispatch(actionId, actor, ctx = {}) {
  const fn = ACTIONS[actionId];
  if (!fn)    return engine.error(`Unknown actionId: ${actionId}`);
  if (!actor) return engine.error("No actor provided.");
  return fn(actor, ctx);
}
