# SENTUH TOWER (versi terbaru + Gemini AI)

Integrasi dibuat dari `index(1).html` yang dikirim pengguna pada 24 Oktober 2026. Seluruh fitur dari versi teman dipertahankan: pengenalan tower, data SIMS, pengisian pasangan frekuensi dari panduan, validasi EQ_MFR/BWIDTH, riwayat pemeriksaan dan ekspor Excel. Ditambahkan AI Inspection Assistant yang memanggil Netlify Function.

## Deploy
Ganti `index.html`, `netlify.toml` dan `netlify/functions/analyze.js` pada repository GitHub yang terhubung Netlify. Variabel rahasia `GEMINI_API_KEY` tetap disimpan di Netlify. Jangan menaruh API key maupun CSV SIMS dalam repo.

**Privasi**: hanya string kategori validasi yang dikirim ke Gemini; tidak ada data SIMS atau koordinat.

**Pengujian**: syntax check JavaScript tersedia, tetapi pengujian panggilan Gemini dan perilaku di website live perlu dilakukan di Netlify. AI memberi rekomendasi, bukan keputusan legalitas.

**Catatan**: tombol AI dapat membaca satu atau dua frekuensi, sementara validasi dan Save pada versi teman masih mensyaratkan Tx/Rx lengkap. Fitur ini tidak mengubah aturan Save yang sudah ada.
