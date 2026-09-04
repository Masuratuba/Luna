import { describe, expect, it } from "node:test";
import { DurableMailSendProvider } from "./mail-send-provider";

describe("DurableMailSendProvider", () => {
  it("fails closed when user identity is missing", async () => {
    const provider = new DurableMailSendProvider();
    await expect(provider.sendMessage({ userId: " ", to: ["a@example.com"], subject: "Hi", text: "Hello" }))
      .rejects.toThrow("MAIL_SEND_USER_REQUIRED");
  });

  it("fails closed when recipient is missing", async () => {
    const provider = new DurableMailSendProvider();
    await expect(provider.sendMessage({ userId: "user-1", to: [], subject: "Hi", text: "Hello" }))
      .rejects.toThrow("MAIL_SEND_RECIPIENT_REQUIRED");
  });

  it("fails closed when subject or body is blank", async () => {
    const provider = new DurableMailSendProvider();
    await expect(provider.sendMessage({ userId: "user-1", to: ["a@example.com"], subject: " ", text: "Hello" }))
      .rejects.toThrow("MAIL_SEND_SUBJECT_REQUIRED");
    await expect(provider.sendMessage({ userId: "user-1", to: ["a@example.com"], subject: "Hi", text: " " }))
      .rejects.toThrow("MAIL_SEND_BODY_REQUIRED");
  });
});
