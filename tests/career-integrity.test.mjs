import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");

test("career responsibilities are present in their dedicated modules", () => {
  assert.match(read("js/career/career-engine.js"), /function tournamentPool\(/);
  assert.match(read("js/career/contract-engine.js"), /function canReceiveStandardContract\(/);
  assert.match(read("js/career/injury-engine.js"), /function createInjury\(/);
  assert.match(read("js/career/season-engine.js"), /function finishSeason\(/);
  assert.match(read("js/career/retirement-engine.js"), /function maybeForceRetire\(/);
  assert.match(read("js/ui/retirement-view.js"), /function retireCareer\(/);
  assert.match(read("js/events/event-engine.js"), /function showEvent\(/);
  assert.match(read("js/storage.js"), /function continueCareer\(/);
});

test("retirement image is external and available", () => {
  const view = read("js/ui/retirement-view.js");
  assert.match(view, /\.\/assets\/images\/retirement-arena\.jpg/);
  assert.ok(fs.statSync(path.join(root, "assets/images/retirement-arena.jpg")).size > 100000);
});
