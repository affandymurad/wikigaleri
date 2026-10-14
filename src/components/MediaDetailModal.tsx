import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { CommonsMediaItem } from '../types/wikimedia';
import { getLicenseInfo, generateAttribution, formatBytes, getFileExtension } from '../utils/licenseUtils';
import {
  UnifiedMediaAiAnalysis,
  generateUnifiedMediaAnalysis,
  buildLocalMediaAnalysis,
  getCachedUnifiedAnalysis,
  setCachedUnifiedAnalysis,
  getGeminiQuotaBlockMessage,
  GEMINI_ASSISTANT_NAME,
  GEMINI_MODEL_NAME,
  GEMINI_MODEL_VERSION,
  AI_DISCLAIMER_TEXT_ID,
  AI_DISCLAIMER_TEXT_EN,
} from '../services/geminiClient';
import {
  fetchFileGlobalUsage,
fetchRelatedWikimediaLinks,
RelatedWikiLink,
  fetchMediaDetailByTitle,
  fetchMediaExtraDetail,
  fetchFileHistory,
  FileVersionEntry,
  PageEditEntry,
  MediaExtraDetail,
  WikiGlobalUsageItem,
} from '../services/wikimediaApi';
import { exportMediaAnalysisPdf } from '../utils/pdfGenerator';
import { X, Download, Copy, Check, ExternalLink, Sparkles, ShieldCheck, BookOpen, Eye, Key, FileText, MapPin, Calendar, User, Info, ChevronLeft, Loader2, ChevronRight, Bookmark, AlertCircle, Globe, RefreshCw, FileCode, Tag, CheckCircle2, Folder, FileDown, Camera, ChevronDown, History, MessageSquare, Volume2, VolumeX } from 'lucide-react';
import { TalkPageView } from './MediaGrid';

import { Translations, Language } from '../i18n/translations';

interface MediaDetailModalProps {
  item: CommonsMediaItem | null;
  onClose: () => void;
  geminiApiKey: string;
  onOpenGeminiModal: () => void;
  onNext?: () => void;
  onPrev?: () => void;
  hasNext?: boolean;
  hasPrev?: boolean;
  isSaved?: boolean;
  onToggleSave?: (item: CommonsMediaItem) => void;
  t: Translations;
  language?: Language;
  onSearchUser?: (username: string) => void;
  onSearchCategory?: (category: string) => void;
  isUserSaved?: (username: string) => boolean;
  isCategorySaved?: (category: string) => boolean;
  onToggleUserSave?: (username: string) => void;
  onToggleCategorySave?: (category: string) => void;
}

type DetailTab = 'download' | 'cats' | 'license' | 'history' | 'talk' | 'ai';

const fmtDateTime = (iso: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  return isNaN(d.getTime())
    ? iso
    : d.toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

/** Riwayat versi berkas (unggahan ulang) + riwayat suntingan halaman deskripsi. */
const FileHistoryPanel: React.FC<{ title: string; onSearchUser?: (u: string) => void; language?: Language }> = ({ title, onSearchUser, language = 'id' }) => {
  const [data, setData] = useState<{ versions: FileVersionEntry[]; edits: PageEditEntry[] } | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'versions' | 'edits'>('versions');

  useEffect(() => {
    let cancelled = false;
    setData(null);
    setError(null);
    setLoading(true);
    fetchFileHistory(title)
      .then((d) => { if (!cancelled) setData(d); })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : 'Gagal memuat'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [title]);

  const userLink = (u: string) =>
    `https://commons.wikimedia.org/wiki/User:${encodeURIComponent(u.replace(/ /g, '_'))}`;
  const historyUrl = `https://commons.wikimedia.org/w/index.php?title=${encodeURIComponent(title.replace(/ /g, '_'))}&action=history`;

  const chipCls = (on: boolean) =>
    `inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-medium transition-colors ${
      on
        ? 'border-accent-600 bg-accent-600 text-white'
        : 'border-stone-200 bg-stone-100 text-stone-600 hover:bg-stone-200 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700'
    }`;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => setView('versions')} className={chipCls(view === 'versions')}>
          {language === 'en' ? 'File versions' : 'Versi Berkas'}{data ? ` (${data.versions.length})` : ''}
        </button>
        <button type="button" onClick={() => setView('edits')} className={chipCls(view === 'edits')}>
          {language === 'en' ? 'Page edits' : 'Suntingan Halaman'}{data ? ` (${data.edits.length})` : ''}
        </button>
        <a
          href={historyUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto inline-flex items-center gap-1 text-accent-700 hover:underline dark:text-accent-300"
        >
          {language === 'en' ? 'Full history' : 'Riwayat lengkap'} <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      {loading && (
        <div role="status" className="flex items-center gap-2 rounded-lg border border-stone-200 bg-stone-50 p-4 text-stone-500 dark:border-stone-800 dark:bg-stone-800/50 dark:text-stone-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          {language === 'en' ? 'Loading history…' : 'Memuat riwayat…'}
        </div>
      )}
      {!loading && error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
          {language === 'en' ? 'Failed to load history: ' : 'Gagal memuat riwayat: '}{error}
        </div>
      )}

      {!loading && !error && data && view === 'versions' && (
        <ul className="space-y-2">
          {data.versions.length === 0 && <li className="text-stone-500">{language === 'en' ? 'No version data.' : 'Tidak ada data versi.'}</li>}
          {data.versions.map((ver, idx) => (
            <li key={ver.timestamp + idx} className="flex gap-3 rounded-lg border border-stone-200 bg-stone-50 p-3 dark:border-stone-800 dark:bg-stone-800/50">
              {ver.thumb ? (
                <img src={ver.thumb} alt="" referrerPolicy="no-referrer" className="h-14 w-14 shrink-0 rounded-lg bg-stone-200 object-cover dark:bg-stone-700" />
              ) : (
                <div className="h-14 w-14 shrink-0 rounded-lg bg-stone-200 dark:bg-stone-700" />
              )}
              <div className="min-w-0 flex-1 space-y-0.5">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <span className="font-semibold text-stone-900 dark:text-white">{fmtDateTime(ver.timestamp)}</span>
                  {idx === 0 && (
                    <span className="rounded-full bg-moss-100 px-2 py-0.5 text-xs font-semibold text-moss-700 dark:bg-moss-900/40 dark:text-moss-300">{language === 'en' ? 'Current' : 'Terkini'}</span>
                  )}
                </div>
                <div className="text-stone-500 dark:text-stone-400">
                  <a href={userLink(ver.user)} onClick={(e) => { if (onSearchUser) { e.preventDefault(); onSearchUser(ver.user); } }} title={onSearchUser ? (language === 'en' ? 'Search this username' : 'Cari nama pengguna ini') : undefined} target="_blank" rel="noopener noreferrer" className="text-accent-700 hover:underline dark:text-accent-300">{ver.user}</a>
                  {ver.width > 0 && <span className="font-mono"> · {ver.width}×{ver.height} px</span>}
                  {ver.size > 0 && <span className="font-mono"> · {formatBytes(ver.size)}</span>}
                </div>
                {ver.comment && <div className="break-words text-stone-600 dark:text-stone-300">{ver.comment}</div>}
              </div>
            </li>
          ))}
        </ul>
      )}

      {!loading && !error && data && view === 'edits' && (
        <ul className="space-y-2">
          {data.edits.length === 0 && <li className="text-stone-500">{language === 'en' ? 'No edit data.' : 'Tidak ada data suntingan.'}</li>}
          {data.edits.map((ed) => (
            <li key={ed.revid} className="rounded-lg border border-stone-200 bg-stone-50 p-3 dark:border-stone-800 dark:bg-stone-800/50">
              <div className="flex flex-wrap items-center gap-x-2 text-stone-500 dark:text-stone-400">
                <span className="font-semibold text-stone-900 dark:text-white">{fmtDateTime(ed.timestamp)}</span>
                <a href={userLink(ed.user)} onClick={(e) => { if (onSearchUser) { e.preventDefault(); onSearchUser(ed.user); } }} title={onSearchUser ? (language === 'en' ? 'Search this username' : 'Cari nama pengguna ini') : undefined} target="_blank" rel="noopener noreferrer" className="text-accent-700 hover:underline dark:text-accent-300">{ed.user}</a>
                {ed.size > 0 && <span className="font-mono">· {ed.size} bytes</span>}
              </div>
              {ed.comment && <div className="mt-0.5 break-words text-stone-600 dark:text-stone-300">{ed.comment}</div>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export const MediaDetailModal: React.FC<MediaDetailModalProps> = ({
  item,
  onClose,
  geminiApiKey,
  onOpenGeminiModal,
  onNext,
  onPrev,
  hasNext,
  hasPrev,
  isSaved = false,
  onToggleSave,
  t,
  language = 'id',
  onSearchUser,
  onSearchCategory,
  isCategorySaved,
  onToggleCategorySave,
}) => {
  // Keyboard navigation
  useEffect(() => {
    if (!item) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight' && hasNext && onNext) {
        onNext();
      } else if (e.key === 'ArrowLeft' && hasPrev && onPrev) {
        onPrev();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasNext, hasPrev, onNext, onPrev, onClose, item]);

  const [activeTab, setActiveTab] = useState<DetailTab>('ai');
  const [attributionFormat, setAttributionFormat] = useState<'plain' | 'markdown' | 'html' | 'wikitext'>('plain');
  const [copiedFormat, setCopiedFormat] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedQuickAttr, setCopiedQuickAttr] = useState(false);

  // Unified AI assistance state
  const [unifiedAnalysis, setUnifiedAnalysis] = useState<UnifiedMediaAiAnalysis | null>(null);
  const [wikiUsages, setWikiUsages] = useState<WikiGlobalUsageItem[]>([]);
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  // Id foto yang sudah selesai dimuat (loading tampil selama id ini belum sama dengan item.id)
  const [loadedMediaId, setLoadedMediaId] = useState<string | null>(null);
  const isMediaLoading = loadedMediaId !== String(item.id);
  const [aiError, setAiError] = useState<string | null>(null);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>(item?.categories || []);
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);
  // Detail tambahan (EXIF kamera, Depicts) untuk tab Unduh & Info
  const [extraDetail, setExtraDetail] = useState<MediaExtraDetail | null>(null);
  const [isExtraLoading, setIsExtraLoading] = useState<boolean>(false);
  const [catsOpen, setCatsOpen] = useState<boolean>(true);

  useEffect(() => {
    if (!item) return;
    let cancelled = false;
    setExtraDetail(null);
    setIsExtraLoading(true);
    fetchMediaExtraDetail(item.id, item.title)
      .then((d) => { if (!cancelled) setExtraDetail(d); })
      .catch(() => { if (!cancelled) setExtraDetail({ exif: [], depicts: [] }); })
      .finally(() => { if (!cancelled) setIsExtraLoading(false); });
    return () => { cancelled = true; };
  }, [item?.id]);
  const [pdfSuccess, setPdfSuccess] = useState<boolean>(false);

  // Reset analysis and sync categories when media item changes
  useEffect(() => {
    if (!item) return;
    setUnifiedAnalysis(null);
    setWikiUsages([]);
    setAiError(null);
    setCategories(item.categories || []);

    // If categories empty or short, fetch details
    if (!item.categories || item.categories.length === 0) {
      fetchMediaDetailByTitle(item.title).then((detailed) => {
        if (detailed?.categories && detailed.categories.length > 0) {
          setCategories(detailed.categories);
        }
      });
    }
  }, [item?.id, item?.title, item?.categories]);

const [usagesLoading, setUsagesLoading] = useState<boolean>(false);
  const [uploader, setUploader] = useState<string>('');
  useEffect(() => {
    setUploader('');
    if (!item?.title) return;
    let cancelled = false;
    fetchFileHistory(item.title)
      .then((r) => {
        const oldest = r.versions[r.versions.length - 1];
        if (!cancelled && oldest?.user) setUploader(oldest.user);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [item?.title]);

  // ===== Mode Baca Dokumen =====
  const [readerOpen, setReaderOpen] = useState(false);
  const [previewFailedId, setPreviewFailedId] = useState<string | null>(null);
  const previewThumb = item.thumbnailUrl || '';
  const previewBig = previewThumb && Number((item as any).width || 0) > 1280 ? previewThumb.replace(/\/(\d+)px-/, '/1280px-') : previewThumb;
  const previewSrc = (previewFailedId === String(item.id) ? previewThumb : previewBig) || item.fileUrl;
  const ttsSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;
  const [speaking, setSpeaking] = useState(false);
  useEffect(() => { return () => { try { window.speechSynthesis?.cancel(); } catch {} }; }, [item.id]);
  useEffect(() => { setSpeaking(false); }, [item.id]);
  const toggleSpeak = (text: string) => {
    if (!ttsSupported) return;
    const synth = window.speechSynthesis;
    if (speaking) { synth.cancel(); setSpeaking(false); return; }
    const clean = text.replace(/\s+/g, ' ').trim();
    if (!clean) return;
    const lang = language === 'en' ? 'en-US' : 'id-ID';
    const chunks = clean.match(/[^.!?。]+[.!?。]?\s*/g) || [clean];
    const parts: string[] = [];
    chunks.forEach((c) => { let s = c; while (s.length > 200) { let cut = s.lastIndexOf(' ', 200); if (cut < 50) cut = 200; parts.push(s.slice(0, cut)); s = s.slice(cut); } if (s.trim()) parts.push(s); });
    synth.cancel();
    const voice = synth.getVoices().find((v) => v.lang.toLowerCase().startsWith(lang.slice(0, 2).toLowerCase()));
    setSpeaking(true);
    parts.forEach((p, i) => { const u = new SpeechSynthesisUtterance(p); u.lang = lang; if (voice) u.voice = voice; if (i === parts.length - 1) { u.onend = () => setSpeaking(false); } u.onerror = () => setSpeaking(false); synth.speak(u); });
  };
  const [readerLoading, setReaderLoading] = useState(false);
  const [readerPage, setReaderPage] = useState(1);
  const [readerInfo, setReaderInfo] = useState<{ pages: number; thumb: string } | null>(null);
  const readerScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setReaderOpen(false);
    setReaderInfo(null);
    setReaderPage(1);
  }, [item?.id]);

  // Esc menutup mode baca (bukan seluruh modal); panah tidak berpindah berkas saat membaca
  useEffect(() => {
    if (!readerOpen) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopImmediatePropagation();
        setReaderOpen(false);
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.stopImmediatePropagation();
      }
    };
    window.addEventListener('keydown', h, true);
    return () => window.removeEventListener('keydown', h, true);
  }, [readerOpen]);

  const openReader = async () => {
    if (!item) return;
    setReaderOpen(true);
    if (readerInfo) return;
    setReaderLoading(true);
    try {
      const url =
        'https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*&prop=imageinfo&iiprop=size%7Curl&iiurlwidth=1100&iiurlparam=page1-1100px&titles=' +
        encodeURIComponent(item.title);
      const res = await fetch(url);
      const json = await res.json();
      const pagesObj = json?.query?.pages || {};
      const first = Object.values(pagesObj)[0] as any;
      const ii = first?.imageinfo?.[0];
      const thumb = String(ii?.thumburl || item.thumbnailUrl || item.fileUrl).split('?')[0];
      const hasPageParam = /\/page\d+-\d+px-/.test(thumb);
      setReaderInfo({ pages: hasPageParam ? Math.max(1, Number(ii?.pagecount) || 1) : 1, thumb });
    } catch {
      setReaderInfo({ pages: 1, thumb: item.thumbnailUrl || item.fileUrl });
    } finally {
      setReaderLoading(false);
    }
  };

  const readerPageUrl = (n: number) =>
    readerInfo ? readerInfo.thumb.replace(/\/page\d+-(\d+)px-/, '/page' + n + '-$1px-') : '';

  const onReaderScroll = () => {
    const c = readerScrollRef.current;
    if (!c) return;
    const mid = c.getBoundingClientRect().top + c.clientHeight * 0.4;
    let cur = 1;
    c.querySelectorAll<HTMLElement>('[data-page]').forEach((el) => {
      if (el.getBoundingClientRect().top <= mid) cur = Number(el.dataset.page);
    });
    setReaderPage(cur);
  };

  const jumpToPage = (n: number) => {
    const el = readerScrollRef.current?.querySelector('[data-page="' + n + '"]');
    el?.scrollIntoView({ block: 'start' });
    setReaderPage(n);
  };

const [usagesLoadedId, setUsagesLoadedId] = useState<number | string | null>(null);
const [relatedLinks, setRelatedLinks] = useState<RelatedWikiLink[]>([]);
const [relatedLoading, setRelatedLoading] = useState<boolean>(false);

// Muat penggunaan lintas-proyek saat tab Kategori & Penggunaan dibuka
useEffect(() => {
  if (activeTab !== 'cats' || !item) return;
  if (usagesLoadedId === item.id) return;
  let cancelled = false;
  setUsagesLoading(true);
  fetchFileGlobalUsage(item.title)
    .then((u) => { if (!cancelled) setWikiUsages(u); })
    .catch(() => {})
    .finally(() => {
      if (!cancelled) { setUsagesLoadedId(item.id); setUsagesLoading(false); }
    });
  return () => { cancelled = true; };
}, [activeTab, item?.id]);

// Cari link proyek Wikimedia terkait setelah analisis AI selesai
useEffect(() => {
  if (!unifiedAnalysis || !item) { setRelatedLinks([]); return; }
  let cancelled = false;
  setRelatedLoading(true);
  const skip = /^(files?|cc[- ]|self-published|pages|uploaded|media |images? from|use dmy|.*\b(licen[sc]e|uploads?)\b)/i;
  const cat = categories.map((c) => c.replace(/^Category:/i, '')).find((c) => !skip.test(c));
  const baseTitle = String(item.cleanTitle || item.title || '').replace(/^File:/i, '').replace(/\.[a-z0-9]{2,4}$/i, '').replace(/[_\d]+/g, ' ').trim();
  fetchRelatedWikimediaLinks({ terms: [cat || '', baseTitle] })
    .then((l) => { if (!cancelled) setRelatedLinks(l); })
    .catch(() => {})
    .finally(() => { if (!cancelled) setRelatedLoading(false); });
  return () => { cancelled = true; };
}, [unifiedAnalysis, item?.id]);

  const licenseInfo = item ? getLicenseInfo(item) : null;
  const attributionText = item ? generateAttribution(item, attributionFormat, language) : '';

  const handleCopyAttribution = () => {
    navigator.clipboard.writeText(attributionText);
    setCopiedFormat(true);
    setTimeout(() => setCopiedFormat(false), 2000);
  };

  const handleQuickCopyAttribution = () => {
    if (!item) return;
    const text = generateAttribution(item, 'plain', language);
    navigator.clipboard.writeText(text);
    setCopiedQuickAttr(true);
    setTimeout(() => setCopiedQuickAttr(false), 2000);
  };

  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const handleSaveToPdf = async () => {
    if (!item || !unifiedAnalysis) return;
    setIsExportingPdf(true);
    try {
      await exportMediaAnalysisPdf(item, unifiedAnalysis, wikiUsages, categories, language);
      setPdfSuccess(true);
      setTimeout(() => setPdfSuccess(false), 2500);
    } catch (err) {
      console.error('Failed to export PDF:', err);
    } finally {
      setIsExportingPdf(false);
    }
  };

  const getWikimediaArticleUrl = (wikiName: string, article: string): string => {
    const clean = article.replace(/^["']|["']$/g, '').trim();
    const encoded = encodeURIComponent(clean.replace(/ /g, '_'));
    const lower = wikiName.toLowerCase();
    if (lower.includes('indonesia') || lower.includes('id.wiki') || lower.includes('id wikipedia')) {
      return `https://id.wikipedia.org/wiki/${encoded}`;
    } else if (lower.includes('english') || lower.includes('inggris') || lower.includes('en.wiki') || lower.includes('en wikipedia')) {
      return `https://en.wikipedia.org/wiki/${encoded}`;
    } else if (lower.includes('voyage')) {
      return `https://en.wikivoyage.org/wiki/${encoded}`;
    } else if (lower.includes('source')) {
      return `https://en.wikisource.org/wiki/${encoded}`;
    } else if (lower.includes('species')) {
      return `https://species.wikimedia.org/wiki/${encoded}`;
    } else if (lower.includes('quote')) {
      return `https://id.wikiquote.org/wiki/${encoded}`;
    } else if (lower.includes('commons')) {
      return `https://commons.wikimedia.org/wiki/${encoded}`;
    } else if (lower.includes('data')) {
      return `https://www.wikidata.org/wiki/Special:Search?search=${encoded}`;
    }
    return `https://id.wikipedia.org/wiki/Special:Search?search=${encoded}`;
  };

  // Id berkas yang sedang ditampilkan, agar hasil yang terlambat tidak menimpa berkas lain
  const currentItemIdRef = useRef<string | number | null>(item ? item.id : null);
  currentItemIdRef.current = item ? item.id : null;

  /**
   * Menjalankan analisis berkas.
   * auto = true: dipakai otomatis saat tab Gemini terbuka. Memakai cache memori (sampai halaman dimuat ulang)
   * dan tidak memanggil Gemini lagi saat kuota baru saja habis.
   * auto = false: tombol manual (Analisis ulang / Coba lagi), selalu memanggil Gemini.
   * Tanpa kunci atau bila Gemini gagal, ditampilkan ringkasan lokal dari metadata Commons.
   */
  const runAiAnalysis = async (auto: boolean) => {
    if (!item) return;
    const target = item;

    if (!geminiApiKey) {
      setAiError(null);
      setUnifiedAnalysis(buildLocalMediaAnalysis(target, language, wikiUsages));
      if (!auto) onOpenGeminiModal();
      return;
    }

    if (auto) {
      const cached = getCachedUnifiedAnalysis(target.id, language);
      if (cached) {
        setAiError(null);
        setUnifiedAnalysis(cached);
        return;
      }
      const blocked = getGeminiQuotaBlockMessage();
      if (blocked) {
        setAiError(blocked);
        setUnifiedAnalysis(buildLocalMediaAnalysis(target, language, wikiUsages));
        return;
      }
    }

    setIsAiLoading(true);
    setAiError(null);

    let usages: WikiGlobalUsageItem[] = wikiUsages;
    try {
      // 1. Ambil pemakaian berkas di proyek Wikimedia (tidak menggagalkan analisis bila gagal)
      if (usages.length === 0) {
        try {
          usages = await fetchFileGlobalUsage(target.title);
          if (currentItemIdRef.current === target.id) setWikiUsages(usages);
        } catch (uErr) {
          console.warn('Failed to fetch wiki usage:', uErr);
        }
      }

      // 2. Analisis terstruktur Gemini sesuai bahasa antarmuka
      const res = await generateUnifiedMediaAnalysis(geminiApiKey, target, usages, language);
      setCachedUnifiedAnalysis(target.id, language, res);
      if (currentItemIdRef.current === target.id) setUnifiedAnalysis(res);
    } catch (err) {
      console.error('Unified AI analysis error:', err);
      if (currentItemIdRef.current !== target.id) return;
      setAiError(err instanceof Error ? err.message : (language === 'en' ? 'Failed to generate the AI analysis.' : 'Gagal menghasilkan analisis AI.'));
      // Pertahankan hasil Gemini sebelumnya bila ada; jika tidak, tampilkan ringkasan lokal
      setUnifiedAnalysis((prev) =>
        prev && prev.modelMeta?.source !== 'local' ? prev : buildLocalMediaAnalysis(target, language, usages)
      );
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleRunAiAnalysis = () => {
    void runAiAnalysis(false);
  };

  // Otomatis jalan saat tab Gemini terbuka: hasil cache, ringkasan lokal (tanpa kunci), atau panggilan Gemini
  const autoRunKeyRef = useRef<string>('');
  useEffect(() => {
    if (!item || activeTab !== 'ai') return;
    const runKey = `${item.id}|${language}|${geminiApiKey ? 1 : 0}`;
    if (autoRunKeyRef.current === runKey) return;
    autoRunKeyRef.current = runKey;
    void runAiAnalysis(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.id, activeTab, language, geminiApiKey]);

  const handleCopySection = (sectionKey: string, textToCopy: string) => {
    navigator.clipboard.writeText(textToCopy);
    setCopiedSection(sectionKey);
    setTimeout(() => {
      setCopiedSection(null);
    }, 2000);
  };

  if (!item || !licenseInfo) return null;

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/70 flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
      {/* Modal Dialog Card */}
      <div className="relative w-full max-w-5xl bg-white dark:bg-stone-900 rounded-lg shadow-sm border border-stone-200 dark:border-stone-800 overflow-hidden flex flex-col max-h-[92vh] lg:h-[88vh]">
        
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/50">
          <div className="flex items-center gap-3 min-w-0 pr-4">
            <h2 className="font-display font-semibold text-base sm:text-lg text-stone-900 dark:text-white truncate">
              {item.cleanTitle}
            </h2>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">


            {/* Bookmark button */}
            {onToggleSave && (
              <button
                type="button"
                onClick={() => onToggleSave(item)}
                className={`p-2 rounded-lg border transition-colors cursor-pointer ${
                  isSaved
                    ? 'bg-accent-50 border-accent-200 text-accent-600 dark:bg-accent-950/60 dark:border-accent-900'
                    : 'text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200 border-stone-200 dark:border-stone-800 hover:bg-stone-100 dark:hover:bg-stone-800'
                }`}
                title={language === 'en' ? (isSaved ? 'Remove from favorites' : 'Save to favorites') : (isSaved ? 'Hapus dari koleksi favorit' : 'Simpan ke koleksi favorit')}
              >
                <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors shrink-0"
              aria-label={language === 'en' ? 'Close (Escape)' : 'Tutup modal (Escape)'}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body: Split Media Viewer & Info Pane */}
        <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 min-h-0 overflow-y-auto lg:overflow-hidden lg:grid-rows-1">
          
          {/* Kiri / atas: panggung media (stage) + toolbar */}
          <div className="lg:col-span-7 relative isolate overflow-hidden bg-stone-950 flex flex-col min-h-[320px] lg:min-h-0 lg:h-full">
            {/* Latar ambient: gambar yang sama diburamkan + gradasi */}
            {(item.mediaType === 'image' || (item.mediaType === 'document' && item.thumbnailUrl)) && (
              <img
                src={item.mediaType === 'image' ? previewSrc : item.thumbnailUrl}
                alt=""
                aria-hidden="true"
                referrerPolicy="no-referrer"
                className="pointer-events-none absolute inset-0 -z-10 h-full w-full scale-125 object-cover opacity-40 blur-3xl saturate-150"
              />
            )}
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-stone-950/50 via-stone-950/60 to-stone-950/90" />

            {/* Panggung */}
            <div className="relative flex flex-1 lg:min-h-0 items-center justify-center px-12 py-4 sm:px-14 sm:py-8 lg:overflow-y-auto">
              {item.mediaType === 'image' ? (
                <div className="relative max-h-[min(60vh,calc(92vh-10rem))] lg:max-h-full lg:h-full max-w-full flex items-center justify-center">
                  {isMediaLoading && (
                    <div
                      role="status"
                      aria-live="polite"
                      className="flex aspect-[4/3] w-[min(100%,440px)] animate-pulse flex-col items-center justify-center gap-3 rounded-lg bg-white/5 text-stone-300 ring-1 ring-white/10"
                    >
                      <Loader2 className="h-7 w-7 animate-spin text-accent-400" />
                      <span className="text-xs font-medium tracking-wide">{language === 'en' ? 'Loading photo…' : 'Memuat foto…'}</span>
                    </div>
                  )}
                  <img
                    key={item.id}
                    ref={(el) => {
                      if (el && el.complete && el.naturalWidth > 0) setLoadedMediaId(String(item.id));
                    }}
                    src={previewSrc}
                    alt={item.cleanTitle}
                    referrerPolicy="no-referrer"
                    onLoad={() => setLoadedMediaId(String(item.id))}
                    onError={() => { if (previewSrc !== previewThumb && previewThumb) { setPreviewFailedId(String(item.id)); } else { setLoadedMediaId(String(item.id)); } }}
                    className={
                      isMediaLoading
                        ? 'pointer-events-none absolute h-px w-px opacity-0'
                        : 'max-h-[min(60vh,calc(92vh-10rem))] lg:max-h-full max-w-full object-contain rounded-lg ring-1 ring-white/15 shadow-sm shadow-black/60 animate-in fade-in'
                    }
                  />
                </div>
              ) : item.mediaType === 'audio' ? (
                <div className="w-full max-w-md space-y-4 rounded-lg border border-white/10 bg-white/5 p-5 text-center ">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-accent-500/20 text-accent-300">
                    <FileText className="h-7 w-7" />
                  </div>
                  <div>
                    <h4 className="font-display text-sm font-semibold text-white">{item.cleanTitle}</h4>
                    <p className="mt-0.5 font-mono text-xs text-stone-400">{item.mimeType}</p>
                  </div>
                  <audio controls src={item.fileUrl} className="w-full">
                    {language === 'en' ? 'Your browser does not support the HTML5 audio player.' : 'Browser Anda tidak mendukung pemutar audio HTML5.'}
                  </audio>
                </div>
              ) : item.mediaType === 'document' ? (
                item.thumbnailUrl ? (
                  <button
                    type="button"
                    onClick={openReader}
                    title={language === 'en' ? 'Reading mode' : 'Mode Baca'}
                    className="group relative cursor-pointer rounded-md shadow-sm shadow-black/60 ring-1 ring-white/15 max-h-[min(56vh,calc(92vh-10rem))] max-w-full"
                  >
                    <img
                      src={item.thumbnailUrl}
                      alt={item.cleanTitle}
                      referrerPolicy="no-referrer"
                      className="max-h-[min(56vh,calc(92vh-10rem))] lg:max-h-[calc(88vh-13rem)] max-w-full rounded-md bg-white object-contain"
                    />
                    <span className="absolute inset-0 flex items-center justify-center rounded-md bg-black/0 opacity-0 transition group-hover:bg-black/40 group-hover:opacity-100">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-stone-900">
                        <BookOpen className="h-3.5 w-3.5" />
                        {language === 'en' ? 'Reading mode' : 'Mode Baca'}
                      </span>
                    </span>
                  </button>
                ) : (
                  <div className="flex h-44 w-36 items-center justify-center rounded-md bg-white/10 ring-1 ring-white/15">
                    <FileText className="h-10 w-10 text-amber-400" />
                  </div>
                )
              ) : (
                <video
                  controls
                  poster={item.thumbnailUrl}
                  src={item.fileUrl}
                  className="block w-full max-h-[min(70vh,calc(92vh-10rem))] lg:max-h-full lg:h-full rounded-lg bg-black object-contain shadow-sm ring-1 ring-white/10"
                >
                  {language === 'en' ? 'Your browser does not support the HTML5 video player.' : 'Browser Anda tidak mendukung pemutar video HTML5.'}
                </video>
              )}

              {/* Navigasi berkas sebelumnya / berikutnya (melayang di sisi panggung) */}
              {(onPrev || onNext) && (
                <>
                  <button
                    type="button"
                    onClick={onPrev}
                    disabled={!hasPrev}
                    title={language === 'en' ? 'Previous file (Left arrow)' : 'Berkas Sebelumnya (Tombol Panah Kiri)'}
                    aria-label={language === 'en' ? 'Previous file' : 'Berkas Sebelumnya'}
                    className="absolute left-2 top-1/2 flex h-10 w-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-white/15 bg-black/40 text-white transition hover:bg-black/60 disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={onNext}
                    disabled={!hasNext}
                    title={language === 'en' ? 'Next file (Right arrow)' : 'Berkas Berikutnya (Tombol Panah Kanan)'}
                    aria-label={language === 'en' ? 'Next file' : 'Berkas Berikutnya'}
                    className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-white/15 bg-black/40 text-white transition hover:bg-black/60 disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </>
              )}
            </div>

            {/* Toolbar bawah: info berkas + aksi */}
            <div className="relative flex flex-wrap items-center justify-between gap-2 border-t border-white/10 bg-black/35 px-3 py-2.5 sm:px-5">
              <div className="flex flex-wrap items-center gap-1.5 font-mono text-xs text-stone-200">
                <span className="rounded-md bg-white/10 px-2 py-1 uppercase">{(item.mimeType.split('/')[1] || item.mediaType).replace(/^x-/, '')}</span>
                {item.width > 0 && <span className="rounded-md bg-white/10 px-2 py-1">{item.width} × {item.height} px</span>}
                {item.fileSize > 0 && <span className="rounded-md bg-white/10 px-2 py-1">{formatBytes(item.fileSize)}</span>}
                {item.mediaType === 'document' && readerInfo && readerInfo.pages > 1 && (
                  <span className="rounded-md bg-white/10 px-2 py-1">{readerInfo.pages} {language === 'en' ? 'pages' : 'halaman'}</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {item.mediaType === 'document' && (
                  <button
                    type="button"
                    onClick={openReader}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-accent-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-accent-500"
                  >
                    <BookOpen className="h-3.5 w-3.5" />
                    {language === 'en' ? 'Reading mode' : 'Mode Baca'}
                  </button>
                )}
                <a
                  href={item.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/20"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  {language === 'en' ? 'Open file' : 'Buka berkas'}
                </a>
              </div>
            </div>

            {/* Mode Baca Dokumen (layar penuh) */}
            {readerOpen && createPortal(
              <div className="fixed inset-0 z-[100] flex flex-col bg-black text-white" role="dialog" aria-modal="true" aria-label={language === 'en' ? 'Document reading mode' : 'Mode baca dokumen'}>
                <div className="flex shrink-0 items-center gap-3 border-b border-white/10 bg-black/90 px-3 py-2.5 sm:px-4">
                  <button
                    type="button"
                    onClick={() => setReaderOpen(false)}
                    aria-label={language === 'en' ? 'Close reading mode' : 'Tutup mode baca'}
                    className="cursor-pointer rounded-full p-2 hover:bg-white/10"
                  >
                    <X className="h-5 w-5" />
                  </button>
                  <div className="min-w-0 flex-1 truncate text-sm font-semibold">{item.cleanTitle}</div>
                  <a
                    href={item.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={language === 'en' ? 'Open document in a new tab' : 'Buka dokumen di tab baru'}
                    className="rounded-full p-2 hover:bg-white/10"
                  >
                    <ExternalLink className="h-5 w-5" />
                  </a>
                </div>
                <div ref={readerScrollRef} onScroll={onReaderScroll} className="min-h-0 flex-1 overflow-y-auto bg-neutral-900">
                  {readerLoading && (
                    <div className="flex items-center justify-center gap-2 py-16 text-sm text-stone-300">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {language === 'en' ? 'Preparing pages…' : 'Menyiapkan halaman…'}
                    </div>
                  )}
                  {readerInfo && (
                    <div className="mx-auto max-w-3xl space-y-3 px-2 py-3 sm:px-4 sm:py-5">
                      {Array.from({ length: readerInfo.pages }, (_, i) => i + 1).map((n) => (
                        <div key={n} data-page={n} className="overflow-hidden rounded-sm bg-white shadow-sm" style={{ minHeight: '40vh' }}>
                          <img
                            src={readerPageUrl(n)}
                            alt={(language === 'en' ? 'Page ' : 'Halaman ') + n}
                            loading="lazy"
                            referrerPolicy="no-referrer"
                            className="block h-auto w-full"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {readerInfo && readerInfo.pages > 1 && (
                  <div className="flex shrink-0 items-center gap-3 border-t border-white/10 bg-black/90 px-4 py-3">
                    <span className="whitespace-nowrap text-xs font-semibold tabular-nums">
                      {language === 'en' ? 'Page ' + readerPage + ' of ' + readerInfo.pages : 'Halaman ' + readerPage + ' dari ' + readerInfo.pages}
                    </span>
                    <input
                      type="range"
                      min={1}
                      max={readerInfo.pages}
                      value={readerPage}
                      onChange={(e) => jumpToPage(Number(e.target.value))}
                      aria-label={language === 'en' ? 'Jump to page' : 'Lompat ke halaman'}
                      className="flex-1 accent-accent-500"
                    />
                  </div>
                )}
              </div>,
              document.body
            )}
          </div>

          {/* Right: Tabbed Details & Actions Pane (5 cols on lg) */}
          <div className="lg:col-span-5 flex flex-col lg:min-h-0 lg:h-full lg:overflow-y-auto bg-white dark:bg-stone-900 border-t lg:border-t-0 lg:border-l border-stone-200 dark:border-stone-800">
            
            {/* Tabs Selector (chip) */}
          <div className="sticky top-0 z-10 flex flex-wrap gap-2 border-b border-stone-200 bg-white px-4 py-3 text-xs font-medium dark:border-stone-800 dark:bg-stone-900">
            <button
              type="button"
              onClick={() => setActiveTab('ai')}
              aria-pressed={activeTab === 'ai'}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 transition-colors ${
                activeTab === 'ai'
                  ? 'border-accent-600 bg-accent-600 font-semibold text-white shadow-xs'
                  : 'border-stone-200 bg-stone-100 text-stone-600 hover:bg-stone-200 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>{t.modal.aiTab}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('download')}
              aria-pressed={activeTab === 'download'}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 transition-colors ${
                activeTab === 'download'
                  ? 'border-accent-600 bg-accent-600 font-semibold text-white shadow-xs'
                  : 'border-stone-200 bg-stone-100 text-stone-600 hover:bg-stone-200 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700'
              }`}
            >
              <Download className="h-3.5 w-3.5" />
              <span>{t.modal.downloadTab}</span>
            </button>
<button
type="button"
onClick={() => setActiveTab('cats')}
aria-pressed={activeTab === 'cats'}
className={'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 transition-colors ' + (activeTab === 'cats'
? 'border-accent-600 bg-accent-600 font-semibold text-white shadow-xs'
: 'border-stone-200 bg-stone-100 text-stone-600 hover:bg-stone-200 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700')}
>
<Tag className="h-3.5 w-3.5" />
<span>{language === 'en' ? 'Categories & Usage' : 'Kategori & Penggunaan'}</span>
</button>
            <button
              type="button"
              onClick={() => setActiveTab('license')}
              aria-pressed={activeTab === 'license'}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 transition-colors ${
                activeTab === 'license'
                  ? 'border-accent-600 bg-accent-600 font-semibold text-white shadow-xs'
                  : 'border-stone-200 bg-stone-100 text-stone-600 hover:bg-stone-200 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700'
              }`}
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>{t.modal.licenseTab}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('history')}
              aria-pressed={activeTab === 'history'}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 transition-colors ${
                activeTab === 'history'
                  ? 'border-accent-600 bg-accent-600 font-semibold text-white shadow-xs'
                  : 'border-stone-200 bg-stone-100 text-stone-600 hover:bg-stone-200 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700'
              }`}
            >
              <History className="h-3.5 w-3.5" />
              <span>{language === 'en' ? 'Version History' : 'Riwayat Versi'}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('talk')}
              aria-pressed={activeTab === 'talk'}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 transition-colors ${
                activeTab === 'talk'
                  ? 'border-accent-600 bg-accent-600 font-semibold text-white shadow-xs'
                  : 'border-stone-200 bg-stone-100 text-stone-600 hover:bg-stone-200 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700'
              }`}
            >
              <MessageSquare className="h-3.5 w-3.5" />
              <span>{language === 'en' ? 'Discussion' : 'Diskusi'}</span>
            </button>
          </div>

          {/* Tab 1: Download & Technical Metadata */}
            {activeTab === 'download' && (
              <div className="p-5 space-y-6 flex-1 overflow-y-auto text-sm">
                {/* Download Options Box */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-stone-900 dark:text-white text-sm flex items-center gap-1.5">
                    <Download className="w-4 h-4 text-accent-600" />
                    <span>{t.modal.downloadTitle}</span>
                  </h4>

                  <div className="space-y-2">
                    <a
                      href={item.fileUrl}
                      download={item.title.replace(/^File:/i, '')}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center justify-between p-3 rounded-lg bg-accent-600 hover:bg-accent-700 text-white font-medium transition-colors shadow-xs"
                    >
                      <div className="flex items-center gap-2">
                        <Download className="w-4 h-4" />
                        <span>{t.modal.downloadOriginal}</span>
                      </div>
                      <span className="font-mono text-xs opacity-90">
                        {item.width ? `${item.width}×${item.height} · ` : ''}{formatBytes(item.fileSize)}
                      </span>
                    </a>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleCopyUrl(item.fileUrl)}
                        className="flex-1 py-2 px-3 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 rounded-lg font-medium transition-colors flex items-center justify-center gap-1.5"
                      >
                        {copiedUrl ? <Check className="w-3.5 h-3.5 text-moss-600" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedUrl ? t.modal.copied : t.modal.copyDirectLink}</span>
                      </button>

                      <a
                        href={item.pageUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 py-2 px-3 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 rounded-lg font-medium transition-colors flex items-center justify-center gap-1.5 text-center"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>{t.modal.commonsPage}</span>
                      </a>
                    </div>

                    {item.width > 320 && item.height > 0 && (item.mediaType === 'image' || item.mediaType === 'document') && (
                      <div className="space-y-1.5 pt-1">
                        <div className="text-xs font-semibold text-stone-500 dark:text-stone-400">
                          {language === 'en' ? 'Other sizes (preview image)' : 'Ukuran lain (gambar pratinjau)'}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                          {[320, 640, 800, 1024, 1280, 1920, 2560]
                            .filter((w) => w < item.width)
                            .map((w) => {
                              const h = Math.round((w * item.height) / item.width);
                              const href = 'https://commons.wikimedia.org/wiki/Special:FilePath/' + encodeURIComponent(item.title.replace(/^File:/i, '').replace(/ /g, '_')) + '?width=' + w;
                              return (
                                <a
                                  key={w}
                                  href={href}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center justify-between gap-2 rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs text-stone-700 transition-colors hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200 dark:hover:bg-stone-700"
                                >
                                  <span className="flex items-center gap-1.5 font-medium"><Download className="h-3.5 w-3.5 text-stone-400" />{w} px</span>
                                  <span className="font-mono text-xs text-stone-400">{w}×{h}</span>
                                </a>
                              );
                            })}
                        </div>
                        <p className="text-xs leading-snug text-stone-400">
                          {language === 'en'
                            ? 'Resized copies are generated by Wikimedia (usually JPG/PNG). Open the link, then save the image.'
                            : 'Salinan berukuran lain dibuat oleh Wikimedia (umumnya JPG/PNG). Buka tautan, lalu simpan gambarnya.'}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Metadata Details */}
                <div className="space-y-3 pt-3 border-t border-stone-100 dark:border-stone-800">
                  <h4 className="font-semibold text-stone-900 dark:text-white text-sm uppercase tracking-wider">
                    {t.modal.sourceInfo}
                  </h4>

                  <dl className="space-y-2 text-stone-600 dark:text-stone-300">
                    <div className="flex items-start gap-2">
                      <FileText className="w-3.5 h-3.5 text-stone-400 mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <dt className="text-stone-400 text-xs">{language === 'en' ? 'Name' : 'Nama'}</dt>
                        <dd className="font-medium break-all text-stone-800 dark:text-stone-200">{item.title.replace(/^File:/i, '')}</dd>
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <User className="w-3.5 h-3.5 text-stone-400 mt-0.5 shrink-0" />
                      <div>
                        <dt className="text-stone-400 text-xs">{t.modal.creator}</dt>
                        <dd className="font-medium text-stone-800 dark:text-stone-200">
                          {item.author && item.author !== 'Wikimedia Commons' ? (
                            item.author
                          ) : uploader ? (
                            <button
                              type="button"
                              onClick={() => onSearchUser && onSearchUser(uploader)}
                              title={language === 'en' ? 'Search this username' : 'Cari nama pengguna ini'}
                              className="cursor-pointer text-accent-700 hover:underline dark:text-accent-300"
                            >
                              {uploader}
                            </button>
                          ) : (
                            item.credit || 'Wikimedia Commons'
                          )}
                        </dd>
                      </div>
                    </div>

                    {uploader && item.author && item.author !== 'Wikimedia Commons' && (
                      <div className="flex items-start gap-2">
                        <User className="w-3.5 h-3.5 text-stone-400 mt-0.5 shrink-0" />
                        <div>
                          <dt className="text-stone-400 text-xs">{language === 'en' ? 'Uploader' : 'Pengunggah'}</dt>
                          <dd className="font-medium">
                            <button
                              type="button"
                              onClick={() => onSearchUser && onSearchUser(uploader)}
                              title={language === 'en' ? 'Search this username' : 'Cari nama pengguna ini'}
                              className="cursor-pointer text-accent-700 hover:underline dark:text-accent-300"
                            >
                              {uploader}
                            </button>
                          </dd>
                        </div>
                      </div>
                    )}

                    <div className="flex items-start gap-2">
                      <FileCode className="w-3.5 h-3.5 text-stone-400 mt-0.5 shrink-0" />
                      <div>
                        <dt className="text-stone-400 text-xs">{t.modal.fileExtension}</dt>
                        <dd className="font-mono flex items-center gap-1.5 text-stone-800 dark:text-stone-200">
                          <span className="px-2 py-0.5 rounded bg-accent-50 dark:bg-accent-950/60 text-accent-700 dark:text-accent-300 font-bold text-xs uppercase border border-accent-200 dark:border-accent-800">
                            {getFileExtension(item.title, item.fileUrl, item.mimeType)}
                          </span>
                          <span className="text-stone-500 text-xs font-normal">({item.mimeType})</span>
                        </dd>
                      </div>
                    </div>

                    {item.date && (
                      <div className="flex items-start gap-2">
                        <Calendar className="w-3.5 h-3.5 text-stone-400 mt-0.5 shrink-0" />
                        <div>
                          <dt className="text-stone-400 text-xs">{t.modal.createdDate}</dt>
                          <dd className="font-mono">{item.date}</dd>
                        </div>
                      </div>
                    )}

                    {item.description && (
                      <div className="flex items-start gap-2">
                        <Info className="w-3.5 h-3.5 text-stone-400 mt-0.5 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2"><dt className="text-stone-400 text-xs">{t.modal.description}</dt>{ttsSupported && (<button type="button" onClick={() => toggleSpeak(String(item.description))} className="inline-flex items-center gap-1 rounded-full border border-stone-200 dark:border-stone-700 px-2.5 py-0.5 text-xs font-medium text-accent-600 dark:text-accent-400 hover:bg-accent-50 dark:hover:bg-stone-800" aria-label={speaking ? (language === 'en' ? 'Stop reading' : 'Berhenti membaca') : (language === 'en' ? 'Read description aloud' : 'Bacakan deskripsi')}>{speaking ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}{speaking ? (language === 'en' ? 'Stop' : 'Berhenti') : (language === 'en' ? 'Read aloud' : 'Bacakan')}</button>)}</div>
                          <dd className="whitespace-pre-line break-words leading-relaxed">{item.description}</dd>
                        </div>
                      </div>
                    )}

                    {(item.latitude !== undefined && item.longitude !== undefined) && (
                      <div className="flex items-start gap-2">
                        <MapPin className="w-3.5 h-3.5 text-stone-400 mt-0.5 shrink-0" />
                        <div>
                          <dt className="text-stone-400 text-xs">{t.modal.coordinates}</dt>
                          <dd className="font-mono">{item.latitude.toFixed(4)}, {item.longitude.toFixed(4)}</dd>
                        </div>
                      </div>
                    )}
                  </dl>
                </div>

              {/* Lisensi, Depicts, EXIF kamera & Kategori */}
              <div className="space-y-5 pt-1">
                {/* Depicts & Data Terstruktur */}
                {extraDetail && extraDetail.depicts.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-bold uppercase tracking-wide text-stone-900 dark:text-white">
                      Depicts &amp; Data Terstruktur
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {extraDetail.depicts.map((d) => (
                        <span
                          key={d}
                          className="rounded-lg border border-stone-300 px-2.5 py-1 text-xs text-stone-700 dark:border-stone-600 dark:text-stone-200"
                        >
                          #{d}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Kamera & Data EXIF */}
                <div className="space-y-2">
                  <h4 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-stone-900 dark:text-white">
                    <Camera className="h-3.5 w-3.5 text-stone-500" />
                    Kamera &amp; Data EXIF
                    {isExtraLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-stone-400" />}
                  </h4>
                  <div className="divide-y divide-stone-200 rounded-lg border border-stone-200 bg-stone-50 px-3.5 dark:divide-stone-700 dark:border-stone-800 dark:bg-stone-800/50">
                    {([
                      ['make', 'Produsen Kamera'],
                      ['model', 'Model Kamera'],
                      ['lens', 'Lensa'],
                      ['exposure', 'Waktu Pencahayaan'],
                      ['fnumber', 'Bukaan (F-number)'],
                      ['iso', 'ISO'],
                      ['datetime', 'Waktu Data Dibuat'],
                      ['focal', 'Panjang Fokus Lensa'],
                    ] as [string, string][]).map(([key, label]) => {
                      const found = extraDetail?.exif.find((x) => x.key === key);
                      if (!found) return null;
                      return (
                        <div key={key} className="flex items-start justify-between gap-3 py-2.5">
                          <span className="flex items-center gap-2 text-stone-500 dark:text-stone-400">
                            {key === 'make' || key === 'model' ? (
                              <Camera className="h-3.5 w-3.5 text-accent-600 dark:text-accent-400" />
                            ) : (
                              <Info className="h-3.5 w-3.5 text-accent-600 dark:text-accent-400" />
                            )}
                            {label}
                          </span>
                          <span className="text-right font-medium text-stone-800 dark:text-stone-100">{found.value}</span>
                        </div>
                      );
                    })}
                    {item.width > 0 && (
                      <div className="flex items-start justify-between gap-3 py-2.5">
                        <span className="flex items-center gap-2 text-stone-500 dark:text-stone-400">
                          <Info className="h-3.5 w-3.5 text-accent-600 dark:text-accent-400" />
                          Resolusi
                        </span>
                        <span className="text-right font-medium text-stone-800 dark:text-stone-100">
                          {item.width} × {item.height} px
                        </span>
                      </div>
                    )}
                    {item.fileSize > 0 && (
                      <div className="flex items-start justify-between gap-3 py-2.5">
                        <span className="flex items-center gap-2 text-stone-500 dark:text-stone-400">
                          <Info className="h-3.5 w-3.5 text-accent-600 dark:text-accent-400" />
                          Ukuran Berkas
                        </span>
                        <span className="text-right font-medium text-stone-800 dark:text-stone-100">{formatBytes(item.fileSize)}</span>
                      </div>
                    )}
                    {item.date && (
                      <div className="flex items-start justify-between gap-3 py-2.5">
                        <span className="flex items-center gap-2 text-stone-500 dark:text-stone-400">
                          <Info className="h-3.5 w-3.5 text-accent-600 dark:text-accent-400" />
                          Tanggal Pengambilan
                        </span>
                        <span className="text-right font-medium text-stone-800 dark:text-stone-100">{item.date}</span>
                      </div>
                    )}
                    {item.mimeType && (
                      <div className="flex items-start justify-between gap-3 py-2.5">
                        <span className="flex items-center gap-2 text-stone-500 dark:text-stone-400">
                          <Info className="h-3.5 w-3.5 text-accent-600 dark:text-accent-400" />
                          Tipe MIME
                        </span>
                        <span className="text-right font-medium text-stone-800 dark:text-stone-100">{item.mimeType}</span>
                      </div>
                    )}
                    {item.latitude !== undefined && item.longitude !== undefined && (
                      <div className="flex items-center justify-between gap-3 py-3">
                        <span className="flex items-center gap-2 text-stone-500 dark:text-stone-400">
                          <MapPin className="h-4 w-4 text-red-500" />
                          <span>
                            <span className="block text-xs">Geotag / Koordinat GPS</span>
                            <span className="font-mono font-medium text-stone-800 dark:text-stone-100">
                              {item.latitude.toFixed(6)}, {item.longitude.toFixed(6)}
                            </span>
                          </span>
                        </span>
                        <a
                          href={`https://www.openstreetmap.org/?mlat=${item.latitude}&mlon=${item.longitude}#map=17/${item.latitude}/${item.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 rounded-full border border-stone-300 px-4 py-1.5 text-xs font-semibold text-accent-700 hover:bg-white dark:border-stone-600 dark:text-accent-300 dark:hover:bg-stone-700"
                        >
                          Peta
                        </a>
                      </div>
                    )}
                  </div>
                </div>

              </div>
              </div>
            )}

{/* Tab: Kategori & Penggunaan di proyek Wikimedia */}
{activeTab === 'cats' && (
<div className="p-5 space-y-5 flex-1 overflow-y-auto text-xs">
<div className="space-y-2.5">
<div className="flex items-center gap-2">
<Tag className="h-4 w-4 text-accent-600 dark:text-accent-400" />
<span className="text-sm font-bold text-stone-900 dark:text-white">{language === 'en' ? 'Categories' : 'Kategori'}</span>
<span className="rounded-full bg-accent-100 px-2 py-0.5 text-xs font-semibold text-accent-700 dark:bg-accent-900/50 dark:text-accent-300">{categories.length}</span>
</div>
{categories.length > 0 ? (
<div className="flex flex-wrap gap-1.5">
{categories.map((c) => {
const name = c.replace(/^Category:/i, '');
return (
<span
  key={c}
  className="inline-flex items-stretch overflow-hidden rounded-lg border border-stone-300 text-xs text-stone-700 dark:border-stone-600 dark:text-stone-200"
>
  {onSearchCategory ? (
    <button
      type="button"
      onClick={() => onSearchCategory(name)}
      title={language === 'en' ? 'Search this category' : 'Cari kategori ini'}
      className="cursor-pointer px-2.5 py-1 hover:bg-stone-50 dark:hover:bg-stone-700"
    >
      {name}
    </button>
  ) : (
    <a
      href={'https://commons.wikimedia.org/wiki/Category:' + encodeURIComponent(name.replace(/ /g, '_'))}
      target="_blank"
      rel="noopener noreferrer"
      className="px-2.5 py-1 hover:bg-stone-50 dark:hover:bg-stone-700"
    >
      {name}
    </a>
  )}
  {onToggleCategorySave && (
    <button
      type="button"
      onClick={() => onToggleCategorySave(name)}
      aria-label={language === 'en' ? 'Bookmark category' : 'Simpan kategori'}
      title={language === 'en' ? 'Bookmark category' : 'Simpan kategori'}
      className="cursor-pointer border-l border-stone-300 px-1.5 hover:bg-stone-50 dark:border-stone-600 dark:hover:bg-stone-700"
    >
      <Bookmark className={`h-3 w-3 ${isCategorySaved && isCategorySaved(name) ? 'fill-current text-accent-600 dark:text-accent-400' : 'text-stone-400'}`} />
    </button>
  )}
</span>
);
})}
</div>
) : (
<p className="text-stone-500 dark:text-stone-400">{language === 'en' ? 'No categories.' : 'Tidak ada kategori.'}</p>
)}
</div>

<div className="space-y-2.5 pt-4 border-t border-stone-200 dark:border-stone-800">
<div className="flex items-center gap-2">
<Globe className="h-4 w-4 text-moss-600 dark:text-moss-400" />
<span className="text-sm font-bold text-stone-900 dark:text-white">{language === 'en' ? 'Usage across Wikimedia projects' : 'Penggunaan di berbagai proyek Wikimedia'}</span>
<span className="rounded-full bg-moss-100 px-2 py-0.5 text-xs font-semibold text-moss-700 dark:bg-moss-900/50 dark:text-moss-300">{wikiUsages.length}</span>
</div>
{usagesLoading ? (
<div className="flex items-center gap-2 text-stone-500 dark:text-stone-400"><Loader2 className="h-4 w-4 animate-spin" />{language === 'en' ? 'Loading usage…' : 'Memuat penggunaan…'}</div>
) : wikiUsages.length === 0 ? (
<p className="text-stone-500 dark:text-stone-400">{language === 'en' ? 'This file is not used on any other Wikimedia project yet.' : 'Berkas ini belum dipakai di proyek Wikimedia lain.'}</p>
) : (
<div className="space-y-3">
{Array.from(new Set(wikiUsages.map((u) => u.wiki))).map((w) => (
<div key={w} className="rounded-lg border border-stone-200 bg-stone-50 dark:border-stone-800 dark:bg-stone-800/50 p-3 space-y-1.5">
<div className="text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">{w}</div>
<div className="flex flex-col gap-1">
{wikiUsages.filter((u) => u.wiki === w).map((u, i) => (
<a key={i} href={u.url} target="_blank" rel="noopener noreferrer" className="group inline-flex items-center gap-1.5 text-stone-700 hover:text-accent-700 dark:text-stone-200 dark:hover:text-accent-300">
<span className="group-hover:underline">{u.title}</span>
<ExternalLink className="h-3 w-3 shrink-0 opacity-60" />
</a>
))}
</div>
</div>
))}
</div>
)}
</div>
</div>
)}

            {/* Tab 2: Creative Commons Legal Compliance & Attribution Generator */}
            {activeTab === 'license' && (
              <div className="p-5 space-y-5 flex-1 overflow-y-auto text-xs">
                
                {/* Official License Badge & Deed */}
                <div className="p-4 rounded-lg bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-stone-900 dark:text-white text-sm">
                      {licenseInfo.label}
                    </span>
                    <a
                      href={licenseInfo.deedUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-accent-600 dark:text-accent-400 hover:underline flex items-center gap-1 font-medium"
                    >
                      <span>Legal Deed</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <p className="text-stone-600 dark:text-stone-400 text-xs leading-relaxed">
                    {item.licenseFull}
                  </p>
                </div>

                {/* Permissions Matrix */}
                <div className="space-y-2">
                  <h4 className="font-semibold text-stone-900 dark:text-white text-sm uppercase tracking-wider">
                    {t.modal.termsTitle}
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 rounded-lg bg-moss-50 dark:bg-moss-950/40 border border-moss-200 dark:border-moss-900/40 text-moss-900 dark:text-moss-200">
                      <span className="font-semibold block">{t.modal.commercialAllowed}</span>
                      <span>{t.modal.commercialDesc}</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-moss-50 dark:bg-moss-950/40 border border-moss-200 dark:border-moss-900/40 text-moss-900 dark:text-moss-200">
                      <span className="font-semibold block">{t.modal.remixAllowed}</span>
                      <span>{t.modal.remixDesc}</span>
                    </div>
                    <div className={`p-2.5 rounded-lg border text-xs ${
                      licenseInfo.requiresAttribution
                        ? 'bg-accent-50 dark:bg-accent-950/40 border-accent-200 dark:border-accent-900/40 text-accent-900 dark:text-accent-200'
                        : 'bg-stone-50 dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400'
                    }`}>
                      <span className="font-semibold block">{t.modal.attributionRule}</span>
                      <span>{t.modal.attributionDesc}</span>
                    </div>
                    <div className={`p-2.5 rounded-lg border text-xs ${
                      licenseInfo.requiresShareAlike
                        ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/40 text-amber-900 dark:text-amber-200'
                        : 'bg-stone-50 dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400'
                    }`}>
                      <span className="font-semibold block">{t.modal.shareAlikeRule}</span>
                      <span>{t.modal.shareAlikeDesc}</span>
                    </div>
                  </div>
                </div>

                {/* Attribution Generator (TASL compliant) */}
                <div className="space-y-3 pt-2">
                  <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
                    <h4 className="font-display font-semibold text-stone-900 dark:text-white text-base">
                      {t.modal.taslTitle}
                    </h4>
                    
                    {/* Format Selector */}
                    <div className="flex flex-wrap items-center gap-1 p-0.5 bg-stone-100 dark:bg-stone-800 rounded-md text-xs">
                      {(['plain', 'markdown', 'html', 'wikitext'] as const).map((fmt) => (
                        <button
                          key={fmt}
                          onClick={() => setAttributionFormat(fmt)}
                          className={`px-2.5 py-1 rounded capitalize ${
                            attributionFormat === fmt
                              ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-white font-medium shadow-2xs'
                              : 'text-stone-500 hover:text-stone-900 dark:text-stone-400'
                          }`}
                        >
                          {fmt}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div
                      tabIndex={0}
                      aria-label={t.modal.taslTitle}
                      className="w-full select-all whitespace-pre-wrap [overflow-wrap:anywhere] p-3 font-mono text-xs leading-relaxed bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-lg text-stone-800 dark:text-stone-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-600"
                    >
                      {attributionText}
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyAttribution}
                      className="ml-auto w-fit px-3 py-1.5 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-700 rounded-md font-medium text-xs text-stone-800 dark:text-stone-200 flex items-center gap-1 shadow-2xs transition-colors"
                    >
                      {copiedFormat ? <Check className="w-3.5 h-3.5 text-moss-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedFormat ? t.modal.copied : t.modal.copyAttributionBtn}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Riwayat Versi Berkas */}
          {activeTab === 'history' && (
            <div className="p-5 space-y-5 flex-1 overflow-y-auto text-xs">
              <FileHistoryPanel title={item.title} onSearchUser={onSearchUser} language={language} />
            </div>
          )}

          {/* Tab: Diskusi (File talk page) */}
          {activeTab === 'talk' && (
            <div className="p-5 space-y-5 flex-1 overflow-y-auto">
              <TalkPageView
                title={`File talk:${item.title.replace(/^File:/i, '')}`}
                emptyHint={language === 'en' ? 'No discussion for this file yet.' : 'Belum ada diskusi untuk berkas ini.'}
                language={language}
              />
            </div>
          )}

          {/* Tab 3: Gemini AI Assistant (Unified Direct View) */}
            {activeTab === 'ai' && (
              <div className="p-5 space-y-4 flex-1 overflow-y-auto text-xs">
                {/* Check if user configured their Gemini key */}
                {isAiLoading ? (
                  <div className="p-10 text-center space-y-4 bg-stone-50/50 dark:bg-stone-800/30 rounded-lg border border-stone-200/60 dark:border-stone-800">
                    <div className="relative mx-auto w-12 h-12 flex items-center justify-center">
                      <div className="absolute inset-0 rounded-full border-2 border-accent-500/30 border-t-accent-600 animate-spin" />
                      <Sparkles className="w-5 h-5 text-accent-600 animate-pulse" />
                    </div>
                    <div className="space-y-1.5">
                      <p className="font-semibold text-stone-900 dark:text-white text-sm">
                        {t.modal.aiLoading}
                      </p>
                      <p className="text-stone-500 dark:text-stone-400 text-xs max-w-sm mx-auto leading-relaxed">
                        {t.modal.aiLoadingDesc}
                      </p>
                    </div>
                  </div>
                ) : aiError && !unifiedAnalysis ? (
                  <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-lg text-amber-900 dark:text-amber-200 text-xs space-y-3">
                    <div className="flex items-start gap-2.5">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <p className="font-semibold text-sm">{t.modal.aiCallErrorTitle}</p>
                        <p className="leading-relaxed opacity-90">{aiError}</p>
                      </div>
                    </div>
                    <div className="pt-1 flex items-center gap-3">
                      <button
                        type="button"
                        onClick={handleRunAiAnalysis}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-accent-600 hover:bg-accent-700 text-white rounded-lg font-medium text-xs transition-colors shadow-xs"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>{t.modal.retryAiBtn}</span>
                      </button>
                    </div>
                  </div>
                ) : !unifiedAnalysis ? (
                  /* Initial State: Call to Action */
                  <div className="p-6 text-center bg-stone-50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-800 rounded-lg space-y-4">
                    <div className="w-12 h-12 rounded-full bg-accent-50 dark:bg-accent-950/50 text-accent-600 dark:text-accent-400 flex items-center justify-center mx-auto border border-accent-200 dark:border-accent-900/50 shadow-xs">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <div className="space-y-1 max-w-md mx-auto">
                      <h4 className="font-semibold text-stone-900 dark:text-white text-sm">
                        {t.modal.aiHeroTitle}
                      </h4>
                      <p className="text-stone-500 dark:text-stone-400 text-xs leading-relaxed">
                        {t.modal.aiHeroSubtitle}
                      </p>
                    </div>
                    <button
                      onClick={handleRunAiAnalysis}
                      className="px-4 py-2.5 bg-accent-600 hover:bg-accent-700 text-white rounded-lg font-medium text-xs transition-colors inline-flex items-center gap-2 shadow-xs"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>{t.modal.runAiFullBtn}</span>
                    </button>
                  </div>
                ) : (
                  /* Unified Analysis Result: 4 Structured Sections with Copy Icons */
                  <div className="space-y-4">
                    {/* Catatan sumber hasil: ringkasan lokal (tanpa kunci) atau Gemini gagal */}
                    {unifiedAnalysis.modelMeta?.source === 'local' && !geminiApiKey && (
                      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-lg bg-accent-50 dark:bg-accent-950/40 border border-accent-200 dark:border-accent-900 text-xs text-accent-900 dark:text-accent-200">
                        <span className="leading-relaxed min-w-0">
                          {language === 'en'
                            ? 'No Gemini key yet, so this is a summary built from Commons metadata. Add your key for a fuller explanation.'
                            : 'Belum ada kunci Gemini, jadi ini ringkasan dari metadata Commons. Tambahkan kunci untuk penjelasan yang lebih lengkap.'}
                        </span>
                        <button
                          type="button"
                          onClick={onOpenGeminiModal}
                          className="inline-flex items-center gap-1.5 whitespace-nowrap px-3 py-1.5 bg-accent-600 hover:bg-accent-700 text-white rounded-lg font-medium transition-colors"
                        >
                          <Key className="w-3.5 h-3.5" />
                          <span>{t.modal.inputKeyBtn}</span>
                        </button>
                      </div>
                    )}
                    {aiError && (
                      <div role="alert" className="flex flex-wrap items-start justify-between gap-3 p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-900 dark:text-red-200">
                        <div className="flex items-start gap-2 min-w-0">
                          <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                          <div className="space-y-0.5 min-w-0">
                            <p className="font-semibold">{t.modal.aiCallErrorTitle}</p>
                            <p className="leading-relaxed opacity-90 break-words">{aiError}</p>
                            {unifiedAnalysis.modelMeta?.source === 'local' && (
                              <p className="leading-relaxed opacity-90">
                                {language === 'en'
                                  ? 'Showing a summary from Commons metadata instead.'
                                  : 'Menampilkan ringkasan dari metadata Commons sebagai gantinya.'}
                              </p>
                            )}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={handleRunAiAnalysis}
                          className="inline-flex items-center gap-1.5 whitespace-nowrap px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>{t.modal.retryAiBtn}</span>
                        </button>
                      </div>
                    )}

                    {/* Header Controls: Structured Badge, Copy All JSON, and Re-run */}
                    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 pb-3 border-b border-stone-200 dark:border-stone-800">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1 whitespace-nowrap px-2.5 py-0.5 rounded-full bg-moss-50 dark:bg-moss-950/50 text-moss-700 dark:text-moss-300 border border-moss-200 dark:border-moss-800 text-xs font-semibold">
                          <CheckCircle2 className="w-3 h-3" />
                          {t.modal.jsonBadge}
                        </span>
                        <span className="text-stone-500 dark:text-stone-400 text-xs whitespace-nowrap">{t.modal.fourSectionsBadge}</span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={handleSaveToPdf}
                          disabled={isExportingPdf}
                          className="inline-flex items-center gap-1.5 whitespace-nowrap px-3 py-1.5 bg-accent-600 hover:bg-accent-700 disabled:opacity-50 text-white rounded-lg text-xs font-medium transition-colors"
                          title="Simpan dan unduh laporan analisis lengkap dalam format PDF"
                        >
                          {pdfSuccess ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span className="font-semibold">{t.modal.pdfSavedBtn}</span>
                            </>
                          ) : isExportingPdf ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              <span>{t.modal.savingPdfBtn}</span>
                            </>
                          ) : (
                            <>
                              <FileDown className="w-3.5 h-3.5" />
                              <span>{t.modal.savePdfBtn}</span>
                            </>
                          )}
                        </button>
                        <button
                          onClick={handleRunAiAnalysis}
                          className="inline-flex items-center gap-1.5 whitespace-nowrap px-3 py-1.5 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 rounded-lg text-xs font-medium transition-colors"
                          title="Muat ulang atau perbarui analisis berkas ini"
                        >
                          <RefreshCw className="w-3.5 h-3.5 text-stone-500" />
                          <span>{t.modal.rerunAiBtn}</span>
                        </button>
                      </div>
                    </div>

                    {/* Assistant & LLM Model Info Bar with AI Disclaimer */}
                    <div className="p-3 rounded-lg bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-800 space-y-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2 min-w-0">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-accent-600 text-white font-medium text-xs">
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>{unifiedAnalysis.modelMeta?.assistantName || GEMINI_ASSISTANT_NAME}</span>
                          </span>
                          <span className="inline-flex flex-wrap items-baseline gap-x-1.5 px-2 py-0.5 rounded-md bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-200 text-xs font-medium">
                            <span>{unifiedAnalysis.modelMeta?.modelName || GEMINI_MODEL_NAME}</span>
                            <span className="font-mono font-normal text-stone-500 dark:text-stone-400 break-all">{unifiedAnalysis.modelMeta?.modelVersion || GEMINI_MODEL_VERSION}</span>
                          </span>
                        </div>
                        <span className="text-xs text-moss-600 dark:text-moss-400 font-medium inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          {language === 'en' ? 'Based on Commons metadata' : 'Berdasarkan metadata Commons'}
                        </span>
                      </div>

                      {/* AI Disclaimer Section with Official Wikimedia AI Link */}
                      <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-900/50 text-xs text-amber-900 dark:text-amber-200">
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <div className="space-y-1 w-full">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <span className="font-semibold block text-xs">{t.modal.aiDisclaimerTitle}</span>
                            <a
                              href="https://meta.wikimedia.org/wiki/Artificial_intelligence/Guidelines"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs font-medium text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-100 underline decoration-amber-400 inline-flex items-center gap-1 transition-colors"
                            >
                              <span>{t.modal.aiDisclaimerLink}</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          </div>
                          <p className="text-xs leading-relaxed text-amber-800 dark:text-amber-300">
                            {unifiedAnalysis.modelMeta?.disclaimer ||
                              (language === 'en' ? AI_DISCLAIMER_TEXT_EN : AI_DISCLAIMER_TEXT_ID)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* SECTION 1: Penjelasan Objek untuk Pengguna Awam */}
                    <div className="p-4 rounded-lg bg-accent-50/50 dark:bg-accent-950/20 border border-accent-100 dark:border-accent-900/40 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-accent-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                            <Sparkles className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-stone-900 dark:text-white text-xs">
                              {t.modal.sec1Title}
                            </h4>
                            <span className="text-xs text-accent-600 dark:text-accent-400 font-medium">
                              {t.modal.sec1Subtitle}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() =>
                            handleCopySection(
                              'object',
                              `[${t.modal.sec1Title}: ${item.cleanTitle}]\n${unifiedAnalysis.objectDescription.laymanSummary}\n\n${t.modal.sec1HighlightsTitle}\n${unifiedAnalysis.objectDescription.keyHighlights.map((k) => `• ${k}`).join('\n')}`
                            )
                          }
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 text-xs transition-colors shadow-2xs"
                          title="Salin bagian penjelasan objek ini"
                        >
                          {copiedSection === 'object' ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-moss-600" />
                              <span className="text-moss-600 font-medium">{t.modal.copiedSection}</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 text-stone-500" />
                              <span>{t.modal.copySection}</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Layman summary block */}
                      <div className="p-3 bg-white dark:bg-stone-900/80 rounded-lg border border-accent-200/60 dark:border-accent-900/60 text-stone-800 dark:text-stone-200 text-xs leading-relaxed font-medium">
                        {unifiedAnalysis.objectDescription.laymanSummary}
                      </div>

                      {/* Key highlights / bullets */}
                      {unifiedAnalysis.objectDescription.keyHighlights?.length > 0 && (
                        <div className="pt-1">
                          <div className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">
                            {t.modal.sec1HighlightsTitle}
                          </div>
                          <div className="flex flex-col gap-1.5">
                            {unifiedAnalysis.objectDescription.keyHighlights.map((highlight, idx) => (
                              <span
                                key={idx}
                                className="flex items-start gap-1.5 px-2.5 py-1.5 rounded-md bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 text-xs"
                              >
                                <Tag className="w-2.5 h-2.5 text-accent-500 shrink-0" />
                                <span>{highlight}</span>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                    {Array.isArray(unifiedAnalysis.objectDescription.usageIdeas) && unifiedAnalysis.objectDescription.usageIdeas.length > 0 && (
                      <div className="pt-1">
                        <div className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">
                          {t.modal.sec1UsageTitle}
                        </div>
                        <ul className="space-y-1 text-xs text-stone-700 dark:text-stone-300 leading-relaxed list-disc pl-4">
                          {unifiedAnalysis.objectDescription.usageIdeas.map((idea, idx) => (
                            <li key={idx}>{idea}</li>
                          ))}
                        </ul>
                      </div>
                    )}

{/* Link proyek Wikimedia terkait rangkuman */}
<RelatedWikimediaLinks links={relatedLinks} loading={relatedLoading} language={language} />
                    </div>

                    {/* SECTION 2: Penjelasan Singkat Lisensi Foto */}
                    <div className="p-4 rounded-lg bg-moss-50/50 dark:bg-moss-950/20 border border-moss-100 dark:border-moss-900/40 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-moss-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                            <ShieldCheck className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-stone-900 dark:text-white text-xs">
                              {t.modal.sec2Title}
                            </h4>
                            <span className="text-xs text-moss-700 dark:text-moss-400 font-semibold font-mono">
                              {unifiedAnalysis.licenseExplanation.licenseName}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() =>
                            handleCopySection(
                              'license',
                              `[${t.modal.sec2Title}: ${unifiedAnalysis.licenseExplanation.licenseName}]\n${unifiedAnalysis.licenseExplanation.shortSummary}\n\n${t.modal.sec2CommTitle} ${unifiedAnalysis.licenseExplanation.commercialUse}\n${t.modal.sec2ModTitle} ${unifiedAnalysis.licenseExplanation.modificationRules}\n\n${t.modal.sec2AttrTitle}\n${unifiedAnalysis.licenseExplanation.attributionGuide}`
                            )
                          }
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 text-xs transition-colors shadow-2xs"
                          title="Salin penjelasan lisensi ini"
                        >
                          {copiedSection === 'license' ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-moss-600" />
                              <span className="text-moss-600 font-medium">{t.modal.copiedSection}</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 text-stone-500" />
                              <span>{t.modal.copySection}</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Plain-language license description */}
                      <p className="text-stone-700 dark:text-stone-300 text-xs leading-relaxed">
                        {unifiedAnalysis.licenseExplanation.shortSummary}
                      </p>

                      {/* Commercial & Modification rules grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <div className="p-2.5 rounded-lg bg-white dark:bg-stone-900 border border-moss-200 dark:border-moss-800/60">
                          <span className="font-semibold text-moss-700 dark:text-moss-300 block mb-0.5">
                            {t.modal.sec2CommTitle}
                          </span>
                          <span className="text-stone-600 dark:text-stone-300">
                            {unifiedAnalysis.licenseExplanation.commercialUse}
                          </span>
                        </div>
                        <div className="p-2.5 rounded-lg bg-white dark:bg-stone-900 border border-moss-200 dark:border-moss-800/60">
                          <span className="font-semibold text-moss-700 dark:text-moss-300 block mb-0.5">
                            {t.modal.sec2ModTitle}
                          </span>
                          <span className="text-stone-600 dark:text-stone-300">
                            {unifiedAnalysis.licenseExplanation.modificationRules}
                          </span>
                        </div>
                      </div>

                      {unifiedAnalysis.licenseExplanation.watchOut && (
                        <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 text-xs">
                          <span className="font-semibold text-amber-800 dark:text-amber-300 block mb-0.5">
                            {t.modal.sec2WatchTitle}
                          </span>
                          <span className="text-stone-700 dark:text-stone-300 leading-relaxed">
                            {unifiedAnalysis.licenseExplanation.watchOut}
                          </span>
                        </div>
                      )}

                      {/* Practical attribution guide */}
                      <div className="p-2.5 rounded-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-xs space-y-1 min-w-0 overflow-hidden">
                        <span className="font-semibold text-stone-900 dark:text-white block">
                          {t.modal.sec2AttrTitle}
                        </span>
                        <p className="text-stone-600 dark:text-stone-300 font-mono text-xs leading-relaxed whitespace-pre-wrap break-all min-w-0">
                          {unifiedAnalysis.licenseExplanation.attributionGuide}
                        </p>
                      </div>
                    </div>

                    {/* Ethical notice */}
                    <div className="p-3 bg-stone-100 dark:bg-stone-800/30 rounded-lg text-xs text-stone-500 dark:text-stone-400 leading-normal">
                      {t.modal.ethicalNotice}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};


// Daftar link proyek Wikimedia terkait (Wikipedia, Wikidata, Wikivoyage)
export const RelatedWikimediaLinks: React.FC<{
  links: RelatedWikiLink[];
  loading: boolean;
  language: string;
}> = ({ links, loading, language }) => {
  const en = language === 'en';
  const groups = Array.from(new Set(links.map((l) => l.project)));
  return (
    <div className="mt-3 pt-3 border-t border-accent-100 dark:border-accent-900/40 space-y-2">
      <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
        <Globe className="w-3.5 h-3.5" />
        {en ? 'Related Wikimedia projects' : 'Proyek Wikimedia terkait'}
        {loading && <Loader2 className="w-3 h-3 animate-spin" />}
      </div>
      {!loading && links.length === 0 && (
        <p className="text-xs text-stone-500 dark:text-stone-400">
          {en ? 'No related pages found.' : 'Tidak ada halaman terkait yang ditemukan.'}
        </p>
      )}
      {groups.map((g) => (
        <div key={g} className="space-y-1">
          <div className="text-xs font-semibold text-stone-400">{g}</div>
          <div className="flex flex-wrap gap-1.5">
            {links.filter((l) => l.project === g).map((l) => (
              <a
                key={l.url}
                href={l.url}
                target="_blank"
                rel="noopener noreferrer"
                title={l.description || l.title}
                className="inline-flex items-center gap-1 rounded-lg border border-stone-300 bg-white px-2 py-1 text-xs text-stone-700 hover:bg-stone-50 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200 dark:hover:bg-stone-700"
              >
                <span>{l.title}</span>
                <ExternalLink className="w-2.5 h-2.5 opacity-60" />
              </a>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
