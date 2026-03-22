/**
 * commands/create.js
 * Command: npm run create
 * Buat N akun ChatGPT secara parallel (max BATCH_SIZE sekaligus).
 */

import chalk from "chalk";
import readline from "readline";
import { writeFileSync, existsSync, unlinkSync } from "fs";
import { resolve } from "path";
import { BATCH_SIZE, RESULT_FILE } from "../config.js";
import { generateAccount } from "../lib/email-gen.js";
import { registerAccount, TOTAL_STEPS } from "../lib/register.js";
import { waitForOtp } from "../lib/otp.js";
import {
  saveAccount,
  clearAccounts,
  isEmailUsed,
  saveEmailToDb,
} from "../lib/storage.js";

// ─── Helper: Prompt input ─────────────────────────────────────────────────────
function ask(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) =>
    rl.question(question, (ans) => {
      rl.close();
      resolve(ans.trim());
    }),
  );
}

// ─── Generate email unik (cek LocalDB) ───────────────────────────────────────
function generateUniqueAccount(emailSuffix = "") {
  let account;
  let attempts = 0;
  do {
    account = generateAccount(emailSuffix);
    attempts++;
    if (attempts > 100) break;
  } while (isEmailUsed(account.email));
  return account;
}

// ─── Progress Bar ─────────────────────────────────────────────────────────────

const BAR_WIDTH = 20;
const EMAIL_WIDTH = 30;
const STATUS_WIDTH = 40;

function renderBar(step, total) {
  const pct = Math.round((step / total) * 100);
  const filled = Math.round((step / total) * BAR_WIDTH);
  const empty = BAR_WIDTH - filled;
  const bar = "█".repeat(filled) + "░".repeat(empty);

  if (pct === 100) return chalk.green(`${bar} ${String(pct).padStart(3)}%`);
  if (pct >= 50) return chalk.yellow(`${bar} ${String(pct).padStart(3)}%`);
  return chalk.cyan(`${bar} ${String(pct).padStart(3)}%`);
}

function truncate(str, maxLen) {
  if (str.length <= maxLen) return str.padEnd(maxLen);
  return str.slice(0, maxLen - 1) + "…";
}

class LiveDisplay {
  constructor(slotCount) {
    this.slotCount = slotCount;
    this.slots = Array.from({ length: slotCount }, () => ({
      email: "—",
      step: 0,
      status: "Menunggu...",
      done: false,
    }));
    this.rendered = false;
  }

  update(slotIdx, data) {
    Object.assign(this.slots[slotIdx], data);
    this.render();
  }

  render() {
    if (this.rendered) {
      process.stdout.write(`\x1B[${this.slotCount}A`);
    }

    for (let i = 0; i < this.slotCount; i++) {
      const s = this.slots[i];
      const emailStr = truncate(s.email, EMAIL_WIDTH);
      const bar = renderBar(s.step, TOTAL_STEPS);
      const statusStr = truncate(s.status, STATUS_WIDTH);

      let icon;
      if (s.done) icon = chalk.green("✅");
      else if (s.step > 0) icon = chalk.yellow("⏳");
      else icon = chalk.gray("⏸ ");

      process.stdout.write(
        `\x1B[2K  ${icon} ${chalk.white.bold(emailStr)} │ ${bar} │ ${s.done ? chalk.green(statusStr) : chalk.gray(statusStr)}\n`,
      );
    }

    this.rendered = true;
  }
}

// ─── OTP ──────────────────────────────────────────────────────────────────────
async function getOtp(email) {
  return await waitForOtp(email);
}

// ─── Auto-convert ─────────────────────────────────────────────────────────────
function autoConvert(allResults) {
  if (allResults.length === 0) return;
  const lines = allResults.map(
    (acc) => `${acc.email}\t${acc.fullName || acc.firstName || "-"}`,
  );
  writeFileSync(resolve(RESULT_FILE), lines.join("\n"), "utf-8");
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export async function cmdCreate(args) {
  // ─── Prompt interaktif ─────────────────────────────────────────────────
  const countInput = await ask(chalk.white(`> Mau buat berapa akun? `));
  const count = Math.max(1, parseInt(countInput) || 1);

  const emailSuffix = await ask(
    chalk.white(`> Tambahan nama di belakang email? (kosongkan jika tidak): `),
  );

  if (emailSuffix) {
    console.log(
      chalk.green(
        `  ✓ Suffix email: "${emailSuffix}" → contoh: abc123${emailSuffix}@domain.xyz`,
      ),
    );
  } else {
    console.log(
      chalk.gray(`  ✓ Email tanpa tambahan → contoh: abc1234567@domain.xyz`),
    );
  }

  // ─── Hapus data lama ───────────────────────────────────────────────────
  await clearAccounts();
  const resultPath = resolve(RESULT_FILE);
  if (existsSync(resultPath)) unlinkSync(resultPath);
  console.log(
    chalk.gray(`\n> 🗑️  Data lama dihapus (accounts.json & result.txt)\n`),
  );

  // Bagi slot ke batch
  const slots = Array.from({ length: count }, (_, i) => i);
  const batches = [];
  for (let i = 0; i < slots.length; i += BATCH_SIZE) {
    batches.push(slots.slice(i, i + BATCH_SIZE));
  }

  let totalSuccess = 0;
  const allResults = [];

  for (let bIdx = 0; bIdx < batches.length; bIdx++) {
    const batch = batches[bIdx];
    const allDone = () =>
      batchDisplay && batchDisplay.slots.every((s) => s.done);

    // ─── Batch header ─────────────────────────────────────────────────────
    const batchLabel = `Batch ${bIdx + 1}/${batches.length} (${batch.length} akun)`;
    const headerLine = `${"─".repeat(80)}`;

    // Print batch header (will be updated when done)
    const headerLineCount = 1;
    console.log(
      chalk.yellow(`⏳ ${batchLabel} `) + chalk.gray(headerLine),
    );

    const batchDisplay = new LiveDisplay(batch.length);
    batchDisplay.render();

    const results = await Promise.allSettled(
      batch.map(async (slotIdx, localIdx) => {
        while (true) {
          const account = generateUniqueAccount(emailSuffix);

          batchDisplay.update(localIdx, {
            email: account.email,
            step: 0,
            status: "Memulai registrasi...",
            done: false,
          });

          try {
            const result = await registerAccount(account, {
              askOtpFn: getOtp,
              onProgress: (step, msg) => {
                batchDisplay.update(localIdx, { step, status: msg });
              },
            });
            await saveAccount(result);
            await saveEmailToDb(account.email);

            batchDisplay.update(localIdx, {
              step: TOTAL_STEPS,
              status: "Berhasil ✅",
              done: true,
            });

            return result;
          } catch {
            batchDisplay.update(localIdx, {
              step: 0,
              status: "Membuat akun baru...",
              done: false,
            });
            await new Promise((r) =>
              setTimeout(r, 3000 + Math.random() * 2000),
            );
          }
        }
      }),
    );

    // Update batch header → done
    const linesUp = batch.length + headerLineCount;
    process.stdout.write(`\x1B[${linesUp}A`);
    process.stdout.write(
      `\x1B[2K${chalk.green(`✅ ${batchLabel} `)}${chalk.gray(headerLine)}\n`,
    );
    // Re-render slots below (cursor is now at slot area)
    for (let i = 0; i < batch.length; i++) {
      const s = batchDisplay.slots[i];
      const emailStr = truncate(s.email, EMAIL_WIDTH);
      const bar = renderBar(s.step, TOTAL_STEPS);
      const statusStr = truncate(s.status, STATUS_WIDTH);
      process.stdout.write(
        `\x1B[2K  ${chalk.green("✅")} ${chalk.white.bold(emailStr)} │ ${bar} │ ${chalk.green(statusStr)}\n`,
      );
    }

    const batchSuccess = results.filter(
      (r) => r.status === "fulfilled",
    ).length;
    totalSuccess += batchSuccess;

    results.forEach((r) => {
      if (r.status === "fulfilled") allResults.push(r.value);
    });

    if (bIdx < batches.length - 1) {
      await new Promise((r) =>
        setTimeout(r, 3000 + Math.random() * 2000),
      );
    }
  }

  // ─── Auto-convert & simpan ─────────────────────────────────────────────
  autoConvert(allResults);

  console.log(
    chalk.green(`\n✅ Selesai! ${totalSuccess}/${count} akun berhasil dibuat.`),
  );
  console.log(
    chalk.gray(`💾 Tersimpan di: `) +
      chalk.cyan(`data/accounts.json`) +
      chalk.gray(` & `) +
      chalk.cyan(`data/result.txt\n`),
  );
}
