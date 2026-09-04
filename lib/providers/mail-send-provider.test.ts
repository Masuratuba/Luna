import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DurableMailSendProvider } from "./mail-send-provider";

describe("DurableMailSendProvider", () => {
  it("fails closed when user identity is missing", async () => {
    const provider = new DurableMailSendProvider();
    await assert.rejects(
      provider.sendMessage({ userId: " ", to: ["a@example.com"], subject: "Hi", text: "Hello" }),
      /MAIL_SEND_USER_REQUIRED/,
    );
  });

  it("fails closed when recipient is missing", async () => {
    const provider = new DurableMailSendProvider();
    await assert.rejects(
      provider.sendMessage({ userId: "user-1", to: [], subject: "Hi", text: "Hello" }),
      /MAIL_SEND_RECIPIENT_REQUIRED/,
    );
  });

  it("fails closed when subject or body is blank", async () => {
    const provider = new DurableMailSendProvider();
    await assert.rejects(
      provider.sendMessage({ userId: "user-1", to: ["a@example.com"], subject: " ", text: "Hello" }),
      /MAIL_SEND_SUBJECT_REQUIRED/,
    );
    await assert.rejects(
      provider.sendMessage({ userId: "user-1", to: ["a@example.com"], subject: "Hi", text: " " }),
      /MAIL_SEND_BODY_REQUIRED/,
    );
  });
});
