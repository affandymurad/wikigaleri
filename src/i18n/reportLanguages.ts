/** Bahasa untuk tab Wikivoyage: dipakai untuk label tabel, deskripsi Commons, dan edisi Wikivoyage */
export interface ReportLanguage {
  code: string;
  name: string;
  flagCode: string;
}

export const REPORT_LANGUAGES: ReportLanguage[] = [
  { code: 'en', name: 'English', flagCode: 'us' },
  { code: 'id', name: 'Bahasa Indonesia', flagCode: 'id' },
  { code: 'ms', name: 'Bahasa Melayu', flagCode: 'my' },
  { code: 'ko', name: '한국어', flagCode: 'kr' },
  { code: 'es', name: 'Español', flagCode: 'es' },
  { code: 'fr', name: 'Français', flagCode: 'fr' },
  { code: 'de', name: 'Deutsch', flagCode: 'de' },
  { code: 'ja', name: '日本語', flagCode: 'jp' },
  { code: 'zh', name: '中文', flagCode: 'cn' },
  { code: 'ar', name: 'العربية', flagCode: 'sa' },
  { code: 'nl', name: 'Nederlands', flagCode: 'nl' },
  { code: 'ru', name: 'Русский', flagCode: 'ru' },
  { code: 'th', name: 'ไทย', flagCode: 'th' },
  { code: 'ta', name: 'தமிழ்', flagCode: 'in' },
  { code: 'he', name: 'עברית', flagCode: 'il' },
];

/** Bahasa dengan edisi Wikivoyage sendiri (xx.wikivoyage.org); sisanya memakai edisi Inggris */
export const WIKIVOYAGE_EDITIONS = new Set(['en', 'id', 'es', 'fr', 'de', 'ja', 'zh', 'nl', 'ru', 'he']);

export type ReportProject = 'wikivoyage' | 'wikipedia';

/** Edisi yang tersedia per proyek: Wikipedia ada di semua 15 bahasa */
export const projectEditions = (project: ReportProject): Set<string> =>
  project === 'wikipedia' ? new Set(REPORT_LANGUAGES.map((l) => l.code)) : WIKIVOYAGE_EDITIONS;

export const RTL_LANGUAGES = new Set(['ar', 'he']);

export const editionFor = (project: ReportProject, lang: string): string => (projectEditions(project).has(lang) ? lang : 'en');

export interface ReportText {
  languageLabel: string;
  title: string; // {cat} {edition}
  subtitle: string;
  file: string;
  usedOn: string; // {edition}
  lastUploaded: string;
  description: string;
  caption: string; // {edition}
  loadingCaptions: string; // {done} {total}
  perPage: string;
  all: string;
  txtHint: string;
  searchPlaceholder: string;
  matches: string; // {m} {n}
  noMatch: string; // {q}
  clearSearch: string;
  loadingCategory: string;
  checking: string; // {done} {total}
  count: string; // {n} {total} {edition}
  truncated: string; // {max}
  empty: string; // {edition}
  retry: string;
  noEdition: string; // {lang}
  generated: string;
}

const T = (o: ReportText) => o;

export const REPORT_TEXT: Record<string, ReportText> = {
  en: T({
    languageLabel: 'Interface & data language',
    title: 'Files of {cat} used on {edition} Wikivoyage',
    subtitle: 'Only files directly in this category (subcategories are not included). "Last uploaded" is when the latest version of the file was uploaded.',
    file: 'File', usedOn: 'Used on {edition} Wikivoyage', lastUploaded: 'Last uploaded', description: 'Commons description',
    caption: 'Caption on {edition} Wikivoyage', loadingCaptions: 'Loading Wikivoyage captions… {done}/{total}', perPage: 'Per page', all: 'All',
    txtHint: 'Click TXT to download the table as wiki syntax (.txt) for pasting into a wiki page. PDF includes thumbnails.',
    searchPlaceholder: 'Search in table…', matches: '{m} of {n} rows match', noMatch: 'No rows match “{q}”.', clearSearch: 'Clear search',
    loadingCategory: 'Loading category…', checking: 'Checking files… {done}/{total}',
    count: '{n} of {total} files are used on {edition} Wikivoyage.', truncated: 'Only the first {max} files were checked.',
    empty: 'No file in this category is used on {edition} Wikivoyage.', retry: 'Retry',
    noEdition: 'Wikivoyage has no edition in {lang}; showing English Wikivoyage.', generated: 'Generated',
  }),
  id: T({
    languageLabel: 'Bahasa Antarmuka & Data',
    title: 'Berkas {cat} yang dipakai di Wikivoyage {edition}',
    subtitle: 'Hanya berkas langsung di kategori ini (subkategori tidak ikut). "Terakhir diunggah" adalah waktu versi terbaru berkas diunggah.',
    file: 'Berkas', usedOn: 'Dipakai di Wikivoyage {edition}', lastUploaded: 'Terakhir diunggah', description: 'Deskripsi Commons',
    caption: 'Keterangan di Wikivoyage {edition}', loadingCaptions: 'Memuat keterangan Wikivoyage… {done}/{total}', perPage: 'Per halaman', all: 'Semua',
    txtHint: 'Klik TXT untuk mengunduh tabel dalam sintaks wiki (.txt) yang siap ditempel ke halaman wiki. PDF memuat gambar mini.',
    searchPlaceholder: 'Cari di tabel…', matches: '{m} dari {n} baris cocok', noMatch: 'Tidak ada baris yang cocok dengan “{q}”.', clearSearch: 'Hapus pencarian',
    loadingCategory: 'Memuat kategori…', checking: 'Memeriksa berkas… {done}/{total}',
    count: '{n} dari {total} berkas dipakai di Wikivoyage {edition}.', truncated: 'Hanya {max} berkas pertama yang diperiksa.',
    empty: 'Tidak ada berkas di kategori ini yang dipakai di Wikivoyage {edition}.', retry: 'Coba lagi',
    noEdition: 'Wikivoyage tidak punya edisi {lang}; menampilkan Wikivoyage Inggris.', generated: 'Dibuat',
  }),
  ms: T({
    languageLabel: 'Bahasa Antara Muka & Data',
    title: 'Fail {cat} yang digunakan di Wikivoyage {edition}',
    subtitle: 'Hanya fail terus dalam kategori ini (subkategori tidak termasuk). "Terakhir dimuat naik" ialah masa versi terkini fail dimuat naik.',
    file: 'Fail', usedOn: 'Digunakan di Wikivoyage {edition}', lastUploaded: 'Terakhir dimuat naik', description: 'Keterangan Commons',
    caption: 'Kapsyen di Wikivoyage {edition}', loadingCaptions: 'Memuatkan kapsyen Wikivoyage… {done}/{total}', perPage: 'Setiap halaman', all: 'Semua',
    txtHint: 'Klik TXT untuk memuat turun jadual dalam sintaks wiki (.txt) untuk ditampal ke halaman wiki. PDF mengandungi imej kecil.',
    searchPlaceholder: 'Cari dalam jadual…', matches: '{m} daripada {n} baris sepadan', noMatch: 'Tiada baris sepadan dengan “{q}”.', clearSearch: 'Kosongkan carian',
    loadingCategory: 'Memuatkan kategori…', checking: 'Memeriksa fail… {done}/{total}',
    count: '{n} daripada {total} fail digunakan di Wikivoyage {edition}.', truncated: 'Hanya {max} fail pertama diperiksa.',
    empty: 'Tiada fail dalam kategori ini yang digunakan di Wikivoyage {edition}.', retry: 'Cuba lagi',
    noEdition: 'Wikivoyage tiada edisi {lang}; memaparkan Wikivoyage Inggeris.', generated: 'Dijana',
  }),
  ko: T({
    languageLabel: '인터페이스 및 데이터 언어',
    title: '{edition} 위키여행에서 사용된 {cat}의 파일',
    subtitle: '이 분류에 직접 속한 파일만 포함됩니다(하위 분류 제외). "마지막 업로드"는 파일의 최신 버전이 업로드된 시각입니다.',
    file: '파일', usedOn: '{edition} 위키여행에서 사용', lastUploaded: '마지막 업로드', description: 'Commons 설명',
    caption: '{edition} 위키여행의 사진 설명', loadingCaptions: '위키여행 설명 불러오는 중… {done}/{total}', perPage: '페이지당', all: '전체',
    txtHint: 'TXT를 누르면 위키 문법(.txt)으로 표를 내려받아 위키 문서에 붙여넣을 수 있습니다. PDF에는 썸네일이 포함됩니다.',
    searchPlaceholder: '표에서 검색…', matches: '{n}행 중 {m}행 일치', noMatch: '“{q}”와 일치하는 행이 없습니다.', clearSearch: '검색 지우기',
    loadingCategory: '분류를 불러오는 중…', checking: '파일 확인 중… {done}/{total}',
    count: '{total}개 파일 중 {n}개가 {edition} 위키여행에서 사용됩니다.', truncated: '처음 {max}개 파일만 확인했습니다.',
    empty: '이 분류의 파일 중 {edition} 위키여행에서 사용되는 것이 없습니다.', retry: '다시 시도',
    noEdition: '위키여행에는 {lang} 판이 없어 영어 위키여행을 표시합니다.', generated: '생성일',
  }),
  es: T({
    languageLabel: 'Idioma de interfaz y datos',
    title: 'Archivos de {cat} usados en Wikiviajes {edition}',
    subtitle: 'Solo archivos directamente en esta categoría (sin subcategorías). "Última subida" es cuando se subió la versión más reciente del archivo.',
    file: 'Archivo', usedOn: 'Usado en Wikiviajes {edition}', lastUploaded: 'Última subida', description: 'Descripción en Commons',
    caption: 'Pie de foto en Wikiviajes {edition}', loadingCaptions: 'Cargando pies de foto de Wikiviajes… {done}/{total}', perPage: 'Por página', all: 'Todos',
    txtHint: 'Haz clic en TXT para descargar la tabla en sintaxis wiki (.txt) y pegarla en una página wiki. El PDF incluye miniaturas.',
    searchPlaceholder: 'Buscar en la tabla…', matches: '{m} de {n} filas coinciden', noMatch: 'Ninguna fila coincide con «{q}».', clearSearch: 'Borrar búsqueda',
    loadingCategory: 'Cargando categoría…', checking: 'Comprobando archivos… {done}/{total}',
    count: '{n} de {total} archivos se usan en Wikiviajes {edition}.', truncated: 'Solo se comprobaron los primeros {max} archivos.',
    empty: 'Ningún archivo de esta categoría se usa en Wikiviajes {edition}.', retry: 'Reintentar',
    noEdition: 'Wikiviajes no tiene edición en {lang}; se muestra Wikivoyage en inglés.', generated: 'Generado',
  }),
  fr: T({
    languageLabel: "Langue de l'interface et des données",
    title: 'Fichiers de {cat} utilisés sur Wikivoyage {edition}',
    subtitle: "Uniquement les fichiers directement dans cette catégorie (sans sous-catégories). « Dernier import » est la date d'import de la dernière version du fichier.",
    file: 'Fichier', usedOn: 'Utilisé sur Wikivoyage {edition}', lastUploaded: 'Dernier import', description: 'Description Commons',
    caption: 'Légende sur Wikivoyage {edition}', loadingCaptions: 'Chargement des légendes Wikivoyage… {done}/{total}', perPage: 'Par page', all: 'Tous',
    txtHint: 'Cliquez sur TXT pour télécharger le tableau en syntaxe wiki (.txt) à coller dans une page wiki. Le PDF inclut des miniatures.',
    searchPlaceholder: 'Rechercher dans le tableau…', matches: '{m} lignes sur {n} correspondent', noMatch: 'Aucune ligne ne correspond à « {q} ».', clearSearch: 'Effacer la recherche',
    loadingCategory: 'Chargement de la catégorie…', checking: 'Vérification des fichiers… {done}/{total}',
    count: '{n} fichiers sur {total} sont utilisés sur Wikivoyage {edition}.', truncated: 'Seuls les {max} premiers fichiers ont été vérifiés.',
    empty: "Aucun fichier de cette catégorie n'est utilisé sur Wikivoyage {edition}.", retry: 'Réessayer',
    noEdition: "Wikivoyage n'a pas d'édition en {lang} ; affichage de Wikivoyage en anglais.", generated: 'Généré le',
  }),
  de: T({
    languageLabel: 'Oberflächen- & Datensprache',
    title: 'Dateien aus {cat}, die in Wikivoyage {edition} verwendet werden',
    subtitle: 'Nur Dateien direkt in dieser Kategorie (ohne Unterkategorien). „Zuletzt hochgeladen“ ist der Zeitpunkt, an dem die neueste Version der Datei hochgeladen wurde.',
    file: 'Datei', usedOn: 'Verwendet in Wikivoyage {edition}', lastUploaded: 'Zuletzt hochgeladen', description: 'Commons-Beschreibung',
    caption: 'Bildunterschrift in Wikivoyage {edition}', loadingCaptions: 'Wikivoyage-Bildunterschriften werden geladen … {done}/{total}', perPage: 'Pro Seite', all: 'Alle',
    txtHint: 'Mit TXT lässt sich die Tabelle in Wiki-Syntax (.txt) zum Einfügen in eine Wikiseite herunterladen. Das PDF enthält Vorschaubilder.',
    searchPlaceholder: 'In der Tabelle suchen …', matches: '{m} von {n} Zeilen passen', noMatch: 'Keine Zeile passt zu „{q}“.', clearSearch: 'Suche löschen',
    loadingCategory: 'Kategorie wird geladen …', checking: 'Dateien werden geprüft … {done}/{total}',
    count: '{n} von {total} Dateien werden in Wikivoyage {edition} verwendet.', truncated: 'Nur die ersten {max} Dateien wurden geprüft.',
    empty: 'Keine Datei dieser Kategorie wird in Wikivoyage {edition} verwendet.', retry: 'Erneut versuchen',
    noEdition: 'Wikivoyage hat keine Ausgabe auf {lang}; die englische Wikivoyage wird angezeigt.', generated: 'Erstellt',
  }),
  ja: T({
    languageLabel: 'インターフェースとデータの言語',
    title: '{edition}版ウィキボヤージュで使われている {cat} のファイル',
    subtitle: 'このカテゴリに直接含まれるファイルのみ(サブカテゴリは含みません)。「最終アップロード」はファイルの最新版がアップロードされた日時です。',
    file: 'ファイル', usedOn: '{edition}版ウィキボヤージュでの使用', lastUploaded: '最終アップロード', description: 'Commons の説明',
    caption: '{edition}版ウィキボヤージュでの説明文', loadingCaptions: 'ウィキボヤージュの説明文を読み込み中… {done}/{total}', perPage: '表示件数', all: 'すべて',
    txtHint: 'TXT をクリックすると、ウィキ構文(.txt)の表をダウンロードしてウィキのページに貼り付けられます。PDF にはサムネイルが含まれます。',
    searchPlaceholder: '表内を検索…', matches: '{n} 行中 {m} 行が一致', noMatch: '「{q}」に一致する行はありません。', clearSearch: '検索をクリア',
    loadingCategory: 'カテゴリを読み込み中…', checking: 'ファイルを確認中… {done}/{total}',
    count: '{total} 件中 {n} 件のファイルが{edition}版ウィキボヤージュで使われています。', truncated: '最初の {max} 件のみ確認しました。',
    empty: 'このカテゴリのファイルは{edition}版ウィキボヤージュで使われていません。', retry: '再試行',
    noEdition: 'ウィキボヤージュには{lang}版がないため、英語版を表示しています。', generated: '作成日',
  }),
  zh: T({
    languageLabel: '界面与数据语言',
    title: '{cat} 中被{edition}维基导游使用的文件',
    subtitle: '仅包含直接位于此分类的文件(不含子分类)。“最后上传”指文件最新版本的上传时间。',
    file: '文件', usedOn: '在{edition}维基导游中的使用', lastUploaded: '最后上传', description: 'Commons 说明',
    caption: '{edition}维基导游中的图片说明', loadingCaptions: '正在加载维基导游图片说明… {done}/{total}', perPage: '每页', all: '全部',
    txtHint: '点击 TXT 可下载维基语法(.txt)格式的表格,以便粘贴到维基页面。PDF 包含缩略图。',
    searchPlaceholder: '在表格中搜索…', matches: '{n} 行中有 {m} 行匹配', noMatch: '没有与“{q}”匹配的行。', clearSearch: '清除搜索',
    loadingCategory: '正在加载分类…', checking: '正在检查文件… {done}/{total}',
    count: '{total} 个文件中有 {n} 个被{edition}维基导游使用。', truncated: '仅检查了前 {max} 个文件。',
    empty: '此分类中没有文件被{edition}维基导游使用。', retry: '重试',
    noEdition: '维基导游没有{lang}版本;正在显示英文维基导游。', generated: '生成于',
  }),
  ar: T({
    languageLabel: 'لغة الواجهة والبيانات',
    title: 'ملفات {cat} المستخدمة في ويكي السفر ({edition})',
    subtitle: 'الملفات الموجودة مباشرة في هذا التصنيف فقط (دون التصنيفات الفرعية). «آخر رفع» هو وقت رفع أحدث نسخة من الملف.',
    file: 'الملف', usedOn: 'مستخدم في ويكي السفر ({edition})', lastUploaded: 'آخر رفع', description: 'وصف كومنز',
    caption: 'تعليق الصورة في ويكي السفر ({edition})', loadingCaptions: 'جارٍ تحميل تعليقات ويكي السفر… {done}/{total}', perPage: 'لكل صفحة', all: 'الكل',
    txtHint: 'انقر على TXT لتنزيل الجدول بصيغة ويكي (.txt) ولصقه في صفحة ويكي. يتضمن ملف PDF صورًا مصغرة.',
    searchPlaceholder: 'ابحث في الجدول…', matches: '{m} من {n} صفًا مطابقة', noMatch: 'لا توجد صفوف تطابق «{q}».', clearSearch: 'مسح البحث',
    loadingCategory: 'جارٍ تحميل التصنيف…', checking: 'جارٍ فحص الملفات… {done}/{total}',
    count: '{n} من أصل {total} ملفًا مستخدمة في ويكي السفر ({edition}).', truncated: 'تم فحص أول {max} ملف فقط.',
    empty: 'لا يوجد ملف في هذا التصنيف مستخدم في ويكي السفر ({edition}).', retry: 'إعادة المحاولة',
    noEdition: 'لا توجد نسخة من ويكي السفر بلغة {lang}؛ يتم عرض النسخة الإنجليزية.', generated: 'أُنشئ في',
  }),
  nl: T({
    languageLabel: 'Interface- en datataal',
    title: "Bestanden uit {cat} die op Wikivoyage {edition} worden gebruikt",
    subtitle: 'Alleen bestanden die rechtstreeks in deze categorie staan (geen subcategorieën). "Laatst geüpload" is het moment waarop de nieuwste versie van het bestand is geüpload.',
    file: 'Bestand', usedOn: 'Gebruikt op Wikivoyage {edition}', lastUploaded: 'Laatst geüpload', description: 'Commons-beschrijving',
    caption: 'Onderschrift op Wikivoyage {edition}', loadingCaptions: 'Wikivoyage-onderschriften laden… {done}/{total}', perPage: 'Per pagina', all: 'Alles',
    txtHint: 'Klik op TXT om de tabel als wikisyntaxis (.txt) te downloaden en in een wikipagina te plakken. De PDF bevat miniaturen.',
    searchPlaceholder: 'Zoeken in tabel…', matches: '{m} van {n} rijen komen overeen', noMatch: 'Geen rijen komen overeen met “{q}”.', clearSearch: 'Zoekopdracht wissen',
    loadingCategory: 'Categorie laden…', checking: 'Bestanden controleren… {done}/{total}',
    count: '{n} van {total} bestanden worden gebruikt op Wikivoyage {edition}.', truncated: 'Alleen de eerste {max} bestanden zijn gecontroleerd.',
    empty: 'Geen enkel bestand in deze categorie wordt gebruikt op Wikivoyage {edition}.', retry: 'Opnieuw proberen',
    noEdition: 'Wikivoyage heeft geen {lang} editie; de Engelse Wikivoyage wordt getoond.', generated: 'Aangemaakt',
  }),
  ru: T({
    languageLabel: 'Язык интерфейса и данных',
    title: 'Файлы из {cat}, используемые в Викигиде ({edition})',
    subtitle: 'Только файлы непосредственно в этой категории (без подкатегорий). «Последняя загрузка» — время загрузки последней версии файла.',
    file: 'Файл', usedOn: 'Используется в Викигиде ({edition})', lastUploaded: 'Последняя загрузка', description: 'Описание на Commons',
    caption: 'Подпись в Викигиде ({edition})', loadingCaptions: 'Загрузка подписей Викигида… {done}/{total}', perPage: 'На странице', all: 'Все',
    txtHint: 'Нажмите TXT, чтобы скачать таблицу в вики-разметке (.txt) для вставки на вики-страницу. PDF содержит миниатюры.',
    searchPlaceholder: 'Поиск по таблице…', matches: 'Совпадений: {m} из {n} строк', noMatch: 'Нет строк, соответствующих «{q}».', clearSearch: 'Очистить поиск',
    loadingCategory: 'Загрузка категории…', checking: 'Проверка файлов… {done}/{total}',
    count: '{n} из {total} файлов используются в Викигиде ({edition}).', truncated: 'Проверены только первые {max} файлов.',
    empty: 'Ни один файл этой категории не используется в Викигиде ({edition}).', retry: 'Повторить',
    noEdition: 'У Викигида нет раздела на языке «{lang}»; показан английский Wikivoyage.', generated: 'Создано',
  }),
  th: T({
    languageLabel: 'ภาษาของอินเทอร์เฟซและข้อมูล',
    title: 'ไฟล์ของ {cat} ที่ใช้ใน Wikivoyage ({edition})',
    subtitle: 'เฉพาะไฟล์ที่อยู่ในหมวดหมู่นี้โดยตรง (ไม่รวมหมวดหมู่ย่อย) "อัปโหลดล่าสุด" คือเวลาที่อัปโหลดไฟล์เวอร์ชันล่าสุด',
    file: 'ไฟล์', usedOn: 'ใช้ใน Wikivoyage ({edition})', lastUploaded: 'อัปโหลดล่าสุด', description: 'คำอธิบายใน Commons',
    caption: 'คำบรรยายภาพใน Wikivoyage ({edition})', loadingCaptions: 'กำลังโหลดคำบรรยายภาพจาก Wikivoyage… {done}/{total}', perPage: 'ต่อหน้า', all: 'ทั้งหมด',
    txtHint: 'คลิก TXT เพื่อดาวน์โหลดตารางในรูปแบบไวยากรณ์วิกิ (.txt) สำหรับวางในหน้าวิกิ ส่วน PDF มีภาพขนาดย่อ',
    searchPlaceholder: 'ค้นหาในตาราง…', matches: 'ตรงกัน {m} จาก {n} แถว', noMatch: 'ไม่มีแถวที่ตรงกับ “{q}”', clearSearch: 'ล้างการค้นหา',
    loadingCategory: 'กำลังโหลดหมวดหมู่…', checking: 'กำลังตรวจสอบไฟล์… {done}/{total}',
    count: '{n} จาก {total} ไฟล์ถูกใช้ใน Wikivoyage ({edition})', truncated: 'ตรวจสอบเฉพาะ {max} ไฟล์แรก',
    empty: 'ไม่มีไฟล์ในหมวดหมู่นี้ที่ใช้ใน Wikivoyage ({edition})', retry: 'ลองอีกครั้ง',
    noEdition: 'Wikivoyage ไม่มีฉบับภาษา {lang} จึงแสดง Wikivoyage ภาษาอังกฤษ', generated: 'สร้างเมื่อ',
  }),
  ta: T({
    languageLabel: 'இடைமுகம் & தரவு மொழி',
    title: '{edition} விக்கிப்பயணத்தில் பயன்படுத்தப்படும் {cat} கோப்புகள்',
    subtitle: 'இந்த வகையில் நேரடியாக உள்ள கோப்புகள் மட்டும் (துணை வகைகள் இல்லை). "கடைசியாக பதிவேற்றம்" என்பது கோப்பின் புதிய பதிப்பு பதிவேற்றப்பட்ட நேரம்.',
    file: 'கோப்பு', usedOn: '{edition} விக்கிப்பயணத்தில் பயன்பாடு', lastUploaded: 'கடைசியாக பதிவேற்றம்', description: 'Commons விளக்கம்',
    caption: '{edition} விக்கிப்பயணத்தில் பட விளக்கம்', loadingCaptions: 'விக்கிப்பயண விளக்கங்கள் ஏற்றப்படுகின்றன… {done}/{total}', perPage: 'ஒரு பக்கத்திற்கு', all: 'அனைத்தும்',
    txtHint: 'விக்கி பக்கத்தில் ஒட்ட, TXT ஐ சொடுக்கி அட்டவணையை விக்கி தொடரியலில் (.txt) பதிவிறக்கலாம். PDF இல் சிறுபடங்கள் உள்ளன.',
    searchPlaceholder: 'அட்டவணையில் தேடுக…', matches: '{n} வரிசைகளில் {m} பொருந்துகின்றன', noMatch: '“{q}” உடன் பொருந்தும் வரிசை இல்லை.', clearSearch: 'தேடலை அழி',
    loadingCategory: 'வகை ஏற்றப்படுகிறது…', checking: 'கோப்புகள் சரிபார்க்கப்படுகின்றன… {done}/{total}',
    count: '{total} கோப்புகளில் {n} கோப்புகள் {edition} விக்கிப்பயணத்தில் பயன்படுகின்றன.', truncated: 'முதல் {max} கோப்புகள் மட்டுமே சரிபார்க்கப்பட்டன.',
    empty: 'இந்த வகையில் உள்ள எந்த கோப்பும் {edition} விக்கிப்பயணத்தில் பயன்படுத்தப்படவில்லை.', retry: 'மீண்டும் முயல்க',
    noEdition: 'விக்கிப்பயணத்தில் {lang} பதிப்பு இல்லை; ஆங்கில விக்கிப்பயணம் காட்டப்படுகிறது.', generated: 'உருவாக்கியது',
  }),
  he: T({
    languageLabel: 'שפת הממשק והנתונים',
    title: 'קבצים מ-{cat} שבשימוש בוויקימסע ({edition})',
    subtitle: 'רק קבצים שנמצאים ישירות בקטגוריה זו (ללא תתי-קטגוריות). "הועלה לאחרונה" הוא מועד העלאת הגרסה העדכנית של הקובץ.',
    file: 'קובץ', usedOn: 'בשימוש בוויקימסע ({edition})', lastUploaded: 'הועלה לאחרונה', description: 'תיאור ב-Commons',
    caption: 'כיתוב בוויקימסע ({edition})', loadingCaptions: 'טוען כיתובים מוויקימסע… {done}/{total}', perPage: 'בכל עמוד', all: 'הכול',
    txtHint: 'לחצו על TXT להורדת הטבלה בתחביר ויקי (.txt) להדבקה בדף ויקי. קובץ ה-PDF כולל תמונות ממוזערות.',
    searchPlaceholder: 'חיפוש בטבלה…', matches: '{m} מתוך {n} שורות תואמות', noMatch: 'אין שורות התואמות ל-“{q}”.', clearSearch: 'נקה חיפוש',
    loadingCategory: 'טוען קטגוריה…', checking: 'בודק קבצים… {done}/{total}',
    count: '{n} מתוך {total} קבצים בשימוש בוויקימסע ({edition}).', truncated: 'נבדקו רק {max} הקבצים הראשונים.',
    empty: 'אין קובץ בקטגוריה זו שבשימוש בוויקימסע ({edition}).', retry: 'נסה שוב',
    noEdition: 'אין לוויקימסע מהדורה ב{lang}; מוצג וויקימסע באנגלית.', generated: 'נוצר',
  }),
};

export const fillText = (s: string, vars: Record<string, string | number>) =>
  s.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''));

/** Nama edisi untuk judul, mis. "en" -> "English" dalam bahasa antarmuka yang dipilih */
export const editionLabel = (edition: string) => REPORT_LANGUAGES.find((l) => l.code === edition)?.name ?? edition.toUpperCase();

/** Pasangan [nama Wikivoyage, nama Wikipedia] dalam tiap bahasa, urut dari bentuk terpanjang; dipakai untuk membentuk teks Wikipedia dari teks Wikivoyage */
const PROJECT_SWAP: Record<string, [string, string][]> = {
  en: [['Wikivoyage', 'Wikipedia']],
  id: [['Wikivoyage', 'Wikipedia']],
  ms: [['Wikivoyage', 'Wikipedia']],
  ko: [['위키여행', '위키백과']],
  es: [['Wikiviajes', 'Wikipedia'], ['Wikivoyage', 'Wikipedia']],
  fr: [['Wikivoyage', 'Wikipédia']],
  de: [['Wikivoyage', 'Wikipedia']],
  ja: [['ウィキボヤージュ', 'ウィキペディア']],
  zh: [['维基导游', '维基百科']],
  ar: [['ويكي السفر', 'ويكيبيديا']],
  nl: [['Wikivoyage', 'Wikipedia']],
  ru: [['Викигиде', 'Википедии'], ['Викигид', 'Википедия'], ['Wikivoyage', 'Wikipedia']],
  th: [['Wikivoyage', 'Wikipedia'], ['วิกิพีเดีย', 'วิกิพีเดีย']],
  ta: [['விக்கிப்பயணத்தில்', 'விக்கிப்பீடியாவில்'], ['விக்கிப்பயணம்', 'விக்கிப்பீடியா'], ['விக்கிப்பயண', 'விக்கிப்பீடியா']],
  he: [['וויקימסע', 'ויקיפדיה']],
};

/** Teks laporan untuk bahasa dan proyek tertentu */
export const reportTextFor = (lang: string, project: ReportProject): ReportText => {
  const base = REPORT_TEXT[lang] || REPORT_TEXT.en;
  if (project === 'wikivoyage') return base;
  const swaps = PROJECT_SWAP[lang] || PROJECT_SWAP.en;
  const out = { ...base } as Record<string, string>;
  for (const [k, v] of Object.entries(base)) {
    let t = v as string;
    for (const [from, to] of swaps) t = t.split(from).join(to);
    out[k] = t;
  }
  return out as unknown as ReportText;
};
