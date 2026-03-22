/**
 * lib/storage.js
 * Simpan dan load akun dari data/accounts.json.
 * LocalDB email di data/email-db.json (tidak pernah dihapus).
 * Thread-safe untuk concurrent writes menggunakan write-lock.
 */

import fs from "fs";
import path from "path";
import { ACCOUNTS_FILE, EMAIL_DB_FILE } from "../config.js";

const FILE_PATH = path.resolve(ACCOUNTS_FILE);
const EMAIL_DB_PATH = path.resolve(EMAIL_DB_FILE);

// Pastikan folder data/ ada
const dataDir = path.dirname(FILE_PATH);
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

// ─── Mutex write-lock (mencegah race condition saat concurrent write) ─────────
let _writeLock = Promise.resolve();

// ─── Accounts ─────────────────────────────────────────────────────────────────

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

export function clearAccounts() {
  _writeLock = _writeLock.then(() => {
    fs.writeFileSync(FILE_PATH, JSON.stringify([], null, 2));
  });
  return _writeLock;
}

// ─── LocalDB Email (persistent, tidak pernah dihapus) ─────────────────────────

export function loadEmailDb() {
  if (!fs.existsSync(EMAIL_DB_PATH)) return [];
  try {
    return JSON.parse(fs.readFileSync(EMAIL_DB_PATH, "utf-8"));
  } catch {
    return [];
  }
}

/** Cek apakah email sudah pernah dipakai */
export function isEmailUsed(email) {
  const db = loadEmailDb();
  return db.includes(email);
}

/** Simpan email ke LocalDB setelah akun berhasil dibuat */
export function saveEmailToDb(email) {
  _writeLock = _writeLock.then(() => {
    const db = loadEmailDb();
    if (!db.includes(email)) {
      db.push(email);
      fs.writeFileSync(EMAIL_DB_PATH, JSON.stringify(db, null, 2));
    }
  });
  return _writeLock;
}
