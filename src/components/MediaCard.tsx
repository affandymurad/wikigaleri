import React, { useState } from 'react';
import { CommonsMediaItem } from '../types/wikimedia';
import { getLicenseInfo, formatBytes, getFileExtension } from '../utils/licenseUtils';
import {
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

  return (
    <article
      onClick={() => onOpenDetail(item)}
      className="group break-inside-avoid mb-5 flex flex-col bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-800 rounded-lg overflow-hidden hover:border-accent-600 dark:hover:border-accent-400 transition-colors cursor-pointer"
    >
      {/* Media Container (Natural height for Pinterest Masonry, fixed aspect for Grid) */}
      <div
        className={`relative w-full bg-stone-100 dark:bg-stone-950 overflow-hidden flex items-center justify-center ${
          layoutMode === 'grid' ? 'aspect-4/3' : 'min-h-[160px]'
        }`}
      >
        {item.mediaType === 'image' ? (
          <>
            {!imageLoaded && !imageError && (
              <div className="absolute inset-0 bg-stone-200 dark:bg-stone-800/60 animate-pulse min-h-[220px]" />
            )}
            {imageError ? (
              <div className="flex flex-col items-center justify-center p-8 text-center text-stone-400 dark:text-stone-600 min-h-[180px]">
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
                }  transition-transform duration-500 ease-out ${
                  imageLoaded ? 'opacity-100' : 'opacity-0'
                }`}
              />
            )}
                      </>
        ) : item.mediaType === 'audio' ? (
          <div className="w-full py-10 px-6 flex flex-col items-center justify-center bg-stone-100 dark:bg-stone-900 text-center">
            <div className="w-16 h-16 rounded-lg bg-moss-100 dark:bg-moss-950/80 border border-moss-200 dark:border-moss-800 flex items-center justify-center mb-3 text-moss-600 dark:text-moss-400 shadow-sm transition-transform">
              <Music className="w-8 h-8" />
            </div>
            <span className="text-xs font-semibold text-stone-800 dark:text-stone-200">
              {t.card.audioCard}
            </span>
            <div className="text-xs font-mono text-stone-500 dark:text-stone-400 mt-1 flex items-center gap-1.5 justify-center">
              <span>{item.mimeType}</span>
              <span className="px-1.5 py-0.5 rounded bg-moss-100 dark:bg-moss-900/60 text-moss-700 dark:text-moss-300 font-bold text-xs uppercase">
                {fileExtension}
              </span>
            </div>

                      </div>
        ) : item.mediaType === 'document' ? (
          <div className="relative w-full py-6 px-4 flex flex-col items-center justify-center bg-stone-50 dark:bg-stone-900/50">
            {item.thumbnailUrl ? (
              <div className="relative max-h-72 overflow-hidden rounded-lg shadow-sm border border-stone-200 dark:border-stone-800">
                <img
                  src={item.thumbnailUrl}
                  alt={item.cleanTitle}
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  className="w-full object-contain"
                />
              </div>
            ) : (
              <div className="w-16 h-16 rounded-lg bg-amber-100 dark:bg-amber-950/80 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-amber-600 dark:text-amber-400 my-4 shadow-sm">
                <FileText className="w-8 h-8" />
              </div>
            )}
            <div className="absolute top-3 left-3 flex items-center gap-1.5 text-xs font-semibold text-white bg-stone-900/85 px-2.5 py-1 rounded-md">
              <FileText className="w-3 h-3" />
              <span>{t.card.documentCard}</span>
              <span className="px-1 rounded bg-black/30 text-xs font-mono uppercase">{fileExtension}</span>
            </div>
          </div>
        ) : (
          <div className="relative w-full aspect-video flex items-center justify-center bg-stone-950">
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
              <div className="w-12 h-12 rounded-full bg-white/95 dark:bg-stone-900/95 flex items-center justify-center text-stone-900 dark:text-white shadow-sm transition-transform">
                <Play className="w-5 h-5 ml-0.5 fill-current" />
              </div>
            </div>
            <div className="absolute top-3 left-3 flex items-center gap-1.5 text-xs font-semibold text-white bg-stone-900/85 px-2.5 py-1 rounded-md">
              <Video className="w-3 h-3" />
              <span>{t.card.videoCard}</span>
              <span className="px-1 rounded bg-white/20 text-xs font-mono uppercase">{fileExtension}</span>
            </div>
          </div>
        )}

        {/* Floating Overlay Actions (appear on hover) */}
        <div className="absolute inset-0 p-3 flex flex-col justify-start opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-150 pointer-events-none">
          {/* Top Row: Save / Bookmark */}
          <div className="flex items-center justify-between pointer-events-auto w-full">
            {onToggleSave ? (
              <button
                type="button"
                onClick={handleSave}
                className={`p-2 rounded-full shadow-sm cursor-pointer ${
                  isSaved
                    ? 'bg-accent-600 text-white'
                    : 'bg-white/90 text-stone-700 dark:bg-stone-900/90 dark:text-stone-200 hover:text-accent-600'
                }`}
                title={isSaved ? t.card.saved : t.card.save}
              >
                <Bookmark className={`w-3.5 h-3.5 ${isSaved ? 'fill-current' : ''}`} />
              </button>
            ) : <span />}
          </div>
        </div>
      </div>

      {/* Card Content Footer (Clean & Comfortable Typography) */}
      <div className="p-4 space-y-2.5">
        <h3
          className="font-display font-medium text-base text-stone-900 dark:text-stone-100 line-clamp-2 leading-snug group-hover:text-accent-600 dark:group-hover:text-accent-400 transition-colors"
          title={item.cleanTitle}
        >
          {item.cleanTitle}
        </h3>

        {/* Creator & License Row */}
        <div className="flex items-center justify-between text-xs pt-1 border-t border-stone-100 dark:border-stone-800/80">
          <div className="flex items-center gap-2 min-w-0 pr-2">
                        <span
              className="truncate text-stone-600 dark:text-stone-400 text-xs font-medium"
              title={item.author}
            >
              {item.author || 'Wikimedia Commons'}
            </span>
          </div>

          <span
            className="text-xs font-medium text-stone-700 dark:text-stone-300 whitespace-nowrap shrink-0"
            title={item.licenseFull}
          >
            {licenseInfo.label}
          </span>
        </div>

        {/* Technical dimensions, size & file extension */}
        <div className="flex items-center justify-between text-xs text-stone-400 dark:text-stone-500 font-mono tabular-nums pt-0.5">
          <div className="flex items-center gap-1.5 min-w-0 truncate">
            {item.width > 0 && <span>{item.width}×{item.height}</span>}
            {item.width > 0 && item.fileSize > 0 && <span aria-hidden="true">·</span>}
            {item.fileSize > 0 && <span>{formatBytes(item.fileSize)}</span>}
          </div>
          <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 font-bold text-xs font-mono tracking-wider uppercase border border-stone-200/80 dark:border-stone-700/80 shrink-0">
            {fileExtension}
          </span>
        </div>
      </div>
    </article>
  );
};
