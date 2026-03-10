<div align="center">

<img src="logo.png" alt="ChatGPT Account Creator" width="120" />

# ChatGPT Account Creator

**A CLI tool for bulk automation of ChatGPT account creation via headless browser.**

![Version](https://img.shields.io/badge/Version-2.0.0-blueviolet)
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
- Automatic OTP verification from email inbox via API polling
- Account data storage to `data/accounts.json`
- Export account list to `data/result.txt` (format: email TAB name)
- Informative CLI output with per-step progress logging
- Automatic retry mechanism (up to 3x per slot) on failure
- Browser stealth mode to avoid bot detection

## Requirements

- Node.js v18 or newer
- Google Chrome or Microsoft Edge installed on the system
- Custom email domain with inbox API support (default: `plexai.xyz`)

## Installation

```bash
git clone https://github.com/username/chatgpt-account-creator.git
cd chatgpt-account-creator
npm install
```

Copy the configuration template and adjust as needed:

```bash
cp .env.example .env
```

## Configuration

Edit `.env`:

```env
# Email domain used for account creation (comma-separated for multiple)
DOMAINS=plexai.xyz
```

To change the password, batch size, or retry limit, edit `src/config.js`:

```js
export const PASSWORD = "@Gopretstudio88"; // password for all accounts
export const BATCH_SIZE = 5; // max accounts processed in parallel
export const MAX_RETRY = 3; // retry attempts per slot on failure
```

## Usage

### Creating Accounts

```bash
# Create 1 account (default)
npm run create

# Create N accounts at once
npm run create -- 10
npm run create -- 25

# Create an account with a specific email
npm run create -- --email name@domain.com
```

### Viewing Results

```bash
# Display all saved accounts
npm run list

# Display statistics (total, verified, pending, failed)
npm run stats
```

### Exporting Data

```bash
# Export to data/result.txt (FORMAT: email[TAB]name)
npm run convert
```

## Project Structure

```
chatgpt-account-creator/
├── index.js              # CLI entry point (command router)
├── package.json
├── .env                  # Environment configuration
├── .env.example
├── data/
│   ├── accounts.json     # Stored account results
│   └── result.txt        # Export output
└── src/
    ├── config.js         # All constants & configuration
    ├── commands/
    │   ├── create.js     # Account creation logic (batch parallel)
    │   ├── list.js       # Display account list
    │   ├── stats.js      # Account statistics
    │   └── convert.js    # Export to result.txt
    └── lib/
        ├── browser.js    # Puppeteer browser setup + helper functions
        ├── register.js   # 6-step ChatGPT registration flow
        ├── otp.js        # OTP polling from email inbox
        ├── email-gen.js  # Random email & name generator
        └── storage.js    # Read/write data/accounts.json
```

## Registration Flow

Each account is processed through 6 steps:

1. OAuth setup - fetch CSRF token, obtain auth0 redirect URL
2. Password entry - navigate to registration page, fill in password
3. OTP verification - auto-poll inbox, enter the 6-digit code
4. Profile setup - full name and random date of birth (2000-2005)
5. Session retrieval - extract access token from active session
6. Save & done - account data is saved to `accounts.json`

## Output Format

### `data/accounts.json`

```json
[
  {
    "email": "user@plexai.xyz",
    "password": "@Gopretstudio88",
    "fullName": "Alex Smith",
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
user@plexai.xyz    Alex Smith
user2@plexai.xyz   Jordan Davis
```

## Notes

- The browser runs in headless mode (no visible window)
- OTP is fetched automatically; if it fails, manual input is prompted in the terminal
- Only free accounts are created - no payment or credit card information is used
- Ensure your email domain supports catchall addresses or an inbox API

## Support

If this project has been useful, you can support further development:

<a href="https://trakteer.id/alhifnywahid" target="_blank"><img src="https://cdn.trakteer.id/images/embed/trbtn-red-1.png" height="40" alt="Trakteer" /></a>&nbsp;<a href="https://saweria.co/alhifnywahid" target="_blank"><img src="https://img.shields.io/badge/-Support%20on%20Saweria-FF6600?style=for-the-badge" height="40" alt="Saweria" /></a>

## Community

Join and discuss with other users:

<a href="https://t.me/gopretstudio" target="_blank"><img src="https://img.shields.io/badge/-@gopretstudio-2CA5E0?style=for-the-badge&logo=telegram&logoColor=white" height="40" alt="Telegram" /></a>

## License

[MIT](LICENSE) - free to use and modify with attribution.
