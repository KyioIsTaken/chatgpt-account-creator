/**
 * lib/email-gen.js
 * Generate email, nama, dan password untuk akun baru.
 */

import { PASSWORD, DOMAINS } from "../config.js";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function randomUsername(length = 10) {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from(
    { length },
    () => chars[Math.floor(Math.random() * chars.length)],
  ).join("");
}

// ─── Exports ──────────────────────────────────────────────────────────────────

export function generateEmail() {
  const domain = DOMAINS[Math.floor(Math.random() * DOMAINS.length)];
  return `${randomUsername(10)}@${domain}`;
}

export function generateName() {
  const firstNames = [
    "Alex",
    "Jordan",
    "Taylor",
    "Morgan",
    "Casey",
    "Riley",
    "Drew",
    "Avery",
    "Blake",
    "Quinn",
  ];
  const lastNames = [
    "Smith",
    "Johnson",
    "Williams",
    "Brown",
    "Jones",
    "Garcia",
    "Miller",
    "Davis",
    "Wilson",
    "Moore",
  ];
  const first = firstNames[Math.floor(Math.random() * firstNames.length)];
  const last = lastNames[Math.floor(Math.random() * lastNames.length)];
  return { firstName: first, lastName: last, fullName: `${first} ${last}` };
}

/** Buat N akun (email + password + nama) */
export function generateAccounts(count = 1) {
  return Array.from({ length: count }, () => {
    const { firstName, lastName, fullName } = generateName();
    return {
      email: generateEmail(),
      password: PASSWORD,
      firstName,
      lastName,
      fullName,
    };
  });
}
