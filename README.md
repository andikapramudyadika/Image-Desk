# Image Desk

Image Desk adalah website statis untuk memproses gambar langsung di browser. Cocok untuk project GitHub sederhana karena tidak membutuhkan backend, database, atau dependency build.

## Fitur

- Upload banyak gambar sekaligus.
- Compress gambar melalui pengaturan kualitas.
- Resize dengan batas lebar dan tinggi maksimal.
- Convert ke WebP, JPG, atau PNG.
- Watermark teks dengan pilihan posisi dan transparansi.
- Progress bar saat batch diproses.
- Unduh hasil satu per satu atau semua hasil sekaligus.

## Cara menjalankan

Langsung buka `index.html` di browser modern.

Jika ingin memakai server lokal sederhana, jalankan dari folder project:

```bash
python -m http.server 8000
```

Lalu buka `http://localhost:8000`.

## Deploy ke GitHub Pages

1. Upload semua file project ke repository GitHub.
2. Buka menu repository `Settings`.
3. Pilih `Pages`.
4. Pada `Build and deployment`, pilih branch utama dan folder root.
5. Simpan, lalu tunggu GitHub membuat link website.

## Catatan

Semua proses gambar dilakukan di perangkat pengguna melalui Canvas API. File gambar tidak dikirim ke server mana pun.
