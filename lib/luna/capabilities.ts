export type LunaCapability = { name: string; description: string; enabled: boolean; version: string };
const capabilities = new Map<string, LunaCapability>();
export function registerCapability(capability: LunaCapability) { capabilities.set(capability.name, capability); }
export function hasCapability(name: string) { return capabilities.get(name)?.enabled === true; }
export function listCapabilities() { return [...capabilities.values()]; }
