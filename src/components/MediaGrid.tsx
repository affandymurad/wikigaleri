import React, { useState, useEffect } from 'react';
import { CommonsMediaItem } from '../types/wikimedia';
import { MediaCard } from './MediaCard';
import { AlertCircle, RefreshCw, Layers, ChevronLeft, ChevronRight, LayoutGrid, Columns, Bookmark, Loader2, ExternalLink, MessageSquare } from 'lucide-react';
import { fetchTalkPage, TalkPageResult } from '../services/wikimediaApi';
import { Translations } from '../i18n/translations';
import { User as UserIcon, Tag as TagIcon, X as XIcon, Download as DownloadIcon, Upload as UploadIcon } from 'lucide-react';

interface MediaGridProps {
  items: CommonsMediaItem[];
  isLoading: boolean;
  error: string | null;
  currentPage: number;
  totalPages: number;
  totalHits?: number;
  itemsPerPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  viewLayout: 'masonry' | 'grid';
  savedCount: number;
  showSavedOnly: boolean;
  onSetViewLayout: (layout: 'masonry' | 'grid') => void;
  onSetShowSavedOnly: (show: boolean) => void;
  onGoToPage: (page: number) => void;
  onNextPage: () => void;
  onPrevPage: () => void;
  onRetry: () => void;
  onOpenDetail: (item: CommonsMediaItem) => void;
  onQuickCopyAttribution: (item: CommonsMediaItem) => void;
  isItemSaved: (id: number) => boolean;
  onToggleSaveItem: (item: CommonsMediaItem) => void;
  isLatestUploads?: boolean;
  language?: 'id' | 'en';
  t: Translations;
}

export const MediaGrid: React.FC<MediaGridProps> = ({
  items,
  isLoading,
  error,
  currentPage,
  totalPages,
  totalHits,
  itemsPerPage,
  hasNextPage,
  hasPrevPage,
  viewLayout,
  savedCount,
  showSavedOnly,
  onSetViewLayout,
  onSetShowSavedOnly,
  onGoToPage,
  onNextPage,
  onPrevPage,
  onRetry,
  onOpenDetail,
  onQuickCopyAttribution,
  isItemSaved,
  onToggleSaveItem,
  isLatestUploads = false,
  t,
  language = 'id',
}) => {
  const [jumpPageInput, setJumpPageInput] = useState('');

  // Sinkronkan kolom 'Ke hal' dengan halaman aktif
  useEffect(() => {
    setJumpPageInput(String(currentPage));
  }, [currentPage]);

  const commitJump = () => {
    const parsed = parseInt(jumpPageInput, 10);
    if (isNaN(parsed)) {
      setJumpPageInput(String(currentPage));
      return;
    }
    const target = Math.min(Math.max(parsed, 1), Math.max(totalPages, 1));
    setJumpPageInput(String(target));
    if (target !== currentPage) onGoToPage(target);
  };

  const handleJumpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Blur memicu commitJump (satu kali) lewat onBlur
    (document.activeElement as HTMLElement | null)?.blur?.();
  };

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }

    return pages;
  };

  if (isLoading) {
    const skeletonHeights = ['h-64', 'h-80', 'h-52', 'h-96', 'h-60', 'h-72', 'h-84', 'h-68'];
    return (
      <div className="space-y-6">
        <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-4">
          {skeletonHeights.map((hClass, idx) => (
            <div
              key={idx}
              className="break-inside-avoid mb-4 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg overflow-hidden animate-pulse flex flex-col p-2 space-y-3"
            >
              <div className={`w-full ${hClass} bg-stone-200 dark:bg-stone-800 rounded-lg`} />
              <div className="p-2 space-y-2">
                <div className="h-4 bg-stone-200 dark:bg-stone-800 rounded w-3/4" />
                <div className="h-3 bg-stone-100 dark:bg-stone-800/60 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error && items.length === 0) {
    return (
      <div className="p-12 text-center bg-white dark:bg-stone-900 border border-accent-200 dark:border-accent-900/50 rounded-lg max-w-lg mx-auto space-y-4 my-8">
        <div className="w-12 h-12 rounded-full bg-accent-100 dark:bg-accent-950/60 text-accent-600 dark:text-accent-400 flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-stone-900 dark:text-white">{t.gallery.errorTitle}</h3>
          <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">{error}</p>
        </div>
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-accent-600 hover:bg-accent-700 text-white rounded-lg text-xs font-semibold transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          <span>{t.gallery.retryBtn}</span>
        </button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="p-16 text-center bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg max-w-md mx-auto space-y-4 my-8">
        <div className="w-12 h-12 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-400 flex items-center justify-center mx-auto">
          {showSavedOnly ? <Bookmark className="w-6 h-6" /> : <Layers className="w-6 h-6" />}
        </div>
        <div>
          <h3 className="text-base font-semibold text-stone-900 dark:text-white">
            {showSavedOnly ? t.gallery.emptySavedTitle : t.gallery.emptyTitle}
          </h3>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 leading-relaxed">
            {showSavedOnly ? t.gallery.emptySavedDesc : t.gallery.emptyDesc}
          </p>
        </div>
        {showSavedOnly ? (
          <button
            onClick={() => onSetShowSavedOnly(false)}
            className="text-xs text-accent-600 dark:text-accent-400 font-semibold hover:underline"
          >
            {t.gallery.backToAll}
          </button>
        ) : (
          <button
            onClick={onRetry}
            className="text-xs text-accent-600 hover:text-accent-700 dark:text-accent-400 font-semibold underline"
          >
            {t.gallery.reloadSelection}
          </button>
        )}
      </div>
    );
  }

  const startCount = (currentPage - 1) * itemsPerPage + 1;
  const endCount = startCount + items.length - 1;

  return (
    <div id="gallery-content" className="space-y-6">
      {/* Gallery Header Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-stone-200 dark:border-stone-800 text-xs">
        <div className="flex items-center gap-3">
          {isLatestUploads && !showSavedOnly ? (
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-moss-50 dark:bg-moss-950/60 border border-moss-200 dark:border-moss-800 text-moss-700 dark:text-moss-300 font-semibold text-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-moss-500 animate-pulse" />
                <span>{language === 'id' ? 'Unggahan Terbaru' : 'Live Feed'}</span>
              </span>
              <span className="font-semibold text-stone-900 dark:text-white text-sm">
                {t.gallery.latestUploads}
              </span>
            </div>
          ) : (
            <span className="font-semibold text-stone-900 dark:text-white text-sm">
              {showSavedOnly ? t.gallery.savedCollection : t.gallery.catalog}
            </span>
          )}
          <span className="text-stone-400">·</span>
          <span className="text-stone-500 dark:text-stone-400 font-mono tabular-nums">
            {showSavedOnly
              ? t.gallery.savedCount(items.length)
              : t.gallery.itemsCount(startCount, endCount, totalHits)}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-0.5 p-0.5 bg-stone-100 dark:bg-stone-800 rounded-lg">
            <button
              onClick={() => onSetViewLayout('masonry')}
              className={`p-1.5 rounded-md transition-all ${
                viewLayout === 'masonry'
                  ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-white shadow-xs'
                  : 'text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white'
              }`}
              title={t.gallery.masonryView}
            >
              <Columns className="w-4 h-4" />
            </button>
            <button
              onClick={() => onSetViewLayout('grid')}
              className={`p-1.5 rounded-md transition-all ${
                viewLayout === 'grid'
                  ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-white shadow-xs'
                  : 'text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white'
              }`}
              title={t.gallery.gridView}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Showcase */}
      {viewLayout === 'masonry' ? (
        <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-5 [column-fill:_balance]">
          {items.map((item) => (
            <MediaCard
              key={item.id}
              item={item}
              onOpenDetail={onOpenDetail}
              onQuickCopyAttribution={onQuickCopyAttribution}
              isSaved={isItemSaved(item.id)}
              onToggleSave={onToggleSaveItem}
              layoutMode="masonry"
              t={t}
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {items.map((item) => (
            <MediaCard
              key={item.id}
              item={item}
              onOpenDetail={onOpenDetail}
              onQuickCopyAttribution={onQuickCopyAttribution}
              isSaved={isItemSaved(item.id)}
              onToggleSave={onToggleSaveItem}
              layoutMode="grid"
              t={t}
            />
          ))}
        </div>
      )}

      {/* Numbered Pagination Toolbar */}
      {!showSavedOnly && (totalPages > 1 || (isLatestUploads && (hasNextPage || hasPrevPage))) && (
        <div className="pt-8 pb-12 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-stone-200 dark:border-stone-800 text-xs">
          <button
            onClick={onPrevPage}
            disabled={!hasPrevPage}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium shadow-xs cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>{t.gallery.previous}</span>
          </button>

          <div className="flex items-center gap-1 overflow-x-auto max-w-full py-1">
            {getPageNumbers().map((p, idx) => {
              if (p === '...') {
                return (
                  <span key={`dots-${idx}`} className="px-2 text-stone-400 select-none">
                    ...
                  </span>
                );
              }

              const pageNum = p as number;
              const isCurrent = pageNum === currentPage;

              return (
                <button
                  key={pageNum}
                  onClick={() => onGoToPage(pageNum)}
                  className={`w-9 h-9 rounded-lg font-mono text-xs font-semibold flex items-center justify-center transition-all cursor-pointer ${
                    isCurrent
                      ? 'bg-stone-900 text-white dark:bg-white dark:text-stone-900 shadow-sm scale-105'
                      : 'bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-800 hover:bg-stone-100 dark:hover:bg-stone-800'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-3">
            {!isLatestUploads && (
              <form onSubmit={handleJumpSubmit} className="flex items-center gap-1.5">
                <label htmlFor="jump-page-input" className="text-stone-400">{t.gallery.jumpTo}</label>
                <input
                  id="jump-page-input"
                  type="number"
                  inputMode="numeric"
                  min="1"
                  max={totalPages}
                  value={jumpPageInput}
                  onChange={(e) => setJumpPageInput(e.target.value)}
                  onFocus={(e) => e.target.select()}
                  onBlur={commitJump}
                  className="w-12 p-1.5 text-center text-xs font-mono rounded-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 focus:outline-none focus:ring-1 focus:ring-accent-500"
                />
                <span className="text-stone-400 font-mono">/ {totalPages}</span>
              </form>
            )}

            <button
              onClick={onNextPage}
              disabled={!hasNextPage}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium shadow-xs cursor-pointer"
            >
              <span>{t.gallery.next}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

/** Tampilan halaman pembicaraan (Talk Page) Wikimedia Commons: file talk / user talk. */
export const TalkPageView: React.FC<{ title: string; emptyHint?: string; language?: 'en' | 'id' }> = ({ title, emptyHint, language = 'id' }) => {
  const en = language === 'en';
  const [data, setData] = useState<TalkPageResult | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setData(null);
    setError(null);
    setLoading(true);
    fetchTalkPage(title)
      .then((d) => { if (!cancelled) setData(d); })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : 'Gagal memuat'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [title]);

  const openUrl =
    data?.url ||
    `https://commons.wikimedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_')).replace(/%3A/g, ':')}`;

  return (
    <div className="space-y-3 text-xs">
      <div className="flex items-center justify-between gap-3">
        <h4 className="flex min-w-0 items-center gap-2 font-bold text-stone-900 dark:text-white">
          <MessageSquare className="h-4 w-4 shrink-0 text-accent-600 dark:text-accent-400" />
          <span className="truncate">{en ? title : title.replace(/^User talk:/i, 'Pembicaraan Pengguna:').replace(/^File talk:/i, 'Pembicaraan Berkas:')}</span>
        </h4>
        <a
          href={openUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex shrink-0 items-center gap-1 rounded-full border border-stone-200 px-3 py-1 font-semibold text-accent-700 hover:bg-stone-50 dark:border-stone-700 dark:text-accent-300 dark:hover:bg-stone-800"
        >
          {data && !data.exists ? (en ? 'Start a discussion' : 'Mulai diskusi') : (en ? 'Open on Commons' : 'Buka di Commons')}
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      {loading && (
        <div role="status" className="flex items-center gap-2 rounded-lg border border-stone-200 bg-stone-50 p-4 text-stone-500 dark:border-stone-800 dark:bg-stone-800/50 dark:text-stone-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          {en ? 'Loading talk page…' : 'Memuat halaman pembicaraan…'}
        </div>
      )}

      {!loading && error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
          {en ? 'Failed to load talk page: ' : 'Gagal memuat halaman pembicaraan: '}{error}
        </div>
      )}

      {!loading && !error && data && !data.exists && (
        <div className="rounded-lg border border-dashed border-stone-300 bg-stone-50 p-5 text-center text-stone-500 dark:border-stone-700 dark:bg-stone-800/40 dark:text-stone-400">
          {emptyHint || (en ? 'No talk page yet.' : 'Belum ada halaman pembicaraan untuk ini.')}
        </div>
      )}

      {!loading && !error && data && data.exists && (
        <div
          className="rounded-lg border border-stone-200 bg-white p-4 text-sm leading-relaxed text-stone-700 dark:border-stone-800 dark:bg-stone-900/60 dark:text-stone-200 [&_a]:text-accent-600 [&_a]:underline dark:[&_a]:text-accent-400 [&_h2]:mt-4 [&_h2]:border-b [&_h2]:border-stone-200 [&_h2]:pb-1 [&_h2]:text-base [&_h2]:font-bold dark:[&_h2]:border-stone-700 [&_h3]:mt-3 [&_h3]:font-semibold [&_p]:my-2 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_dl]:my-1 [&_dd]:ml-4 [&_table]:my-2 [&_table]:w-full [&_table]:text-xs [&_td]:p-1 [&_blockquote]:border-l-2 [&_blockquote]:pl-3 break-words"
          dangerouslySetInnerHTML={{ __html: data.html }}
        />
      )}
    </div>
  );
};

// ===== Panel Bookmark: grid username & kategori tersimpan =====
interface BookmarksPanelProps {
  savedUsers: string[];
  savedCategories: string[];
  onOpenUser: (name: string) => void;
  onOpenCategory: (name: string) => void;
  onRemoveUser: (name: string) => void;
  onRemoveCategory: (name: string) => void;
  language: 'id' | 'en';
}

export const BookmarksPanel: React.FC<BookmarksPanelProps> = ({
  savedUsers,
  savedCategories,
  onOpenUser,
  onOpenCategory,
  onRemoveUser,
  onRemoveCategory,
  language,
}) => {
  const en = language === 'en';

  const renderGrid = (
    title: string,
    icon: React.ReactNode,
    names: string[],
    onOpen: (n: string) => void,
    onRemove: (n: string) => void,
    emptyText: string
  ) => (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {icon}
        <h3 className="text-sm font-bold text-stone-900 dark:text-white">{title}</h3>
        <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-semibold text-stone-600 dark:bg-stone-800 dark:text-stone-300">{names.length}</span>
      </div>
      {names.length === 0 ? (
        <p className="rounded-lg border border-dashed border-stone-300 p-4 text-center text-xs text-stone-500 dark:border-stone-700 dark:text-stone-400">{emptyText}</p>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {names.map((n) => (
            <div key={n} className="group relative flex items-center rounded-lg border border-stone-200 bg-white shadow-xs transition hover:border-accent-400 dark:border-stone-700 dark:bg-stone-900 dark:hover:border-accent-500">
              <button type="button" onClick={() => onOpen(n)} className="min-w-0 flex-1 cursor-pointer px-3 py-3 text-left" title={n}>
                <span className="block truncate text-xs font-semibold text-stone-800 dark:text-stone-100">{n}</span>
                <span className="block text-xs text-stone-400">{en ? 'Open search' : 'Buka pencarian'}</span>
              </button>
              <button type="button" onClick={() => onRemove(n)} aria-label={en ? 'Remove bookmark' : 'Hapus bookmark'} className="mr-1.5 shrink-0 cursor-pointer rounded-md p-1 text-stone-400 hover:bg-stone-100 hover:text-red-600 dark:hover:bg-stone-800">
                <XIcon className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {renderGrid(
        en ? 'Saved usernames' : 'Nama pengguna tersimpan',
        <UserIcon className="h-4 w-4 text-accent-600 dark:text-accent-400" />,
        savedUsers,
        onOpenUser,
        onRemoveUser,
        en ? 'No saved usernames yet. Search a username and tap Save.' : 'Belum ada nama pengguna tersimpan. Cari nama pengguna lalu tekan Simpan.'
      )}
      {renderGrid(
        en ? 'Saved categories' : 'Kategori tersimpan',
        <TagIcon className="h-4 w-4 text-accent-600 dark:text-accent-400" />,
        savedCategories,
        onOpenCategory,
        onRemoveCategory,
        en ? 'No saved categories yet. Search a category and tap Save.' : 'Belum ada kategori tersimpan. Cari kategori lalu tekan Simpan.'
      )}
      <div className="flex items-center gap-2 pt-2">
        <Bookmark className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        <h3 className="text-sm font-bold text-stone-900 dark:text-white">{en ? 'Saved media' : 'Media tersimpan'}</h3>
      </div>
    </div>
  );
};


// Ekspor / impor semua markah (berkas, nama pengguna, kategori) dalam satu berkas JSON
export function BookmarkBackupBar({ language = 'id' }: { language?: string }) {
  const en = language === 'en';
  const fileRef = React.useRef<HTMLInputElement>(null);
  const [msg, setMsg] = React.useState<{ ok: boolean; text: string } | null>(null);
  const KEYS = {
    media: 'wikigaleri_saved_favorites',
    users: 'wikigaleri_saved_users',
    categories: 'wikigaleri_saved_categories',
  };
  const read = (k: string): any[] => {
    try {
      const v = JSON.parse(localStorage.getItem(k) || '[]');
      return Array.isArray(v) ? v : [];
    } catch {
      return [];
    }
  };

  const exportJson = () => {
    const data = {
      app: 'WikiGaleri',
      version: 1,
      exportedAt: new Date().toISOString(),
      media: read(KEYS.media),
      users: read(KEYS.users),
      categories: read(KEYS.categories),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wikigaleri-bookmarks-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setMsg({
      ok: true,
      text: en
        ? `Exported ${data.media.length} files, ${data.users.length} usernames, ${data.categories.length} categories.`
        : `Diekspor: ${data.media.length} berkas, ${data.users.length} nama pengguna, ${data.categories.length} kategori.`,
    });
  };

  const importJson = async (file: File) => {
    try {
      const data = JSON.parse(await file.text());
      if (!data || data.app !== 'WikiGaleri' || !Array.isArray(data.media) || !Array.isArray(data.users) || !Array.isArray(data.categories)) {
        throw new Error('format');
      }
      const mediaOk = data.media.filter((m: any) => m && typeof m === 'object' && m.id !== undefined && m.title);
      const mergeBy = (cur: any[], inc: any[], key: (x: any) => string) => {
        const seen = new Set(cur.map(key));
        const out = [...cur];
        inc.forEach((x) => {
          const k = key(x);
          if (!seen.has(k)) {
            seen.add(k);
            out.push(x);
          }
        });
        return out;
      };
      const media = mergeBy(read(KEYS.media), mediaOk, (x) => String(x.id));
      const users = mergeBy(read(KEYS.users), data.users.filter((x: any) => typeof x === 'string'), (x) => x);
      const cats = mergeBy(read(KEYS.categories), data.categories.filter((x: any) => typeof x === 'string'), (x) => x);
      localStorage.setItem(KEYS.media, JSON.stringify(media));
      localStorage.setItem(KEYS.users, JSON.stringify(users));
      localStorage.setItem(KEYS.categories, JSON.stringify(cats));
      setMsg({
        ok: true,
        text: en
          ? `Imported: ${media.length} files, ${users.length} usernames, ${cats.length} categories in total. Reloading…`
          : `Diimpor: total ${media.length} berkas, ${users.length} nama pengguna, ${cats.length} kategori. Memuat ulang…`,
      });
      setTimeout(() => window.location.reload(), 1200);
    } catch {
      setMsg({ ok: false, text: en ? 'Invalid file. Use a JSON exported from WikiGaleri.' : 'Berkas tidak valid. Gunakan JSON hasil ekspor WikiGaleri.' });
    }
  };

  const btn = 'inline-flex items-center gap-1.5 rounded-full border border-stone-300 dark:border-stone-600 px-3.5 py-1.5 text-xs font-semibold text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-800 cursor-pointer';
  const points = en
    ? [
        ['Saved only on this device.', 'Your bookmarks live in this browser. They are not on a server and not tied to an account, so clearing site data or switching browser or device loses them.'],
        ['Export = make a backup.', 'Downloads one JSON file (wikigaleri-bookmarks-date.json) with your saved files, usernames, and categories.'],
        ['Import = restore or move.', 'Pick a JSON exported from WikiGaleri. Items are merged with what you already have, duplicates are skipped, and nothing is deleted. The page reloads when done.'],
      ]
    : [
        ['Hanya tersimpan di perangkat ini.', 'Markah Anda disimpan di peramban ini, bukan di server dan tidak terkait akun. Jika data situs dihapus atau Anda pindah peramban atau perangkat, markah ikut hilang.'],
        ['Ekspor = membuat cadangan.', 'Mengunduh satu berkas JSON (wikigaleri-bookmarks-tanggal.json) berisi berkas, nama pengguna, dan kategori yang Anda simpan.'],
        ['Impor = memulihkan atau memindahkan.', 'Pilih JSON hasil ekspor WikiGaleri. Isinya digabung dengan markah yang sudah ada, duplikat dilewati, dan tidak ada yang dihapus. Halaman dimuat ulang setelah selesai.'],
      ];

  return (
    <div className="rounded-lg border border-stone-300 dark:border-stone-800 bg-white dark:bg-stone-900 p-4 sm:p-5 space-y-4">
      <div className="space-y-1">
        <h3 className="font-display text-base font-semibold text-stone-900 dark:text-white">
          {en ? 'Back up and move your bookmarks' : 'Cadangkan dan pindahkan markah Anda'}
        </h3>
        <p className="text-sm text-stone-600 dark:text-stone-400">
          {en
            ? 'Keep your saved files, usernames, and categories safe, or carry them to another browser or device.'
            : 'Amankan berkas, nama pengguna, dan kategori yang Anda simpan, atau bawa ke peramban atau perangkat lain.'}
        </p>
      </div>
      <ul className="space-y-2 text-sm text-stone-600 dark:text-stone-400">
        {points.map(([title, text]) => (
          <li key={title} className="flex gap-2.5">
            <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent-600 dark:bg-accent-400" />
            <span>
              <strong className="font-semibold text-stone-800 dark:text-stone-200">{title}</strong> {text}
            </span>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={exportJson} className={btn}>
          <DownloadIcon className="h-3.5 w-3.5" />
          {en ? 'Export JSON' : 'Ekspor JSON'}
        </button>
        <button type="button" onClick={() => fileRef.current?.click()} className={btn}>
          <UploadIcon className="h-3.5 w-3.5" />
          {en ? 'Import JSON' : 'Impor JSON'}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) importJson(f);
            e.target.value = '';
          }}
        />
        {msg && (
          <span role="status" className={`text-xs ${msg.ok ? 'text-moss-600 dark:text-moss-400' : 'text-red-600 dark:text-red-400'}`}>
            {msg.text}
          </span>
        )}
      </div>
    </div>
  );
}
