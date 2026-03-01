import { engine } from "../engine.js";

const SHIELD_NAME = "Blitz Barrier";

/**
 * @param {Actor5e} actor
 * @param {object}  ctx
 * @param {Token}   [ctx.token]
 */
export async function run(actor, ctx = {}) {
  const token = ctx.token ?? canvas.tokens?.controlled[0];
  if (!token) return engine.warn("Select your token first.");

  const item = actor.items.find(i => i.name === SHIELD_NAME);
  if (!item) return engine.warn(`Couldn't find "${SHIELD_NAME}" on ${actor.name}.`);

  const hd = await engine.numberInputDialog({
    title:   "Awaken Shield",
    label:   "Hit Dice spent to awaken:",
    min:     0,
    step:    1,
    default: 1,
  });
  if (hd === null) return; // cancelled

  if (!Number.isFinite(hd) || hd < 0) return engine.warn("Invalid HD amount.");

  const charges = Math.max(0, 1 + hd);
  await item.update({ "system.uses.value": charges, "system.uses.max": charges });

  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ token }),
    content:
      `<b>${actor.name}</b> awakens <i>${SHIELD_NAME}</i> for <b>1 minute</b>, ` +
      `spending <b>${hd}</b> Hit Dice (<u>apply HD deduction manually</u>).<br>` +
      `Shield Charges: <b>${charges}</b>.<br>` +
      `<u>Reminder:</u> Allies within the bright light radius have ` +
      `<b>half cover (+2 AC / Dex saves)</b> vs attacks originating from outside the area.`,
  });
}
