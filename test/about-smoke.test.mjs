import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const aboutSource = readFileSync(new URL('../src/pages/About.jsx', import.meta.url), 'utf8');

test('about page smoke content includes key sections', () => {
  assert.match(aboutSource, /About JMU Men/);
  assert.match(aboutSource, /Core Values/);
  assert.match(aboutSource, /Be Part of the Program/);
});
