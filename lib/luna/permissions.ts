export type LunaAction = "read" | "write" | "delete" | "execute";
export type PermissionLevel = "read" | "write" | "destructive";

export type ToolPermission = {
  tool: string;
  level: PermissionLevel;
  requiresConfirmation: boolean;
};

const DEFAULT_PERMISSIONS: ToolPermission[] = [
  { tool: "search", level: "read", requiresConfirmation: false },
  { tool: "web.fetch", level: "read", requiresConfirmation: false },
  { tool: "memory.read", level: "read", requiresConfirmation: false },
  { tool: "memory.write", level: "write", requiresConfirmation: false },
  { tool: "task.create", level: "write", requiresConfirmation: false },
  { tool: "shop.publish", level: "destructive", requiresConfirmation: true },
  { tool: "external.send", level: "destructive", requiresConfirmation: true },
  { tool: "data.delete", level: "destructive", requiresConfirmation: true },
];

export function getToolPermission(tool: string): ToolPermission {
  return DEFAULT_PERMISSIONS.find((permission) => permission.tool === tool) ?? { tool, level: "destructive", requiresConfirmation: true };
}

export function canPerformAction(action: LunaAction, authenticated: boolean, tool?: string) {
  if (!authenticated) return false;
  if (!tool) return true;
  return !getToolPermission(tool).requiresConfirmation && action !== "delete";
}
