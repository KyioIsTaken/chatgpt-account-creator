/**
 * commands/convert.js
 * Command: npm run convert
 * Ekspor accounts.json → data/result.txt (format: EMAIL\tNAMA per baris)
 */

import { writeFileSync } from "fs";
import { resolve } from "path";
import chalk from "chalk";
import { loadAccounts } from "../lib/storage.js";
import { RESULT_FILE } from "../config.js";

export async function cmdConvert() {
  const accounts = loadAccounts();

  if (accounts.length === 0) {
    console.log(chalk.yellow("\n⚠️  Tidak ada akun di data/accounts.json\n"));
    return;
  }

  const lines = accounts.map(
    (acc) => `${acc.email}\t${acc.fullName || acc.firstName || "-"}`,
  );

  writeFileSync(resolve(RESULT_FILE), lines.join("\n"), "utf-8");
  console.log(
    chalk.green(`\n✅ ${accounts.length} akun diekspor ke ${RESULT_FILE}\n`),
  );
}
