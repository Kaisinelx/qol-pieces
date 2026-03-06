const templateData = {
  t: "circle",
  user: game.user.id,
  distance: 10,
  x: token.center.x,
  y: token.center.y
};

const doc = await MeasuredTemplateDocument.create(templateData, { parent: canvas.scene });

new Sequence()
  .effect()
  .file("jb2a.fog_cloud.02.white")
  .atLocation(doc)
  .scale(1.4)
  .fadeIn(500)
  .fadeOut(500)
  .play();

await actor.setFlag("qol-pieces", "harmony", {
  ...(actor.getFlag("qol-pieces", "harmony")),
  cloudTemplate: doc.uuid
});