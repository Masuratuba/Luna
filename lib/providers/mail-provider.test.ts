import assert from "node:assert/strict";
import test from "node:test";
import { DurableMailProvider } from "./mail-provider";

test("mail read rejects missing user identity before touching storage", async () => {
  const provider = new DurableMailProvider();
  await assert.rejects(provider.listMessages({ userId: "" }), /MAIL_USER_REQUIRED/);
});

test("mail read is unavailable closed when the durable store is not configured", async () => {
  const provider = new DurableMailProvider();
  await assert.rejects(provider.listMessages({ userId: "user-1", limit: 10 }), /MAIL_STORE_UNAVAILABLE/);
});
