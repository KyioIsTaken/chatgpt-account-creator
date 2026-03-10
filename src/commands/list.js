/**
 * commands/list.js
 * Command: npm run list
 * Tampilkan semua akun yang tersimpan di data/accounts.json
 */

import chalk from "chalk";
import Table from "cli-table3";
import { loadAccounts } from "../lib/storage.js";

export async function cmdList() {
  const accounts = loadAccounts();

  if (accounts.length === 0) {
    console.log(
      chalk.yellow("\nBelum ada akun tersimpan. Jalankan: npm run create\n"),
    );
    return;
  }

  console.log(chalk.bold(`\n📋 Daftar Akun (${accounts.length} total)\n`));

  const table = new Table({
    head: [
      chalk.cyan.bold("#"),
      chalk.cyan.bold("EMAIL"),
      chalk.cyan.bold("PASSWORD"),
      chalk.cyan.bold("NAMA"),
      chalk.cyan.bold("STATUS"),
      chalk.cyan.bold("DIBUAT"),
    ],
    style: { head: [], border: ["cyan"] },
    colWidths: [3, 26, 18, 16, 12, 12],
    wordWrap: false,
  });

  accounts.forEach((acc, idx) => {
    const statusStr =
      acc.status === "verified"
        ? chalk.green("✅ verified")
        : acc.status === "failed"
          ? chalk.red("❌ failed")
          : chalk.yellow("⏳ pending");
    const date = acc.createdAt
      ? new Date(acc.createdAt).toLocaleDateString("id-ID")
      : "-";
    table.push([
      idx + 1,
      acc.email,
      acc.password,
      acc.fullName || "-",
      statusStr,
      date,
    ]);
  });

  console.log(table.toString());
}
