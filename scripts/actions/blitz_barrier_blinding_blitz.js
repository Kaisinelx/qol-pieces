import { engine } from "../engine.js";

const SHIELD_NAME    = "Blitz Barrier";
const DC             = 15;
const DAMAGE_FORMULA = "3d6";

/**
 * @param {Actor5e} actor
 * @param {object}  ctx
 * @param {Token}   [ctx.token]
 * @param {Token[]} [ctx.targets]
 *
 * NOTE: Blinded condition, reaction tracking, and end-of-turn repeat saves
 * are NOT automated. Apply the Blinded condition manually after this fires.
 */
export async function run(actor, ctx = {}) {
  const token = ctx.token ?? canvas.tokens?.controlled[0];
  if (!token) return engine.warn("Select your token first.");

  const targets = ctx.targets ?? [...(game.user.targets ?? [])];
  const target  = targets[0];
  if (!target) return engine.warn("Target one creature first.");

  // Guard: token may exist without a linked actor
  const targetActor = target.actor;
  if (!targetActor) return engine.warn(`${target.name} has no actor — cannot roll save.`);

  const item = actor.items.find(i => i.name === SHIELD_NAME);
  if (!item) return engine.warn(`Couldn't find "${SHIELD_NAME}" on ${actor.name}.`);

  const charges = item.system?.uses?.value ?? 0;
if (charges < 1) return engine.warn("No shield charges remaining. Awaken it first.");

if (globalThis.Sequence) {
  new Sequence()
    .effect()
    .file("jb2a.explosion.08.1200.orange")
    .atLocation(target)
    .scale(0.7)
    .fadeIn(100)
    .fadeOut(400)
    .play();
}

// Damage roll — posted to chat separately so dice are visible
const dmgRoll = await (new Roll(DAMAGE_FORMULA)).evaluate();
  await dmgRoll.toMessage({ flavor: "Blinding Blitz — Radiant Damage (3d6)" });

  // CON save — dnd5e method; guarded above
  const saveRoll = await targetActor.rollAbilitySave("con", { dc: DC, fastForward: true });
  const failed   = (saveRoll?.total ?? 0) < DC;

  const full    = dmgRoll.total ?? 0;
  const applied = failed ? full : Math.floor(full / 2);

  await item.update({ "system.uses.value": charges - 1 });

  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ token }),
    content:
      `<b>Blinding Blitz</b> — ${token.name} flashes the shield at <b>${target.name}</b> (DC ${DC} CON).<br>` +
      `Save result: <b>${failed ? "FAILED" : "PASSED"}</b> — takes <b>${applied}</b> radiant damage.<br>` +
      (failed
        ? `<b>Apply Blinded manually for 1 minute.</b> At the end of its turn it may repeat the DC ${DC} CON save.`
        : `Not blinded.`) +
      `<br>Charges remaining: <b>${charges - 1}</b>.`,
  });
}
