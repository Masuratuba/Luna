import { routeMessage } from "./router";
import type { LunaContext } from "./types";

export function runLunaCore(context: LunaContext) {
  const decision = routeMessage(context.message);
  return { decision, context };
}
