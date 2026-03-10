/**
 * lib/register.js
 * Flow registrasi akun ChatGPT (6 step).
 * Menggunakan browser.js untuk setup browser.
 *
 * Step 1: chatgpt.com → CSRF token → signin/openai → auth0 URL
 * Step 2: Isi password
 * Step 3: Tunggu + isi OTP
 * Step 4: Isi nama & tanggal lahir
 * Step 5: Ambil session credentials
 * Step 6: Return hasil & tutup browser
 */

import chalk from "chalk";
import Table from "cli-table3";
import {
  launchBrowser,
  waitForAnySelector,
  clickButton,
  sleep,
} from "./browser.js";

const CHATGPT_BASE = "https://chatgpt.com";
const TOTAL_STEPS = 6;

function log(step, msg, status = "ok") {
  const icon =
    status === "ok"
      ? chalk.green("✓")
      : status === "wait"
        ? chalk.yellow("…")
        : chalk.red("✗");
  process.stdout.write(
    `\r  [${step}/${TOTAL_STEPS}] ${icon} ${msg}               \n`,
  );
}

/**
 * Registrasi akun ChatGPT.
 * @param {{ email, password, fullName, firstName, lastName }} account
 * @param {{ askOtpFn: Function }} opts
 * @returns {Promise<Object>} data akun hasil registrasi
 */
export async function registerAccount(account, opts = {}) {
  const { email, password, fullName } = account;
  const { askOtpFn } = opts;

  const { browser, page } = await launchBrowser();

  // Tampilkan info akun dalam tabel
  const table = new Table({
    head: [
      chalk.cyan.bold("EMAIL"),
      chalk.cyan.bold("PASSWORD"),
      chalk.cyan.bold("NAMA"),
    ],
    style: { head: [], border: ["cyan"] },
    colWidths: [30, 22, 22],
  });
  table.push([email, password, fullName]);
  console.log(table.toString());
  console.log("");

  try {
    // ── Step 1: Setup OAuth & buka halaman password ───────────────────────
    process.stdout.write(
      `  [1/${TOTAL_STEPS}] … Setup OAuth & buka halaman password`,
    );

    await page.goto(CHATGPT_BASE, {
      waitUntil: "domcontentloaded",
      timeout: 20000,
    });

    const csrfToken = await page.evaluate(async () => {
      const res = await fetch("/api/auth/csrf", { credentials: "include" });
      const { csrfToken } = await res.json();
      return csrfToken;
    });
    if (!csrfToken) throw new Error("CSRF token tidak diperoleh");

    const signinResult = await page.evaluate(
      async (csrf, email) => {
        const params = new URLSearchParams({
          prompt: "login",
          screen_hint: "signup",
          login_hint: email,
        });
        const body = new URLSearchParams({
          callbackUrl: "https://chatgpt.com/",
          csrfToken: csrf,
          json: "true",
        });
        const res = await fetch(`/api/auth/signin/openai?${params}`, {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Accept: "application/json",
          },
          body: body.toString(),
        });
        const { url } = await res.json();
        return { ok: res.ok, url };
      },
      csrfToken,
      email,
    );

    if (!signinResult.url)
      throw new Error("URL auth0 tidak diperoleh dari signin/openai");

    await page.goto(signinResult.url, {
      waitUntil: "networkidle0",
      timeout: 30000,
    });
    log(1, 'Halaman "Create a password" terbuka', "ok");

    // ── Step 2: Isi password ──────────────────────────────────────────────
    process.stdout.write(`  [2/${TOTAL_STEPS}] … Isi password`);

    const pwFound = await waitForAnySelector(
      page,
      [
        'input[name="new-password"]',
        'input[type="password"]',
        'input[name="password"]',
      ],
      10000,
    );

    if (!pwFound) {
      await page.screenshot({ path: "debug-no-password.png", fullPage: true });
      throw new Error(`Password field tidak ditemukan. URL: ${page.url()}`);
    }

    await page.click(pwFound.selector, { clickCount: 3 });
    await page.keyboard.press("Backspace");
    await page.type(pwFound.selector, password, { delay: 50 });
    await sleep(300);

    const clicked = await clickButton(page, ["continue", "lanjut", "next"]);
    if (!clicked) await page.keyboard.press("Enter");
    log(2, "Password diisi → OTP akan dikirim ke email", "ok");

    // ── Step 3: Tunggu & isi OTP ──────────────────────────────────────────
    process.stdout.write(`  [3/${TOTAL_STEPS}] … Tunggu halaman OTP`);

    const otpFound = await waitForAnySelector(
      page,
      [
        'input[name="code"]',
        'input[autocomplete="one-time-code"]',
        'input[inputmode="numeric"]',
        'input[type="text"]:not([placeholder*="mail" i])',
      ],
      30000,
    );

    if (!otpFound) {
      await page.screenshot({ path: "debug-no-otp.png", fullPage: true });
      throw new Error(`OTP field tidak ditemukan. URL: ${page.url()}`);
    }

    log(3, "Halaman OTP muncul!");

    const otpCode = await askOtpFn(email);

    await page.click(otpFound.selector, { clickCount: 3 });
    await page.type(otpFound.selector, otpCode.trim(), { delay: 80 });
    await sleep(300);

    const otpClicked = await clickButton(page, [
      "continue",
      "verify",
      "submit",
      "confirm",
      "next",
    ]);
    if (!otpClicked) await page.keyboard.press("Enter");

    await Promise.race([
      page.waitForFunction(
        () => window.location.pathname.includes("about-you"),
        { timeout: 20000 },
      ),
      page.waitForSelector('input[name="name"]', { timeout: 20000 }),
    ]).catch(() => {});

    log(3, "OTP valid!", "ok");

    // ── Step 4: Isi nama & tanggal lahir ─────────────────────────────────
    process.stdout.write(`  [4/${TOTAL_STEPS}] … Isi nama & tanggal lahir`);
    await sleep(1500);

    const nameEl = await page.$('input[name="name"]').catch(() => null);
    if (nameEl) {
      await nameEl.click({ clickCount: 3 });
      await page.keyboard.press("Backspace");
      await page.type('input[name="name"]', fullName, { delay: 50 });
    }

    const year = 2000 + Math.floor(Math.random() * 6);
    const month = Math.floor(Math.random() * 12) + 1;
    const day = Math.floor(Math.random() * 28) + 1;
    const birthdate = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const birthdateDisplay = `${String(month).padStart(2, "0")}/${String(day).padStart(2, "0")}/${year}`;

    const spinbtns = await page.$$('[role="spinbutton"]');
    if (spinbtns.length >= 3) {
      await spinbtns[0].click();
      await page.keyboard.type(String(month).padStart(2, "0"));
      await sleep(200);
      await spinbtns[1].click();
      await page.keyboard.type(String(day).padStart(2, "0"));
      await sleep(200);
      await spinbtns[2].click();
      await page.keyboard.type(String(year));
      await sleep(200);
    } else {
      const bday = await page.$(
        '[aria-label*="Birthday" i], [placeholder*="Birthday" i]',
      );
      if (bday) {
        await bday.click();
        await page.keyboard.type(String(month).padStart(2, "0"));
        await sleep(100);
        await page.keyboard.type(String(day).padStart(2, "0"));
        await sleep(100);
        await page.keyboard.type(String(year));
      }
    }

    await sleep(600);

    const finishClicked = await clickButton(page, [
      "finish",
      "agree",
      "done",
      "create account",
      "continue",
    ]);
    if (!finishClicked) await page.keyboard.press("Enter");

    await page
      .waitForFunction(
        () =>
          window.location.hostname === "chatgpt.com" ||
          window.location.pathname === "/",
        { timeout: 15000 },
      )
      .catch(() => {});

    await sleep(2000);
    log(4, `Profil → ${fullName}, lahir ${birthdateDisplay}`, "ok");

    // ── Step 5: Ambil session credentials ────────────────────────────────
    process.stdout.write(`  [5/${TOTAL_STEPS}] … Ambil session credentials`);

    if (!page.url().includes("chatgpt.com")) {
      await page.goto("https://chatgpt.com", {
        waitUntil: "domcontentloaded",
        timeout: 20000,
      });
      await sleep(2000);
    }

    const session = await page.evaluate(async () => {
      try {
        const res = await fetch("/api/auth/session", {
          credentials: "include",
        });
        if (!res.ok) return null;
        return res.json();
      } catch {
        return null;
      }
    });

    let sessionData = {};
    if (session?.accessToken) {
      sessionData = {
        userId: session.user?.id,
        accountId: session.account?.id,
        organizationId: session.account?.organizationId,
        planType: session.account?.planType,
        accessToken: session.accessToken,
        expires: session.expires,
      };
      log(
        5,
        `Session OK - plan: ${session.account?.planType || "free"} 🎉`,
        "ok",
      );
    } else {
      log(5, "Session tidak diperoleh (akun tetap tersimpan)", "ok");
    }

    // ── Step 6: Selesai ───────────────────────────────────────────────────
    log(6, "Akun selesai dibuat - browser ditutup ✅", "ok");

    return { ...account, birthdate, status: "verified", ...sessionData };
  } finally {
    await browser.close();
  }
}
