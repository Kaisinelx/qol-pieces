import { engine } from "../engine.js";

const BRIGHT = 15;
const DIM    = 30;

const AURA_NAME = "blitz-barrier-aura";

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
      ? { bright: 0, dim: 0, color: null, alpha: 0.5, angle: 360, attenuation: 0.5, luminosity: 0.25 }
      : { bright: BRIGHT, dim: DIM, color: "#ffffff", alpha: 0.35, angle: 360, attenuation: 0.5, luminosity: 0.25 },
  });

  if (globalThis.Sequence) {
    if (currentlyOn) {
      // turning OFF → remove aura
      Sequencer.EffectManager.endEffects({
        name: AURA_NAME,
        object: token
      });
    } else {
      // turning ON → create persistent aura loop
      new Sequence()
        .effect()
        .file("modules/jb2a_patreon/Library/Generic/Template/Circle/Aura/Aura004/Aura004Part01_Outward_Loop_004_Refraction_1400x1400.webm")
        .attachTo(token)
        .scale(0.9)
        .name(AURA_NAME)
        .persist()
        .fadeIn(500)
        .fadeOut(500)
        .play();
    }
  }

  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ token }),
    content: `<b>${token.name}</b> ${currentlyOn ? "extinguishes" : "ignites"} the shield's light.`,
  });
}
