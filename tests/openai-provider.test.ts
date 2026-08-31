import test from "node:test";
import assert from "node:assert/strict";
import { validateLunaModelRequest, resolveLunaModel } from "../lib/providers/openai-provider";

test("OpenAI request validation rejects empty or oversized input", () => {
  assert.throws(() => validateLunaModelRequest({ input: "   " }), /OPENAI_INPUT_REQUIRED/);
  assert.throws(() => validateLunaModelRequest({ input: "x".repeat(20_001) }), /OPENAI_INPUT_TOO_LARGE/);
});

test("OpenAI request validation trims input and accepts a bounded model", () => {
  const request = validateLunaModelRequest({ input: "  hello  ", model: "  gpt-5.6-luna  " });
  assert.equal(request.input, "hello");
  assert.equal(request.model, "gpt-5.6-luna");
});

test("OpenAI model resolution prefers the explicit request, then configured model", () => {
  assert.equal(resolveLunaModel({ model: "  gpt-5.6-luna  " }, "configured-model"), "gpt-5.6-luna");
  assert.equal(resolveLunaModel({}, "configured-model"), "configured-model");
});

test("OpenAI model resolution falls back to the default model", () => {
  assert.equal(resolveLunaModel({}), "gpt-5.6-luna");
});
