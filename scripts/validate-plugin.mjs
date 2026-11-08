import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";

const root = path.resolve("static/gis-dictionary");
const file = (p) => fs.readFileSync(path.join(root, p), "utf8");
const plugin = JSON.parse(fs.readFileSync("plugin.json", "utf8"));
const dict = JSON.parse(file("data/concepts.json"));
const registry = JSON.parse(file("data/sources.json"));

assert.match(plugin.title, /GIS Dictionary/);
assert.match(plugin.version, /^\d+\.\d+\.\d+/);
assert.equal(plugin.includes, undefined);
for (const name of ["index.html", "app.js", "styles.css", "favicon.svg", "data/concepts.json", "data/sources.json"]) {
  assert.ok(fs.statSync(path.join(root, name)).size > 0, "Missing asset: " + name);
}
const html = file("index.html");
assert.ok(html.includes('href="./styles.css"'));
assert.ok(html.includes('src="./app.js"'));
assert.ok(html.includes("mb-gis-dictionary"));
assert.ok(!html.includes("github.com/puran1218/gis-dictionary"));
assert.ok(Array.isArray(dict.concepts) && dict.concepts.length >= 150);
const ids = new Set();
const sourceIds = new Set(registry.sources.map((source) => source.id));
for (const concept of dict.concepts) {
  assert.ok(!ids.has(concept.id), "Duplicate ID " + concept.id);
  ids.add(concept.id);
  for (const lang of ["en", "zh-Hans"]) {
    assert.ok(concept.terms[lang].preferred, concept.id + " " + lang);
    assert.ok(concept.content.definition[lang], concept.id + " definition " + lang);
    assert.ok(concept.content.essence[lang], concept.id + " essence " + lang);
  }
  assert.ok(concept.source_ids.length > 0);
  for (const source of concept.source_ids) {
    assert.ok(sourceIds.has(source), concept.id + " source " + source);
  }
}
for (const concept of dict.concepts) {
  for (const ref of concept.related) {
    assert.ok(ids.has(ref.id), concept.id + " -> " + ref.id);
  }
}
console.log(JSON.stringify({ version: plugin.version, concepts: dict.concepts.length, sources: registry.sources.length, status: "validated" }));
