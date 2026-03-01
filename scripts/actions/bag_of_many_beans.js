import { engine } from "../engine.js";

const ITEM_NAME = "Bag of Many Beans";
const TABLE_NAME = "Bag of Many Beans (d8)";

export async function run(actor, ctx = {}) {
  const token = ctx.token ?? canvas.tokens.controlled[0];
  if (!token) return engine.warn("Select a token.");

  const item = actor.items.getName(ITEM_NAME);
  if (!item) return engine.warn(`Actor does not have "${ITEM_NAME}".`);

  const uses = item.system?.uses;
  const current = Number(uses?.value ?? 0);
  if (!uses) return engine.warn("Item has no uses configured.");
  if (current <= 0) return engine.warn("No beans remaining.");

  await item.update({ "system.uses.value": current - 1 });

  const table = game.tables.getName(TABLE_NAME);
  if (!table) return engine.error(`RollTable "${TABLE_NAME}" not found.`);

  const roll = await table.roll({ displayChat: false });
  const result = roll.results?.[0];

  const content = engine.renderItemCard(item, {
    subtitle: `Result: ${roll.roll.total}`,
    body: result?.text ?? "<p>(No result text found.)</p>",
    footer: "Plant/throw the bean as an <strong>action</strong>. Concentration effects require <strong>you</strong> to concentrate."
  });

  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ token }),
    content
  });
}