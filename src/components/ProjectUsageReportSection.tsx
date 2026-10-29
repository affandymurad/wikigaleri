import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, ArrowDown, ArrowUp, Check, ChevronDown, ChevronLeft, ChevronRight, Download, ExternalLink, FileCode, FileText, Loader2, Search, X } from 'lucide-react';
import {
  captionKey,
  fetchCategoryUsageReport,
  fetchProjectCaptions,
  type UsageProject,
  normalizeCategoryName,
  USAGE_REPORT_MAX_FILES,
  UsageReport,
} from '../services/wikimediaApi';

import { FlagIcon } from './FlagIcon';
import { parseReportLang, withReportLang } from '../utils/urlState';
import {
  REPORT_LANGUAGES,
  reportTextFor,
  RTL_LANGUAGES,
  projectEditions,
  editionLabel,
  fillText,
  editionFor,
} from '../i18n/reportLanguages';

interface ProjectUsageReportSectionProps {
  currentCategory: string;
  project: UsageProject;
  language?: 'en' | 'id';
  /** Naik tiap kali tombol Cari ditekan, supaya pencarian yang sama bisa dimuat ulang */
  searchNonce?: number;
}

const commonsFileUrl = (title: string) => `https://commons.wikimedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_')).replace(/%3A/g, ':')}`;

const PAGE_SIZES = [5, 10, 15, 20, 25, 50, 100]; // 0 = semua
const CAPTION_CONCURRENCY = 4;

const csvCell = (s: string) => `"${s.replace(/"/g, '""')}"`;

// Teks bebas di dalam sel wikitext: bungkus <nowiki> bila ada karakter yang bisa dibaca sebagai sintaks wiki
const wikiText = (s: string) => {
  const t = s.replace(/\s+/g, ' ').trim();
  return /[|[\]{}<]|~~~|&#?\w+;|^[*#:;=!+-]/.test(t) ? `<nowiki>${t.replace(/<\/?nowiki\s*\/?>/gi, '')}</nowiki>` : t;
};

const pickDescription = (d: Record<string, string>, lang: string) =>
  d[lang] ?? d.default ?? d.en ?? Object.values(d)[0] ?? '';

export const ProjectUsageReportSection: React.FC<ProjectUsageReportSectionProps> = ({ currentCategory, project, language = 'id', searchNonce = 0 }) => {
  const category = useMemo(() => normalizeCategoryName(currentCategory) || '', [currentCategory]);
  // Bahasa/edisi ikut URL (?lang=); tanpa parameter memakai bahasa aplikasi
  const [lang, setLangState] = useState<string>(() => parseReportLang(window.location.search) ?? language);
  const setLang = (code: string) => {
    setLangState(code);
    try {
      const next = withReportLang(window.location.search, code);
      if (next !== window.location.search) window.history.replaceState(window.history.state, '', window.location.pathname + next);
    } catch { /* abaikan */ }
  };
  useEffect(() => {
    const onPop = () => setLangState(parseReportLang(window.location.search) ?? language);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [language]);
  const [langOpen, setLangOpen] = useState(false);
  const langRef = useRef<HTMLDivElement | null>(null);
  const [report, setReport] = useState<UsageReport | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newestFirst, setNewestFirst] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25); // 0 = semua
  // Keterangan foto di artikel proyek terpilih: kunci `${edisi}|${artikel}|${berkas}`; diisi bertahap di latar belakang
  const [captionTick, setCaptionTick] = useState(0); // naik tiap keterangan baru masuk, memicu render dan penyaringan ulang
  const [query, setQuery] = useState('');
  const captionsRef = useRef<Record<string, string>>({});
  const sectionsRef = useRef<Record<string, string>>({});
  const captionsDone = useRef(new Set<string>());
  const [captionProgress, setCaptionProgress] = useState<{ done: number; total: number } | null>(null);

  const tx = reportTextFor(lang, project);
  const langMeta = REPORT_LANGUAGES.find((l) => l.code === lang) || REPORT_LANGUAGES[0];
  const rtl = RTL_LANGUAGES.has(lang);
  const edition = editionFor(project, lang);
  const edLabel = editionLabel(edition);

  useEffect(() => {
    if (!langOpen) return;
    const onDown = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) setLangOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [langOpen]);

  useEffect(() => {
    if (!category) return;
    const ctrl = new AbortController();
    setReport(null);
    setError(null);
    setProgress({ done: 0, total: 0 });
    fetchCategoryUsageReport(category, project, (done, total) => setProgress({ done, total }), ctrl.signal)
      .then((r) => {
        if (!ctrl.signal.aborted) setReport(r);
      })
      .catch((e) => {
        // hanya abaikan pembatalan milik efek ini; AbortError dari luar ditampilkan agar bisa dicoba lagi
        if (ctrl.signal.aborted) return;
        setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setProgress(null);
      });
    return () => ctrl.abort();
  }, [category, project, reloadKey, searchNonce]);

  // Reset keterangan saat kategori berganti
  useEffect(() => {
    captionsRef.current = {};
    sectionsRef.current = {};
    captionsDone.current = new Set();
    setCaptionTick((t) => t + 1);
  }, [category, reloadKey, searchNonce]);

  const fmtDate = (iso: string) => {
    if (!iso) return '-';
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString(lang, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
  };

  // Dibaca dari ref (bukan state) agar ekspor yang menunggu pemuatan melihat data terbaru; `captions` memicu render ulang
  const captionFor = (r: { title: string }, a: { title: string }) => captionsRef.current[`${edition}|${a.title}|${captionKey(r.title)}`] || '';
  // Tautan artikel ke bagian tempat gambar muncul; ke awal artikel bila bagiannya belum diketahui atau tidak ada
  const sectionFor = (r: { title: string }, a: { title: string }) => sectionsRef.current[`${edition}|${a.title}|${captionKey(r.title)}`] || '';
  const articleHref = (r: { title: string }, a: { title: string; url: string }) => {
    const sec = sectionFor(r, a);
    return sec ? `${a.url}#${encodeURIComponent(sec)}` : a.url;
  };
  const captionCell = (r: { title: string; articles: { title: string }[] }) =>
    r.articles.map((a) => (r.articles.length > 1 && captionFor(r, a) ? `${a.title}: ${captionFor(r, a)}` : captionFor(r, a))).filter(Boolean).join('\n');

  // Baris untuk edisi terpilih; ganti bahasa hanya menyaring ulang data yang sudah dimuat
  const allRows = useMemo(() => {
    if (!report) return [];
    const dir = newestFirst ? -1 : 1;
    return report.rows
      .map((r) => ({ ...r, articles: r.articles.filter((a) => a.edition === edition) }))
      .filter((r) => r.articles.length > 0)
      .sort((a, b) => dir * a.lastUploaded.localeCompare(b.lastUploaded));
  }, [report, newestFirst, edition]);

  // Pencarian kata kunci (semua kata harus ada) pada nama berkas, artikel, tanggal, keterangan, dan deskripsi
  const rowSearchText = (r: (typeof allRows)[number]) =>
    [r.title.replace(/^File:/, ''), r.articles.map((a) => a.title).join(' '), r.lastUploaded.slice(0, 10), fmtDate(r.lastUploaded), captionCell(r), pickDescription(r.descriptions, lang)]
      .join(' ')
      .toLowerCase();
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const rows = useMemo(() => {
    if (terms.length === 0) return allRows;
    return allRows.filter((r) => {
      const hay = rowSearchText(r);
      return terms.every((t) => hay.includes(t));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allRows, query, lang, captionTick]);

  // Kembali ke halaman 1 saat data, edisi, urutan, atau kata kunci berubah
  useEffect(() => setPage(1), [category, edition, newestFirst, report, pageSize, query]);
  const effectiveSize = pageSize === 0 ? Math.max(1, rows.length) : pageSize;
  const totalPages = Math.max(1, Math.ceil(rows.length / effectiveSize));
  const curPage = Math.min(page, totalPages);
  const pageRows = rows.slice((curPage - 1) * effectiveSize, curPage * effectiveSize);

  // Keterangan foto dimuat hanya untuk baris yang tampil (artikel Wikipedia besar), 4 permintaan paralel.
  // Ekspor memuat sisanya sebelum menulis berkas.
  const filesByArticle = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const r of report?.rows ?? []) {
      for (const a of r.articles) if (a.edition === edition) m.set(a.title, [...(m.get(a.title) || []), r.title]);
    }
    return m;
  }, [report, edition]);
  const inflight = useRef(new Map<string, Promise<void>>());

  const ensureCaptions = async (target: { articles: { title: string }[] }[], signal?: AbortSignal) => {
    const todo = [...new Set(target.flatMap((r) => r.articles.map((a) => a.title)))].filter((t) => !captionsDone.current.has(`${edition}|${t}`));
    if (todo.length === 0) return;
    let done = 0;
    setCaptionProgress({ done: 0, total: todo.length });
    const fetchOne = (article: string) => {
      const key = `${edition}|${article}`;
      let p = inflight.current.get(key);
      if (!p) {
        p = (async () => {
          const files = filesByArticle.get(article) || [];
          try {
            const found = await fetchProjectCaptions(project, edition, article, files);
            for (const f of files) {
              const c = found.captions[captionKey(f)];
              if (c) captionsRef.current[`${key}|${captionKey(f)}`] = c;
              const sec = found.sections[captionKey(f)];
              if (sec) sectionsRef.current[`${key}|${captionKey(f)}`] = sec;
            }
          } catch (e) {
            console.warn('Caption fetch failed:', article, e);
          }
          captionsDone.current.add(key);
        })().finally(() => inflight.current.delete(key));
        inflight.current.set(key, p);
      }
      return p;
    };
    const queue = [...todo];
    const worker = async () => {
      while (queue.length && !signal?.aborted) {
        await fetchOne(queue.shift()!);
        done += 1;
        setCaptionTick((t) => t + 1);
        setCaptionProgress({ done, total: todo.length });
      }
    };
    await Promise.all(Array.from({ length: CAPTION_CONCURRENCY }, worker));
    if (!signal?.aborted) setCaptionProgress(null);
  };

  // Semua keterangan dimuat (halaman yang tampil lebih dulu); ekspor baru aktif setelah semuanya lengkap
  useEffect(() => {
    if (!report) return;
    const ctrl = new AbortController();
    const rest = allRows.filter((r) => !pageRows.includes(r));
    void ensureCaptions([...pageRows, ...rest], ctrl.signal);
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [report, edition, curPage, effectiveSize, newestFirst]);

  // Kemajuan keseluruhan (bukan per putaran muat): artikel yang sudah selesai dibanding semua artikel di tabel
  const allArticles = useMemo(() => [...new Set(allRows.flatMap((r) => r.articles.map((a) => a.title)))], [allRows]);
  const doneArticles = allArticles.filter((t) => captionsDone.current.has(`${edition}|${t}`)).length;
  const dataReady = !!report && doneArticles === allArticles.length;
  const dataPercent = allArticles.length === 0 ? 100 : Math.floor((doneArticles / allArticles.length) * 100);

  // Nomor halaman yang ditampilkan: awal, akhir, dan sekitar halaman aktif
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


  const headers: [string, string, string, string, string] = [
    tx.file,
    fillText(tx.usedOn, { edition: edLabel }),
    tx.lastUploaded,
    fillText(tx.caption, { edition: edLabel }),
    tx.description,
  ];
  const titleText = fillText(tx.title, { cat: category, edition: edLabel });

  const exportCsv = async () => {
    await ensureCaptions(rows);
    const lines = rows.map((r) =>
      [r.title, r.articles.map((a) => a.title).join('; '), r.lastUploaded, captionCell(r).replace(/\n/g, ' | '), pickDescription(r.descriptions, lang)].map(csvCell).join(',')
    );
    const blob = new Blob(['﻿' + [headers.map(csvCell).join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${category.replace(/[^\w-]+/g, '_')}_${project}_${edition}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Sintaks wiki untuk ditempel di wiki proyek ini (edisi terpilih): artikel ditautkan lokal, berkas ke Commons.
  // Gambar mini hanya untuk tampilan web, tidak ikut di berkas.
  const exportTxt = async () => {
    await ensureCaptions(rows);
    const cell = (v: string) => (v ? v : '-');
    const lines: string[] = [
      '{| class="wikitable sortable"',
      `|+ ${wikiText(titleText)}`,
      `! ${headers.map(wikiText).join(' !! ')}`,
    ];
    for (const r of rows) {
      const name = r.title.replace(/^File:/, '');
      const articles = r.articles
        .map((a) => {
          const sec = sectionFor(r, a);
          return sec && /^[^|[\]{}<>#]+$/.test(sec) ? `[[${a.title}#${sec}|${a.title}]]` : `[[${a.title}]]`;
        })
        .join('<br>');
      lines.push(
        '|-',
        // gambar mini 60 px yang menaut ke Commons, lalu nama berkas sebagai tautan teks
        `| [[${r.title}|60px|link=commons:${r.title}]]<br>[[:commons:${r.title}|${name}]]`,
        `| ${articles}`,
        `| ${r.lastUploaded ? r.lastUploaded.slice(0, 10) : '-'}`,
        `| ${cell(captionCell(r).split('\n').map(wikiText).join('<br>'))}`,
        `| ${cell(wikiText(pickDescription(r.descriptions, lang)))}`
      );
    }
    lines.push('|}');
    const blob = new Blob([lines.join('\n') + '\n'], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${category.replace(/[^\w-]+/g, '_')}_${project}_${edition}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPdf = async () => {
    setPdfBusy(true);
    try {
      await ensureCaptions(rows);
      const { exportUsageReportPdf } = await import('../utils/usageReportPdf');
      await exportUsageReportPdf({
        title: titleText,
        subtitle:
          terms.length > 0
            ? `${fillText(tx.matches, { m: rows.length, n: allRows.length })} — “${query.trim()}”`
            : fillText(tx.count, { n: rows.length, total: report?.checked ?? 0, edition: edLabel }),
        footer: `${tx.generated} ${new Date().toISOString().slice(0, 10)}`,
        headers,
        rows: rows.map((r) => ({
          file: r.title.replace(/^File:/, ''),
          fileUrl: commonsFileUrl(r.title),
          thumb: r.thumb,
          articles: r.articles.map((a) => a.title).join('\n'),
          date: fmtDate(r.lastUploaded),
          caption: captionCell(r) || '-',
          description: pickDescription(r.descriptions, lang) || '-',
        })),
        rtl,
        fileName: `${category.replace(/[^\w-]+/g, '_')}_${project}_${edition}.pdf`,
      });
    } catch (e) {
      console.error('PDF export failed:', e);
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setPdfBusy(false);
    }
  };

  const th = `px-3 py-2 text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400 ${rtl ? 'text-right' : 'text-left'}`;
  const actionBtn =
    'inline-flex items-center gap-1.5 rounded-full border border-stone-300 px-3 py-1.5 text-xs font-semibold text-stone-600 hover:bg-stone-50 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed dark:border-stone-600 dark:text-stone-300 dark:hover:bg-stone-800';

  return (
    <div className="space-y-3" dir={rtl ? 'rtl' : 'ltr'} lang={lang}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-stone-800 dark:text-stone-100">{titleText}</h2>
          <p className="text-xs text-stone-500 dark:text-stone-400">{tx.subtitle}</p>
          {report && allRows.length > 0 && <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">{tx.txtHint}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative" ref={langRef}>
            <button
              type="button"
              onClick={() => setLangOpen((o) => !o)}
              aria-expanded={langOpen}
              aria-haspopup="listbox"
              title={tx.languageLabel}
              className="inline-flex items-center gap-2 rounded-full border border-stone-300 px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-50 cursor-pointer dark:border-stone-600 dark:text-stone-200 dark:hover:bg-stone-800"
            >
              <FlagIcon countryCode={langMeta.flagCode} className="w-5 h-3.5 rounded-xs shrink-0 shadow-xs" />
              <span>{langMeta.name}</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${langOpen ? 'rotate-180' : ''}`} />
            </button>
            {langOpen && (
              <div dir="ltr" className="absolute right-0 z-30 mt-2 w-60 rounded-xl border border-stone-200 bg-white py-1.5 shadow-xl dark:border-stone-700 dark:bg-stone-900">
                <div className="mb-1 border-b border-stone-100 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-stone-500 dark:border-stone-800 dark:text-stone-400">
                  {tx.languageLabel}
                </div>
                <div role="listbox" className="max-h-72 overflow-y-auto">
                  {REPORT_LANGUAGES.map((l) => (
                    <button
                      key={l.code}
                      type="button"
                      role="option"
                      aria-selected={l.code === lang}
                      onClick={() => {
                        setLang(l.code);
                        setLangOpen(false);
                      }}
                      className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm cursor-pointer ${
                        l.code === lang
                          ? 'bg-stone-100 font-semibold text-stone-900 dark:bg-stone-800 dark:text-stone-50'
                          : 'text-stone-700 hover:bg-stone-50 dark:text-stone-300 dark:hover:bg-stone-800'
                      }`}
                    >
                      <span className="flex items-center gap-2.5">
                        <FlagIcon countryCode={l.flagCode} className="w-5 h-3.5 rounded-xs shrink-0 shadow-xs" />
                        <span>{l.name}</span>
                      </span>
                      {l.code === lang && <Check className="w-4 h-4 text-green-700 dark:text-green-400" />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          {report && allRows.length > 0 && (
            <>
              {([
                { key: 'csv', label: 'CSV', Icon: Download, run: exportCsv, busy: false },
                { key: 'txt', label: 'TXT', Icon: FileCode, run: exportTxt, busy: false },
                { key: 'pdf', label: 'PDF', Icon: FileText, run: exportPdf, busy: pdfBusy },
              ] as const).map(({ key, label, Icon, run, busy }) => (
                <button
                  key={key}
                  type="button"
                  onClick={run}
                  disabled={!dataReady || busy}
                  title={dataReady ? (key === 'txt' ? 'Wikitext' : label) : `${label}: ${fillText(tx.loadingCaptions, { done: doneArticles, total: allArticles.length })}`}
                  className={`relative overflow-hidden ${actionBtn}`}
                >
                  {!dataReady && (
                    <span
                      aria-hidden="true"
                      className="absolute inset-y-0 left-0 bg-stone-200/70 dark:bg-stone-700/60 transition-[width] duration-300"
                      style={{ width: `${dataPercent}%` }}
                    />
                  )}
                  <span className="relative inline-flex items-center gap-1.5">
                    {!dataReady || busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Icon className="w-3.5 h-3.5" />}
                    {label}
                    {!dataReady && <span className="tabular-nums">{dataPercent}%</span>}
                  </span>
                </button>
              ))}
            </>
          )}
        </div>
      </div>

      {!projectEditions(project).has(lang) && (
        <p className="text-xs text-stone-500 dark:text-stone-400">{fillText(tx.noEdition, { lang: langMeta.name })}</p>
      )}

      {progress && (
        <div className="flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400" role="status">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          {progress.total > 0 ? fillText(tx.checking, { done: progress.done, total: progress.total }) : tx.loadingCategory}
        </div>
      )}

      {report && !dataReady && (
        <div className="flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400" role="status">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          {fillText(tx.loadingCaptions, { done: doneArticles, total: allArticles.length })}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200" role="alert">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="flex-1">{error}</span>
          <button type="button" onClick={() => setReloadKey((k) => k + 1)} className="underline font-semibold cursor-pointer">
            {tx.retry}
          </button>
        </div>
      )}

      {report && (
        <>
          <p className="text-xs text-stone-500 dark:text-stone-400">
            {fillText(tx.count, { n: rows.length, total: report.checked, edition: edLabel })}
            {report.truncated && ' ' + fillText(tx.truncated, { max: USAGE_REPORT_MAX_FILES })}
          </p>
          {allRows.length > 0 && (
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
              {terms.length > 0 && (
                <span className="text-xs text-stone-500 dark:text-stone-400">{fillText(tx.matches, { m: rows.length, n: allRows.length })}</span>
              )}
            </div>
          )}
          {rows.length === 0 ? (
            <div className="rounded-lg border border-dashed border-stone-300 p-6 text-center text-xs text-stone-500 dark:border-stone-700 dark:text-stone-400">
              {terms.length > 0 ? fillText(tx.noMatch, { q: query.trim() }) : fillText(tx.empty, { edition: edLabel })}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-stone-200 dark:border-stone-700">
              <table className="min-w-full divide-y divide-stone-200 text-xs dark:divide-stone-700">
                <thead className="bg-stone-50 dark:bg-stone-800/60">
                  <tr>
                    <th className={th}>{headers[0]}</th>
                    <th className={th}>{headers[1]}</th>
                    <th className={th}>
                      <button type="button" onClick={() => setNewestFirst((v) => !v)} className="inline-flex items-center gap-1 uppercase tracking-wide cursor-pointer">
                        {headers[2]}
                        {newestFirst ? <ArrowDown className="w-3 h-3" /> : <ArrowUp className="w-3 h-3" />}
                      </button>
                    </th>
                    <th className={th}>{headers[3]}</th>
                    <th className={th}>{headers[4]}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 bg-white dark:divide-stone-800 dark:bg-stone-900">
                  {pageRows.map((r) => (
                    <tr key={r.title} className="align-top">
                      <td className="min-w-56 px-3 py-2 font-medium text-stone-800 dark:text-stone-100">
                        <a href={commonsFileUrl(r.title)} target="_blank" rel="noopener noreferrer" className="inline-flex items-start gap-2 hover:underline">
                          {r.thumb && (
                            <img
                              src={r.thumb}
                              alt=""
                              loading="lazy"
                              referrerPolicy="no-referrer"
                              className="h-12 w-12 shrink-0 rounded border border-stone-200 bg-stone-50 object-contain dark:border-stone-700 dark:bg-stone-800"
                            />
                          )}
                          <span className="min-w-0 break-words" dir="ltr">{r.title.replace(/^File:/, '')}</span>
                          <ExternalLink className="w-3 h-3 mt-0.5 shrink-0" />
                        </a>
                      </td>
                      <td className="px-3 py-2">
                        <ul className="space-y-0.5">
                          {r.articles.map((a) => (
                            <li key={a.url}>
                              <a href={articleHref(r, a)} target="_blank" rel="noopener noreferrer" className="text-accent-700 hover:underline dark:text-accent-300">
                                {a.title}
                              </a>
                            </li>
                          ))}
                        </ul>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-stone-600 dark:text-stone-300" title={r.lastUploaded}>
                        {fmtDate(r.lastUploaded)}
                      </td>
                      <td className="px-3 py-2 text-stone-600 dark:text-stone-300 whitespace-pre-line">
                        {captionCell(r) || (captionProgress && r.articles.some((a) => !captionsDone.current.has(`${edition}|${a.title}`)) ? '…' : '-')}
                      </td>
                      <td className="px-3 py-2 text-stone-600 dark:text-stone-300">{pickDescription(r.descriptions, lang) || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {rows.length > PAGE_SIZES[0] && (
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
