const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "data");
const FILE_PATH = path.join(DATA_DIR, "blockedGroups.json");

function ensureFile() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(FILE_PATH)) fs.writeFileSync(FILE_PATH, JSON.stringify([]));
}

function getBlockedGroups() {
  ensureFile();
  try {
    const raw = fs.readFileSync(FILE_PATH, "utf-8");
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function isGroupBlocked(groupId) {
  return getBlockedGroups().includes(groupId);
}

function blockGroup(groupId) {
  ensureFile();
  const list = getBlockedGroups();
  if (!list.includes(groupId)) {
    list.push(groupId);
    fs.writeFileSync(FILE_PATH, JSON.stringify(list, null, 2));
  }
  return list;
}

function unblockGroup(groupId) {
  ensureFile();
  const list = getBlockedGroups().filter((g) => g !== groupId);
  fs.writeFileSync(FILE_PATH, JSON.stringify(list, null, 2));
  return list;
}

module.exports = { getBlockedGroups, isGroupBlocked, blockGroup, unblockGroup };
