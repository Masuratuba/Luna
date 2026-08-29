export type ApprovalRequest = { id: string; userId: string; action: string; reason: string; createdAt: string; status: "pending" | "approved" | "rejected" };
export function createApproval(input: Omit<ApprovalRequest, "createdAt" | "status">): ApprovalRequest { return { ...input, createdAt: new Date().toISOString(), status: "pending" }; }
export function resolveApproval(request: ApprovalRequest, approved: boolean): ApprovalRequest { return { ...request, status: approved ? "approved" : "rejected" }; }
