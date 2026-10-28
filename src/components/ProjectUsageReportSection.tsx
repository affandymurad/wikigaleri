import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, ArrowDown, ArrowUp, Check, ChevronDown, ChevronLeft, ChevronRight, Download, ExternalLink, FileText, Loader2 } from 'lucide-react';
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
}

const commonsFileUrl = (title: string) => `https://commons.wikimedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_')).replace(/%3A/g, ':')}`;

const PAGE_SIZES = [5, 10, 15, 20, 25, 50, 100]; // 0 = semua
const CAPTION_CONCURRENCY = 4;

const csvCell = (s: string) => `"${s.replace(/"/g, '""')}"`;

const pickDescription = (d: Record<string, string>, lang: string) =>
  d[lang] ?? d.default ?? d.en ?? Object.values(d)[0] ?? '';

export const ProjectUsageReportSection: React.FC<ProjectUsageReportSectionProps> = ({ currentCategory, project, language = 'id' }) => {
  const category = useMemo(() => normalizeCategoryName(currentCategory) || '', [currentCategory]);
  const [lang, setLang] = useState<string>(language);
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
  const [captions, setCaptions] = useState<Record<string, string>>({});
  const captionsRef = useRef<Record<string, string>>({});
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
        if (ctrl.signal.aborted || e?.name === 'AbortError') return;
        setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setProgress(null);
      });
    return () => ctrl.abort();
  }, [category, project, reloadKey]);

  // Reset keterangan saat kategori berganti
  useEffect(() => {
    captionsRef.current = {};
    captionsDone.current = new Set();
    setCaptions({});
  }, [category, reloadKey]);

  // Baris untuk edisi terpilih; ganti bahasa hanya menyaring ulang data yang sudah dimuat
  const rows = useMemo(() => {
    if (!report) return [];
    const dir = newestFirst ? -1 : 1;
    return report.rows
      .map((r) => ({ ...r, articles: r.articles.filter((a) => a.edition === edition) }))
      .filter((r) => r.articles.length > 0)
      .sort((a, b) => dir * a.lastUploaded.localeCompare(b.lastUploaded));
  }, [report, newestFirst, edition]);

  // Kembali ke halaman 1 saat data, edisi, atau urutan berubah
  useEffect(() => setPage(1), [category, edition, newestFirst, report, pageSize]);
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
              const c = found[captionKey(f)];
              if (c) captionsRef.current[`${key}|${captionKey(f)}`] = c;
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
        setCaptions({ ...captionsRef.current });
        setCaptionProgress({ done, total: todo.length });
      }
    };
    await Promise.all(Array.from({ length: CAPTION_CONCURRENCY }, worker));
    if (!signal?.aborted) setCaptionProgress(null);
  };

  useEffect(() => {
    if (!report) return;
    const ctrl = new AbortController();
    void ensureCaptions(pageRows, ctrl.signal);
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [report, edition, curPage, effectiveSize, newestFirst]);

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

  const fmtDate = (iso: string) => {
    if (!iso) return '-';
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString(lang, { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const captionFor = (r: { title: string }, a: { title: string }) => captions[`${edition}|${a.title}|${captionKey(r.title)}`] || '';
  const captionCell = (r: { title: string; articles: { title: string }[] }) =>
    r.articles.map((a) => (r.articles.length > 1 && captionFor(r, a) ? `${a.title}: ${captionFor(r, a)}` : captionFor(r, a))).filter(Boolean).join('\n');

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

  const exportPdf = async () => {
    setPdfBusy(true);
    try {
      await ensureCaptions(rows);
      const { exportUsageReportPdf } = await import('../utils/usageReportPdf');
      await exportUsageReportPdf({
        title: titleText,
        subtitle: fillText(tx.count, { n: rows.length, total: report?.checked ?? 0, edition: edLabel }),
        footer: `WikiGaleri  |  ${tx.generated} ${new Date().toISOString().slice(0, 10)}`,
        headers,
        rows: rows.map((r) => ({
          file: r.title.replace(/^File:/, ''),
          fileUrl: commonsFileUrl(r.title),
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
          {report && rows.length > 0 && (
            <>
              <button type="button" onClick={exportCsv} className={actionBtn}>
                <Download className="w-3.5 h-3.5" />
                CSV
              </button>
              <button type="button" onClick={exportPdf} disabled={pdfBusy} className={actionBtn}>
                {pdfBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
                PDF
              </button>
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

      {captionProgress && (
        <div className="flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400" role="status">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          {fillText(tx.loadingCaptions, { done: captionProgress.done, total: captionProgress.total })}
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
          {rows.length === 0 ? (
            <div className="rounded-lg border border-dashed border-stone-300 p-6 text-center text-xs text-stone-500 dark:border-stone-700 dark:text-stone-400">
              {fillText(tx.empty, { edition: edLabel })}
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
                      <td className="px-3 py-2 font-medium text-stone-800 dark:text-stone-100">
                        <a href={commonsFileUrl(r.title)} target="_blank" rel="noopener noreferrer" className="inline-flex items-start gap-1 hover:underline">
                          <span className="break-all" dir="ltr">{r.title.replace(/^File:/, '')}</span>
                          <ExternalLink className="w-3 h-3 mt-0.5 shrink-0" />
                        </a>
                      </td>
                      <td className="px-3 py-2">
                        <ul className="space-y-0.5">
                          {r.articles.map((a) => (
                            <li key={a.url}>
                              <a href={a.url} target="_blank" rel="noopener noreferrer" className="text-accent-700 hover:underline dark:text-accent-300">
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
