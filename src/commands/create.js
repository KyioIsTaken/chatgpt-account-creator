/**
 * commands/create.js
 * Command: npm run create
 * Buat N akun ChatGPT secara parallel (max BATCH_SIZE sekaligus).
 *
 * Fitur:
 * - Tanya jumlah akun via prompt interaktif
 * - Input nama tambahan opsional (ditambahkan ke email username)
 * - Hapus data lama (accounts.json & result.txt) — tapi BUKAN email-db.json
 * - Cek email unik via LocalDB sebelum proses
 * - Auto-retry tanpa batas jika gagal (buat akun baru otomatis)
 * - Live progress bar per-slot
 * - Auto-convert ke result.txt setelah selesai
 */

import chalk from "chalk";
import readline from "readline";
import { writeFileSync, existsSync, unlinkSync } from "fs";
import { resolve } from "path";
import Table from "cli-table3";
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

// ─── Helper: Prompt input dari user ────────────────────────────────────────────
function askQuestion(question) {
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
    if (attempts > 100) break; // safety net
  } while (isEmailUsed(account.email));
  return account;
}

// ─── Progress Bar Renderer ────────────────────────────────────────────────────

const BAR_WIDTH = 20;
const EMAIL_WIDTH = 28;
const STATUS_WIDTH = 45;

function renderBar(step, total) {
  const pct = Math.round((step / total) * 100);
  const filled = Math.round((step / total) * BAR_WIDTH);
  const empty = BAR_WIDTH - filled;
  const bar = "█".repeat(filled) + "░".repeat(empty);

  if (pct === 100) return chalk.green(`${bar} ${pct}%`);
  if (pct >= 50) return chalk.yellow(`${bar} ${pct}%`);
  return chalk.cyan(`${bar} ${pct}%`);
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
      process.stdout.write(`\x1B[${this.slotCount + 1}A`);
    }

    process.stdout.write(
      `\x1B[2K${chalk.gray("─".repeat(EMAIL_WIDTH + BAR_WIDTH + STATUS_WIDTH + 16))}\n`,
    );

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

// ─── OTP: auto-fetch saja ─────────────────────────────────────────────────────
async function getOtp(email) {
  return await waitForOtp(email);
}

// ─── Auto-convert ke result.txt ───────────────────────────────────────────────
function autoConvert(allResults) {
  if (allResults.length === 0) return;
  const lines = allResults.map(
    (acc) => `${acc.email}\t${acc.fullName || acc.firstName || "-"}`,
  );
  writeFileSync(resolve(RESULT_FILE), lines.join("\n"), "utf-8");
  console.log(
    chalk.green(`\n📄 ${allResults.length} akun diekspor ke ${RESULT_FILE}`),
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export async function cmdCreate(args) {
  // ─── Tanya jumlah akun ─────────────────────────────────────────────────
  const countInput = await askQuestion(
    chalk.yellow(`\n🔢 Mau buat berapa akun? `),
  );
  const count = Math.max(1, parseInt(countInput) || 1);

  // ─── Tanya nama tambahan untuk email ───────────────────────────────────
  const emailSuffix = await askQuestion(
    chalk.yellow(
      `📝 Apakah ada penambahan nama di belakang email? (kosongkan jika tidak): `,
    ),
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

  // ─── Hapus data lama (BUKAN email-db.json) ─────────────────────────────
  await clearAccounts();
  const resultPath = resolve(RESULT_FILE);
  if (existsSync(resultPath)) unlinkSync(resultPath);
  console.log(
    chalk.gray(`\n  🗑️  Data lama dihapus (accounts.json & result.txt)`),
  );

  console.log(
    chalk.yellow(
      `\n▶ Membuat ${count} akun (batch ${BATCH_SIZE} sekaligus)...\n`,
    ),
  );

  // Bagi slot ke batch-batch
  const slots = Array.from({ length: count }, (_, i) => i);
  const batches = [];
  for (let i = 0; i < slots.length; i += BATCH_SIZE) {
    batches.push(slots.slice(i, i + BATCH_SIZE));
  }
  console.log(
    chalk.gray(`  Total batch: ${batches.length} × max ${BATCH_SIZE}\n`),
  );

  let totalSuccess = 0;
  const allResults = [];

  for (let bIdx = 0; bIdx < batches.length; bIdx++) {
    const batch = batches[bIdx];
    console.log(
      chalk.cyan.bold(
        `\n═══ Batch ${bIdx + 1}/${batches.length} (${batch.length} akun) ${"═".repeat(20)}`,
      ),
    );
    console.log();

    const display = new LiveDisplay(batch.length);
    display.render();

    const results = await Promise.allSettled(
      batch.map(async (slotIdx, localIdx) => {
        while (true) {
          // Generate email unik (cek LocalDB)
          const account = generateUniqueAccount(emailSuffix);

          display.update(localIdx, {
            email: account.email,
            step: 0,
            status: "Memulai registrasi...",
            done: false,
          });

          try {
            const result = await registerAccount(account, {
              askOtpFn: getOtp,
              onProgress: (step, msg) => {
                display.update(localIdx, { step, status: msg });
              },
            });
            await saveAccount(result);
            // Simpan email ke LocalDB (persistent)
            await saveEmailToDb(account.email);

            display.update(localIdx, {
              step: TOTAL_STEPS,
              status: "Berhasil ✅",
              done: true,
            });

            return result;
          } catch {
            display.update(localIdx, {
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

    const batchSuccess = results.filter(
      (r) => r.status === "fulfilled",
    ).length;
    totalSuccess += batchSuccess;

    results.forEach((r) => {
      if (r.status === "fulfilled") allResults.push(r.value);
    });

    console.log(
      chalk.cyan(`\n  Batch ${bIdx + 1} selesai: `) +
        chalk.green(`✅ ${batchSuccess} berhasil`),
    );

    if (bIdx < batches.length - 1) {
      const delay = 3000 + Math.random() * 2000;
      console.log(
        chalk.gray(
          `\n⏳ Jeda ${(delay / 1000).toFixed(1)}s sebelum batch berikutnya...\n`,
        ),
      );
      await new Promise((r) => setTimeout(r, delay));
    }
  }

  // ─── Ringkasan akhir ──────────────────────────────────────────────────
  console.log(
    chalk.cyan.bold(
      `\n${"═".repeat(60)}\n  📊 RINGKASAN\n${"═".repeat(60)}`,
    ),
  );

  const summaryTable = new Table({
    head: [chalk.cyan.bold("TOTAL"), chalk.green.bold("✅ BERHASIL")],
    style: { head: [], border: ["cyan"] },
    colWidths: [12, 16],
  });
  summaryTable.push([count, totalSuccess]);
  console.log("\n" + summaryTable.toString());

  if (allResults.length > 0) {
    console.log(chalk.cyan.bold(`\n  📋 Detail Akun:`));
    const detailTable = new Table({
      head: [
        chalk.cyan.bold("#"),
        chalk.cyan.bold("EMAIL"),
        chalk.cyan.bold("PASSWORD"),
        chalk.cyan.bold("NAMA"),
      ],
      style: { head: [], border: ["cyan"] },
      colWidths: [5, 30, 20, 22],
    });
    allResults.forEach((acc, i) => {
      detailTable.push([i + 1, acc.email, acc.password, acc.fullName]);
    });
    console.log(detailTable.toString());
  }

  // ─── Auto-convert ke result.txt ────────────────────────────────────────
  autoConvert(allResults);

  console.log(
    chalk.gray("\n💾 Akun tersimpan di: ") +
      chalk.cyan("data/accounts.json") +
      chalk.gray(" & ") +
      chalk.cyan("data/result.txt") +
      "\n",
  );
}
