export async function run(actor, ctx = {}) {
  const token = ctx.token ?? canvas.tokens?.controlled[0];
  if (!token) return ui.notifications.warn("Select your token first.");

  const templateData = {
    t: "circle",
    user: game.user.id,
    distance: 10,
    x: token.center.x,
    y: token.center.y
  };

  const doc = await MeasuredTemplateDocument.create(templateData, { parent: canvas.scene });

  if (globalThis.Sequence) {
    new Sequence()
      .effect()
      .file("modules/jb2a_patreon/Library/1st_Level/Fog_Cloud/FogCloud_02_Regular_White_800x800.webm")
      .atLocation(doc)
      .scale(1.4)
      .fadeIn(500)
      .fadeOut(500)
      .play();
  }

  await actor.setFlag("qol-pieces", "harmony", {
    ...(actor.getFlag("qol-pieces", "harmony") ?? {}),
    cloudTemplate: doc.uuid
  });
}
