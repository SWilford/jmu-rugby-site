export function parseCsvText(csvText) {
  const source = String(csvText || "");
  const rows = [];
  let currentRow = [];
  let currentValue = "";
  let inQuotes = false;

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    const nextChar = source[index + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentValue += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && char === ",") {
      currentRow.push(currentValue);
      currentValue = "";
      continue;
    }

    if (!inQuotes && (char === "\n" || char === "\r")) {
      if (char === "\r" && nextChar === "\n") {
        index += 1;
      }
      currentRow.push(currentValue);
      rows.push(currentRow);
      currentRow = [];
      currentValue = "";
      continue;
    }

    currentValue += char;
  }

  currentRow.push(currentValue);
  if (currentRow.length > 1 || currentRow[0] !== "" || rows.length === 0) {
    rows.push(currentRow);
  }

  return rows;
}

const HEADER_FIELDS = [
  { key: "firstName", matcher: (value) => value.includes("first name") },
  { key: "lastName", matcher: (value) => value.includes("last name") },
  { key: "position", matcher: (value) => value.includes("position") },
  { key: "year", matcher: (value) => value.includes("current grade") },
  { key: "major", matcher: (value) => value === "major" || value.startsWith("major ") },
  { key: "hometown", matcher: (value) => value.includes("hometown") },
  { key: "height", matcher: (value) => value.includes("height") },
  { key: "weight", matcher: (value) => value.includes("weight") },
  { key: "bio", matcher: (value) => value.includes("write a little bio") || value.includes("bio about yourself") },
];

const PUNCTUATION_REPLACEMENTS = [
  ["â€™", "'"],
  ["â€˜", "'"],
  ["’", "'"],
  ["‘", "'"],
  ["?", "'"],
  ["'", "'"],
  ["`", "'"],
  ["´", "'"],
  ["â€œ", '"'],
  ["â€", '"'],
  ["“", '"'],
  ["”", '"'],
  ["?", '"'],
  ["?", '"'],
  ["â€“", "-"],
  ["â€”", "-"],
  ["–", "-"],
  ["—", "-"],
  ["Â", ""],
  ["\u00a0", " "],
];

function normalizePunctuation(value) {
  let result = String(value || "");
  for (const [searchValue, replacement] of PUNCTUATION_REPLACEMENTS) {
    result = result.split(searchValue).join(replacement);
  }
  return result;
}

function normalizeFieldText(value) {
  return normalizePunctuation(value).replace(/\s+/g, " ").trim();
}

function titleCaseWords(value) {
  return normalizeFieldText(value)
    .toLowerCase()
    .replace(/(^|[\s/-])([a-z])/g, (_, prefix, letter) => `${prefix}${letter.toUpperCase()}`);
}

function normalizeHometown(value) {
  const cleaned = normalizeFieldText(value);
  if (!cleaned.includes(",")) return cleaned;

  const pieces = cleaned
    .split(",")
    .map((piece) => piece.trim())
    .filter(Boolean);

  if (!pieces.length) return "";

  const lastIndex = pieces.length - 1;
  const lastPiece = pieces[lastIndex];
  if (/^[a-z]{2}$/i.test(lastPiece)) {
    pieces[lastIndex] = lastPiece.toUpperCase();
  }

  return pieces.join(", ");
}

function normalizeHeight(value) {
  const cleaned = normalizePunctuation(value).trim();
  if (!cleaned) return "";

  const normalized = cleaned
    .toLowerCase()
    .replace(/feet|foot|ft\.?/g, "'")
    .replace(/inches|inch|in\.?/g, '"')
    .replace(/\s+/g, " ")
    .replace(/\s*'\s*/g, "'")
    .replace(/\s*"\s*/g, '"')
    .replace(/(\d),(\d{1,2})(?!\d)/g, "$1 $2")
    .trim();

  const formattedPatterns = [
    /^(?<feet>[4-7])'(?<inches>\d{1,2})"?$/,
    /^(?<feet>[4-7]) (?<inches>\d{1,2})$/,
    /^(?<feet>[4-7])["'](?<inches>\d{1,2})"?$/,
    /^(?<feet>[4-7])' (?<inches>\d{1,2})"?$/,
  ];

  for (const pattern of formattedPatterns) {
    const match = normalized.match(pattern);
    if (!match?.groups) continue;

    const feet = Number(match.groups.feet);
    const inches = Number(match.groups.inches);
    if (!Number.isInteger(feet) || !Number.isInteger(inches) || inches < 0 || inches > 11) {
      break;
    }

    return `${feet}' ${inches}"`;
  }

  return normalizeFieldText(cleaned);
}

function normalizeWeight(value) {
  const digits = normalizePunctuation(value).replace(/\D+/g, "");
  return digits || "";
}

function normalizeBio(value) {
  const normalized = normalizePunctuation(value).replace(/\r\n?/g, "\n");
  const lines = normalized.split("\n").map((line) => line.trim());
  const compacted = [];

  for (const line of lines) {
    if (!line) {
      if (compacted.length > 0 && compacted[compacted.length - 1] !== "") {
        compacted.push("");
      }
      continue;
    }

    compacted.push(line.replace(/\s+/g, " "));
  }

  while (compacted[0] === "") compacted.shift();
  while (compacted[compacted.length - 1] === "") compacted.pop();

  return compacted.join("\n");
}

function normalizeHeader(header) {
  return normalizePunctuation(header)
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function mapHeaders(headerRow) {
  return headerRow.map((header) => {
    const normalizedHeader = normalizeHeader(header);
    const match = HEADER_FIELDS.find((entry) => entry.matcher(normalizedHeader));
    return match?.key || null;
  });
}

function buildImportedPlayer(rawFields) {
  const firstName = normalizeFieldText(rawFields.firstName);
  const lastName = normalizeFieldText(rawFields.lastName);
  const name = [firstName, lastName].filter(Boolean).join(" ").trim();

  return {
    name,
    position: titleCaseWords(rawFields.position),
    year: titleCaseWords(rawFields.year),
    major: normalizeFieldText(rawFields.major),
    hometown: normalizeHometown(rawFields.hometown),
    height: normalizeHeight(rawFields.height),
    weight: normalizeWeight(rawFields.weight),
    bio: normalizeBio(rawFields.bio),
  };
}

function isImportedPlayerBlank(player) {
  return Object.values(player).every((value) => !String(value || "").trim());
}

export function buildCanonicalPlayerNameKey(name) {
  return normalizePunctuation(name)
    .normalize("NFKC")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function buildRosterImportDiff(currentPlayers, importedRows) {
  const existingPlayers = Array.isArray(currentPlayers) ? currentPlayers : [];
  const nextRows = Array.isArray(importedRows) ? importedRows : [];
  const currentByKey = new Map();

  for (const player of existingPlayers) {
    const canonicalNameKey = buildCanonicalPlayerNameKey(player.name);
    if (!canonicalNameKey || currentByKey.has(canonicalNameKey)) continue;
    currentByKey.set(canonicalNameKey, player);
  }

  let nextId = existingPlayers.reduce((maxId, player) => {
    const numericId = Number(player?.id);
    return Number.isFinite(numericId) ? Math.max(maxId, numericId) : maxId;
  }, 0);

  const matchedRows = [];
  const newRows = [];
  const seenKeys = new Set();

  for (const row of nextRows) {
    const canonicalNameKey = row.canonicalNameKey || buildCanonicalPlayerNameKey(row.name);
    if (!canonicalNameKey) continue;

    seenKeys.add(canonicalNameKey);
    const existingPlayer = currentByKey.get(canonicalNameKey);

    if (existingPlayer) {
      matchedRows.push({
        existingPlayer,
        nextRow: {
          id: existingPlayer.id,
          name: row.name,
          position: row.position,
          year: row.year,
          major: row.major,
          hometown: row.hometown,
          height: row.height,
          weight: row.weight,
          bio: row.bio,
          headshot_url: existingPlayer.headshot_url || null,
          canonicalNameKey,
        },
      });
      continue;
    }

    nextId += 1;
    newRows.push({
      id: nextId,
      name: row.name,
      position: row.position,
      year: row.year,
      major: row.major,
      hometown: row.hometown,
      height: row.height,
      weight: row.weight,
      bio: row.bio,
      headshot_url: null,
      canonicalNameKey,
    });
  }

  const removedPlayers = existingPlayers.filter((player) => {
    const canonicalNameKey = buildCanonicalPlayerNameKey(player.name);
    return canonicalNameKey && !seenKeys.has(canonicalNameKey);
  });

  return {
    matchedRows,
    newRows,
    removedPlayers,
    summary: {
      matched: matchedRows.length,
      added: newRows.length,
      removed: removedPlayers.length,
      totalNext: matchedRows.length + newRows.length,
    },
  };
}

export function buildRosterImportPreview(csvText, currentPlayers = []) {
  const rows = parseCsvText(csvText);
  if (!rows.length || rows.every((row) => row.every((value) => !String(value || "").trim()))) {
    throw new Error("This CSV is empty.");
  }

  const [headerRow, ...dataRows] = rows;
  const headerMap = mapHeaders(headerRow);
  const recognizedColumns = headerMap.filter(Boolean);
  if (!recognizedColumns.length || !recognizedColumns.includes("firstName") || !recognizedColumns.includes("lastName")) {
    throw new Error("This CSV does not include the expected roster columns.");
  }

  const normalizedRows = [];
  const invalidRows = [];

  for (let index = 0; index < dataRows.length; index += 1) {
    const rawRow = dataRows[index];
    const fieldValues = {};

    for (let cellIndex = 0; cellIndex < headerMap.length; cellIndex += 1) {
      const fieldName = headerMap[cellIndex];
      if (!fieldName) continue;
      fieldValues[fieldName] = rawRow[cellIndex] || "";
    }

    const player = buildImportedPlayer(fieldValues);
    if (isImportedPlayerBlank(player)) continue;

    const sourceRowNumber = index + 2;
    const canonicalNameKey = buildCanonicalPlayerNameKey(player.name);
    const nextRow = {
      ...player,
      canonicalNameKey,
      sourceRowNumber,
    };

    normalizedRows.push(nextRow);

    const messages = [];
    if (!nextRow.name) messages.push("Missing player name.");
    if (!nextRow.position) messages.push("Missing player position.");
    if (messages.length) {
      invalidRows.push({
        sourceRowNumber,
        name: nextRow.name,
        messages,
      });
    }
  }

  const duplicateGroups = new Map();
  for (const row of normalizedRows) {
    if (!row.canonicalNameKey) continue;
    const group = duplicateGroups.get(row.canonicalNameKey) || [];
    group.push(row);
    duplicateGroups.set(row.canonicalNameKey, group);
  }

  for (const group of duplicateGroups.values()) {
    if (group.length < 2) continue;
    for (const row of group) {
      invalidRows.push({
        sourceRowNumber: row.sourceRowNumber,
        name: row.name,
        messages: ["Duplicate player name in CSV after formatting."],
      });
    }
  }

  const invalidRowNumbers = new Set(invalidRows.map((row) => row.sourceRowNumber));
  const validRows = normalizedRows.filter((row) => !invalidRowNumbers.has(row.sourceRowNumber));
  const diff = buildRosterImportDiff(currentPlayers, validRows);

  return {
    rows: normalizedRows,
    validRows,
    invalidRows,
    diff,
    summary: {
      parsed: normalizedRows.length,
      valid: validRows.length,
      invalid: invalidRowNumbers.size,
      matched: diff.summary.matched,
      added: diff.summary.added,
      removed: diff.summary.removed,
    },
  };
}
