// Netlify Function. GEMINI_API_KEY disimpan di environment Netlify, bukan frontend.
const KATEGORI = new Set([
  'PASANGAN_SESUAI', 'DATA_TIDAK_LENGKAP',
  'DATA_TIDAK_LENGKAP_DAN_INDIKASI_TERBALIK', 'PASANGAN_TERBALIK',
  'PASANGAN_BERBEDA_BARIS', 'TX_COCOK_RX_BEDA',
  'RX_COCOK_TX_BEDA', 'PASANGAN_TIDAK_DITEMUKAN',
  'TX_SAJA_COCOK', 'TX_SAJA_TIDAK_COCOK',
  'RX_SAJA_COCOK', 'RX_SAJA_TIDAK_COCOK'
]);

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Metode tidak didukung.' }) };
  }
  if (!process.env.GEMINI_API_KEY) {
    return { statusCode: 503, headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'GEMINI_API_KEY belum dikonfigurasi di Netlify.' }) };
  }
  let kategori;
  try {
    if ((event.body || '').length > 1024) throw new Error('Ukuran permintaan melebihi batas.');
    ({ kategori } = JSON.parse(event.body || '{}'));
    if (!KATEGORI.has(kategori)) throw new Error('Kategori pemeriksaan tidak valid.');
  } catch (e) {
    return { statusCode: 400, headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: e.message }) };
  }
  const petunjuk = `Anda adalah asisten analisis teknis untuk petugas inspeksi stasiun radio Microwave Link pada instansi pemerintah Indonesia.
Tulis dalam bahasa Indonesia baku, formal, objektif, ringkas, dan sesuai konteks inspeksi. Hindari gaya percakapan, istilah tidak resmi, dan saran yang tidak relevan.
Anda hanya menerima KATEGORI hasil pencocokan. Anda TIDAK menerima koordinat, nilai frekuensi, nama penyelenggara, nomor ISR, status izin, atau data SIMS rinci. Jangan mengarang rincian tersebut.

Keluarkan JSON VALID saja, tepat tiga properti:
- "kesimpulan": satu kalimat singkat tanpa tanda titik di akhir (maksimal 12 kata).
- "penjelasan": satu atau dua kalimat formal (maksimal 45 kata).
- "tindak_lanjut": array berisi TEPAT dua kalimat tindakan spesifik, menggunakan verba formal dan masing-masing maksimal 24 kata.
Tidak boleh ada Markdown, kode kategori, penjelasan di luar JSON, atau istilah LEGAL/ILEGAL. Jangan menetapkan keabsahan izin atau kelayakan operasional hanya dari frekuensi.

DIKSI WAJIB:
- Sebut 'data SIMS', 'data stasiun radio', 'pasangan frekuensi Tx dan Rx', 'identitas stasiun radio', 'hasil pemeriksaan', dan 'verifikasi' sesuai kebutuhan.
- JANGAN gunakan 'rekaman', 'cocokkan', 'cek ulang', 'nggak', 'hipotesis', 'data pembanding sistem', 'status hukum', 'parameter penerima belum terkonfirmasi' atau 'rencana awal'.
- Gunakan 'melakukan verifikasi kesesuaian' atau 'memastikan kesesuaian', bukan 'cocokkan'.
- Jangan mengulang langkah yang sudah dilaksanakan, kecuali ditemukan ketidaksesuaian yang memerlukan verifikasi ulang.

KAIDAH BERDASARKAN KATEGORI:
PASANGAN_SESUAI:
  kesimpulan: 'Frekuensi Tx dan Rx sesuai dengan data SIMS'
  penjelasan: 'Hasil pemeriksaan menunjukkan kesesuaian pasangan frekuensi Tx dan Rx dengan data SIMS. Kesesuaian parameter lain dan informasi perizinan masih memerlukan verifikasi tersendiri.'
  tindak_lanjut: ['Melakukan verifikasi kesesuaian identitas stasiun radio dan perangkat dengan data SIMS.', 'Memastikan status dan masa berlaku izin penggunaan spektrum frekuensi radio melalui sumber resmi.']
TX_SAJA_COCOK / RX_SAJA_COCOK:
  Nyatakan secara tepat frekuensi yang diperiksa sesuai data SIMS, tetapi pemeriksaan masih parsial. Jangan menyatakan Rx atau Tx pasti kosong karena parameter pasangan mungkin sekadar belum diisi.
  Rekomendasi: dokumentasikan hasil pemeriksaan parsial, kemudian verifikasi parameter pasangan hanya jika dipersyaratkan dan tersedia.
PASANGAN_TERBALIK / DATA_TIDAK_LENGKAP_DAN_INDIKASI_TERBALIK:
  Nyatakan indikasi pasangan Tx/Rx terbalik terhadap data SIMS, bukan bukti pelanggaran. Rekomendasikan verifikasi arah link, sisi pengukuran, dan konfigurasi frekuensi perangkat; periksa kelengkapan data SIMS jika terkait.
DATA_TIDAK_LENGKAP:
  Nyatakan pemeriksaan belum dapat disimpulkan karena sebagian data pasangan frekuensi tidak tersedia atau tidak valid. Sarankan verifikasi kelengkapan data pada sumber resmi.
PASANGAN_BERBEDA_BARIS:
  Tx dan Rx ditemukan tetapi berasal dari baris data SIMS yang berbeda; bukan satu pasangan yang terverifikasi. Periksa identitas link dan pasangan frekuensi yang benar.
TX_COCOK_RX_BEDA / RX_COCOK_TX_BEDA:
  Nyatakan parameter mana yang sesuai dan tidak sesuai secara spesifik; sarankan pemeriksaan identitas link serta verifikasi ulang parameter yang berbeda.
PASANGAN_TIDAK_DITEMUKAN / TX_SAJA_TIDAK_COCOK / RX_SAJA_TIDAK_COCOK:
  Nyatakan hasil belum sesuai dengan data SIMS yang tersedia tanpa menyimpulkan legalitas. Sarankan memeriksa satuan, identitas stasiun/link, dan hasil pengukuran.

Jika ragu, gunakan formulasi netral 'memerlukan verifikasi lebih lanjut', bukan dugaan yang tidak didukung data.`;
  try {
    const model = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
    // Hanya nama model tepercaya dari environment, tidak berasal dari pengunjung.
    if (!/^gemini-[a-zA-Z0-9.-]+$/.test(model)) throw new Error('Nama model tidak valid.');
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST',
      headers: { 'x-goog-api-key': process.env.GEMINI_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: petunjuk }] },
        contents: [{ role: 'user', parts: [{ text: `Kategori hasil pencocokan Tx/Rx dengan data SIMS: ${kategori}` }] }],
        generationConfig: { maxOutputTokens: 400, temperature: 0.15, responseMimeType: "application/json" }
      })
    });
    const data = await response.json();
    if (!response.ok) {
      console.error('Gemini API status', response.status, data?.error?.status || 'unknown');
      throw new Error('Gemini gagal (' + response.status + ').');
    }
    const analisis = (data.candidates?.[0]?.content?.parts || [])
      .map(part => typeof part.text === 'string' ? part.text : '').join('\n').trim();
    if (!analisis) throw new Error('Model belum mengembalikan analisis.');
    let parsed;
    try { parsed = JSON.parse(analisis); } catch { throw new Error('Format respons AI tidak sesuai.'); }
    if (typeof parsed.kesimpulan !== 'string' || typeof parsed.penjelasan !== 'string' ||
        !Array.isArray(parsed.tindak_lanjut) || parsed.tindak_lanjut.length !== 2 ||
        parsed.tindak_lanjut.some(x => typeof x !== 'string')) {
      throw new Error('Isi respons AI tidak lengkap.');
    }
    const bersih = value => value.replace(/[*`#]/g, '').trim().slice(0, 500);
    const hasil = { kesimpulan: bersih(parsed.kesimpulan),
      penjelasan: bersih(parsed.penjelasan), tindak_lanjut: parsed.tindak_lanjut.map(bersih) };
    return { statusCode: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control':'no-store' },
      body: JSON.stringify({ hasil }) };
  } catch (e) {
    console.error('AI request failed', e.message);
    return { statusCode: 502, headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Layanan AI gagal. Periksa konfigurasi dan log Netlify.' }) };
  }
};
