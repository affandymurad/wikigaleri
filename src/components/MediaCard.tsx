import React, { useState } from 'react';
import { CommonsMediaItem } from '../types/wikimedia';
import { getLicenseInfo, formatBytes, getFileExtension } from '../utils/licenseUtils';
import {
  Download,
  Image,
  Play,
  Music,
  Video,
  FileText,
  Bookmark,
  ExternalLink,
} from 'lucide-react';

import { Translations } from '../i18n/translations';

interface MediaCardProps {
  item: CommonsMediaItem;
  onOpenDetail: (item: CommonsMediaItem) => void;
  onQuickCopyAttribution?: (item: CommonsMediaItem) => void;
  isSaved?: boolean;
  onToggleSave?: (item: CommonsMediaItem) => void;
  layoutMode?: 'masonry' | 'grid';
  t: Translations;
}

export const MediaCard: React.FC<MediaCardProps> = ({
  item,
  onOpenDetail,
  isSaved = false,
  onToggleSave,
  layoutMode = 'masonry',
  t,
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const licenseInfo = getLicenseInfo(item);
  const fileExtension = getFileExtension(item.title, item.fileUrl, item.mimeType);

  const handleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onToggleSave) {
      onToggleSave(item);
    }
  };

  const handleDirectDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    const link = document.createElement('a');
    link.href = item.fileUrl;
    link.download = item.title.replace(/^File:/i, '');
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Get single initial for author avatar
  const authorInitial = (item.author || item.credit || 'W').charAt(0).toUpperCase();

  return (
    <article
      onClick={() => onOpenDetail(item)}
      className="group break-inside-avoid mb-5 flex flex-col bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl overflow-hidden hover:border-slate-400 dark:hover:border-slate-700 hover:shadow-xl dark:hover:shadow-slate-950/60 transition-all duration-300 cursor-pointer"
    >
      {/* Media Container (Natural height for Pinterest Masonry, fixed aspect for Grid) */}
      <div
        className={`relative w-full bg-slate-100 dark:bg-slate-950 overflow-hidden flex items-center justify-center ${
          layoutMode === 'grid' ? 'aspect-4/3' : 'min-h-[160px]'
        }`}
      >
        {item.mediaType === 'image' ? (
          <>
            {!imageLoaded && !imageError && (
              <div className="absolute inset-0 bg-slate-200 dark:bg-slate-800/60 animate-pulse min-h-[220px]" />
            )}
            {imageError ? (
              <div className="flex flex-col items-center justify-center p-8 text-center text-slate-400 dark:text-slate-600 min-h-[180px]">
                <Image className="w-8 h-8 mb-2 opacity-50" />
                <span className="text-xs">Gambar Wikimedia Commons</span>
              </div>
            ) : (
              <img
                src={item.thumbnailUrl}
                alt={item.cleanTitle}
                loading="lazy"
                referrerPolicy="no-referrer"
                onLoad={() => setImageLoaded(true)}
                onError={() => setImageError(true)}
                className={`w-full ${
                  layoutMode === 'grid' ? 'h-full object-cover' : 'h-auto object-cover'
                } group-hover:scale-[1.02] transition-transform duration-500 ease-out ${
                  imageLoaded ? 'opacity-100' : 'opacity-0'
                }`}
              />
            )}
            {/* Overlay file extension on image bottom-left */}
            <span className="absolute bottom-2.5 left-2.5 px-1.5 py-0.5 rounded bg-black/65 backdrop-blur-xs text-[9px] font-bold text-white font-mono uppercase tracking-wider shadow-xs pointer-events-none group-hover:opacity-0 transition-opacity">
              {fileExtension}
            </span>
          </>
        ) : item.mediaType === 'audio' ? (
          <div className="w-full py-10 px-6 flex flex-col items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 text-center">
            <div className="w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center mb-3 text-emerald-600 dark:text-emerald-400 shadow-sm group-hover:scale-105 transition-transform">
              <Music className="w-8 h-8" />
            </div>
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              {t.card.audioCard}
            </span>
            <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5 justify-center">
              <span>{item.mimeType}</span>
              <span className="px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 font-bold text-[10px] uppercase">
                {fileExtension}
              </span>
            </div>

            {/* Faux Waveform bars */}
            <div className="flex items-center gap-1 mt-4 h-6 opacity-70">
              {[40, 70, 30, 90, 60, 100, 45, 80, 50, 75, 35, 85].map((h, i) => (
                <div
                  key={i}
                  style={{ height: `${h}%` }}
                  className="w-1 bg-emerald-500/80 rounded-full"
                />
              ))}
            </div>
          </div>
        ) : item.mediaType === 'document' ? (
          <div className="relative w-full py-6 px-4 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900/50">
            {item.thumbnailUrl ? (
              <div className="relative max-h-72 overflow-hidden rounded-lg shadow-sm border border-slate-200 dark:border-slate-800">
                <img
                  src={item.thumbnailUrl}
                  alt={item.cleanTitle}
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  className="w-full object-contain"
                />
              </div>
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-950/80 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-amber-600 dark:text-amber-400 my-4 shadow-sm">
                <FileText className="w-8 h-8" />
              </div>
            )}
            <div className="absolute top-3 left-3 flex items-center gap-1.5 text-[11px] font-semibold text-white bg-amber-600 px-2.5 py-1 rounded-full shadow-xs">
              <FileText className="w-3 h-3" />
              <span>{t.card.documentCard}</span>
              <span className="px-1 rounded bg-black/30 text-[9px] font-mono uppercase">{fileExtension}</span>
            </div>
          </div>
        ) : (
          <div className="relative w-full aspect-video flex items-center justify-center bg-slate-950">
            {item.thumbnailUrl ? (
              <img
                src={item.thumbnailUrl}
                alt={item.cleanTitle}
                loading="lazy"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover opacity-85"
              />
            ) : null}
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/20 transition-colors">
              <div className="w-12 h-12 rounded-full bg-white/95 dark:bg-slate-900/95 flex items-center justify-center text-slate-900 dark:text-white shadow-lg group-hover:scale-110 transition-transform">
                <Play className="w-5 h-5 ml-0.5 fill-current" />
              </div>
            </div>
            <div className="absolute top-3 left-3 flex items-center gap-1.5 text-[11px] font-semibold text-white bg-black/70 backdrop-blur-xs px-2.5 py-1 rounded-full">
              <Video className="w-3 h-3" />
              <span>{t.card.videoCard}</span>
              <span className="px-1 rounded bg-white/20 text-[9px] font-mono uppercase">{fileExtension}</span>
            </div>
          </div>
        )}

        {/* Floating Overlay Actions (appear on hover) - Sisa Download & Bookmark saja */}
        <div className="absolute inset-0 p-3 flex flex-col justify-start opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-gradient-to-b from-black/50 via-transparent to-transparent pointer-events-none">
          {/* Top Row: Save / Bookmark & Direct Download */}
          <div className="flex items-center justify-between pointer-events-auto w-full">
            {onToggleSave ? (
              <button
                type="button"
                onClick={handleSave}
                className={`p-2 rounded-full backdrop-blur-md shadow-md transition-transform hover:scale-110 cursor-pointer ${
                  isSaved
                    ? 'bg-rose-600 text-white'
                    : 'bg-white/90 text-slate-700 dark:bg-slate-900/90 dark:text-slate-200 hover:text-rose-600'
                }`}
                title={isSaved ? t.card.saved : t.card.save}
              >
                <Bookmark className={`w-3.5 h-3.5 ${isSaved ? 'fill-current' : ''}`} />
              </button>
            ) : <span />}

            <button
              type="button"
              onClick={handleDirectDownload}
              className="px-3.5 py-1.5 rounded-full bg-slate-900/90 hover:bg-slate-900 text-white dark:bg-white/90 dark:hover:bg-white dark:text-slate-900 text-xs font-semibold shadow-md flex items-center gap-1.5 transition-transform hover:scale-105 shrink-0 cursor-pointer backdrop-blur-md ml-auto"
              title={t.card.download}
            >
              <Download className="w-3.5 h-3.5" />
              <span>{t.card.download}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Card Content Footer (Clean & Comfortable Typography) */}
      <div className="p-4 space-y-2.5">
        <h3
          className="font-display font-semibold text-sm text-slate-900 dark:text-slate-100 line-clamp-2 leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors"
          title={item.cleanTitle}
        >
          {item.cleanTitle}
        </h3>

        {/* Creator & License Row */}
        <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center gap-2 min-w-0 pr-2">
            <div className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-[10px] flex items-center justify-center shrink-0">
              {authorInitial}
            </div>
            <span
              className="truncate text-slate-600 dark:text-slate-400 text-xs font-medium"
              title={item.author}
            >
              {item.author || 'Wikimedia Commons'}
            </span>
          </div>

          <span
            className="text-[11px] font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap shrink-0"
            title={item.licenseFull}
          >
            {licenseInfo.label}
          </span>
        </div>

        {/* Technical dimensions, size & file extension */}
        <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 font-mono tabular-nums pt-0.5">
          <div className="flex items-center gap-1.5 min-w-0 truncate">
            {item.width > 0 && <span>{item.width}×{item.height}</span>}
            {item.width > 0 && item.fileSize > 0 && <span aria-hidden="true">·</span>}
            {item.fileSize > 0 && <span>{formatBytes(item.fileSize)}</span>}
          </div>
          <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-[10px] font-mono tracking-wider uppercase border border-slate-200/80 dark:border-slate-700/80 shrink-0">
            {fileExtension}
          </span>
        </div>
      </div>
    </article>
  );
};
