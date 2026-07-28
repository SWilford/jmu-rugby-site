import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const navbarSource = readFileSync(new URL('../src/components/Navbar.jsx', import.meta.url), 'utf8');

const expectedLinks = [
  ['Home', '/'],
  ['About', '/about'],
  ['Schedule', '/schedule'],
  ['Team', '/team'],
  ['Media', '/media'],
  ['Join', '/join'],
  ['Donate', '/donate'],
  ['Contact', '/contact'],
];

test('navbar includes all top-level navigation links', () => {
  for (const [label, path] of expectedLinks) {
    assert.match(navbarSource, new RegExp(`\\["${label}",\\s*"${path}"\\]`));
  }
});
