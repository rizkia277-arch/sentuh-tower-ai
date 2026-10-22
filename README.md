# SENTUH TOWER — Gemini AI

Ini versi Netlify dari SENTUH TOWER dengan AI Inspection Assistant. Perubahan dibanding versi awal: backend `netlify/functions/analyze.js` memakai Google Gemini API, bukan OpenAI.

## Mengatur API di Netlify
1. Di project `sentuhtower`, Project configuration > Environment variables, simpan `GEMINI_API_KEY` sebagai **secret**, scope **Functions** dan konteks **Production**.
2. Jangan meletakkan key di `index.html`, repository, atau screenshot. Bila key pernah terlihat, rotasi key di Google AI Studio.
3. Opsional: `GEMINI_MODEL` untuk model yang didukung key Anda. Default `gemini-3.5-flash-lite`. Periksa di Google AI Studio karena model dan kuota Free Tier bisa berbeda per akun/proyek.

## Deploy
**PENTING:** Unggah folder yang berisi `index.html`, `netlify.toml`, dan `netlify/functions/analyze.js` sebagai sumber project (misalnya lewat Git repository yang dihubungkan ke Netlify). `index.html` saja tidak cukup. Netlify Functions perlu ter-deploy; deploy folder statis drag-and-drop tidak selalu memproses source functions. Alternatif yang andal: Netlify CLI `netlify deploy --build --prod` dari folder project (membutuhkan Netlify CLI, login, dan pemilihan project yang benar).

Uji alamat `https://<domainmu>/.netlify/functions/analyze` di browser: respons **405** untuk GET menandakan fungsi tersedia. 404 menandakan fungsi tidak ikut deploy. Setelah itu unggah CSV uji nonrahasia, lakukan pencarian dan validasi, lalu tekan tombol Analisis AI.

## Privasi dan pengambilan keputusan
CSV SIMS tetap di browser. Request menuju AI hanya objek `{"kategori":"..."}`, tanpa koordinat, frekuensi, nama operator, nomor ISR ataupun CSV. Kategori tetap dikirim ke Gemini/Google; gunakan kategori simulasi bila data dinas tidak diizinkan untuk API eksternal. AI memberi interpretasi dan saran saja, bukan penetapan legalitas.

**Keamanan:** Tampilan saat ini tetap memiliki label LEGAL/ILEGAL berbasis aturan lama. Perlakukan label itu sebagai indikator pencocokan sementara, bukan keputusan hukum.
