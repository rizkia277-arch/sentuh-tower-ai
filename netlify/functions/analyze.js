// Netlify Function. GEMINI_API_KEY disimpan di environment Netlify, bukan frontend.
const KATEGORI = new Set([
  'PASANGAN_SESUAI', 'DATA_TIDAK_LENGKAP',
  'DATA_TIDAK_LENGKAP_DAN_INDIKASI_TERBALIK', 'PASANGAN_TERBALIK',
  'PASANGAN_BERBEDA_BARIS', 'TX_COCOK_RX_BEDA',
  'RX_COCOK_TX_BEDA', 'PASANGAN_TIDAK_DITEMUKAN'
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
  const petunjuk = `Anda asisten teknis inspeksi stasiun radio Microwave Link di Indonesia. Jelaskan arti kategori pemeriksaan dalam bahasa Indonesia yang singkat (maks. 130 kata), lalu berikan 2-3 rekomendasi verifikasi lapangan yang aman dan realistis. Gunakan hanya kategori yang diberikan. Jangan mengarang detail frekuensi, identitas tower, ISR atau pengukuran. Jangan menyatakan LEGAL/ILEGAL sebagai kepastian hukum: keputusan final perlu pemeriksaan petugas dan data perizinan resmi. Pisahkan fakta hasil pencocokan dari hipotesis dan saran. Jangan menyatakan analisis sebagai bukti pemanfaatan AI untuk penentuan status hukum.`;
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
        generationConfig: { maxOutputTokens: 650, temperature: 0.2 }
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
    return { statusCode: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control':'no-store' },
      body: JSON.stringify({ analisis }) };
  } catch (e) {
    console.error('AI request failed', e.message);
    return { statusCode: 502, headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Layanan AI gagal. Periksa konfigurasi dan log Netlify.' }) };
  }
};
