import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Download, ExternalLink, FileCode, FileText, ListPlus, Loader2, Search, Upload, X } from 'lucide-react';
import { BulkFileRow, fetchBulkFiles, fetchCategoryFileNames } from '../services/wikimediaApi';
import { extensionOf, parseBulkList } from '../utils/bulkFiles';
import { parseBulkCategory, parseBulkFiles, withBulkCategory, withBulkFiles } from '../utils/urlState';

interface BulkFilesSectionProps {
  language?: 'en' | 'id';
  /** Kategori Commons yang berkasnya dimuat saat tab dibuka (tombol Bulk di mode Kategori); ?category= di URL berlaku sama */
  seedCategory?: string | null;
}

const BULK_MAX_FILES = 2000;
const SAMPLE_CATEGORY = 'Wikilokal';
const SAMPLE_LIMIT = BULK_MAX_FILES;
const MAX_TXT_BYTES = 1024 * 1024;
const PAGE_SIZES = [5, 10, 15, 20, 25, 50, 100]; // 0 = semua

const TEXT = {
  en: {
    title: 'Bulk file check',
    subtitle: 'Paste file names, one per line, or upload a TXT file. Each name is looked up once on Wikimedia Commons.',
    inputLabel: 'List of file names (one per line)',
    placeholder: 'Visa policy of Turkmenistan NewMap.png\nFile:Visa_policy_of_the_USA.svg\nhttps://commons.wikimedia.org/wiki/File:Example.jpg',
    hint: 'The “File:” prefix, underscores, Commons links, and names without an extension are accepted (every file with that name is listed). Names listed more than once are checked once.',
    upload: 'Upload TXT',
    txtOnly: 'TXT files only (.txt)',
    notTxt: 'Only TXT files (.txt) are accepted.',
    tooBig: 'The TXT file is larger than 1 MB.',
    readFail: 'The file could not be read.',
    overwrite: 'Replace the current list with the contents of this file?',
    run: 'Search',
    clear: 'Clear',
    sample: 'Sample: all files of Wikilokal',
    sampleFail: 'Could not load the category files.',
    loadingTitle: 'Loading',
    loadingCategory: (c: string) => `Loading files of the category “${c}”…`,
    sampleEmpty: 'The category has no files.',
    empty: 'Enter at least one file name first.',
    parsedTitle: (n: number) => `${n.toLocaleString('en-US')} unique file names`,
    dupLine: (d: number) => (d ? `${d} duplicate name${d === 1 ? '' : 's'} found; each is checked once.` : 'No duplicates found.'),
    dupSummary: (n: number) => `Duplicates (${n})`,
    listedIn: 'lines',
    sameFile: 'Different names that lead to the same file',
    sameFileLine: (a: string, b: string) => `“${a}” and “${b}”`,
    truncated: (max: number) => `Only the first ${max.toLocaleString('en-US')} names are checked.`,
    checking: (d: number, n: number) => `Checking Commons: ${d.toLocaleString('en-US')} of ${n.toLocaleString('en-US')} files`,
    retry: 'Try again',
    count: (n: number, total: number) => `${n.toLocaleString('en-US')} of ${total.toLocaleString('en-US')} files shown`,
    found: (f: number, m: number) => `${f.toLocaleString('en-US')} found, ${m.toLocaleString('en-US')} not found`,
    headers: ['File', 'Keyword', 'Original file name', 'Extension', 'Last uploaded', 'Uploader', 'Commons description'],
    notFound: 'Not found on Commons',
    redirect: 'redirect',
    searchPlaceholder: 'Search the table…',
    clearSearch: 'Clear search',
    matches: (m: number, n: number) => `${m} of ${n} match`,
    noMatch: (q: string) => `No row matches “${q}”.`,
    perPage: 'Per page',
    all: 'All',
    txtHint: 'Click TXT to download the table in wiki syntax (a wikitable to paste into a wiki page). TXT and PDF include thumbnails.',
    generated: 'Generated',
    csvTitle: 'CSV',
  },
  id: {
    title: 'Pemeriksaan berkas massal',
    subtitle: 'Tempel nama berkas, satu per baris, atau unggah berkas TXT. Tiap nama dicari sekali di Wikimedia Commons.',
    inputLabel: 'Daftar nama berkas (satu per baris)',
    placeholder: 'Visa policy of Turkmenistan NewMap.png\nFile:Visa_policy_of_the_USA.svg\nhttps://commons.wikimedia.org/wiki/File:Example.jpg',
    hint: 'Awalan “File:”, garis bawah, tautan Commons, dan nama tanpa ekstensi diterima (semua berkas dengan nama itu ditampilkan). Nama yang tercantum lebih dari sekali hanya dicek sekali.',
    upload: 'Unggah TXT',
    txtOnly: 'Hanya berkas TXT (.txt)',
    notTxt: 'Hanya berkas TXT (.txt) yang diterima.',
    tooBig: 'Berkas TXT lebih besar dari 1 MB.',
    readFail: 'Berkas tidak dapat dibaca.',
    overwrite: 'Ganti daftar saat ini dengan isi berkas ini?',
    run: 'Cari',
    clear: 'Bersihkan',
    sample: 'Contoh: semua berkas Wikilokal',
    sampleFail: 'Berkas kategori tidak dapat dimuat.',
    loadingTitle: 'Memuat',
    loadingCategory: (c: string) => `Memuat berkas kategori “${c}”…`,
    sampleEmpty: 'Kategori ini tidak punya berkas.',
    empty: 'Isi setidaknya satu nama berkas dulu.',
    parsedTitle: (n: number) => `${n.toLocaleString('id-ID')} nama berkas unik`,
    dupLine: (d: number) => (d ? `${d} nama ganda ditemukan; masing-masing hanya dicek sekali.` : 'Tidak ada nama ganda.'),
    dupSummary: (n: number) => `Duplikat (${n})`,
    listedIn: 'baris',
    sameFile: 'Nama berbeda yang menuju berkas yang sama',
    sameFileLine: (a: string, b: string) => `“${a}” dan “${b}”`,
    truncated: (max: number) => `Hanya ${max.toLocaleString('id-ID')} nama pertama yang dicek.`,
    checking: (d: number, n: number) => `Memeriksa Commons: ${d.toLocaleString('id-ID')} dari ${n.toLocaleString('id-ID')} berkas`,
    retry: 'Coba lagi',
    count: (n: number, total: number) => `${n.toLocaleString('id-ID')} dari ${total.toLocaleString('id-ID')} berkas ditampilkan`,
    found: (f: number, m: number) => `${f.toLocaleString('id-ID')} ditemukan, ${m.toLocaleString('id-ID')} tidak ditemukan`,
    headers: ['Berkas', 'Kata kunci', 'Nama berkas asli', 'Ekstensi', 'Terakhir diunggah', 'Pengunggah', 'Deskripsi Commons'],
    notFound: 'Tidak ditemukan di Commons',
    redirect: 'pengalihan',
    searchPlaceholder: 'Cari di tabel…',
    clearSearch: 'Hapus pencarian',
    matches: (m: number, n: number) => `${m} dari ${n} cocok`,
    noMatch: (q: string) => `Tidak ada baris yang cocok dengan “${q}”.`,
    perPage: 'Per halaman',
    all: 'Semua',
    txtHint: 'Klik TXT untuk mengunduh tabel dalam sintaks wiki (wikitable yang bisa ditempel ke halaman wiki). TXT dan PDF menyertakan gambar mini.',
    generated: 'Dibuat',
    csvTitle: 'CSV',
  },
} as const;

const commonsFileUrl = (title: string) => `https://commons.wikimedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_')).replace(/%3A/g, ':')}`;
const csvCell = (s: string) => `"${s.replace(/"/g, '""')}"`;

// Teks bebas di dalam sel wikitext: bungkus <nowiki> bila ada karakter yang bisa dibaca sebagai sintaks wiki
const wikiText = (s: string) => {
  const t = s.replace(/\s+/g, ' ').trim();
  return /[|[\]{}<]|~~~|&#?\w+;|^[*#:;=!+-]/.test(t) ? `<nowiki>${t.replace(/<\/?nowiki\s*\/?>/gi, '')}</nowiki>` : t;
};

const pickDescription = (d: Record<string, string>, lang: string) => d[lang] ?? d.default ?? d.en ?? Object.values(d)[0] ?? '';

const download = (blob: Blob, name: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
};

type Notice = { duplicates: { keyword: string; lines: number[] }[]; sameFile: [string, string][]; truncated: boolean };

export const BulkFilesSection: React.FC<BulkFilesSectionProps> = ({ language = 'id', seedCategory = null }) => {
  const tx = TEXT[language];
  const [text, setText] = useState<string>(() => (parseBulkFiles(window.location.search) ?? []).join('\n'));
  const [rows, setRows] = useState<BulkFileRow[] | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [uniqueCount, setUniqueCount] = useState(0);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setErrorState] = useState<string | null>(null);
  const [retryable, setRetryable] = useState(false);
  const setError = (m: string | null, canRetry = false) => {
    setErrorState(m);
    setRetryable(canRetry);
  };
  const [pdfBusy, setPdfBusy] = useState(false);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25); // 0 = semua
  const [dateSort, setDateSort] = useState<'none' | 'asc' | 'desc'>('none');
  const abortRef = useRef<AbortController | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  // Daftar dari kategori ditulis sebagai ?category=; daftar ketikan/unggahan sebagai ?files=
  const writeUrl = (names: string[] | null, category: string | null = null) => {
    try {
      const next = withBulkCategory(withBulkFiles(window.location.search, category ? null : names), category);
      if (next !== window.location.search) window.history.replaceState(window.history.state, '', window.location.pathname + next);
    } catch { /* abaikan */ }
  };

  const run = async (source: string = text, category: string | null = null) => {
    const parsed = parseBulkList(source);
    if (parsed.entries.length === 0) {
      setError(tx.empty);
      return;
    }
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    const entries = parsed.entries.slice(0, BULK_MAX_FILES);
    setError(null);
    setRows(null);
    setQuery('');
    setUniqueCount(parsed.entries.length);
    setProgress({ done: 0, total: entries.length });
    writeUrl(entries.map((e) => e.name), category);
    try {
      const result = await fetchBulkFiles(entries, (done, total) => !ctrl.signal.aborted && setProgress({ done, total }), ctrl.signal);
      if (ctrl.signal.aborted) return;
      // beberapa nama berbeda yang berujung ke berkas Commons yang sama
      const seen = new Map<string, string>();
      const sameFile: [string, string][] = [];
      for (const r of result) {
        if (!r.exists) continue;
        const prev = seen.get(r.title);
        if (prev !== undefined && prev !== r.keyword) sameFile.push([prev, r.keyword]);
        else seen.set(r.title, r.keyword);
      }
      setNotice({
        duplicates: parsed.duplicates.map((d) => ({ keyword: d.keyword, lines: d.lines })),
        sameFile,
        truncated: parsed.entries.length > BULK_MAX_FILES,
      });
      setRows(result);
      setPage(1);
    } catch (e) {
      if (ctrl.signal.aborted) return;
      setError(e instanceof Error ? e.message : String(e), true);
    } finally {
      if (!ctrl.signal.aborted) setProgress(null);
    }
  };

  // Daftar dari URL (?files=) langsung diperiksa saat tab dibuka
  useEffect(() => {
    const cat = seedCategory ?? parseBulkCategory(window.location.search);
    if (cat) void loadCategory(cat);
    else if (text.trim()) void run(text);
    return () => abortRef.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!/\.txt$/i.test(file.name) || (file.type && file.type !== 'text/plain')) {
      setError(tx.notTxt);
      return;
    }
    if (file.size > MAX_TXT_BYTES) {
      setError(tx.tooBig);
      return;
    }
    if (text.trim() && !window.confirm(tx.overwrite)) return;
    try {
      const content = await file.text();
      setText(content);
      setError(null);
      void run(content);
    } catch {
      setError(tx.readFail);
    }
  };

  // Nama berkas sebuah kategori Commons (paling banyak SAMPLE_LIMIT) dimuat ke kotak teks lalu diperiksa
  // sampleBusy: kategori yang sedang dimuat (untuk panel pemuatan); sampleBtnBusy: hanya bila dimulai dari tombol contoh
  const [sampleBusy, setSampleBusy] = useState<string | null>(null);
  const [sampleBtnBusy, setSampleBtnBusy] = useState(false);
  const loadCategory = async (category: string, confirmOverwrite = false) => {
    if (confirmOverwrite && text.trim() && !window.confirm(tx.overwrite)) return;
    setSampleBusy(category);
    setSampleBtnBusy(confirmOverwrite);
    try {
      const names = await fetchCategoryFileNames(category, SAMPLE_LIMIT);
      if (names.length === 0) {
        setError(tx.sampleEmpty);
        return;
      }
      const content = names.join('\n');
      setText(content);
      setError(null);
      void run(content, category);
    } catch {
      setError(tx.sampleFail);
    } finally {
      setSampleBusy(null);
      setSampleBtnBusy(false);
    }
  };
  const loadSample = () => loadCategory(SAMPLE_CATEGORY, true);

  const clearAll = () => {
    abortRef.current?.abort();
    setText('');
    setRows(null);
    setNotice(null);
    setProgress(null);
    setError(null);
    setQuery('');
    writeUrl(null);
  };

  const fmtDate = (iso: string) => {
    if (!iso) return '-';
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString(language === 'id' ? 'id-ID' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
  };
  const nameOf = (r: BulkFileRow) => (r.exists ? r.title.replace(/^File:/, '') : '');
  const extOf = (r: BulkFileRow) => (r.exists ? extensionOf(nameOf(r)) : '');

  const allRows = useMemo(() => {
    const list = rows ?? [];
    if (dateSort === 'none') return list;
    const dir = dateSort === 'desc' ? -1 : 1;
    return [...list].sort((a, b) => dir * a.lastUploaded.localeCompare(b.lastUploaded));
  }, [rows, dateSort]);

  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const filtered = useMemo(() => {
    if (terms.length === 0) return allRows;
    return allRows.filter((r) => {
      const hay = [r.keyword, nameOf(r), extOf(r), r.lastUploaded.slice(0, 10), fmtDate(r.lastUploaded), r.uploader, pickDescription(r.descriptions, language)].join(' ').toLowerCase();
      return terms.every((t) => hay.includes(t));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allRows, query, language]);

  useEffect(() => setPage(1), [query, pageSize, dateSort]);
  const effectiveSize = pageSize === 0 ? Math.max(1, filtered.length) : pageSize;
  const totalPages = Math.max(1, Math.ceil(filtered.length / effectiveSize));
  const curPage = Math.min(page, totalPages);
  const pageRows = filtered.slice((curPage - 1) * effectiveSize, curPage * effectiveSize);
  const pageNumbers = useMemo(() => {
    const set = new Set<number>([1, totalPages, curPage - 1, curPage, curPage + 1]);
    const nums = [...set].filter((n) => n >= 1 && n <= totalPages).sort((a, b) => a - b);
    const out: (number | '…')[] = [];
    nums.forEach((n, i) => {
      if (i > 0 && n - nums[i - 1] > 1) out.push('…');
      out.push(n);
    });
    return out;
  }, [curPage, totalPages]);

  // Ekspor aktif setelah semua data dimuat; selama itu tombol menampilkan persentase
  const dataReady = !!rows && !progress;
  const dataPercent = progress ? (progress.total ? Math.floor((progress.done / progress.total) * 100) : 0) : 100;
  const foundCount = (rows ?? []).filter((r) => r.exists).length;
  const stamp = new Date().toISOString().slice(0, 10);
  const headers = [...tx.headers];
  const titleText = tx.title;

  const exportCsv = () => {
    const lines = filtered.map((r) =>
      [r.exists ? r.title : '', r.keyword, nameOf(r) || tx.notFound, extOf(r), r.lastUploaded, r.uploader, pickDescription(r.descriptions, language)].map(csvCell).join(',')
    );
    const head = headers;
    download(new Blob(['﻿' + [head.map(csvCell).join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' }), `commons_bulk_${stamp}.csv`);
  };

  const exportTxt = () => {
    const lines: string[] = ['{| class="wikitable sortable"', `|+ ${wikiText(titleText)}`, `! ${headers.map(wikiText).join(' !! ')}`];
    for (const r of filtered) {
      lines.push(
        '|-',
        r.exists ? `| [[${r.title}|60px|link=commons:${r.title}]]` : '| -',
        `| ${wikiText(r.keyword)}`,
        r.exists ? `| [[:commons:${r.title}|${nameOf(r)}]]` : `| ${wikiText(tx.notFound)}`,
        `| ${extOf(r) || '-'}`,
        `| ${r.lastUploaded ? r.lastUploaded.slice(0, 10) : '-'}`,
        `| ${wikiText(r.uploader) || '-'}`,
        `| ${wikiText(pickDescription(r.descriptions, language)) || '-'}`
      );
    }
    lines.push('|}');
    download(new Blob([lines.join('\n') + '\n'], { type: 'text/plain;charset=utf-8' }), `commons_bulk_${stamp}.txt`);
  };

  const exportPdf = async () => {
    setPdfBusy(true);
    try {
      const { exportUsageReportPdf } = await import('../utils/usageReportPdf');
      await exportUsageReportPdf({
        title: titleText,
        subtitle: terms.length > 0 ? `${tx.matches(filtered.length, allRows.length)} — “${query.trim()}”` : `${tx.count(filtered.length, allRows.length)} · ${tx.found(foundCount, allRows.length - foundCount)}`,
        footer: `${tx.generated} ${stamp}`,
        headers: [`${headers[0]} / ${headers[2]}`, headers[1], headers[4], headers[5], headers[6]],
        rows: filtered.map((r) => ({
          file: nameOf(r) || tx.notFound,
          fileUrl: r.exists ? commonsFileUrl(r.title) : '',
          thumb: r.thumb,
          articles: r.keyword,
          date: fmtDate(r.lastUploaded),
          caption: r.uploader || '-',
          description: pickDescription(r.descriptions, language) || '-',
        })),
        rtl: false,
        fileName: `commons_bulk_${stamp}.pdf`,
      });
    } catch (e) {
      console.error('PDF export failed:', e);
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setPdfBusy(false);
    }
  };

  const th = 'px-3 py-2 text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400 text-left';
  const actionBtn =
    'inline-flex items-center gap-1.5 rounded-full border border-stone-300 px-3 py-1.5 text-xs font-semibold text-stone-600 hover:bg-stone-50 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed dark:border-stone-600 dark:text-stone-300 dark:hover:bg-stone-800';

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-stone-800 dark:text-stone-100">{titleText}</h2>
          <p className="text-xs text-stone-500 dark:text-stone-400">{tx.subtitle}</p>
          {rows && rows.length > 0 && <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">{tx.txtHint}</p>}
        </div>
        {(rows || progress) && (
          <div className="flex flex-wrap items-center gap-2">
            {([
              { key: 'csv', label: 'CSV', Icon: Download, run: exportCsv, busy: false },
              { key: 'txt', label: 'TXT', Icon: FileCode, run: exportTxt, busy: false },
              { key: 'pdf', label: 'PDF', Icon: FileText, run: exportPdf, busy: pdfBusy },
            ] as const).map(({ key, label, Icon, run: onClick, busy }) => (
              <button
                key={key}
                type="button"
                onClick={onClick}
                disabled={!dataReady || busy || filtered.length === 0}
                title={dataReady ? (key === 'txt' ? 'Wikitext' : label) : `${label}: ${dataPercent}%`}
                className={`relative overflow-hidden ${actionBtn}`}
              >
                {!dataReady && (
                  <span aria-hidden="true" className="absolute inset-y-0 left-0 bg-stone-200/70 dark:bg-stone-700/60 transition-[width] duration-300" style={{ width: `${dataPercent}%` }} />
                )}
                <span className="relative inline-flex items-center gap-1.5">
                  {!dataReady || busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Icon className="w-3.5 h-3.5" />}
                  {label}
                  {!dataReady && <span className="tabular-nums">{dataPercent}%</span>}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <label htmlFor="bulk-input" className="block text-xs font-semibold text-stone-700 dark:text-stone-200">{tx.inputLabel}</label>
        <textarea
          id="bulk-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={tx.placeholder}
          spellCheck={false}
          rows={8}
          className="w-full rounded-xl border border-stone-300 bg-white p-3 font-mono text-xs text-stone-800 placeholder:text-stone-400 focus:border-accent-500 focus:outline-none dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100"
        />
        <p className="text-xs text-stone-500 dark:text-stone-400">{tx.hint}</p>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void run()}
            disabled={!!progress}
            className="inline-flex items-center gap-1.5 rounded-full bg-accent-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-accent-700 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {progress ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
            {tx.run}
          </button>
          <input ref={fileRef} type="file" accept=".txt,text/plain" onChange={onUpload} className="hidden" />
          <button type="button" onClick={() => fileRef.current?.click()} disabled={!!progress} className={actionBtn}>
            <Upload className="w-3.5 h-3.5" />
            {tx.upload}
          </button>
          <button type="button" onClick={() => void loadSample()} disabled={!!progress || !!sampleBusy} className={actionBtn}>
            {sampleBtnBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ListPlus className="w-3.5 h-3.5" />}
            {tx.sample}
          </button>
          <span className="text-xs text-stone-500 dark:text-stone-400">{tx.txtOnly}</span>
          {(text || rows) && (
            <button type="button" onClick={clearAll} className={`${actionBtn} ms-auto`}>
              <X className="w-3.5 h-3.5" />
              {tx.clear}
            </button>
          )}
        </div>
      </div>

      {(sampleBusy || progress) && (
        <section aria-label={tx.loadingTitle} className="rounded-xl border border-stone-200 bg-stone-50 p-4 dark:border-stone-700 dark:bg-stone-800/50" role="status" aria-live="polite">
          <div className="flex items-center gap-2 text-sm font-semibold text-stone-800 dark:text-stone-100">
            <Loader2 className="w-4 h-4 animate-spin text-accent-600" />
            {tx.loadingTitle}
          </div>
          <ol className="mt-2 space-y-2 text-xs text-stone-600 dark:text-stone-300">
            {sampleBusy && (
              <li className="space-y-1">
                <div>{tx.loadingCategory(sampleBusy)}</div>
                <div className="h-1.5 overflow-hidden rounded-full bg-stone-200 dark:bg-stone-700">
                  <div className="h-full w-1/3 animate-pulse rounded-full bg-accent-600" />
                </div>
              </li>
            )}
            {progress && (
              <li className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span>{tx.checking(progress.done, progress.total)}</span>
                  <span className="tabular-nums font-semibold">{dataPercent}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-stone-200 dark:bg-stone-700">
                  <div className="h-full rounded-full bg-accent-600 transition-[width] duration-300" style={{ width: `${dataPercent}%` }} />
                </div>
              </li>
            )}
          </ol>
        </section>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200" role="alert">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="flex-1">{error}</span>
          {retryable && text.trim() && (
            <button type="button" onClick={() => void run()} className="underline font-semibold cursor-pointer">
              {tx.retry}
            </button>
          )}
        </div>
      )}

      {rows && notice && (
        <div
          className={`rounded-lg border p-3 text-xs ${
            notice.duplicates.length || notice.sameFile.length || notice.truncated
              ? 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200'
              : 'border-green-300 bg-green-50 text-green-900 dark:border-green-800 dark:bg-green-950/30 dark:text-green-200'
          }`}
          role="status"
        >
          <b>{tx.parsedTitle(uniqueCount)}</b>
          <ul className="mt-1 list-disc ps-5 space-y-0.5">
            <li>{tx.found(foundCount, rows.length - foundCount)}</li>
            <li>{tx.dupLine(notice.duplicates.length)}</li>
            {notice.truncated && <li>{tx.truncated(BULK_MAX_FILES)}</li>}
          </ul>
          {notice.duplicates.length > 0 && (
            <details className="mt-2" open={notice.duplicates.length <= 12}>
              <summary className="cursor-pointer font-semibold">{tx.dupSummary(notice.duplicates.length)}</summary>
              <ul className="mt-1 max-h-56 overflow-auto list-disc ps-5 space-y-0.5">
                {notice.duplicates.map((d) => (
                  <li key={d.keyword}>
                    <span className="font-semibold">{d.keyword}</span> — {tx.listedIn}: {d.lines.join(', ')}
                  </li>
                ))}
              </ul>
            </details>
          )}
          {notice.sameFile.length > 0 && (
            <details className="mt-2" open={notice.sameFile.length <= 12}>
              <summary className="cursor-pointer font-semibold">{tx.sameFile} ({notice.sameFile.length})</summary>
              <ul className="mt-1 max-h-56 overflow-auto list-disc ps-5 space-y-0.5">
                {notice.sameFile.map(([a, b]) => (
                  <li key={`${a}|${b}`}>{tx.sameFileLine(a, b)}</li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}

      {rows && rows.length > 0 && (
        <>
          <p className="text-xs text-stone-500 dark:text-stone-400">{tx.count(filtered.length, rows.length)}</p>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative w-full max-w-sm">
              <Search className="pointer-events-none absolute top-1/2 start-3 h-3.5 w-3.5 -translate-y-1/2 text-stone-400" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={tx.searchPlaceholder}
                aria-label={tx.searchPlaceholder}
                className="w-full rounded-full border border-stone-300 bg-white py-1.5 ps-9 pe-8 text-xs text-stone-800 placeholder:text-stone-400 focus:border-accent-500 focus:outline-none dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  aria-label={tx.clearSearch}
                  title={tx.clearSearch}
                  className="absolute top-1/2 end-2 -translate-y-1/2 rounded-full p-0.5 text-stone-400 hover:text-stone-700 cursor-pointer dark:hover:text-stone-200"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            {terms.length > 0 && <span className="text-xs text-stone-500 dark:text-stone-400">{tx.matches(filtered.length, allRows.length)}</span>}
          </div>

          {filtered.length === 0 ? (
            <div className="rounded-lg border border-dashed border-stone-300 p-6 text-center text-xs text-stone-500 dark:border-stone-700 dark:text-stone-400">
              {tx.noMatch(query.trim())}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-stone-200 dark:border-stone-700">
              <table className="min-w-full divide-y divide-stone-200 text-xs dark:divide-stone-700">
                <thead className="bg-stone-50 dark:bg-stone-800/60">
                  <tr>
                    <th className={th}>{headers[0]}</th>
                    <th className={th}>{headers[1]}</th>
                    <th className={th}>{headers[2]}</th>
                    <th className={th}>{headers[3]}</th>
                    <th className={th}>
                      <button
                        type="button"
                        onClick={() => setDateSort((s) => (s === 'none' ? 'desc' : s === 'desc' ? 'asc' : 'none'))}
                        className="inline-flex items-center gap-1 uppercase tracking-wide cursor-pointer"
                      >
                        {headers[4]}
                        {dateSort === 'desc' ? <ArrowDown className="w-3 h-3" /> : dateSort === 'asc' ? <ArrowUp className="w-3 h-3" /> : null}
                      </button>
                    </th>
                    <th className={th}>{headers[5]}</th>
                    <th className={th}>{headers[6]}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 bg-white dark:divide-stone-800 dark:bg-stone-900">
                  {pageRows.map((r) => (
                    <tr key={`${r.keyword}|${r.title}`} className="align-top">
                      <td className="px-3 py-2">
                        {r.exists && r.thumb ? (
                          <a href={commonsFileUrl(r.title)} target="_blank" rel="noopener noreferrer" aria-label={nameOf(r)}>
                            <img
                              src={r.thumb}
                              alt=""
                              loading="lazy"
                              referrerPolicy="no-referrer"
                              className="h-12 w-12 rounded border border-stone-200 bg-stone-50 object-contain dark:border-stone-700 dark:bg-stone-800"
                            />
                          </a>
                        ) : (
                          <span className="inline-flex h-12 w-12 items-center justify-center rounded border border-dashed border-stone-300 text-stone-400 dark:border-stone-600">–</span>
                        )}
                      </td>
                      <td className="min-w-40 px-3 py-2 text-stone-700 dark:text-stone-200 break-words" dir="ltr">
                        {r.keyword}
                        {r.lines.length > 1 && <span className="ms-1 rounded-full bg-amber-100 px-1.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">×{r.lines.length}</span>}
                      </td>
                      <td className="min-w-56 px-3 py-2 font-medium text-stone-800 dark:text-stone-100">
                        {r.exists ? (
                          <a href={commonsFileUrl(r.title)} target="_blank" rel="noopener noreferrer" className="inline-flex items-start gap-1.5 hover:underline">
                            <span className="min-w-0 break-words" dir="ltr">{nameOf(r)}</span>
                            <ExternalLink className="w-3 h-3 mt-0.5 shrink-0" />
                            {r.redirected && <span className="rounded-full bg-stone-100 px-1.5 text-[10px] font-semibold text-stone-600 dark:bg-stone-800 dark:text-stone-300">{tx.redirect}</span>}
                          </a>
                        ) : (
                          <span className="font-normal text-red-700 dark:text-red-400">{tx.notFound}</span>
                        )}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap font-mono text-stone-600 dark:text-stone-300">{extOf(r) || '-'}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-stone-600 dark:text-stone-300" title={r.lastUploaded}>
                        {fmtDate(r.lastUploaded)}
                      </td>
                      <td className="min-w-32 px-3 py-2 text-stone-600 dark:text-stone-300 break-words">
                        {r.uploader ? (
                          <a href={`https://commons.wikimedia.org/wiki/User:${encodeURIComponent(r.uploader.replace(/ /g, '_'))}`} target="_blank" rel="noopener noreferrer" className="hover:underline">
                            {r.uploader}
                          </a>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-3 py-2 text-stone-600 dark:text-stone-300">{pickDescription(r.descriptions, language) || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {filtered.length > PAGE_SIZES[0] && (
            <div dir="ltr" className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <label className="inline-flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400">
                {tx.perPage}
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="rounded-full border border-stone-300 bg-white px-2.5 py-1 text-xs font-semibold text-stone-700 cursor-pointer dark:border-stone-600 dark:bg-stone-900 dark:text-stone-200"
                >
                  {PAGE_SIZES.map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                  <option value={0}>{tx.all}</option>
                </select>
              </label>
              {totalPages > 1 && (
                <nav aria-label="Pagination" className="flex flex-wrap items-center justify-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPage(curPage - 1)}
                    disabled={curPage === 1}
                    aria-label="Previous page"
                    className="rounded-full border border-stone-300 p-1.5 text-stone-600 hover:bg-stone-50 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed dark:border-stone-600 dark:text-stone-300 dark:hover:bg-stone-800"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  {pageNumbers.map((n, i) =>
                    n === '…' ? (
                      <span key={`gap-${i}`} className="px-1 text-xs text-stone-400">…</span>
                    ) : (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setPage(n)}
                        aria-current={n === curPage ? 'page' : undefined}
                        className={`min-w-8 rounded-full border px-2.5 py-1 text-xs font-semibold cursor-pointer ${
                          n === curPage
                            ? 'border-accent-600 bg-accent-600 text-white'
                            : 'border-stone-300 text-stone-600 hover:bg-stone-50 dark:border-stone-600 dark:text-stone-300 dark:hover:bg-stone-800'
                        }`}
                      >
                        {n}
                      </button>
                    )
                  )}
                  <button
                    type="button"
                    onClick={() => setPage(curPage + 1)}
                    disabled={curPage === totalPages}
                    aria-label="Next page"
                    className="rounded-full border border-stone-300 p-1.5 text-stone-600 hover:bg-stone-50 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed dark:border-stone-600 dark:text-stone-300 dark:hover:bg-stone-800"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </nav>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};
