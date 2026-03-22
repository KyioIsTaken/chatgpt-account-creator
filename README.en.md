<div align="center">

<img src="logo.png" alt="ChatGPT Account Creator" width="120" />

# ChatGPT Account Creator

**A CLI tool for bulk automation of ChatGPT account creation via headless browser.**

![Version](https://img.shields.io/badge/Version-3.0.0-blueviolet)
![Node](https://img.shields.io/badge/Node.js-v18+-green)
![Runtime](https://img.shields.io/badge/Runtime-Puppeteer-orange)
![License](https://img.shields.io/badge/License-MIT-lightgrey)

[Features](#features) - [Installation](#installation) - [Usage](#usage) - [Structure](#project-structure) - [License](#license)

[Bahasa Indonesia](README.md) | **English**

</div>

---

> **Disclaimer:** This project is created solely for **educational purposes and browser automation research**. Using this tool to violate OpenAI's Terms of Service, abuse the platform, or engage in any illegal activity is entirely the responsibility of the user. The author assumes no liability for any misuse.

---

## Features

- Automated ChatGPT account creation via the official web registration flow
- Parallel processing of up to 5 accounts simultaneously (batch processing)
- **Live progress bar** per-account with real-time ANSI terminal display
- Automatic OTP verification from email inbox via API polling
- **Realistic random names** using faker.js (symbols automatically stripped)
- **Unique emails** — LocalDB ensures no duplicate emails across sessions
- **Optional email suffix** — append a name to the email (e.g. `abc123wahid@domain.xyz`)
- Unlimited auto-retry on failure (silently creates a new account, no errors shown)
- Results saved to `data/accounts.json` and auto-exported to `data/result.txt`
- Centralized configuration via `config.json` (password, domain, headless, OTP, etc.)
- Browser stealth mode to avoid bot detection

## Requirements

- Node.js v18 or newer
- Google Chrome or Microsoft Edge installed on the system
- Custom email domain with inbox API support (default: `plexai.xyz`)

## Installation

```bash
git clone https://github.com/alhifnywahid/chatgpt-account-creator.git
cd chatgpt-account-creator
npm install
```

## Configuration

Edit `config.json` in the project root:

```json
{
  "password": "@Gopretstudio88",
  "domains": ["plexai.xyz"],
  "batchSize": 5,
  "headless": true,
  "otp": {
    "timeout": 90000,
    "pollInterval": 4000,
    "apiUrl": "https://mail.gopretstudio.com",
    "apiKey": "GOMAIL-xxxxx"
  },
  "paths": {
    "accounts": "./data/accounts.json",
    "result": "./data/result.txt",
    "emailDb": "./data/email-db.json"
  }
}
```

| Option | Description |
|--------|-------------|
| `password` | Password used for all created accounts |
| `domains` | List of email domains (array) |
| `batchSize` | Max accounts processed in parallel |
| `headless` | `true` = invisible browser, `false` = visible browser window |
| `otp.timeout` | OTP polling timeout in milliseconds |
| `otp.pollInterval` | Inbox polling interval in milliseconds |
| `otp.apiUrl` | Email server API URL |
| `otp.apiKey` | Email server API key |

## Usage

### Creating Accounts

```bash
npm run create
```

The system will ask interactively:

```
🔢 Mau buat berapa akun? 5
📝 Apakah ada penambahan nama di belakang email? (kosongkan jika tidak): wahid
```

Then displays a live progress bar:

```
  ✅ abc123wahid@plexai.xyz  │ ████████████████████ 100% │ Berhasil ✅
  ⏳ def456wahid@plexai.xyz  │ ██████████░░░░░░░░░░  50% │ Menunggu kode OTP...
  ⏸  —                       │ ░░░░░░░░░░░░░░░░░░░░   0% │ Menunggu...
```

### Manual Export

```bash
# Re-export to data/result.txt (FORMAT: email[TAB]name)
npm run convert
```

> **Note:** Export to `result.txt` is already done automatically after every `npm run create`.

## Project Structure

```
chatgpt-account-creator/
├── index.js              # CLI entry point (command router)
├── config.json           # All configuration centralized
├── package.json
├── data/
│   ├── accounts.json     # Account results (reset on each create)
│   ├── result.txt        # Export output (reset on each create)
│   └── email-db.json     # LocalDB unique emails (persistent)
└── src/
    ├── config.js         # Wrapper for reading config.json
    ├── commands/
    │   ├── create.js     # Account creation logic (batch + progress bar)
    │   └── convert.js    # Export to result.txt
    └── lib/
        ├── browser.js    # Puppeteer browser setup + helpers
        ├── register.js   # 6-step ChatGPT registration flow
        ├── otp.js        # OTP polling from email inbox
        ├── email-gen.js  # Email & name generator (faker.js)
        └── storage.js    # Read/write accounts + LocalDB email
```

## Registration Flow

Each account is processed through 6 steps:

1. OAuth setup - fetch CSRF token, obtain auth0 redirect URL
2. Password entry - navigate to registration page, fill in password
3. OTP verification - auto-poll inbox, enter the 6-digit code
4. Profile setup - full name (faker.js) and random date of birth (2000-2005)
5. Session retrieval - extract access token from active session
6. Save & done - account data saved to `accounts.json` & `result.txt`

## Output Format

### `data/accounts.json`

```json
[
  {
    "email": "abc123wahid@plexai.xyz",
    "password": "@Gopretstudio88",
    "fullName": "Isabella Thompson",
    "birthdate": "2002-05-14",
    "status": "verified",
    "userId": "...",
    "accessToken": "...",
    "createdAt": "2025-03-11T00:00:00.000Z"
  }
]
```

### `data/result.txt`

```
abc123wahid@plexai.xyz    Isabella Thompson
def456wahid@plexai.xyz    Marcus Chen
```

## Notes

- Browser runs headless by default; set `"headless": false` in `config.json` to show the window
- On any failure at any step, the system automatically creates a new account without displaying errors
- `data/email-db.json` stores all previously used emails (never deleted)
- Only free accounts are created — no payment or credit card information is used
- Ensure your email domain supports catchall addresses or an inbox API

## Support

If this project has been useful, you can support further development:

<a href="https://trakteer.id/alhifnywahid" target="_blank"><img src="https://cdn.trakteer.id/images/embed/trbtn-red-1.png" height="40" alt="Trakteer" /></a>&nbsp;<a href="https://saweria.co/alhifnywahid" target="_blank"><img src="https://img.shields.io/badge/-Support%20on%20Saweria-FF6600?style=for-the-badge" height="40" alt="Saweria" /></a>

## Community

Join and discuss with other users:

<a href="https://t.me/gopretstudio" target="_blank"><img src="https://img.shields.io/badge/-@gopretstudio-2CA5E0?style=for-the-badge&logo=telegram&logoColor=white" height="40" alt="Telegram" /></a>

## License

[MIT](LICENSE) - free to use and modify with attribution.
