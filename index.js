#!/usr/bin/env node
/**
 * index.js - CLI Entry Point
 *
 * Hanya berisi routing command ke handler yang sesuai.
 * Logika detail ada di src/commands/*.js
 *
 * Usage:
 *   npm run create [-- N]          buat N akun (default: 1)
 *   npm run create [-- --email x]  buat akun dengan email tertentu
 *   npm run list                   tampilkan semua akun
 *   npm run stats                  statistik akun
 *   npm run convert                ekspor ke data/result.txt
 */

import "dotenv/config";
import chalk from "chalk";
import { cmdCreate } from "./src/commands/create.js";
import { cmdList } from "./src/commands/list.js";
import { cmdStats } from "./src/commands/stats.js";
import { cmdConvert } from "./src/commands/convert.js";

function banner() {
  console.log(
    chalk.cyan.bold(`
╔══════════════════════════════════════╗
║   🤖 ChatGPT Account Creator v2.0   ║
║      Auto-register via web flow      ║
╚══════════════════════════════════════╝`),
  );
}

function showHelp() {
  banner();
  console.log(`\n${chalk.bold("Penggunaan:")}\n`);
  const cmds = [
    ["npm run create", "Buat 1 akun baru"],
    ["npm run create -- 5", "Buat 5 akun sekaligus"],
    ["npm run create -- --email x@y", "Buat akun dengan email tertentu"],
    ["npm run list", "Tampilkan semua akun"],
    ["npm run stats", "Statistik pembuatan akun"],
    ["npm run convert", "Ekspor akun ke data/result.txt"],
  ];
  cmds.forEach(([cmd, desc]) =>
    console.log(`  ${chalk.cyan(cmd.padEnd(42))} ${chalk.gray(desc)}`),
  );
  console.log();
}

// ─── Router ──────────────────────────────────────────────────────────────────

const [, , command, ...args] = process.argv;

try {
  switch (command) {
    case "create":
      banner();
      await cmdCreate(args);
      break;
    case "list":
      banner();
      await cmdList();
      break;
    case "stats":
      banner();
      await cmdStats();
      break;
    case "convert":
      await cmdConvert();
      break;
    default:
      showHelp();
  }
} catch (err) {
  console.error(chalk.red(`\n💥 Error: ${err.message}`));
  process.exit(1);
}
