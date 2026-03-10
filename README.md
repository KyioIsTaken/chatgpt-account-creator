<div align="center">

<img src="logo.png" alt="ChatGPT Account Creator" width="120" />

# ChatGPT Account Creator

**Alat CLI untuk otomatisasi pembuatan akun ChatGPT secara massal via browser headless.**

![Version](https://img.shields.io/badge/Version-2.0.0-blueviolet)
![Node](https://img.shields.io/badge/Node.js-v18+-green)
![Runtime](https://img.shields.io/badge/Runtime-Puppeteer-orange)
![License](https://img.shields.io/badge/License-MIT-lightgrey)

[Fitur](#fitur-utama) - [Instalasi](#instalasi) - [Penggunaan](#penggunaan) - [Struktur](#struktur-project) - [Lisensi](#lisensi)

**Bahasa Indonesia** | [English](README.en.md)

</div>

---

> **Disclaimer:** Project ini dibuat semata-mata untuk tujuan **pembelajaran dan riset otomatisasi browser**. Penggunaan alat ini untuk tindakan yang melanggar Ketentuan Layanan OpenAI, penyalahgunaan platform, atau aktivitas ilegal lainnya sepenuhnya menjadi tanggung jawab pengguna. Penulis tidak bertanggung jawab atas segala bentuk penyalahgunaan.

---

## Fitur Utama

- Pembuatan akun ChatGPT secara otomatis via web flow resmi
- Pemrosesan paralel hingga 5 akun secara bersamaan (batch processing)
- Verifikasi OTP otomatis dari inbox email via API
- Penyimpanan hasil akun ke `data/accounts.json`
- Ekspor daftar akun ke `data/result.txt` (format: email TAB nama)
- Tampilan CLI yang informatif dengan progress per langkah
- Mekanisme retry otomatis (hingga 3x per slot) jika terjadi kegagalan
- Stealth mode browser untuk menghindari deteksi bot

## Persyaratan

- Node.js v18 atau lebih baru
- Google Chrome atau Microsoft Edge terinstall di sistem
- Akun email domain kustom yang mendukung API inbox (default: `plexai.xyz`)

## Instalasi

```bash
git clone https://github.com/username/chatgpt-account-creator.git
cd chatgpt-account-creator
npm install
```

Salin file konfigurasi dan sesuaikan isinya:

```bash
cp .env.example .env
```

## Konfigurasi

Edit file `.env`:

```env
# Domain email yang digunakan untuk pembuatan akun (pisahkan dengan koma)
DOMAINS=plexai.xyz
```

Untuk mengubah password atau jumlah akun per batch, edit `src/config.js`:

```js
export const PASSWORD = "@Gopretstudio88"; // password untuk semua akun
export const BATCH_SIZE = 5; // maksimal akun diproses bersamaan
export const MAX_RETRY = 3; // percobaan ulang jika gagal
```

## Penggunaan

### Membuat Akun

```bash
# Buat 1 akun (default)
npm run create

# Buat N akun sekaligus
npm run create -- 10
npm run create -- 25

# Buat akun dengan email tertentu
npm run create -- --email nama@domain.com
```

### Melihat Hasil

```bash
# Tampilkan daftar semua akun tersimpan
npm run list

# Tampilkan statistik (total, verified, pending, gagal)
npm run stats
```

### Ekspor Data

```bash
# Ekspor ke data/result.txt (FORMAT: email[TAB]nama)
npm run convert
```

## Struktur Project

```
chatgpt-account-creator/
├── index.js              # CLI entry point (router)
├── package.json
├── .env                  # Konfigurasi environment
├── .env.example
├── data/
│   ├── accounts.json     # Hasil akun yang tersimpan
│   └── result.txt        # Output ekspor
└── src/
    ├── config.js         # Semua konstanta & konfigurasi
    ├── commands/
    │   ├── create.js     # Logika pembuatan akun (batch parallel)
    │   ├── list.js       # Tampilkan daftar akun
    │   ├── stats.js      # Statistik akun
    │   └── convert.js    # Ekspor ke result.txt
    └── lib/
        ├── browser.js    # Setup browser Puppeteer + helper functions
        ├── register.js   # 6-step flow registrasi ChatGPT
        ├── otp.js        # Polling OTP dari inbox email
        ├── email-gen.js  # Generate email & nama acak
        └── storage.js    # Read/write data/accounts.json
```

## Alur Kerja Registrasi

Setiap akun diproses melalui 6 langkah:

1. Setup OAuth - ambil CSRF token, dapatkan URL auth0
2. Isi password - navigasi ke halaman registrasi, isi password
3. Verifikasi OTP - polling inbox otomatis, isi kode 6 digit
4. Isi profil - nama lengkap dan tanggal lahir acak (2000-2005)
5. Ambil session - ekstrak access token dari sesi aktif
6. Simpan & selesai - data akun disimpan ke `accounts.json`

## Format Output

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

## Catatan

- Browser berjalan dalam mode headless (tidak terlihat di layar)
- OTP diambil otomatis; jika gagal, akan meminta input manual di terminal
- Hanya akun free yang dibuat - tidak ada proses pembayaran atau kartu kredit
- Pastikan domain email yang digunakan mendukung catchall/API inbox

## Dukungan

Jika project ini bermanfaat, kamu bisa mendukung pengembangan lebih lanjut:

<a href="https://trakteer.id/alhifnywahid" target="_blank"><img src="https://cdn.trakteer.id/images/embed/trbtn-red-1.png" height="40" alt="Trakteer" /></a>&nbsp;<a href="https://saweria.co/alhifnywahid" target="_blank"><img src="https://img.shields.io/badge/-Dukung%20di%20Saweria-FF6600?style=for-the-badge" height="40" alt="Saweria" /></a>

## Komunitas

Gabung dan diskusi bersama pengguna lain:

<a href="https://t.me/gopretstudio" target="_blank"><img src="https://img.shields.io/badge/-@gopretstudio-2CA5E0?style=for-the-badge&logo=telegram&logoColor=white" height="40" alt="Telegram" /></a>

## Lisensi

[MIT](LICENSE) - bebas digunakan dan dimodifikasi dengan menyertakan atribusi.
