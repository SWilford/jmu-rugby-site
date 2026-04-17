import test from "node:test";
import assert from "node:assert/strict";

import {
  buildCanonicalPlayerNameKey,
  buildRosterImportDiff,
  buildRosterImportPreview,
  parseCsvText,
} from "../src/lib/rosterCsv.js";

test("parseCsvText handles quoted commas and multiline cells", () => {
  const rows = parseCsvText(`FIRST NAME,LAST NAME,write a little bio about yourself (optional)
"Connor","O'Hehir","Line one, with comma
Line two"`);

  assert.equal(rows.length, 2);
  assert.equal(rows[1][0], "Connor");
  assert.equal(rows[1][1], "O'Hehir");
  assert.equal(rows[1][2], "Line one, with comma\nLine two");
});

test("buildRosterImportPreview formats roster rows and ignores blanks", () => {
  const csv = [
    "Timestamp,LAST NAME,FIRST NAME,POSITION  (What position you want to be listed as),Current grade,Major,\"Hometown (Town, State)\",\"Height (optional) ex 6' 1\"\"\",Weight (optional) in lbs,write a little bio about yourself (optional)",
    '3/31/2026 13:41:51,Meza,Joaquin,Fullback,Junior,Accounting,Ashburn,6’0,190,',
    ',,,,,,,,,',
    '3/31/2026 13:42:38,Wilford,Spencer,Lock,Sophomore,Computer Science,\"Annandale, VA\",\"6\' 1\"\"\",195,',
  ].join("\n");

  const preview = buildRosterImportPreview(csv, []);

  assert.equal(preview.summary.parsed, 2);
  assert.equal(preview.summary.valid, 2);
  assert.equal(preview.summary.invalid, 0);
  assert.equal(preview.validRows[0].name, "Joaquin Meza");
  assert.equal(preview.validRows[0].height, "6' 0\"");
  assert.equal(preview.validRows[0].weight, "190");
  assert.equal(preview.validRows[1].name, "Spencer Wilford");
  assert.equal(preview.validRows[1].height, "6' 1\"");
});

test("buildRosterImportPreview normalizes messy height, weight, and bio fields", () => {
  const csv = [
    "Timestamp,LAST NAME,FIRST NAME,POSITION  (What position you want to be listed as),Current grade,Major,\"Hometown (Town, State)\",\"Height (optional) ex 6' 1\"\"\",Weight (optional) in lbs,write a little bio about yourself (optional)",
    '3/31/2026 13:42:56,Tiago,JJ,Flanker,Freshman,Integrated Sciences and Technologies ,\"Springfield, VA\",5’ 11”,195,',
    '3/31/2026 19:29:50,Pare,Yanis,winger,Freshman,Engineering ,\"Aldie,Virginia\",\"5,10\",180,',
    '4/5/2026 23:06:56,Goff ,Nathan ,Fly half,Junior,Biology/Ore-Medicine ,\"Waynesboro, Virginia \",6’1”,205,\"2026-2027 President.\n\n Native Virginian.\"',
  ].join("\n");

  const preview = buildRosterImportPreview(csv, []);

  assert.equal(preview.validRows[0].name, "JJ Tiago");
  assert.equal(preview.validRows[0].position, "Flanker");
  assert.equal(preview.validRows[0].hometown, "Springfield, VA");
  assert.equal(preview.validRows[0].height, "5' 11\"");
  assert.equal(preview.validRows[1].position, "Winger");
  assert.equal(preview.validRows[1].height, "5' 10\"");
  assert.equal(preview.validRows[2].position, "Fly Half");
  assert.equal(preview.validRows[2].weight, "205");
  assert.equal(preview.validRows[2].bio, "2026-2027 President.\n\nNative Virginian.");
});

test("buildRosterImportPreview blocks invalid required fields and duplicate normalized names", () => {
  const csv = [
    "Timestamp,LAST NAME,FIRST NAME,POSITION  (What position you want to be listed as),Current grade,Major,\"Hometown (Town, State)\",\"Height (optional) ex 6' 1\"\"\",Weight (optional) in lbs,write a little bio about yourself (optional)",
    '3/31/2026 13:41:51,Meza,Joaquin,,Junior,Accounting,Ashburn,6’0,190,',
    '3/31/2026 13:42:38,O’Hehir,Connor,Lock,Junior,History,\"Farmingville, NY\",6’4”,210,',
    '3/31/2026 13:42:46,O\'Hehir, Connor ,Lock,Junior,History,\"Farmingville, NY\",6\'4,210,',
  ].join("\n");

  const preview = buildRosterImportPreview(csv, []);

  assert.equal(preview.summary.invalid, 3);
  assert.equal(preview.validRows.length, 0);
  assert.match(preview.invalidRows[0].messages.join(" "), /Missing player position/);
  assert.ok(
    preview.invalidRows.some((row) => row.messages.join(" ").includes("Duplicate player name in CSV after formatting."))
  );
});

test("buildCanonicalPlayerNameKey normalizes whitespace and punctuation variants", () => {
  assert.equal(buildCanonicalPlayerNameKey(" Connor  O’Hehir "), "connor o'hehir");
  assert.equal(buildCanonicalPlayerNameKey("Connor O'Hehir"), "connor o'hehir");
});

test("buildRosterImportDiff preserves matched headshots and removes missing players", () => {
  const currentPlayers = [
    {
      id: 4,
      name: "Connor O'Hehir",
      position: "Lock",
      year: "Junior",
      major: "History",
      hometown: "Farmingville, NY",
      height: "6' 4\"",
      weight: "210",
      bio: "Old bio",
      headshot_url: "headshots/players/4-connor.jpg",
    },
    {
      id: 5,
      name: "Old Player",
      position: "Prop",
      year: "Senior",
      major: "Business",
      hometown: "Somewhere, VA",
      height: "6' 0\"",
      weight: "230",
      bio: "",
      headshot_url: "headshots/players/5-old.jpg",
    },
  ];

  const importedRows = [
    {
      name: "Connor O’Hehir",
      position: "Lock",
      year: "Senior",
      major: "History/Education",
      hometown: "Farmingville, NY",
      height: "6' 4\"",
      weight: "215",
      bio: "Updated bio",
      canonicalNameKey: buildCanonicalPlayerNameKey("Connor O’Hehir"),
    },
    {
      name: "New Player",
      position: "Winger",
      year: "Freshman",
      major: "Marketing",
      hometown: "Ashburn, VA",
      height: "5' 10\"",
      weight: "180",
      bio: "",
      canonicalNameKey: buildCanonicalPlayerNameKey("New Player"),
    },
  ];

  const diff = buildRosterImportDiff(currentPlayers, importedRows);

  assert.equal(diff.summary.matched, 1);
  assert.equal(diff.summary.added, 1);
  assert.equal(diff.summary.removed, 1);
  assert.equal(diff.matchedRows[0].nextRow.id, 4);
  assert.equal(diff.matchedRows[0].nextRow.headshot_url, "headshots/players/4-connor.jpg");
  assert.equal(diff.newRows[0].id, 6);
  assert.equal(diff.newRows[0].headshot_url, null);
  assert.equal(diff.removedPlayers[0].name, "Old Player");
});
