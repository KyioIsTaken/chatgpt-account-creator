/**
 * lib/browser.js
 * Semua yang berkaitan dengan setup browser Puppeteer.
 * Terpisah dari logika registrasi agar mudah diuji dan dimodifikasi.
 */

import puppeteerExtra from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { existsSync } from "fs";
import path from "path";
import os from "os";
import { HEADLESS } from "../config.js";

// ─── Chrome Finder ────────────────────────────────────────────────────────────

export function findChrome() {
  const candidates = [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    path.join(
      os.homedir(),
      "AppData\\Local\\Google\\Chrome\\Application\\chrome.exe",
    ),
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium-browser",
    "/usr/bin/chromium",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  ];
  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  throw new Error("Chrome/Edge tidak ditemukan. Install Google Chrome!");
}

// ─── Browser Launch ───────────────────────────────────────────────────────────

/**
 * Launch browser dengan stealth plugin.
 * headless dikontrol dari config.json
 * @returns {Promise<{browser, page}>}
 */
export async function launchBrowser() {
  puppeteerExtra.use(StealthPlugin());

  const browser = await puppeteerExtra.launch({
    executablePath: findChrome(),
    headless: HEADLESS,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-blink-features=AutomationControlled",
    ],
    defaultViewport: { width: 1280, height: 800 },
  });

  const page = await browser.newPage();
  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36",
  );

  return { browser, page };
}

// ─── Page Helpers ─────────────────────────────────────────────────────────────

/** Tunggu sampai salah satu selector ditemukan di halaman. */
export async function waitForAnySelector(page, selectors, timeout = 15000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    for (const sel of selectors) {
      try {
        const el = await page.$(sel);
        if (el) return { selector: sel, element: el };
      } catch {}
    }
    await sleep(400);
  }
  return null;
}

/** Klik button berdasarkan teks yang cocok dengan patterns. */
export async function clickButton(page, patterns) {
  return page.evaluate((patterns) => {
    const btns = [...document.querySelectorAll('button, [role="button"]')];
    const btn = btns.find((b) =>
      patterns.some((p) => new RegExp(p, "i").test(b.textContent)),
    );
    if (btn) {
      btn.click();
      return btn.textContent.trim();
    }
    return null;
  }, patterns);
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
