/**
 * lib/otp.js
 * Ambil OTP dari inbox email secara otomatis via API polling.
 *
 * Flow:
 * 1. Split email → username + domain
 * 2. Poll inbox tiap beberapa detik sampai email OTP masuk
 * 3. Extract kode 6 digit dari subject/snippet
 * 4. Return kode OTP
 */

import { OTP_TIMEOUT, OTP_POLL } from "../config.js";

const BASE_URL = "https://mail.gopretstudio.com";
const API_KEY = "GOMAIL-FqcmbaAGbPnwHIxKElNq";
const HEADERS = { "x-api-key": API_KEY };

// ─── HTTP helpers ─────────────────────────────────────────────────────────────

async function apiGet(path) {
  const res = await fetch(`${BASE_URL}${path}`, { headers: HEADERS });
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`);
  return res.json();
}

async function getInbox(username, domain, limit = 5) {
  const q = limit ? `?limit=${limit}` : "";
  return apiGet(`/api/i/${username}/${domain}${q}`);
}

// ─── OTP Extractor ────────────────────────────────────────────────────────────

function extractOtp(message) {
  const sources = [
    message.subject || "",
    message.snippet || "",
    message.body || "",
  ];
  const patterns = [
    /\bcode\s+is\s+(\d{6})\b/i,
    /\bcode:\s*(\d{6})\b/i,
    /\b(\d{6})\b/,
  ];
  for (const text of sources) {
    for (const pat of patterns) {
      const m = text.match(pat);
      if (m) return m[1];
    }
  }
  return null;
}

// ─── Main: Polling OTP ───────────────────────────────────────────────────────

/**
 * Tunggu dan ambil OTP otomatis dari inbox email.
 * @param {string} email - e.g. "user@plexai.xyz"
 * @returns {Promise<string>} kode OTP 6 digit
 */
export async function waitForOtp(email) {
  const [username, domain] = email.split("@");
  if (!username || !domain)
    throw new Error(`Format email tidak valid: ${email}`);

  const startTime = Date.now();
  const minDate = new Date(startTime - 30_000); // abaikan email > 30 detik lalu

  process.stdout.write(`\n  📬 Menunggu OTP untuk ${email}...\n`);

  while (Date.now() - startTime < OTP_TIMEOUT) {
    try {
      const inbox = await getInbox(username, domain, 5);
      if (inbox.success && inbox.messages?.length > 0) {
        for (const msg of inbox.messages) {
          const isFromOpenAI = (msg.from || "").includes("openai.com");
          const isOtpSubject = /chatgpt|verification|code/i.test(
            msg.subject || msg.snippet || "",
          );
          const isFresh = new Date(msg.date || 0) >= minDate;
          if ((isFromOpenAI || isOtpSubject) && isFresh) {
            const otp = extractOtp(msg);
            if (otp) {
              process.stdout.write(`  ✅ OTP diterima: ${otp}\n`);
              return otp;
            }
          }
        }
      }
    } catch {
      // silent retry
    }
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    process.stdout.write(`\r  ⏳ Menunggu OTP... ${elapsed}s   `);
    await new Promise((r) => setTimeout(r, OTP_POLL));
  }

  throw new Error(
    `OTP tidak diterima setelah ${OTP_TIMEOUT / 1000}s. Cek inbox ${email} manual.`,
  );
}
