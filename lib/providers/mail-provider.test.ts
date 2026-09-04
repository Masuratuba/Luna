import assert from "node:assert/strict";
import test from "node:test";
import { DurableMailProvider } from "./mail-provider";

test("mail read rejects missing user identity before touching storage", async () => {
  const provider = new DurableMailProvider();
  await assert.rejects(provider.listMessages({ userId: "" }), /MAIL_USER_REQUIRED/);
});
