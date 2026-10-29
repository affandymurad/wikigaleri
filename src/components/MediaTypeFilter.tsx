import React, { useEffect, useRef } from 'react';
import { MediaType } from '../types/wikimedia';
import { Grid, Image, Music, Video, FileText, Box, Rotate3d, User, FolderTree, ListChecks } from 'lucide-react';
import { Translations } from '../i18n/translations';

interface MediaTypeFilterProps {
  mediaType: MediaType;
  onSelectMediaType: (type: MediaType) => void;
  userMode?: boolean;
  onSetUserMode?: (on: boolean) => void;
  userLabel?: string;
  categoryMode?: boolean;
  onSetCategoryMode?: (on: boolean) => void;
  categoryLabel?: string;
  bulkMode?: boolean;
  onSetBulkMode?: (on: boolean) => void;
  bulkLabel?: string;
  t: Translations;
}

export const MediaTypeFilter: React.FC<MediaTypeFilterProps> = ({
  mediaType,
  onSelectMediaType,
  userMode = false,
  onSetUserMode,
  userLabel = 'Nama Pengguna',
  categoryMode = false,
  onSetCategoryMode,
  categoryLabel = 'Kategori',
  bulkMode = false,
  onSetBulkMode,
  bulkLabel = 'Massal',
  t,
}) => {
  // Layar sempit: baris ini bisa digeser; chip yang aktif selalu digulirkan ke tampilan (mis. saat pindah dari Massal ke Kategori)
  const listRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const active = listRef.current?.querySelector<HTMLElement>('[aria-selected="true"]');
    active?.scrollIntoView({ block: 'nearest', inline: 'center' });
  }, [mediaType, userMode, categoryMode, bulkMode]);

  const options: { id: MediaType; label: string; icon: React.ReactNode }[] = [
    {
      id: 'all',
      label: t.filters.allMedia,
      icon: <Grid className="w-3.5 h-3.5" />,
    },
    {
      id: 'image',
      label: t.filters.photos,
      icon: <Image className="w-3.5 h-3.5" />,
    },
    {
      id: 'audio',
      label: t.filters.audio,
      icon: <Music className="w-3.5 h-3.5" />,
    },
    {
      id: 'video',
      label: t.filters.video,
      icon: <Video className="w-3.5 h-3.5" />,
    },
    {
      id: 'document',
      label: t.filters.document,
      icon: <FileText className="w-3.5 h-3.5" />,
    },
    {
      id: '3d',
      label: t.filters.model3d,
      icon: <Box className="w-3.5 h-3.5" />,
    },
    {
      id: 'panorama',
      label: t.filters.panorama360,
      icon: <Rotate3d className="w-3.5 h-3.5" />,
    },
  ];

  return (
    <div className="w-full flex justify-center sm:justify-start">
      <div
        ref={listRef}
        className="inline-flex items-center gap-1 p-1.5 bg-stone-100 dark:bg-stone-800/80 border border-stone-200/80 dark:border-stone-800 rounded-lg max-w-full overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:flex-wrap sm:overflow-visible text-xs sm:text-sm font-medium shadow-2xs"
        role="tablist"
        aria-label="Filter Jenis Dokumen"
      >
        {options.map((opt) => {
          const isActive = !userMode && !categoryMode && !bulkMode && mediaType === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => { onSelectMediaType(opt.id); if (userMode) onSetUserMode?.(false);
              if (categoryMode) onSetCategoryMode?.(false); }}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-white shadow-xs font-semibold '
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white hover:bg-stone-200/50 dark:hover:bg-stone-700/50'
              }`}
            >
              {opt.icon}
              <span>{opt.label}</span>
            </button>
          );
        })}
        {onSetUserMode && (
          <button
            type="button"
            role="tab"
            aria-selected={userMode}
            onClick={() => { if (categoryMode) onSetCategoryMode?.(false); onSetUserMode(true); }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                userMode
                  ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-white shadow-xs font-semibold '
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white hover:bg-stone-200/50 dark:hover:bg-stone-700/50'
              }`}
          >
            <User className="w-4 h-4" />
            <span>{userLabel}</span>
          </button>
        )}
        {onSetCategoryMode && (
          <button
            type="button"
            role="tab"
            aria-selected={categoryMode}
            onClick={() => onSetCategoryMode(true)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-all whitespace-nowrap cursor-pointer ${
              categoryMode
                ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-white shadow-xs font-semibold '
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white hover:bg-stone-200/50 dark:hover:bg-stone-700/50'
            }`}
          >
            <FolderTree className="w-4 h-4" />
            <span>{categoryLabel}</span>
          </button>
        )}
        {onSetBulkMode && (
          <button
            type="button"
            role="tab"
            aria-selected={bulkMode}
            onClick={() => onSetBulkMode(true)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-all whitespace-nowrap cursor-pointer ${
              bulkMode
                ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-white shadow-xs font-semibold '
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white hover:bg-stone-200/50 dark:hover:bg-stone-700/50'
            }`}
          >
            <ListChecks className="w-4 h-4" />
            <span>{bulkLabel}</span>
          </button>
        )}
      </div>
    </div>
  );
};
