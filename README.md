<div align="center">

# WikiGaleri

**A gallery for Wikimedia Commons: find free media, understand it, and reuse it with the right credit.**
**Galeri untuk Wikimedia Commons: temukan media bebas, pahami isinya, dan pakai dengan kredit yang benar.**

[English](#english) · [Bahasa Indonesia](#bahasa-indonesia)

Built by **Team Metafora** for the Google Cloud AI Builder Cup.
Dibuat oleh **Tim Metafora** untuk Google Cloud AI Builder Cup.

<h1>Built with AI Studio</h1>

<p>The fastest path from prompt to production with Gemini.</p>

<a href="https://aistudio.google.com/apps">Start building</a>

</div>

---

## English

### What is WikiGaleri?

Wikimedia Commons holds millions of free files, but they are hard to search and the license rules are easy to get wrong. WikiGaleri is a web app that makes this simpler:

- Search Commons by keyword, username, category or live feed, and filter by media type and license.
- See a nearby map of photos around any spot, powered by MapLibre.
- Ask Gemini to explain a file in plain language and sum up what its license allows.
- Copy a ready-made credit line (TASL: Title, Author, Source, License) in one click.
- Use it in Indonesian or English, in light or dark mode.

### Features

| Feature | What it does |
|---|---|
| Gallery and search | Browse images, audio, video, documents and more from Commons, with curated topics and a random tab |
| Filters | Narrow results by media type and license (Public Domain, CC BY, CC BY-SA and others) |
| File details | Download sizes, source info, categories and usage, version history and discussion |
| Gemini assistant | Two short sections per file: what the file is, and what you can do with it |
| Credit line | A TASL credit line ready to paste, plus a quick-copy modal |
| Nearby map | Find Commons photos around a point, with a Gemini summary of the area |
| Guides | In-app guides for CC licenses, Wikimedia terms and what WikiGaleri is |
| Export | Save results as PDF |

### How Gemini is used

Gemini 2.5 Flash reads the official Commons metadata (title, description, categories, license, size, location) and writes:

1. **What this file is**: a plain-language explanation, key facts and ideas for using it.
2. **What you can do with it**: a license summary, notes on commercial use and remixing, things to double-check, and a credit line.

Gemini can be wrong or miss context. The license summary is a guide, not legal advice. Always check the file page on Commons before you reuse anything.

### Tech stack

- React 19, TypeScript, Vite
- Tailwind CSS 4
- MapLibre GL (nearby map, OpenFreeMap tiles)
- Google Gemini API (`@google/genai`, model `gemini-2.5-flash`)
- Wikimedia Commons and Wikidata APIs
- jsPDF and qrcode for export

### Run locally

**Prerequisites:** Node.js 20 or newer (or Bun).

```bash
git clone https://github.com/affandymurad/wikigaleri.git
cd wikigaleri
npm install
npm run dev
```

Open http://localhost:3000.

**Gemini API key.** The Gemini features need your own key from [Google AI Studio](https://aistudio.google.com/apikey). Open the Gemini key dialog in the app and paste it there. The key is stored only in your browser (`localStorage`) and sent only to Google. Never commit a key to this repository.

`.env.example` lists the variables AI Studio injects when the app runs there (`GEMINI_API_KEY`, `APP_URL`).

### Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start the dev server on port 3000 |
| `npm run build` | Build for production into `dist/` |
| `npm run preview` | Preview the production build |
| `npm run lint` | Type-check with TypeScript |

### Project structure

```
src/
  components/   UI: gallery, detail modal, nearby map, guides
  hooks/        Commons gallery, language, dark mode, API key
  services/     Wikimedia API client and Gemini client (prompts live here)
  i18n/         Indonesian and English strings
  utils/        License helpers and PDF export
```

### Credits and disclaimer

WikiGaleri is an independent project. It is not made, endorsed or run by the Wikimedia Foundation. Every file keeps the license chosen by its author, so follow it when you reuse a file.

Media shown in the app comes from [Wikimedia Commons](https://commons.wikimedia.org). Map data by [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors.

### Team

**Team Metafora**: Affandy Murad (Team Leader) and Ahmad Fauzi (Member).

---

## Bahasa Indonesia

### Apa itu WikiGaleri?

Wikimedia Commons punya jutaan berkas bebas, tapi sulit dicari dan aturan lisensinya gampang salah dipahami. WikiGaleri adalah aplikasi web yang membuat semua itu lebih mudah:

- Cari di Commons lewat kata kunci, nama pengguna, kategori, atau Live Feed, lalu saring berdasarkan jenis media dan lisensi.
- Lihat peta foto di sekitar suatu tempat, didukung MapLibre.
- Minta Gemini menjelaskan isi berkas dengan bahasa sehari-hari dan meringkas apa yang diizinkan lisensinya.
- Salin teks kredit siap pakai (TASL: Judul, Pembuat, Sumber, Lisensi) dengan satu klik.
- Tersedia dalam bahasa Indonesia dan Inggris, mode terang dan gelap.

### Fitur

| Fitur | Fungsi |
|---|---|
| Galeri dan pencarian | Jelajahi gambar, audio, video, dokumen, dan lainnya dari Commons, lengkap dengan topik pilihan dan tab acak |
| Filter | Saring hasil menurut jenis media dan lisensi (Domain Publik, CC BY, CC BY-SA, dan lainnya) |
| Detail berkas | Ukuran unduhan, info sumber, kategori dan penggunaan, riwayat versi, serta diskusi |
| Asisten Gemini | Dua bagian singkat per berkas: apa isi berkas ini, dan boleh dipakai untuk apa |
| Teks kredit | Teks kredit TASL siap tempel, plus jendela salin cepat |
| Peta terdekat | Temukan foto Commons di sekitar satu titik, dengan ringkasan area dari Gemini |
| Panduan | Panduan lisensi CC, ketentuan Wikimedia, dan penjelasan tentang WikiGaleri langsung di aplikasi |
| Ekspor | Simpan hasil sebagai PDF |

### Cara Gemini dipakai

Gemini 2.5 Flash membaca metadata resmi dari Commons (judul, deskripsi, kategori, lisensi, ukuran, lokasi), lalu menulis:

1. **Apa isi berkas ini**: penjelasan bahasa awam, fakta penting, dan ide pemakaian.
2. **Boleh dipakai untuk apa**: ringkasan lisensi, catatan soal pemakaian komersial dan remix, hal yang perlu dicek, serta teks kredit.

Gemini bisa salah atau melewatkan konteks. Ringkasan lisensi hanya penuntun, bukan nasihat hukum. Selalu cek halaman berkas di Commons sebelum memakainya kembali.

### Teknologi

- React 19, TypeScript, Vite
- Tailwind CSS 4
- MapLibre GL (peta terdekat, tile OpenFreeMap)
- Google Gemini API (`@google/genai`, model `gemini-2.5-flash`)
- API Wikimedia Commons dan Wikidata
- jsPDF dan qrcode untuk ekspor

### Menjalankan secara lokal

**Prasyarat:** Node.js 20 atau lebih baru (atau Bun).

```bash
git clone https://github.com/affandymurad/wikigaleri.git
cd wikigaleri
npm install
npm run dev
```

Buka http://localhost:3000.

**Kunci API Gemini.** Fitur Gemini butuh kunci milikmu sendiri dari [Google AI Studio](https://aistudio.google.com/apikey). Buka dialog kunci Gemini di aplikasi, lalu tempel kuncinya di sana. Kunci disimpan hanya di browsermu (`localStorage`) dan hanya dikirim ke Google. Jangan pernah meng-commit kunci ke repositori ini.

`.env.example` berisi variabel yang disuntikkan AI Studio saat aplikasi berjalan di sana (`GEMINI_API_KEY`, `APP_URL`).

### Perintah

| Perintah | Fungsi |
|---|---|
| `npm run dev` | Menjalankan server pengembangan di port 3000 |
| `npm run build` | Membangun versi produksi ke folder `dist/` |
| `npm run preview` | Melihat hasil build produksi |
| `npm run lint` | Memeriksa tipe dengan TypeScript |

### Struktur proyek

```
src/
  components/   Antarmuka: galeri, modal detail, peta terdekat, panduan
  hooks/        Galeri Commons, bahasa, mode gelap, kunci API
  services/     Klien API Wikimedia dan klien Gemini (prompt ada di sini)
  i18n/         Teks bahasa Indonesia dan Inggris
  utils/        Pembantu lisensi dan ekspor PDF
```

### Kredit dan penafian

WikiGaleri adalah proyek independen. Aplikasi ini tidak dibuat, didukung, atau dikelola oleh Wikimedia Foundation. Setiap berkas tetap tunduk pada lisensi pilihan pembuatnya, jadi ikuti lisensi itu saat memakainya kembali.

Media di aplikasi berasal dari [Wikimedia Commons](https://commons.wikimedia.org). Data peta oleh kontributor [OpenStreetMap](https://www.openstreetmap.org/copyright).

### Tim

**Tim Metafora**: Affandy Murad (Ketua Tim) dan Ahmad Fauzi (Anggota).
