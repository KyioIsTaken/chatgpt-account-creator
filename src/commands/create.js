/**
 * commands/create.js
 * Command: npm run create -- [N] [--email x@y]
 * Buat N akun ChatGPT secara parallel (max BATCH_SIZE sekaligus).
 */

import chalk from "chalk";
import readline from "readline";
import Table from "cli-table3";
import { BATCH_SIZE, MAX_RETRY } from "../config.js";
import { generateAccounts } from "../lib/email-gen.js";
import { registerAccount } from "../lib/register.js";
import { waitForOtp } from "../lib/otp.js";
import { saveAccount } from "../lib/storage.js";

// ─── OTP: auto-fetch, fallback ke input manual ────────────────────────────────
async function getOtp(email) {
  try {
    return await waitForOtp(email);
  } catch (err) {
    console.log(chalk.yellow(`\n  ⚠️  Auto-OTP gagal (${err.message})`));
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    return new Promise((resolve) =>
      rl.question(
        chalk.yellow(`  🔑 Masukkan OTP manual untuk ${chalk.bold(email)}: `),
        (ans) => {
          rl.close();
          resolve(ans.trim());
        },
      ),
    );
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export async function cmdCreate(args) {
  let count = 1;
  let specificEmail = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--email" && args[i + 1]) {
      specificEmail = args[i + 1];
      count = 1;
    } else if (!isNaN(parseInt(args[i])) && parseInt(args[i]) > 0) {
      count = parseInt(args[i]);
    }
  }

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

  for (let bIdx = 0; bIdx < batches.length; bIdx++) {
    const batch = batches[bIdx];
    console.log(
      chalk.cyan.bold(
        `\n═══ Batch ${bIdx + 1}/${batches.length} (${batch.length} akun) ${"═".repeat(20)}`,
      ),
    );

    const results = await Promise.allSettled(
      batch.map(async (slotIdx) => {
        let attempt = 0;
        while (attempt < MAX_RETRY) {
          attempt++;
          const base = generateAccounts(1)[0];
          const account = specificEmail
            ? { ...base, email: specificEmail }
            : base;
          const prefix = chalk.gray(`  [Slot ${slotIdx + 1}]`);
          if (attempt > 1)
            console.log(prefix + chalk.yellow(` 🔄 Retry ke-${attempt}...`));
          try {
            const result = await registerAccount(account, { askOtpFn: getOtp });
            await saveAccount(result);
            console.log(
              prefix + chalk.green(` ✅ ${account.email} - berhasil!`),
            );
            return result;
          } catch (err) {
            console.log(
              prefix +
                chalk.red(
                  ` ❌ Gagal (${attempt}/${MAX_RETRY}): ${err.message}`,
                ),
            );
            if (attempt < MAX_RETRY)
              await new Promise((r) =>
                setTimeout(r, 3000 + Math.random() * 2000),
              );
          }
        }
        throw new Error(
          `Slot ${slotIdx + 1} gagal setelah ${MAX_RETRY}x retry`,
        );
      }),
    );

    const batchSuccess = results.filter((r) => r.status === "fulfilled").length;
    const batchFailed = results.filter((r) => r.status === "rejected").length;
    totalSuccess += batchSuccess;

    console.log(
      chalk.cyan(`\n  Batch ${bIdx + 1} selesai: `) +
        chalk.green(`✅ ${batchSuccess} berhasil`) +
        (batchFailed > 0 ? chalk.red(` | ⛔ ${batchFailed} gagal`) : ""),
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

  // Ringkasan
  const table = new Table({
    head: [
      chalk.cyan.bold("TOTAL"),
      chalk.green.bold("✅ BERHASIL"),
      chalk.red.bold("⛔ GAGAL"),
    ],
    style: { head: [], border: ["cyan"] },
    colWidths: [12, 16, 14],
  });
  table.push([count, totalSuccess, count - totalSuccess]);
  console.log("\n" + table.toString());
  console.log(
    chalk.gray("\n💾 Akun tersimpan di: ") +
      chalk.cyan("data/accounts.json") +
      "\n",
  );
}
