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

test("parses an unquoted description and trims trailing sentence punctuation", () => {
  assert.deepEqual(parseTaskInput("Erstelle eine Aufgabe mit dem Titel „Laden“. Die Beschreibung soll Akku und Licht prüfen."), {
    title: "Laden",
    description: "Akku und Licht prüfen",
  });
});

test("supports title-only wording without the phrase 'mit dem Titel'", () => {
  assert.deepEqual(parseTaskInput('Erstelle eine Aufgabe Titel „Wasser holen“. Die Beschreibung soll „Zwei Flaschen“ lauten.'), {
    title: "Wasser holen",
    description: "Zwei Flaschen",
  });
});

test("trims whitespace around a simple command", () => {
  assert.deepEqual(parseTaskInput("   Erstelle eine Aufgabe:   Fahrrad prüfen   "), {
    title: "Fahrrad prüfen",
    description: "",
  });
});

test("caps title and description lengths", () => {
  const parsed = parseTaskInput(`Erstelle eine Aufgabe mit dem Titel „${"T".repeat(250)}“. Die Beschreibung soll „${"D".repeat(2_100)}“ lauten.`);
  assert.equal(parsed.title.length, 200);
  assert.equal(parsed.description.length, 2_000);
});
