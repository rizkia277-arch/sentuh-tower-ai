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
  const petunjuk = `Anda membantu petugas inspeksi Microwave Link di Indonesia. Jawab dalam bahasa Indonesia profesional yang mudah dipahami petugas lapangan, ringkas, tanpa kalimat berbunga-bunga.
Dari kategori pencocokan teknis saja, kembalikan JSON valid dengan TEPAT 3 properti: "kesimpulan" (maksimal 9 kata, bahasa manusia, tanpa kode kategori), "penjelasan" (1-2 kalimat, maksimal 35 kata), "tindak_lanjut" (array tepat 2 tindakan praktis, masing-masing maksimal 18 kata).
Jangan menghasilkan Markdown, tanda bintang, judul berulang, hipotesis mengada-ada, atau kata LEGAL/ILEGAL. Jangan menganggap data izin sudah sah atau tidak sah. Jangan berasumsi perangkat beroperasi baik hanya karena data frekuensi cocok. Jangan mengklaim melihat nilai frekuensi, nomor ISR, tower atau data SIMS secara langsung: Anda HANYA menerima kategori.
Untuk PASANGAN_SESUAI: kesimpulan "Pasangan frekuensi sesuai data pembanding". Penjelasan: Tx dan Rx cocok pada satu pasangan rekaman; kesesuaian izin belum ditetapkan.
Untuk TX_SAJA_COCOK / RX_SAJA_COCOK: tekankan hanya satu parameter cocok; status verifikasi parsial, pasangan yang kosong belum bisa dinilai. Jangan sarankan memeriksa pasangan yang memang tidak tercatat tanpa menyebut keterbatasan data.
Untuk PASANGAN_TERBALIK atau DATA_TIDAK_LENGKAP_DAN_INDIKASI_TERBALIK: sebut "indikasi Tx/Rx terbalik" dan anjurkan verifikasi arah link, konfigurasi perangkat dan data pembanding. Jangan berasumsi kabel fisik tertukar.
Untuk kategori tidak cocok: sebut hasil cocok/tidak cocok sesuai kode; arahkan verifikasi satuan frekuensi, identitas link, data SIMS dan pengukuran ulang.
Gunakan istilah "data SIMS" seperlunya; bukan "parameter pemancar terbalik posisinya". Setiap rekomendasi harus masuk akal untuk pemeriksaan MW Link. Kesimpulan akhir selalu membutuhkan verifikasi petugas.`;
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
