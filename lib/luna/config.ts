export type LunaConfig = { timezone: string; locale: string; notificationsEnabled: boolean; confirmationRequired: boolean };
export const DEFAULT_LUNA_CONFIG: LunaConfig = { timezone: "UTC", locale: "de-DE", notificationsEnabled: true, confirmationRequired: true };
export function mergeConfig(base: LunaConfig, override: Partial<LunaConfig>): LunaConfig { return { ...base, ...override }; }
