import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DurableAuditProvider } from "./audit-provider";

describe("DurableAuditProvider", () => {
  it("fails closed when user identity is missing", async () => {
    const provider = new DurableAuditProvider();
    await assert.rejects(
      provider.record({ userId: " ", action: "mail.send", outcome: "queued" }),
      /AUDIT_USER_REQUIRED/,
    );
  });

  it("fails closed when action is missing", async () => {
    const provider = new DurableAuditProvider();
    await assert.rejects(
      provider.record({ userId: "user-1", action: " ", outcome: "failed" }),
      /AUDIT_ACTION_REQUIRED/,
    );
  });
});
