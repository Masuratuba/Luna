import assert from "node:assert/strict";
import test from "node:test";
import { parseTaskInput } from "./task-parser";

test("parses a quoted German task title and description", () => {
  assert.deepEqual(parseTaskInput('Erstelle eine Aufgabe mit dem Titel „LUNA-CHAT-TEST-101“. Die Beschreibung soll „Prüfung der Aufgabenverarbeitung über den Luna-Chat“ lauten.'), {
    title: "LUNA-CHAT-TEST-101",
    description: "Prüfung der Aufgabenverarbeitung über den Luna-Chat",
  });
});

test("keeps simple task commands working", () => {
  assert.deepEqual(parseTaskInput("Erstelle eine Aufgabe: Oliven ernten"), { title: "Oliven ernten", description: "" });
  assert.deepEqual(parseTaskInput("Mach mir eine Aufgabe - Fahrrad laden"), { title: "Fahrrad laden", description: "" });
});

test("supports straight quotes and leaves description empty when omitted", () => {
  assert.deepEqual(parseTaskInput('Erstelle eine Aufgabe mit dem Titel "Anrufen". Die Beschreibung soll "Restaurant kontaktieren" lauten.'), {
    title: "Anrufen", description: "Restaurant kontaktieren",
  });
});
