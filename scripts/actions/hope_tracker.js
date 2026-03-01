import { engine } from "../engine.js";

const HOPE_ITEM_NAME = "Hope";

// ── Styles ────────────────────────────────────────────────────────────────
const STYLES = `
<style>
.hope-dialog {
  font-family: "Signika", "Trebuchet MS", Arial, sans-serif;
  background:
    radial-gradient(140% 160% at 50% 0%, rgba(235,176,131,0.06), transparent 60%),
    linear-gradient(180deg, rgba(0,0,0,0.15), rgba(0,0,0,0.50)),
    #2A2320;
  border: 2px solid rgba(166,116,78,0.90);
  border-radius: 12px;
  padding: 24px;
  box-shadow:
    inset 0 1.5px 0 rgba(255,255,255,0.10),
    inset 0 0 0 1px rgba(235,176,131,0.20),
    inset 0 20px 30px rgba(0,0,0,0.40),
    0 10px 30px rgba(0,0,0,0.80);
  color: #FEFEFE;
  position: relative;
  overflow: hidden;
}
.hope-dialog::before {
  content: "";
  position: absolute;
  inset: 0;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='512' height='512'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.65' numOctaves='3' stitchTiles='stitch'/><feColorMatrix type='matrix' values='1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 .06 0'/></filter><rect width='512' height='512' filter='url(%23n)'/></svg>");
  background-size: 256px 256px;
  opacity: 0.40;
  pointer-events: none;
}
.hope-header {
  position: relative;
  z-index: 1;
  text-align: center;
  margin-bottom: 20px;
  padding-bottom: 18px;
  border-bottom: 2px solid rgba(166,116,78,0.50);
  box-shadow: 0 1px 0 rgba(0,0,0,0.50);
}
.hope-title {
  font-size: 32px;
  font-weight: 700;
  color: #FFF;
  text-shadow:
    0 0 8px rgba(235,176,131,0.80),
    0 2px 6px rgba(0,0,0,1),
    0 4px 12px rgba(0,0,0,0.80);
  letter-spacing: 3px;
  text-transform: uppercase;
  margin: 0 0 14px 0;
}
.hope-title-accent { color: #EBB083; font-size: 20px; margin: 0 8px; }
.hope-counter {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 10px;
  margin: 16px 0;
}
.hope-orb {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  position: relative;
  box-shadow:
    inset 0 2px 0 rgba(255,255,255,0.15),
    inset 0 0 0 2px rgba(166,116,78,0.50),
    inset 0 10px 18px rgba(0,0,0,0.60),
    0 4px 12px rgba(0,0,0,0.80);
}
.hope-orb.filled {
  background:
    radial-gradient(circle at 30% 30%, rgba(255,240,220,0.90), transparent 70%),
    radial-gradient(circle at 50% 50%, #EBB083, #A6744E);
  box-shadow:
    inset 0 2px 0 rgba(255,255,255,0.50),
    inset 0 0 0 2px rgba(235,176,131,0.80),
    inset 0 10px 18px rgba(0,0,0,0.30),
    0 0 20px rgba(235,176,131,0.60),
    0 4px 16px rgba(0,0,0,0.80);
  animation: hope-pulse 3s ease-in-out infinite;
}
.hope-orb.empty {
  background: radial-gradient(circle at 50% 50%, rgba(60,50,45,0.80), rgba(20,16,14,0.90));
}
@keyframes hope-pulse {
  0%,100% {
    filter: brightness(1.0);
    box-shadow:
      inset 0 2px 0 rgba(255,255,255,0.50),
      inset 0 0 0 2px rgba(235,176,131,0.80),
      inset 0 10px 18px rgba(0,0,0,0.30),
      0 0 20px rgba(235,176,131,0.60),
      0 4px 16px rgba(0,0,0,0.80);
  }
  50% {
    filter: brightness(1.20);
    box-shadow:
      inset 0 2px 0 rgba(255,255,255,0.60),
      inset 0 0 0 2px rgba(235,176,131,0.90),
      inset 0 10px 18px rgba(0,0,0,0.30),
      0 0 28px rgba(235,176,131,0.80),
      0 4px 16px rgba(0,0,0,0.80);
  }
}
.hope-text {
  position: relative;
  z-index: 1;
  font-size: 15px;
  font-weight: 500;
  line-height: 1.7;
  text-align: center;
  color: #FFF;
  text-shadow: 0 1px 2px rgba(0,0,0,0.90), 0 2px 6px rgba(0,0,0,0.70);
  margin: 18px 0;
  padding: 14px 18px;
  background:
    linear-gradient(180deg, rgba(255,255,255,0.04), transparent 50%),
    rgba(0,0,0,0.35);
  border-radius: 8px;
  border: 1px solid rgba(166,116,78,0.35);
  box-shadow: inset 0 0 0 1px rgba(0,0,0,0.70), inset 0 8px 16px rgba(0,0,0,0.40);
}
.hope-text strong { color: #EBB083; font-weight: 700; font-size: 17px; }
.hope-text em    { color: rgba(255,255,255,0.80); font-style: italic; font-size: 13px; }
.hope-cost {
  display: inline-block;
  background: rgba(0,0,0,0.50);
  padding: 3px 8px;
  border-radius: 5px;
  font-size: 13px;
  font-weight: 600;
  margin-left: 6px;
  border: 1px solid rgba(235,176,131,0.60);
  color: #EBB083;
  text-shadow: 0 1px 2px rgba(0,0,0,1), 0 0 6px rgba(235,176,131,0.50);
}
</style>
`;

// ── Helpers ───────────────────────────────────────────────────────────────

/**
 * Always re-reads live values from the item document.
 * Prevents stale closures when multiple buttons are clicked in one session.
 */
function readUses(hopeItem) {
  const uses    = hopeItem.system?.uses ?? {};
  const max     = Number(uses.max)   || 0;
  const spent   = Number(uses.spent) || 0;
  const current = Math.max(0, max - spent);
  return { max, spent, current };
}

function buildOrbs(max, current) {
  return Array.from({ length: max }, (_, i) =>
    `<div class="hope-orb ${i < current ? "filled" : "empty"}"></div>`
  ).join("");
}

function buildContent(max, current) {
  return `
${STYLES}
<div class="hope-dialog">
  <div class="hope-header">
    <div class="hope-title">
      <span class="hope-title-accent">✦</span>HOPE<span class="hope-title-accent">✦</span>
    </div>
    <div class="hope-counter">${buildOrbs(max, current)}</div>
  </div>
  <div class="hope-text">
    <strong>Current: ${current} / ${max}</strong><br>
    <em>Use after a d20 roll (before result is announced)</em>
  </div>
</div>
`;
}

// ── Main ──────────────────────────────────────────────────────────────────
/**
 * @param {Actor5e} actor
 * @param {object}  ctx
 * @param {Token}   [ctx.token]
 *
 * SETUP REQUIREMENT: The "Hope" item must use dnd5e's "spent" uses tracking
 * mode (system.uses.spent + system.uses.max), NOT the value/max mode.
 * If configured as value/max, all reads will return 0.
 */
export async function run(actor, ctx = {}) {
  const token         = ctx.token ?? canvas.tokens?.controlled[0] ?? null;
  const resolvedActor = actor ?? token?.actor ?? game.user.character ?? null;
  if (!resolvedActor) return engine.error("No actor selected and no default character found.");

  const hopeItem = resolvedActor.items.find(i => i.name === HOPE_ITEM_NAME);
  if (!hopeItem) return engine.error(`Actor does not have an item named "${HOPE_ITEM_NAME}".`);

  // Initial read — only used to render the dialog. Each callback re-reads.
  const { max, current: initialCurrent } = readUses(hopeItem);
  if (max <= 0) return engine.warn("Hope item has no max uses set. Set max to 3 in the item.");

  // Speaker helper — prefers token, falls back to actor
  const speaker = () => token
    ? ChatMessage.getSpeaker({ token })
    : ChatMessage.getSpeaker({ actor: resolvedActor });

  // ── Dialog ──────────────────────────────────────────────────────────────
  new Dialog({
    title:   "Hope Controls",
    content: buildContent(max, initialCurrent),
    buttons: {

      inc1: {
        label: "Gain 1 Hope",
        callback: async () => {
          const { max, spent, current } = readUses(hopeItem);
          if (current >= max) return engine.warn("Hope is already at maximum.");
          const newSpent = Math.max(0, spent - 1);
          await hopeItem.update({ "system.uses.spent": newSpent });
          await ChatMessage.create({
            speaker: speaker(),
            content:
              `<div style="color:#EBB083; font-weight:bold; font-size:16px; text-shadow:0 1px 3px rgba(0,0,0,0.9);">✦ Hope: +1 ✦</div>` +
              `<p style="font-size:14px;">Now at <strong>${max - newSpent}/${max}</strong></p>`,
          });
        },
      },

      dec1: {
        label: "Lose 1 Hope",
        callback: async () => {
          const { max, spent, current } = readUses(hopeItem);
          if (current <= 0) return engine.warn("You have no Hope left to lose.");
          const newSpent = Math.min(max, spent + 1);
          await hopeItem.update({ "system.uses.spent": newSpent });
          await ChatMessage.create({
            speaker: speaker(),
            content:
              `<div style="color:#9BA9B7; font-weight:bold; font-size:16px; text-shadow:0 1px 3px rgba(0,0,0,0.9);">✦ Hope: -1 ✦</div>` +
              `<p style="font-size:14px;">Now at <strong>${max - newSpent}/${max}</strong></p>`,
          });
        },
      },

      spend2: {
        label: `Spend 2 Hope <span class="hope-cost">+1d4</span>`,
        callback: async () => {
          const { max, spent, current } = readUses(hopeItem);
          if (current < 2) return engine.warn("You don't have 2 Hope to spend.");
          const newSpent = Math.min(max, spent + 2);
          await hopeItem.update({ "system.uses.spent": newSpent });
          const roll = await (new Roll("1d4")).evaluate();
          await roll.toMessage({
            speaker: speaker(),
            flavor:
              `<div style="color:#EBB083; font-weight:bold; font-size:16px; text-shadow:0 1px 3px rgba(0,0,0,0.9);">✦ Hope: +1d4 bonus ✦</div>` +
              `<p style="font-size:14px;">2 Hope spent (now at <strong>${max - newSpent}/${max}</strong>)<br><em>Add this to your previous d20 roll</em></p>`,
          });
        },
      },

      spend3d6: {
        label: `Spend 3 Hope <span class="hope-cost">+1d6</span>`,
        callback: async () => {
          const { max, spent, current } = readUses(hopeItem);
          if (current < 3) return engine.warn("You don't have 3 Hope to spend.");
          const newSpent = Math.min(max, spent + 3);
          await hopeItem.update({ "system.uses.spent": newSpent });
          const roll = await (new Roll("1d6")).evaluate();
          await roll.toMessage({
            speaker: speaker(),
            flavor:
              `<div style="color:#EBB083; font-weight:bold; font-size:16px; text-shadow:0 1px 3px rgba(0,0,0,0.9);">✦ Hope: +1d6 bonus ✦</div>` +
              `<p style="font-size:14px;">3 Hope spent (now at <strong>${max - newSpent}/${max}</strong>)<br><em>Add this to your previous d20 roll</em></p>`,
          });
        },
      },

      spend3reroll: {
        label: `Spend 3 Hope <span class="hope-cost">Reroll d20</span>`,
        callback: async () => {
          const { max, spent, current } = readUses(hopeItem);
          if (current < 3) return engine.warn("You don't have 3 Hope to spend.");
          const newSpent = Math.min(max, spent + 3);
          await hopeItem.update({ "system.uses.spent": newSpent });
          const roll = await (new Roll("1d20")).evaluate();
          await roll.toMessage({
            speaker: speaker(),
            flavor:
              `<div style="color:#EBB083; font-weight:bold; font-size:16px; text-shadow:0 1px 3px rgba(0,0,0,0.9);">✦ Hope: Reroll d20 ✦</div>` +
              `<p style="font-size:14px;">3 Hope spent (now at <strong>${max - newSpent}/${max}</strong>)<br><em>Use this result instead</em></p>`,
          });
        },
      },

      cancel: { label: "Cancel" },
    },
    default: "cancel",
  }, {
    width:   500,
    classes: ["dialog", "hope-controls"],
  }).render(true);
}
