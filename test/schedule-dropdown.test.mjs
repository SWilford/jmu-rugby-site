import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const scheduleSource = readFileSync(new URL('../src/pages/Schedule.jsx', import.meta.url), 'utf8');

test('schedule season dropdown toggles menu and closes after selection', () => {
  assert.match(scheduleSource, /setShowMenu\(\(prev\) => !prev\)/);
  assert.match(scheduleSource, /setCurrentSeason\(s\.season_id\)/);
  assert.match(scheduleSource, /setShowMenu\(false\)/);
});

test('schedule season dropdown keeps fall before spring in same year', () => {
  assert.match(scheduleSource, /if \(sa === "fall" && sb === "spring"\) return -1/);
  assert.match(scheduleSource, /if \(sa === "spring" && sb === "fall"\) return 1/);
});
