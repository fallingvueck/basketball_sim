import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");

test("index is a small external-module shell", () => {
  assert.ok(Buffer.byteLength(html) < 50000);
  assert.doesNotMatch(html, /data:image\//);
  assert.doesNotMatch(html, /<style(?:\s|>)/i);
  assert.doesNotMatch(html, /<script>(?:.|\n)*?<\/script>/i);
});

test("every local stylesheet and script reference exists", () => {
  const references = [...html.matchAll(/(?:href|src)="(\.\/[^"?#]+)(?:[?#][^"]*)?"/g)].map((match) => match[1]);
  for (const reference of references) {
    assert.ok(fs.existsSync(path.join(root, reference)), `missing ${reference}`);
  }
});
