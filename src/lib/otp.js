/**
 * lib/otp.js
 * Ambil OTP dari inbox email secara otomatis via API polling.
 *
 * Flow:
 * 1. Split email → username + domain
 * 2. Poll inbox tiap beberapa detik sampai email OTP masuk
 * 3. Extract kode 6 digit dari subject/snippet
 * 4. Return kode OTP
 *
 * Mode silent: tidak menulis ke stdout (agar tidak mengganggu progress bar).
 */

import { OTP_TIMEOUT, OTP_POLL, OTP_API_URL, OTP_API_KEY } from "../config.js";

const HEADERS = { "x-api-key": OTP_API_KEY };

// ─── HTTP helpers ─────────────────────────────────────────────────────────────

async function apiGet(path) {
  const res = await fetch(`${OTP_API_URL}${path}`, { headers: HEADERS });
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
  const minDate = new Date(startTime - 30_000);

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
              return otp;
            }
          }
        }
      }
    } catch {
      // silent retry
    }
    await new Promise((r) => setTimeout(r, OTP_POLL));
  }

  throw new Error(
    `OTP tidak diterima setelah ${OTP_TIMEOUT / 1000}s.`,
  );
}
