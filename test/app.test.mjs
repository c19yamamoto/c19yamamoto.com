import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { test } from "node:test";

const projectRoot = resolve(import.meta.dirname, "..");
const outputPath = resolve(projectRoot, "out", "index.html");

let html;

test.before(() => {
  assert.ok(
    existsSync(outputPath),
    "Static export is missing. Run `npm run build` before the application tests.",
  );
  html = readFileSync(outputPath, "utf8");
});

test("renders the profile page metadata and identity", () => {
  assert.match(html, /<html lang="en">/);
  assert.match(html, /<title[^>]*>c19yamamoto\.com<\/title>/);
  assert.match(
    html,
    /<meta name="description" content="c19yamamoto(?:&#x27;|')s personal website"/,
  );
  assert.match(html, /<link rel="icon" href="\/profile\.jpeg"/);
  assert.match(html, /<h1[^>]*>c19yamamoto<\/h1>/);
  assert.match(html, /<img[^>]+src="\/profile\.jpeg"[^>]+alt="Profile"/);
});

test("keeps every public social link and its accessible label", () => {
  const expectedLinks = [
    ["https://x.com/yamaharTech", "X (Twitter)"],
    ["https://github.com/c19yamamoto", "GitHub"],
    ["https://zenn.dev/shebang", "Zenn"],
    ["mailto:c19yamamoto@gmail.com", "Gmail"],
    ["https://connpass.com/user/c19yamamoto/", "connpass"],
    ["https://atcoder.jp/users/c19yamahar", "AtCoder"],
    ["https://hackerone.com/yamahar1216", "HackerOne"],
  ];

  const anchors = [...html.matchAll(/<a\b[^>]*>/g)].map(([anchor]) => anchor);
  assert.equal(anchors.length, expectedLinks.length);

  for (const [href, label] of expectedLinks) {
    const escapedHref = href.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const link = anchors.find((anchor) =>
      new RegExp(`href="${escapedHref}"`).test(anchor),
    );

    assert.ok(link, `Expected link ${href} to be rendered`);
    assert.match(link, new RegExp(`aria-label="${escapedLabel}"`));
    assert.match(link, /target="_blank"/);
    assert.match(link, /rel="noopener noreferrer"/);
  }
});

test("exports the profile image used by the page", () => {
  assert.ok(existsSync(resolve(projectRoot, "out", "profile.jpeg")));
});
