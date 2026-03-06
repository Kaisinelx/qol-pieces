import { engine } from "../engine.js";

const FLAG_SCOPE = "qol-pieces";
const FLAG_KEY   = "natureSpirit";

// ── Icons — swap paths to match your world ───────────────────────────────
const BEAR_ICON    = "icons/magic/nature/wolf-paw-glow-green.webp";
const HAWK_ICON    = "icons/creatures/birds/raptor-owl-flying-moon.webp";
const UNICORN_ICON = "icons/magic/holy/angel-winged-humanoid-blue.webp";

// ── Spirit definitions (built with live druidLevel) ───────────────────────
function buildSpirits(druidLevel) {
  return {
    bear: {
      name:        "Bear Spirit",
      icon:        BEAR_ICON,
      description: "Grants might and endurance. Allies gain temp HP and advantage on Strength checks/saves.",
      tempHP:      5 + druidLevel,
      auraRadius:  30,
      color:       "#8B4513",
    },
    hawk: {
      name:        "Hawk Spirit",
      icon:        HAWK_ICON,
      description: "Consummate hunter. Grant advantage to attacks (reaction). Advantage on Perception checks.",
      auraRadius:  30,
      color:       "#DAA520",
    },
    unicorn: {
      name:        "Unicorn Spirit",
      icon:        UNICORN_ICON,
      description: "Lends protection. Advantage to detect creatures. Healing spells restore extra HP to allies in aura.",
      healBonus:   druidLevel,
      auraRadius:  30,
      color:       "#E6E6FA",
    },
  };
}

// ── Placement ─────────────────────────────────────────────────────────────
async function getCrosshairPosition(token, maxRange) {
  // Prefer Portal if available
  if (typeof Portal !== "undefined" && Portal.pickPoint) {
    try {
      const result = await Portal.pickPoint({ range: maxRange, token });
      if (result?.x !== undefined && result?.y !== undefined) return { x: result.x, y: result.y };
    } catch {
      console.warn("[nature_spirit] Portal.pickPoint unavailable, trying AbilityTemplate fallback.");
    }
  }

  // dnd5e fallback — game.dnd5e.canvas.AbilityTemplate is version-sensitive
  try {
    const templateData = {
      t:         "circle",
      x:         token.center.x,
      y:         token.center.y,
      distance:  30,
      user:      game.user.id,
      fillColor: "#00FF0030",
    };
    const doc      = new CONFIG.MeasuredTemplate.documentClass(templateData, { parent: canvas.scene });
    const template = new game.dnd5e.canvas.AbilityTemplate(doc);
    const result   = await template.drawPreview();
    const tDoc     = Array.isArray(result) ? result[0] : result;
    if (tDoc?.x !== undefined && tDoc?.y !== undefined) return { x: tDoc.x, y: tDoc.y };
  } catch (e) {
    console.error("[nature_spirit] AbilityTemplate preview error:", e);
    engine.warn("Placement failed. Install the Portal module or check your dnd5e version.");
  }
  return null;
}

// ── Aura helpers ──────────────────────────────────────────────────────────
function alliedTokensInRange(token, spiritPos, auraRadius) {
  return canvas.tokens.placeables.filter(t => {
    if (!t.actor || t.disposition !== token.disposition) return false;
    const dist = Math.hypot(t.center.x - spiritPos.x, t.center.y - spiritPos.y)
      / canvas.grid.size * canvas.dimensions.distance;
    return dist <= auraRadius;
  });
}

// FIX #2: Guard against AE duplication — skip if matching effect already exists
function hasExistingAura(targetActor, spiritType) {
  return targetActor.effects.some(
    e => e.getFlag(FLAG_SCOPE, "natureSpirit") && e.getFlag(FLAG_SCOPE, "spiritType") === spiritType
  );
}

async function applyBearEffect(token, centerPos, spirit) {
  for (const t of alliedTokensInRange(token, centerPos, spirit.auraRadius)) {
    if (hasExistingAura(t.actor, "bear")) continue;
    const currentTemp = t.actor.system.attributes.hp.temp || 0;
    if (spirit.tempHP > currentTemp) {
      await t.actor.update({ "system.attributes.hp.temp": spirit.tempHP });
    }
    await t.actor.createEmbeddedDocuments("ActiveEffect", [{
      name:     "Bear Spirit Aura",
      icon:     spirit.icon,
      duration: { rounds: 10 },
      changes:  [
        { key: "flags.midi-qol.advantage.ability.check.str", mode: 0, value: "1", priority: 20 },
        { key: "flags.midi-qol.advantage.ability.save.str",  mode: 0, value: "1", priority: 20 },
      ],
      flags: { [FLAG_SCOPE]: { natureSpirit: true, spiritType: "bear" } },
    }]);
  }
}

async function applyHawkEffect(token, centerPos, spirit) {
  for (const t of alliedTokensInRange(token, centerPos, spirit.auraRadius)) {
    if (hasExistingAura(t.actor, "hawk")) continue;
    await t.actor.createEmbeddedDocuments("ActiveEffect", [{
      name:     "Hawk Spirit Aura",
      icon:     spirit.icon,
      duration: { rounds: 10 },
      changes:  [{ key: "flags.midi-qol.advantage.skill.prc", mode: 0, value: "1", priority: 20 }],
      flags:    { [FLAG_SCOPE]: { natureSpirit: true, spiritType: "hawk" } },
    }]);
  }
  engine.info("💡 Use your reaction to grant advantage to an attack roll in the aura.");
}

async function applyUnicornEffect(token, centerPos, spirit) {
  for (const t of alliedTokensInRange(token, centerPos, spirit.auraRadius)) {
    if (hasExistingAura(t.actor, "unicorn")) continue;
    await t.actor.createEmbeddedDocuments("ActiveEffect", [{
      name:     `Unicorn Spirit Aura (+${spirit.healBonus} Healing)`,
      icon:     spirit.icon,
      duration: { rounds: 10 },
      changes:  [
        { key: "flags.midi-qol.advantage.skill.prc", mode: 0, value: "1", priority: 20 },
        { key: "flags.midi-qol.advantage.skill.inv", mode: 0, value: "1", priority: 20 },
      ],
      flags: { [FLAG_SCOPE]: { natureSpirit: true, spiritType: "unicorn", healBonus: spirit.healBonus } },
    }]);
  }
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ token }),
    content: `
      <div style="padding:10px; background:rgba(230,230,250,0.2); border-left:4px solid #E6E6FA; border-radius:4px;">
        <p style="margin:0; font-size:13px; color:#9370DB;">
          <strong>🦄 Unicorn Spirit:</strong> Healing spells restore <strong>+${spirit.healBonus} HP</strong> to allies in the aura.
        </p>
      </div>`,
  });
}

async function applyEffects(token, centerPos, spirit, spiritType) {
  if (spiritType === "bear")         await applyBearEffect(token, centerPos, spirit);
  else if (spiritType === "hawk")    await applyHawkEffect(token, centerPos, spirit);
  else if (spiritType === "unicorn") await applyUnicornEffect(token, centerPos, spirit);
}

// FIX #3: Cleanup uses FLAG_SCOPE consistently — no "world" leakage
async function dismissEffectsOnly() {
  for (const t of canvas.tokens.placeables) {
    if (!t.actor) continue;
    const effects = t.actor.effects.filter(e => e.getFlag(FLAG_SCOPE, "natureSpirit"));
    if (effects.length) {
      await t.actor.deleteEmbeddedDocuments("ActiveEffect", effects.map(e => e.id));
    }
  }
}

// ── Core actions ──────────────────────────────────────────────────────────
async function summonSpirit(actor, token, spiritType, SPIRITS) {
  const spirit = SPIRITS[spiritType];
  if (!spirit) return engine.error("Invalid spirit type.");

  const location = await getCrosshairPosition(token, 60);
  if (!location || isNaN(location.x) || isNaN(location.y)) {
    return engine.warn("Spirit summoning cancelled.");
  }

  const gridSize  = canvas.grid.size;
  const tileX     = Math.round(Math.floor(Number(location.x) / gridSize) * gridSize);
  const tileY     = Math.round(Math.floor(Number(location.y) / gridSize) * gridSize);
f
  // FIX #3: Tile flags use FLAG_SCOPE, not "world"
  const tiles = await canvas.scene.createEmbeddedDocuments("Tile", [{
  texture: { src: spirit.icon },
  x:       tileX,
  y:       tileY,
  width:   Math.round(gridSize * 2),
  height:  Math.round(gridSize * 2),
  alpha:   0.7,
  flags:   { [FLAG_SCOPE]: { natureSpirit: true, spiritType, ownerId: actor.id } },
}]);

if (!tiles?.length) return engine.error("Failed to create spirit tile.");

const tileId    = tiles[0].id;
const centerX   = tileX + gridSize;
const centerY   = tileY + gridSize;
const centerPos = { x: centerX, y: centerY };

if (globalThis.Sequence) {
  new Sequence()
    .effect()
    .file("modules/jb2a_patreon/Library/Generic/Magic_Signs/ConjurationCircleComplete_02_Regular_Green_800x800.webm")
    .atLocation(centerPos)
    .scale(1.1)
    .fadeIn(300)
    .fadeOut(900)
    .play();
}

  // FIX #1: endRound stored inside the same flag object — no dot-notation split
  const endRound = game.combat?.active ? game.combat.round + 10 : null;

  await actor.setFlag(FLAG_SCOPE, FLAG_KEY, {
    active:     true,
    type:       spiritType,
    tileId,
    templateId: null,
    position:   centerPos,
    auraRadius: spirit.auraRadius,
    duration:   10,
    endRound,   // null when not in combat
  });

  await applyEffects(token, centerPos, spirit, spiritType);

  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ token }),
    content: `
      <div style="background:linear-gradient(to right,#558B2F,#33691E);
        border:2px solid #8BC34A; border-radius:8px; padding:15px; color:#FFF;">
        <h3 style="margin:0 0 10px 0; text-align:center;">🌿 ${spirit.name} Summoned</h3>
        <p style="margin:0; font-size:13px; line-height:1.5;">${spirit.description}</p>
        <p style="margin:10px 0 0 0; font-size:12px; font-style:italic; text-align:center;">
          Duration: 1 minute (10 rounds) | Aura: ${spirit.auraRadius} ft radius
        </p>
      </div>`,
  });

  engine.info(`🌿 ${spirit.name} summoned!`);
}

async function moveSpirit(actor, token, SPIRITS) {
  const spiritData = actor.getFlag(FLAG_SCOPE, FLAG_KEY);
  if (!spiritData) return engine.error("No active spirit found.");

  const spirit   = SPIRITS[spiritData.type];
  const location = await getCrosshairPosition(token, 60);
  if (!location || isNaN(location.x) || isNaN(location.y)) {
    return engine.warn("Spirit movement cancelled.");
  }

  const gridSize = canvas.grid.size;
  const snappedX = Math.round(Math.floor(Number(location.x) / gridSize) * gridSize);
  const snappedY = Math.round(Math.floor(Number(location.y) / gridSize) * gridSize);
  const centerX  = snappedX + gridSize;
  const centerY  = snappedY + gridSize;

  if (spiritData.tileId && canvas.tiles.get(spiritData.tileId)) {
    await canvas.scene.updateEmbeddedDocuments("Tile", [{ _id: spiritData.tileId, x: snappedX, y: snappedY }]);
  }
  if (spiritData.templateId && canvas.templates.get(spiritData.templateId)) {
    await canvas.scene.updateEmbeddedDocuments("MeasuredTemplate", [{ _id: spiritData.templateId, x: centerX, y: centerY }]);
  }

  // FIX #1: Update position inside the same object — no dot-notation
  await actor.setFlag(FLAG_SCOPE, FLAG_KEY, { ...spiritData, position: { x: centerX, y: centerY } });

  await dismissEffectsOnly();
  await new Promise(resolve => setTimeout(resolve, 100));

  await applyEffects(token, { x: centerX, y: centerY }, spirit, spiritData.type);

  engine.info("🌿 Spirit moved!");
}

async function dismissSpirit(actor, token, SPIRITS) {
  const spiritData = actor.getFlag(FLAG_SCOPE, FLAG_KEY);
  if (!spiritData) return;

  if (spiritData.tileId && canvas.tiles.get(spiritData.tileId)) {
    await canvas.scene.deleteEmbeddedDocuments("Tile", [spiritData.tileId]);
  }
  if (spiritData.templateId && canvas.templates.get(spiritData.templateId)) {
    await canvas.scene.deleteEmbeddedDocuments("MeasuredTemplate", [spiritData.templateId]);
  }

  await dismissEffectsOnly();
  await actor.unsetFlag(FLAG_SCOPE, FLAG_KEY);

  // FIX #4: awaited
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ token }),
    content: `<p style="text-align:center;">🌿 <strong>${SPIRITS[spiritData.type]?.name || "Spirit"}</strong> has been dismissed.</p>`,
  });

  engine.info("🌿 Spirit dismissed.");
}

function summonMenu(actor, token, SPIRITS) {
  const spiritOptions = Object.entries(SPIRITS)
    .map(([key, data]) => `<option value="${key}">${data.name}</option>`)
    .join("");

  const content = `
    <form>
      <div class="form-group">
        <label style="font-size:14px; font-weight:bold;">Choose a Spirit:</label>
        <select id="spirit-select" style="width:100%; padding:10px; margin-top:8px; font-size:14px;">
          ${spiritOptions}
        </select>
      </div>
      <div id="spirit-info" style="margin-top:15px; padding:12px; background:rgba(139,195,74,0.1); border-left:4px solid #8BC34A; border-radius:4px;">
        <p style="margin:0; font-size:13px; font-style:italic;">Select a spirit to see details.</p>
      </div>
    </form>`;

  new Dialog({
    title:   "🌿 Summon Nature Spirit",
    content,
    buttons: {
      summon: {
        icon:  '<i class="fas fa-check"></i>',
        label: "Summon",
        callback: async (html) => {
          const spiritType = html.find("#spirit-select").val();
          await summonSpirit(actor, token, spiritType, SPIRITS);
        },
      },
      cancel: { icon: '<i class="fas fa-times"></i>', label: "Cancel" },
    },
    default: "summon",
    render: (html) => {
      const select  = html.find("#spirit-select");
      const infoBox = html.find("#spirit-info");
      const updateInfo = () => {
        const spirit = SPIRITS[select.val()];
        if (!spirit) return;
        let details = `<p style="margin:0; font-size:13px; line-height:1.5;"><strong>${spirit.name}:</strong><br>${spirit.description}</p>`;
        if (spirit.tempHP)    details += `<p style="margin:5px 0 0 0; font-size:12px;"><em>Temp HP: ${spirit.tempHP}</em></p>`;
        if (spirit.healBonus) details += `<p style="margin:5px 0 0 0; font-size:12px;"><em>Healing Bonus: +${spirit.healBonus} HP</em></p>`;
        infoBox.html(details);
      };
      select.on("change", updateInfo);
      updateInfo();
    },
  }, { width: 450 }).render(true);
}

// ── Main ──────────────────────────────────────────────────────────────────
/**
 * @param {Actor5e} actor
 * @param {object}  ctx
 * @param {Token}   [ctx.token]
 *
 * Requires: Druid class item on actor with system.levels >= 2.
 * Optional: Portal module for placement crosshair. Falls back to dnd5e AbilityTemplate.
 * Midi-QOL: AE keys use flags.midi-qol.advantage.* — effects are cosmetic without midi.
 */
export async function run(actor, ctx = {}) {
  const token = ctx.token ?? canvas.tokens?.controlled[0];
  if (!token)        return engine.warn("Select your token first.");
  if (!canvas.scene) return engine.error("No active scene.");

  const druidClass = actor.items.find(i => i.type === "class" && i.name.toLowerCase().includes("druid"));
  const druidLevel = druidClass?.system?.levels ?? 0;
  if (druidLevel < 2) return engine.error("You need to be at least Druid level 2 to use Nature Spirits.");

  const SPIRITS      = buildSpirits(druidLevel);
  const activeSpirit = actor.getFlag(FLAG_SCOPE, FLAG_KEY);
  const hasSpirit    = !!activeSpirit?.active;

  const menuContent = `
    <div style="padding:10px;">
      <p style="margin:0 0 10px 0; font-size:14px; text-align:center;">
        <strong>Nature Spirits</strong> — Call forth an incorporeal spirit
      </p>
      ${hasSpirit ? `
        <p style="padding:8px; background:rgba(139,195,74,0.15); border-radius:4px; color:#558B2F; font-size:13px; text-align:center;">
          Active: <strong>${SPIRITS[activeSpirit.type]?.name || "Unknown Spirit"}</strong>
        </p>` : ""}
    </div>`;

  const buttons = {};
  if (hasSpirit) {
    buttons.move    = { icon: '<i class="fas fa-arrows-alt"></i>',   label: "Move Spirit",    callback: () => moveSpirit(actor, token, SPIRITS)   };
    buttons.dismiss = { icon: '<i class="fas fa-times-circle"></i>', label: "Dismiss Spirit", callback: () => dismissSpirit(actor, token, SPIRITS) };
  } else {
    buttons.summon  = { icon: '<i class="fas fa-paw"></i>',          label: "Summon Spirit",  callback: () => summonMenu(actor, token, SPIRITS)    };
  }
  buttons.cancel = { icon: '<i class="fas fa-times"></i>', label: "Cancel" };

  new Dialog({
    title:   "🌿 Nature Spirits",
    content: menuContent,
    buttons,
  }).render(true);
}
