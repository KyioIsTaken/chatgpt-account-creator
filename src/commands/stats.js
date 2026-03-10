/**
 * commands/stats.js
 * Command: npm run stats
 * Tampilkan statistik pembuatan akun.
 */

import chalk from "chalk";
import Table from "cli-table3";
import { getStats } from "../lib/storage.js";

export async function cmdStats() {
  const { total, success, pending, failed } = getStats();

  const table = new Table({
    head: [
      chalk.cyan.bold("TOTAL"),
      chalk.green.bold("✅ VERIFIED"),
      chalk.yellow.bold("⏳ PENDING"),
      chalk.red.bold("❌ GAGAL"),
    ],
    style: { head: [], border: ["cyan"] },
    colWidths: [10, 14, 13, 12],
  });
  table.push([total, success, pending, failed]);

  console.log(chalk.bold("\n📊 Statistik Akun\n"));
  console.log(table.toString());
}
