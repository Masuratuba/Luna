export type ApprovalStatus = "pending" | "approved" | "rejected" | "consumed" | "expired";

export type ApprovalRequest = {
  id: string;
  userId: string;
  action: string;
  reason: string;
  createdAt: string;
  expiresAt: string;
  status: ApprovalStatus;
  token: string;
  approvedAt?: string;
  consumedAt?: string;
};

export type ApprovalValidation = { ok: boolean; reason: string };

export function createApproval(input: Omit<ApprovalRequest, "createdAt" | "status" | "token" | "expiresAt"> & { ttlMs?: number }): ApprovalRequest {
  const now = Date.now();
  const ttlMs = input.ttlMs ?? 5 * 60 * 1000;
  if (!Number.isFinite(ttlMs) || ttlMs <= 0) throw new Error("approval ttl must be positive");
  return {
    id: input.id,
    userId: input.userId,
    action: input.action,
    reason: input.reason,
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + ttlMs).toISOString(),
    status: "pending",
    token: crypto.randomUUID(),
  };
}

export function resolveApproval(request: ApprovalRequest, approved: boolean, nowMs = Date.now()): ApprovalRequest {
  if (request.status !== "pending") return request;
  if (nowMs >= Date.parse(request.expiresAt)) return { ...request, status: "expired" };
  return { ...request, status: approved ? "approved" : "rejected", approvedAt: approved ? new Date(nowMs).toISOString() : undefined };
}

export function validateApproval(request: ApprovalRequest, userId: string, action: string, token: string, nowMs = Date.now()): ApprovalValidation {
  if (request.userId !== userId) return { ok: false, reason: "approval identity mismatch" };
  if (request.action !== action) return { ok: false, reason: "approval action mismatch" };
  if (request.token !== token) return { ok: false, reason: "invalid approval token" };
  if (request.status !== "approved") return { ok: false, reason: `approval not usable: ${request.status}` };
  if (nowMs >= Date.parse(request.expiresAt)) return { ok: false, reason: "approval expired" };
  return { ok: true, reason: "approval valid" };
}

export function consumeApproval(request: ApprovalRequest, userId: string, action: string, token: string, nowMs = Date.now()): ApprovalRequest {
  const validation = validateApproval(request, userId, action, token, nowMs);
  if (!validation.ok) throw new Error(validation.reason);
  return { ...request, status: "consumed", consumedAt: new Date(nowMs).toISOString() };
}
