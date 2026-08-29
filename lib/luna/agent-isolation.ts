import type { LunaAgentId } from "./agents";

export type AgentAccessMode = "read" | "write" | "execute";

export type AgentAccessGrant = {
  agent: LunaAgentId;
  capability: string;
  mode: AgentAccessMode;
  requiresApproval: boolean;
};

/**
 * Capability-based allow-list. Agents never receive arbitrary tool access.
 * A real deployment must enforce this at the server-side tool gateway as well.
 */
const SHOP_GRANTS: readonly AgentAccessGrant[] = [
  { agent: "shop", capability: "deep-search", mode: "read", requiresApproval: false },
  { agent: "shop", capability: "analytics", mode: "read", requiresApproval: false },
  { agent: "shop", capability: "market-data", mode: "read", requiresApproval: false },
  { agent: "shop", capability: "catalog.read", mode: "read", requiresApproval: false },
  { agent: "shop", capability: "catalog.write", mode: "write", requiresApproval: false },
  { agent: "shop", capability: "content.write", mode: "write", requiresApproval: false },
  { agent: "shop", capability: "pricing.write", mode: "write", requiresApproval: false },
  { agent: "shop", capability: "store.read", mode: "read", requiresApproval: false },
  { agent: "shop", capability: "store.publish", mode: "execute", requiresApproval: true },
  { agent: "shop", capability: "orders.read", mode: "read", requiresApproval: false },
];

const DENIED_SHOP_CAPABILITIES = new Set([
  "user.memory.read",
  "user.memory.write",
  "secrets.read",
  "auth.manage",
  "payments.execute",
  "payouts.execute",
  "arbitrary-tool.execute",
  "code.execute",
  "delete.store",
]);

export function getAgentAccess(agent: LunaAgentId, capability: string, mode: AgentAccessMode) {
  if (agent === "shop" && DENIED_SHOP_CAPABILITIES.has(capability)) {
    return { allowed: false, requiresApproval: true, reason: "capability explicitly denied for isolated Shop Agent" };
  }

  const grant = SHOP_GRANTS.find((item) => item.agent === agent && item.capability === capability);
  if (!grant) return { allowed: false, requiresApproval: true, reason: "capability is not allow-listed" };

  const modes: AgentAccessMode[] = ["read", "write", "execute"];
  if (modes.indexOf(mode) > modes.indexOf(grant.mode)) {
    return { allowed: false, requiresApproval: true, reason: "requested access exceeds granted mode" };
  }

  return { allowed: true, requiresApproval: grant.requiresApproval, reason: "capability allow-listed" };
}

export function listShopGrants() {
  return SHOP_GRANTS.map((grant) => ({ ...grant }));
}
