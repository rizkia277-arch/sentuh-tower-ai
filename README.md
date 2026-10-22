# SENTUH TOWER — penyempurnaan validasi dan AI

Perubahan versi ini:
1. Label LEGAL/ILEGAL pada hasil pencocokan frekuensi diganti menjadi status teknis (SESUAI SIMS, INDIKASI TIDAK SESUAI, BELUM SESUAI SIMS). Keputusan legalitas tetap memerlukan pemeriksaan petugas.
2. Teks instruksi Gemini diperjelas agar rekomendasi tidak mengulang hasil pencocokan, dan memperhatikan kasus Tx/Rx parsial.
3. GPS menampilkan estimasi akurasi `coords.accuracy` serta peringatan jika akurasi melebihi radius 20 meter; mode koordinat manual ditandai simulasi.
4. Backend hanya mengirim kode kategori ke Gemini, bukan file CSV, koordinat, frekuensi ataupun ISR. Jangan gunakan data dinas pada layanan eksternal tanpa izin.

## Deploy
Perbarui `index.html` di root repository GitHub dan `netlify/functions/analyze.js` di foldernya masing-masing. `netlify.toml` tetap disertakan. Netlify akan deploy dari branch `main`. Simpan `GEMINI_API_KEY` sebagai secret di pengaturan Netlify, jangan di repositori.

## Uji
Uji skenario: Tx/Rx lengkap cocok, pasangan terbalik, hanya Tx dan hanya Rx, frekuensi tidak cocok; periksa juga mode GPS dan koordinat manual. Perhatikan nilai akurasi GPS merupakan perkiraan browser, bukan jaminan tower benar.
