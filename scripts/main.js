import { applyAction } from "../router.js";

Hooks.once("ready", () => {
  const mod = game.modules.get("qol-pieces");
  mod.api = { applyAction };
});