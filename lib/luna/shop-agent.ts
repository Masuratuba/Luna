import { getAgentAccess } from "./agent-isolation";

export type ShopWorkflowStep =
  | "discover-products"
  | "analyze-demand"
  | "analyze-competition"
  | "calculate-price"
  | "generate-description"
  | "update-catalog"
  | "publish-store";

export type ShopWorkflowPlan = {
  agent: "shop";
  isolated: true;
  steps: Array<{ id: ShopWorkflowStep; capability: string; mode: "read" | "write" | "execute"; requiresApproval: boolean }>;
};

const STEP_ACCESS: Record<ShopWorkflowStep, { capability: string; mode: "read" | "write" | "execute" }> = {
  "discover-products": { capability: "deep-search", mode: "read" },
  "analyze-demand": { capability: "analytics", mode: "read" },
  "analyze-competition": { capability: "market-data", mode: "read" },
  "calculate-price": { capability: "pricing.write", mode: "write" },
  "generate-description": { capability: "content.write", mode: "write" },
  "update-catalog": { capability: "catalog.write", mode: "write" },
  "publish-store": { capability: "store.publish", mode: "execute" },
};

export function buildShopWorkflow(): ShopWorkflowPlan {
  const order: ShopWorkflowStep[] = [
    "discover-products",
    "analyze-demand",
    "analyze-competition",
    "calculate-price",
    "generate-description",
    "update-catalog",
    "publish-store",
  ];

  return {
    agent: "shop",
    isolated: true,
    steps: order.map((id) => {
      const access = STEP_ACCESS[id];
      const decision = getAgentAccess("shop", access.capability, access.mode);
      if (!decision.allowed) throw new Error(`Shop workflow blocked: ${id}: ${decision.reason}`);
      return { id, ...access, requiresApproval: decision.requiresApproval };
    }),
  };
}

export function canShopAgentAccess(capability: string, mode: "read" | "write" | "execute") {
  return getAgentAccess("shop", capability, mode);
}
