// scripts/engine.js
// Foundry v13 helper surface for qol-pieces actions

export const engine = {
  warn: (msg) => (ui.notifications.warn(msg), null),
  error: (msg) => (ui.notifications.error(msg), null),
  info: (msg) => (ui.notifications.info(msg), null),

  speaker: (token, actor) =>
    token ? ChatMessage.getSpeaker({ token }) : ChatMessage.getSpeaker({ actor }),

  secondsToHMS: (s) => {
    s = Math.max(0, Math.floor(Number(s) || 0));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    const parts = [];
    if (h) parts.push(`${h}h`);
    if (m) parts.push(`${m}m`);
    parts.push(`${sec}s`);
    return parts.join(" ");
  },

  confirmDialog: async (title, html) => {
    return Dialog.confirm({ title, content: html });
  },

  numberInputDialog: ({ title, label, min = 0, step = 1, default: def = 0 } = {}) =>
    new Promise((resolve) => {
      const content = `
        <form>
          <div class="form-group">
            <label>${label ?? "Value:"}</label>
            <input id="qol-number" type="number" value="${def}" min="${min}" step="${step}" style="width:100%;" />
          </div>
        </form>`;

      new Dialog({
        title: title ?? "Input",
        content,
        buttons: {
          ok: {
            label: "OK",
            callback: (html) => {
              const raw = html.find("#qol-number").val();
              const n = Number(raw);
              resolve(Number.isFinite(n) ? n : null);
            }
          },
          cancel: { label: "Cancel", callback: () => resolve(null) }
        },
        default: "ok",
        close: () => resolve(null)
      }).render(true);
    }),

  renderItemCard: (item, { subtitle = "", body = "", footer = "" } = {}) => `
    <div class="dnd5e chat-card item-card">
      <header class="card-header flexrow">
        <img src="${item.img}" title="${item.name}" width="36" height="36">
        <h3>${item.name}</h3>
      </header>
      ${subtitle ? `<div class="card-content"><p><strong>${subtitle}</strong></p></div>` : ""}
      <div class="card-content">${body}</div>
      ${footer ? `<footer class="card-footer">${footer}</footer>` : ""}
    </div>
  `,

  // Minimal safe default: releases/spawns at holder position.
  // Replace later with real collision/grid search.
  findFreePositionNear: (token) => ({ x: token.document.x, y: token.document.y }),

  removeEffectByFlag: async (actor, scope, key) => {
    const effects = actor.effects?.filter((e) => e.getFlag(scope, key)) ?? [];
    if (!effects.length) return;
    await actor.deleteEmbeddedDocuments("ActiveEffect", effects.map((e) => e.id));
  },

  isMediumOrSmaller: (actor) => {
    const size = actor.system?.traits?.size;
    return ["tiny", "sm", "med"].includes(size);
  },

  actorIsDead5e: (actor) => {
    const hp = actor.system?.attributes?.hp?.value;
    const death = actor.system?.attributes?.death;
    const hasDeadEffect = actor.effects?.some((e) => /dead/i.test(e.name));
    return (hp <= 0 && (death?.failure ?? 0) >= 3) || !!hasDeadEffect;
  },

  actorIsUnconsciousAtZeroHp: (actor) => {
    const hp = actor.system?.attributes?.hp?.value;
    if (hp !== 0) return false;
    return actor.effects?.some((e) => /unconscious|incapacitated/i.test(e.name)) ?? false;
  },

  stabilizeActor: async (actor) => {
    await actor.update({
      "system.attributes.death.success": 3,
      "system.attributes.death.failure": 0
    });
  },

  applyGentleRepose: async (actor, { flagScope, flagKey, durationSeconds }) => {
    if (actor.effects?.some((e) => e.getFlag(flagScope, flagKey))) return;

    await actor.createEmbeddedDocuments("ActiveEffect", [
      {
        name: "Gentle Repose (Chrono Casket)",
        icon: "icons/magic/time/hourglass-tilted-gray.webp",
        duration: { seconds: durationSeconds },
        flags: { [flagScope]: { [flagKey]: true } }
      }
    ]);
  }
};