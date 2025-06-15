# Digital Khasanah

Digital Khasanah adalah platform brankas digital dengan enkripsi end-to-end yang memberikan pengguna kendali penuh atas data mereka.

## Struktur Project

Proyek ini terdiri dari dua bagian utama:

- **Backend**: API server yang dibangun dengan Rust dan Axum
- **Frontend**: Aplikasi web yang dibangun dengan HTML, CSS, dan JavaScript

## Memulai

### Prasyarat

- [Rust](https://www.rust-lang.org/tools/install)
- [Node.js](https://nodejs.org/en/) (opsional, untuk alat pengembangan frontend)

### Instalasi Backend

1. Masuk ke direktori backend:

```bash
cd backend
```

2. Kompilasi dan jalankan server dalam mode pengembangan:

```bash
cargo run
```

Server akan berjalan di `localhost:3000`.

### Menjalankan Frontend

1. Masuk ke direktori frontend:

```bash
cd frontend
```

2. Anda dapat menggunakan HTTP server sederhana untuk menjalankan frontend. Misalnya dengan Python:

```bash
# Jika menggunakan Python 3
python -m http.server 8080 -d public

# Jika menggunakan Python 2
cd public && python -m SimpleHTTPServer 8080
```

Atau dengan Node.js:

```bash
# Instal terlebih dahulu jika belum
npm install -g http-server

# Jalankan server
http-server public -p 8080
```

Akses aplikasi di `localhost:8080`.

## Fitur

- Otentikasi pengguna yang aman
- Enkripsi end-to-end di sisi klien
- Brankas digital untuk menyimpan data pribadi
- Impor manual data dari Google Takeout dan Instagram Data Download

## Teknologi

### Backend

- Rust dengan Axum web framework
- JWT untuk autentikasi
- Enkripsi end-to-end

### Frontend

- HTML/CSS/JavaScript vanilla
- Rencana masa depan: Migrasi ke Leptos/Dioxus dengan WebAssembly

## Roadmap Pengembangan

Lihat file [DigitalKhasanah.md](../DigitalKhasanah.md) untuk detail lebih lanjut tentang roadmap pengembangan.
