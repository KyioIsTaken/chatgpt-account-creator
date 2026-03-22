/**
 * lib/email-gen.js
 * Generate email, nama, dan password untuk akun baru.
 *
 * - Nama dari faker.js, semua simbol dibuang
 * - emailSuffix ditambahkan ke username email
 */

import { faker } from "@faker-js/faker";
import { PASSWORD, DOMAINS } from "../config.js";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function randomUsername(length = 10) {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from(
    { length },
    () => chars[Math.floor(Math.random() * chars.length)],
  ).join("");
}

/** Hapus semua karakter selain huruf dan spasi */
function cleanName(name) {
  return name.replace(/[^a-zA-Z\s]/g, "").trim();
}

// ─── Exports ──────────────────────────────────────────────────────────────────

export function generateEmail(emailSuffix = "") {
  const domain = DOMAINS[Math.floor(Math.random() * DOMAINS.length)];
  const username = randomUsername(10) + emailSuffix;
  return `${username}@${domain}`;
}

export function generateName() {
  let first, last;

  // Generate sampai dapat nama bersih tanpa simbol
  do {
    first = cleanName(faker.person.firstName());
  } while (!first);

  do {
    last = cleanName(faker.person.lastName());
  } while (!last);

  return { firstName: first, lastName: last, fullName: `${first} ${last}` };
}

/** Buat 1 akun (email + password + nama) */
export function generateAccount(emailSuffix = "") {
  const { firstName, lastName, fullName } = generateName();
  return {
    email: generateEmail(emailSuffix),
    password: PASSWORD,
    firstName,
    lastName,
    fullName,
  };
}
