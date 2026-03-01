// scripts/main.js
import { dispatch, dispatchFromUi } from "./router.js";

const MODULE_ID = "qol-pieces";

/**
 * Public API:
 * - game.modules.get("qol-pieces").api.dispatch(actionId, actor, ctx)
 * - game.modules.get("qol-pieces").api.run(actionId, ctx)   // auto-actor resolve
 *
 * Global helpers for macros:
 * - globalThis.qolPieces.dispatch(...)
 * - globalThis.qolPieces.run(...)
 */
Hooks.once("init", () => {
  // nothing required here yet; keep for future settings / keybinds
});

Hooks.once("ready", () => {
  const mod = game.modules.get(MODULE_ID);
  mod.api = {
    dispatch,
    run: dispatchFromUi
  };

  globalThis.qolPieces = {
    dispatch,
    run: dispatchFromUi
  };
});
