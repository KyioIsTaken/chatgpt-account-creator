/**
 * lib/storage.js
 * Simpan dan load akun dari data/accounts.json.
 * Thread-safe untuk concurrent writes menggunakan write-lock.
 */

import fs from "fs";
import path from "path";
import { ACCOUNTS_FILE } from "../config.js";

const FILE_PATH = path.resolve(ACCOUNTS_FILE);

// Pastikan folder data/ ada
const dataDir = path.dirname(FILE_PATH);
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

// ─── Mutex write-lock (mencegah race condition saat concurrent write) ─────────
let _writeLock = Promise.resolve();

export function loadAccounts() {
  if (!fs.existsSync(FILE_PATH)) return [];
  try {
    return JSON.parse(fs.readFileSync(FILE_PATH, "utf-8"));
  } catch {
    return [];
  }
}

export function saveAccount(account) {
  _writeLock = _writeLock.then(() => {
    const accounts = loadAccounts();
    accounts.push({ ...account, createdAt: new Date().toISOString() });
    fs.writeFileSync(FILE_PATH, JSON.stringify(accounts, null, 2));
  });
  return _writeLock;
}

export function getStats() {
  const accounts = loadAccounts();
  return {
    total: accounts.length,
    success: accounts.filter((a) => a.status === "verified").length,
    pending: accounts.filter((a) => a.status === "pending_verification").length,
    failed: accounts.filter((a) => a.status === "failed").length,
  };
}
