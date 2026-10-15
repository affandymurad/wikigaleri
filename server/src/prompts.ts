export type Lang = 'en' | 'id';

export interface PromptItem {
  title: string;
  cleanTitle: string;
  description: string;
  author: string;
  credit: string;
  date: string;
  mediaType: string;
  mimeType: string;
  fileSize: number;
  width: number;
  height: number;
  latitude: number | null;
  longitude: number | null;
  licenseShort: string;
  licenseFull: string;
  licenseUrl: string;
  attributionRequired: boolean;
  categories: string[];
  pageUrl: string;
}

export interface WikiUsage {
  title: string;
  wiki: string;
}

export interface AreaPhoto {
  cleanTitle: string;
  licenseShort: string;
  author: string;
}

export interface Prompt {
  system: string;
  user: string;
}

export function buildAnalyzePrompt(item: PromptItem, usages: WikiUsage[], lang: Lang): Prompt {
  const isEn = lang === 'en';

  const usageContext =
    usages.length > 0
      ? isEn
        ? `Wikimedia pages that currently use this file:\n${usages
            .slice(0, 10)
            .map((u) => `- ${u.wiki}: "${u.title}"`)
            .join('\n')}`
        : `Halaman Wikimedia yang saat ini memakai berkas ini:\n${usages
            .slice(0, 10)
            .map((u) => `- ${u.wiki}: "${u.title}"`)
            .join('\n')}`
      : isEn
      ? 'No Wikimedia page is recorded as using this file.'
      : 'Belum ada halaman Wikimedia yang tercatat memakai berkas ini.';

  const system = isEn
    ? `You explain files from Wikimedia Commons to people who are not experts. Write like a well-read friend: plain words, short sentences, and no jargon unless you explain it right away.

Rules:
1. Use only what is in the metadata below or what can clearly be seen in the file. Never invent people, dates, places, creators or copyright status.
2. Be specific. Whenever the metadata has a name, date, place, number, or format, use it instead of a general statement.
3. If something is missing (photographer, exact date, place), say it is not recorded on Commons. Do not guess.
4. For the license, rely only on the one stated (${item.licenseShort || item.licenseFull || 'Creative Commons'}). If it requires credit (BY) or share-alike (SA), say so. Never call a file public domain unless its license says that.
5. Skip filler and hype. Avoid words like stunning, vibrant, rich, tapestry, testament, showcase, captivating and delve. Do not open with praise, and do not end with a sentence that repeats what you already said.
6. Return valid JSON only. No Markdown fences and no text before or after it.`
    : `Kamu menjelaskan berkas Wikimedia Commons kepada orang awam. Tulis seperti teman yang banyak membaca: kata sehari-hari, kalimat pendek, dan istilah teknis hanya kalau langsung dijelaskan.

Aturan:
1. Pakai hanya isi metadata di bawah atau hal yang jelas terlihat pada berkas. Jangan mengarang tokoh, tanggal, tempat, pembuat, atau status hak cipta.
2. Jelas dan spesifik. Kalau metadata punya nama, tanggal, tempat, angka, atau format, pakai itu, jangan diganti kalimat umum.
3. Kalau ada yang tidak tercatat (fotografer, tanggal pastinya, lokasi), bilang terus terang bahwa itu tidak tercatat di Commons. Jangan menebak.
4. Untuk lisensi, pegang hanya lisensi yang tertulis (${item.licenseShort || item.licenseFull || 'Creative Commons'}). Kalau lisensinya mewajibkan atribusi (BY) atau berbagi serupa (SA), sebutkan. Jangan bilang berkas ini domain publik kecuali lisensinya memang begitu.
5. Tanpa basa-basi dan tanpa kata promosi. Hindari kata seperti menakjubkan, memukau, menawan, kaya akan, sarat makna, dan mahakarya. Jangan buka dengan pujian, dan jangan tutup dengan kalimat yang mengulang isi sebelumnya.
6. Keluarkan JSON yang valid saja. Tanpa pagar kode Markdown dan tanpa teks di depan atau belakangnya.`;

  const sizeMb = item.fileSize ? (item.fileSize / 1048576).toFixed(1) + ' MB' : '';
  const dims = item.width && item.height ? item.width + ' x ' + item.height + ' px' : '';
  const geo =
    item.latitude != null && item.longitude != null
      ? item.latitude.toFixed(5) + ', ' + item.longitude.toFixed(5)
      : '';

  const user = isEn
    ? `Explain this Wikimedia Commons file and return JSON that follows the schema below.

FILE METADATA
- Title: ${item.cleanTitle} (${item.title})
- Description on Commons: ${item.description || 'None'}
- Creator: ${item.author || item.credit || 'Not recorded'}
- Date: ${item.date || 'Not recorded'}
- Media type: ${item.mediaType} (${item.mimeType})
- Size: ${[dims, sizeMb].filter(Boolean).join(', ') || 'Not recorded'}
- Coordinates: ${geo || 'Not recorded'}
- License: ${item.licenseShort} (${item.licenseFull})
- License page: ${item.licenseUrl || 'Not recorded'}
- Credit required: ${item.attributionRequired ? 'Yes' : 'No or not stated'}
- Commons categories: ${item.categories.slice(0, 8).join(', ') || 'None'}
- Source: ${item.pageUrl}
- ${usageContext}

JSON SCHEMA
{
  "objectDescription": {
    "laymanSummary": "Three or four plain sentences. Say what this is, who made or published it, when and where (only if recorded), and why it exists or why someone might care. Start with the subject itself.",
    "keyHighlights": [
      "4 to 6 short facts. Start each with a label, for example: Creator: ..., Date: ..., Place: ..., Format: ..., Event: ..., Subject: ... Leave out any label you have no data for."
    ],
    "usageIdeas": [
      "2 to 4 concrete ways someone could use this file, one short sentence each, for example: a slide for a class on local history. Keep them realistic for this license."
    ]
  },
  "licenseExplanation": {
    "licenseName": "${item.licenseShort}",
    "shortSummary": "Two or three plain sentences: what this license is and what it lets you do, in everyday words",
    "commercialUse": "Yes or no, then one sentence on any condition",
    "modificationRules": "Whether the file can be cropped, edited, or remixed, then one sentence on any condition",
    "watchOut": "One or two sentences on what to check besides the license, for example people shown in the file, logos, artworks or buildings visible in it, or details the metadata does not give. Name the specific thing for this file when you can.",
    "attributionGuide": "A ready-to-paste credit line using the real values above, in TASL order: Title, Author, Source (the file page URL), License (name and link)"
  }
}`
    : `Jelaskan berkas Wikimedia Commons ini dan kembalikan JSON sesuai skema di bawah.

METADATA BERKAS
- Judul: ${item.cleanTitle} (${item.title})
- Deskripsi di Commons: ${item.description || 'Tidak ada'}
- Pembuat: ${item.author || item.credit || 'Tidak tercatat'}
- Tanggal: ${item.date || 'Tidak tercatat'}
- Tipe media: ${item.mediaType} (${item.mimeType})
- Ukuran: ${[dims, sizeMb].filter(Boolean).join(', ') || 'Tidak tercatat'}
- Koordinat: ${geo || 'Tidak tercatat'}
- Lisensi: ${item.licenseShort} (${item.licenseFull})
- Halaman lisensi: ${item.licenseUrl || 'Tidak tercatat'}
- Wajib kredit: ${item.attributionRequired ? 'Ya' : 'Tidak atau tidak disebutkan'}
- Kategori Commons: ${item.categories.slice(0, 8).join(', ') || 'Tidak ada'}
- Sumber: ${item.pageUrl}
- ${usageContext}

SKEMA JSON
{
  "objectDescription": {
    "laymanSummary": "Tiga atau empat kalimat sederhana. Sebutkan ini apa, siapa yang membuat atau menerbitkannya, kapan dan di mana (hanya kalau tercatat), dan kenapa berkas ini ada atau kenapa orang mungkin tertarik. Mulai dari bendanya langsung.",
    "keyHighlights": [
      "4 sampai 6 fakta pendek. Awali tiap fakta dengan label, misalnya: Pembuat: ..., Tanggal: ..., Tempat: ..., Format: ..., Acara: ..., Isi: ... Lewati label yang datanya tidak ada."
    ],
    "usageIdeas": [
      "2 sampai 4 contoh pemakaian yang nyata, satu kalimat pendek tiap contoh, misalnya: slide untuk kelas sejarah lokal. Sesuaikan dengan lisensi berkas ini."
    ]
  },
  "licenseExplanation": {
    "licenseName": "${item.licenseShort}",
    "shortSummary": "Dua atau tiga kalimat sederhana: lisensi ini apa dan apa yang boleh Anda lakukan, dengan kata sehari-hari",
    "commercialUse": "Boleh atau tidak, lalu satu kalimat soal syaratnya",
    "modificationRules": "Boleh atau tidak dipotong, diedit, atau diolah ulang, lalu satu kalimat soal syaratnya",
    "watchOut": "Satu atau dua kalimat tentang hal yang perlu dicek selain lisensi, misalnya orang yang tampak di berkas, logo, karya seni atau bangunan yang terlihat, atau hal yang tidak dijelaskan metadata. Sebut hal spesifik untuk berkas ini kalau bisa.",
    "attributionGuide": "Teks kredit siap salin memakai nilai asli di atas, urutan TASL: Judul, Pembuat, Sumber (URL halaman berkas), Lisensi (nama dan tautan)"
  }
}`;

  return { system, user };
}

export function buildAreaPrompt(
  lat: number,
  lng: number,
  address: string,
  photos: AreaPhoto[],
  photosTotal: number,
  lang: Lang
): Prompt {
  const isEn = lang === 'en';
  const photoListText = photos
    .slice(0, 15)
    .map((p, i) => `${i + 1}. ${p.cleanTitle} (${p.licenseShort}, ${isEn ? 'by' : 'oleh'} ${p.author || 'Commons'})`)
    .join('\n');

  const system = isEn
    ? `You describe places using Wikimedia Commons photos and an address. Write like a local guide who sticks to what is known: plain words, short sentences.

Rules:
1. Do not invent events, buildings, or people. Use only the address, the coordinates, and the photo list below.
2. If there is little to go on, say so plainly instead of filling the gap.
3. No hype. Avoid words like vibrant, rich, tapestry, testament, hidden gem and nestled.
4. Return valid JSON only, in the schema given.`
    : `Kamu menjelaskan sebuah tempat memakai foto Wikimedia Commons dan alamatnya. Tulis seperti pemandu lokal yang hanya bicara soal yang jelas: kata sehari-hari, kalimat pendek.

Aturan:
1. Jangan mengarang peristiwa, bangunan, atau tokoh. Pakai hanya alamat, koordinat, dan daftar foto di bawah.
2. Kalau bahan sedikit, katakan apa adanya. Jangan diisi-isi.
3. Tanpa kata promosi. Hindari kata seperti menakjubkan, memukau, kaya akan, sarat makna, dan permata tersembunyi.
4. Keluarkan JSON valid saja, sesuai skema.`;

  const user = isEn
    ? `Describe this area from its coordinates, address, and nearby Wikimedia Commons photos.
Coordinates: ${lat.toFixed(5)}, ${lng.toFixed(5)}
Address: ${address || 'Not available yet'}
Photos nearby: ${photosTotal}
Sample files:
${photoListText || 'No sample files'}

Return JSON in this schema:
{
  "areaOverview": "Two or three plain sentences about this place and what it is known for, based only on the address and coordinates",
  "identifiedLandmarks": ["Place or topic 1", "Place or topic 2", "Place or topic 3"],
  "photosSummary": "What the nearby photos show, in a few plain sentences",
  "curatorInsight": "One or two sentences on what these photos add to Wikimedia for this area, or what seems to be missing"
}`
    : `Jelaskan area ini dari koordinat, alamat, dan foto Wikimedia Commons di sekitarnya.
Koordinat: Lintang ${lat.toFixed(5)}, Bujur ${lng.toFixed(5)}
Alamat: ${address || 'Belum tersedia'}
Jumlah foto di sekitar: ${photosTotal}
Contoh berkas:
${photoListText || 'Tidak ada contoh berkas'}

Kembalikan JSON dengan skema ini:
{
  "areaOverview": "Dua atau tiga kalimat sederhana tentang tempat ini dan apa yang membuatnya dikenal, hanya berdasarkan alamat dan koordinat",
  "identifiedLandmarks": ["Tempat atau topik 1", "Tempat atau topik 2", "Tempat atau topik 3"],
  "photosSummary": "Apa yang tampak di foto-foto sekitar, dalam beberapa kalimat sederhana",
  "curatorInsight": "Satu atau dua kalimat tentang apa yang foto-foto ini tambahkan ke Wikimedia untuk area ini, atau apa yang masih kurang"
}`;

  return { system, user };
}
