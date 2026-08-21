import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const context = vm.createContext({});
const eventSource = fs.readFileSync(path.join(root, "data/events.js"), "utf8");
const injurySource = fs.readFileSync(path.join(root, "data/injuries.js"), "utf8");
vm.runInContext(`${eventSource}\n${injurySource}\nglobalThis.__BL_TEST_DATA={events,PRO_GENERAL_EVENTS,INJURY_PRESSURE_EVENTS,OFF_COURT_EVENT_DEFS};`, context);

test("ordinary and professional events keep three choices", () => {
  const rows = [...context.__BL_TEST_DATA.events, ...context.__BL_TEST_DATA.PRO_GENERAL_EVENTS, ...context.__BL_TEST_DATA.INJURY_PRESSURE_EVENTS];
  assert.ok(rows.length >= 30);
  for (const event of rows) {
    assert.equal(event.opts?.length, 3, event.t);
    assert.equal(new Set(event.opts.map((option) => option[0])).size, 3, event.t);
  }
});

test("off-court events keep three distinct actions", () => {
  for (const [id, event] of Object.entries(context.__BL_TEST_DATA.OFF_COURT_EVENT_DEFS)) {
    assert.equal(event.actions?.length, 3, id);
    assert.equal(new Set(event.actions.map((action) => action[0])).size, 3, id);
  }
});
