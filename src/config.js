/**
 * config.js
 * Semua konstanta dan konfigurasi terpusat di sini.
 * Untuk mengubah perilaku aplikasi, cukup edit file ini.
 */

import "dotenv/config";

// ─── Akun ────────────────────────────────────────────────────────────────────
/** Password yang digunakan untuk semua akun */
export const PASSWORD = "@Gopretstudio88";

/** Domain email (dari .env, default: plexai.xyz) */
export const DOMAINS = (process.env.DOMAINS || "plexai.xyz")
  .split(",")
  .map((d) => d.trim())
  .filter(Boolean);

// ─── Proses ──────────────────────────────────────────────────────────────────
/** Jumlah akun yang diproses secara bersamaan */
export const BATCH_SIZE = 5;

/** Maksimal percobaan ulang jika satu slot gagal */
export const MAX_RETRY = 3;

// ─── OTP ─────────────────────────────────────────────────────────────────────
/** Maksimal waktu tunggu OTP (ms) */
export const OTP_TIMEOUT = 90_000;

/** Interval polling inbox (ms) */
export const OTP_POLL = 4_000;

// ─── File Path ────────────────────────────────────────────────────────────────
export const ACCOUNTS_FILE = "./data/accounts.json";
export const RESULT_FILE = "./data/result.txt";
