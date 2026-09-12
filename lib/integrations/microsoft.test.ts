import test from "node:test";
import assert from "node:assert/strict";
import { createMicrosoftOAuthState, microsoftCrypto, microsoftOAuthCookieOptions, verifyMicrosoftOAuthState } from "./microsoft";

test("Microsoft OAuth state is random and verifies only with its signed cookie", () => {
  process.env.LUNA_TOKEN_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
  const first = createMicrosoftOAuthState();
  const second = createMicrosoftOAuthState();
  assert.notEqual(first.value, second.value);
  assert.equal(verifyMicrosoftOAuthState(first.value, first.cookieValue), true);
  assert.equal(verifyMicrosoftOAuthState(second.value, first.cookieValue), false);
});

test("Microsoft OAuth state cookie allows the cross-site callback", () => {
  const options = microsoftOAuthCookieOptions();
  assert.equal(options.httpOnly, true);
  assert.equal(options.secure, true);
  assert.equal(options.sameSite, "none");
  assert.equal(options.path, "/");
  assert.equal(options.maxAge, 600);
});

test("Microsoft token encryption round-trips without exposing plaintext format", () => {
  process.env.LUNA_TOKEN_ENCRYPTION_KEY = Buffer.alloc(32, 9).toString("base64");
  const plaintext = "access-token-example";
  const encrypted = microsoftCrypto.encrypt(plaintext);
  assert.notEqual(encrypted, plaintext);
  assert.equal(microsoftCrypto.decrypt(encrypted), plaintext);
});
