export type LunaEventRecord = {
  type: string;
  userId: string;
  timestamp: string;
  data: Record<string, unknown>;
};

type Handler = (event: LunaEventRecord) => void | Promise<void>;
const handlers = new Map<string, Set<Handler>>();

export function onEvent(type: string, handler: Handler) {
  const set = handlers.get(type) ?? new Set<Handler>();
  set.add(handler);
  handlers.set(type, set);
  return () => set.delete(handler);
}

export async function emitEvent(event: LunaEventRecord) {
  await Promise.all([...(handlers.get(event.type) ?? []), ...(handlers.get("* ") ?? [])].map((handler) => handler(event)));
}
