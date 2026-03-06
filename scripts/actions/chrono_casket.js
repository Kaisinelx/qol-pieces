import { engine } from "../engine.js";

const ITEM_NAME  = "Chrono Casket";
const FLAG_SCOPE = "qol-pieces";
const FLAG_KEY   = "chronoCasket";

const TIME_MULTIPLIER = 4;
const DAY = (24 * 60 * 60) / TIME_MULTIPLIER; // 21600 real seconds = 24 in-game hours

/**
 * @param {Actor5e} actor   – holder actor, resolved by engine
 * @param {object}  ctx
 * @param {Token}   [ctx.token]    – selected (holder) token
 * @param {Token[]} [ctx.targets]  – user's current targets (may be empty on release)
 */
export async function run(actor, ctx) {
  // Hard guards — must pass before anything else
  const holderToken = ctx.token ?? canvas.tokens?.controlled[0];
  if (!holderToken) return engine.error("Select the token holding the Chrono Casket.");
  if (!canvas.scene) return engine.error("No active scene.");

  const targets = ctx.targets ?? [...(game.user.targets ?? [])];
  const now = Math.floor(Date.now() / 1000);

  // 1 — Locate item on holder
  const casketItem = actor.items.getName(ITEM_NAME);
  if (!casketItem) return engine.warn(`No item named "${ITEM_NAME}" on selected actor.`);

  // 2 — Load persisted state from item flag
  const state = (await casketItem.getFlag(FLAG_SCOPE, FLAG_KEY)) ?? {};

  // 3 — Cooldown guard (only when casket is empty)
  const cooldownEnd = Number(state.cooldownEndTime ?? 0);
  if (!state.storedActorUuid && cooldownEnd > now) {
    return engine.warn(`Chrono Casket on cooldown for ${engine.secondsToHMS(cooldownEnd - now)}.`);
  }

  // 4 — RELEASE branch
  if (state.storedActorUuid) {
    if (Number(state.expiryTime ?? 0) > 0 && now >= Number(state.expiryTime)) {
      engine.info("Time limit reached — releasing contents.");
    }

    const confirmed = await engine.confirmDialog(
      "Chrono Casket: Release",
      "<p>Release the creature stored inside the Chrono Casket?</p>"
    );
    if (!confirmed) return;

    const storedActor = await fromUuid(state.storedActorUuid);
    if (!storedActor) {
      await casketItem.unsetFlag(FLAG_SCOPE, FLAG_KEY);
      return engine.error("Stored actor UUID could not be resolved. Clearing casket state.");
    }

    const pos = engine.findFreePositionNear(holderToken);

    let tokenData;
    if (state.storedTokenData) {
      tokenData = foundry.utils.duplicate(state.storedTokenData);
      Object.assign(tokenData, { x: pos.x, y: pos.y, hidden: false });
    } else {
      tokenData = storedActor.prototypeToken?.toObject?.() ?? {};
      Object.assign(tokenData, {
        name: storedActor.name,
        x: pos.x, y: pos.y, hidden: false,
      });
    }
    tokenData.actorId = storedActor.id;

    const created = await canvas.scene.createEmbeddedDocuments("Token", [tokenData]);
const releasedToken = canvas.tokens.get(created[0]?.id);

if (globalThis.Sequence && releasedToken) {
  await new Sequence()
    .effect()
    .file("jb2a.butterflies.outward.01.bluepurple")
    .atLocation(releasedToken)
    .scale(0.9)
    .fadeIn(100)
    .fadeOut(500)
    .play();
}

await engine.removeEffectByFlag(storedActor, FLAG_SCOPE, "chronoCasketGentleRepose");

    await casketItem.setFlag(FLAG_SCOPE, FLAG_KEY, {
      storedActorUuid:  null,
      storedTokenData:  null,
      storedSceneId:    null,
      expiryTime:       null,
      storedWasDead:    null,
      cooldownEndTime:  now + DAY,
    });

    return engine.info(`Released ${storedActor.name}. Chrono Casket on cooldown for 24 in-game hours.`);
  }

  // 5 — CAPTURE branch
  const targetToken = targets[0];
  if (!targetToken) return engine.warn("Target exactly ONE token to capture.");
  const targetActor = targetToken.actor;
  if (!targetActor) return engine.warn("Target token has no actor.");

  if (!engine.isMediumOrSmaller(targetActor)) {
    return engine.warn("Target must be Medium or smaller.");
  }

  const isDead   = engine.actorIsDead5e(targetActor);
  const isUncon0 = engine.actorIsUnconsciousAtZeroHp(targetActor);
  if (!isDead && !isUncon0) {
    return engine.warn("Target must be dead or unconscious at 0 HP.");
  }

  if (!game.user.isGM) {
    engine.warn("Best run by a GM — token create/delete permissions required.");
  }

  // Minimal token snapshot — strip _id and actorId (reassigned on release)
  const tokenObj = targetToken.document.toObject();
  delete tokenObj._id;
  delete tokenObj.actorId;

  if (isUncon0) await engine.stabilizeActor(targetActor);
  if (isDead)   await engine.applyGentleRepose(targetActor, {
    flagScope:       FLAG_SCOPE,
    flagKey:         "chronoCasketGentleRepose",
    durationSeconds: DAY,
  });
  
if (globalThis.Sequence) {
  await new Sequence()
    .effect()
    .file("jb2a.butterflies.complete.01.bluepurple")
    .atLocation(targetToken)
    .scale(0.8)
    .fadeIn(150)
    .duration(500)

    .effect()
    .file("jb2a.butterflies.inward_burst.01.bluepurple")
    .atLocation(targetToken)
    .scale(0.9)
    .waitUntilFinished(-250)

    .play();
}
  await targetToken.document.delete();

  await casketItem.setFlag(FLAG_SCOPE, FLAG_KEY, {
    storedActorUuid:  targetActor.uuid,
    storedTokenData:  tokenObj,
    storedSceneId:    canvas.scene.id,
    expiryTime:       now + DAY,
    storedWasDead:    isDead,
    cooldownEndTime:  null,
  });

  return engine.info(`Stored ${targetActor.name} inside the Chrono Casket for up to 24 in-game hours.`);
}