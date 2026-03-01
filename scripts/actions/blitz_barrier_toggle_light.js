import { engine } from "../engine.js";

const BRIGHT = 15;
const DIM    = 30;

/**
 * @param {Actor5e} actor
 * @param {object}  ctx
 * @param {Token}   [ctx.token]
 */
export async function run(actor, ctx = {}) {
  const token = ctx.token ?? canvas.tokens?.controlled[0];
  if (!token) return engine.warn("Select your token first.");

  const doc         = token.document;
  const currentlyOn = (doc.light?.bright ?? 0) > 0;

  await doc.update({
    light: currentlyOn
      ? { bright: 0,     dim: 0,   color: null,      alpha: 0.5,  angle: 360, attenuation: 0.5, luminosity: 0.25 }
      : { bright: BRIGHT, dim: DIM, color: "#ffffff", alpha: 0.35, angle: 360, attenuation: 0.5, luminosity: 0.25 },
  });

  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ token }),
    content: `<b>${token.name}</b> ${currentlyOn ? "extinguishes" : "ignites"} the shield's light.`,
  });
}
