import React from 'react';
import { MediaType } from '../types/wikimedia';
import { Grid, Image, Music, Video, FileText, Box, User, FolderTree } from 'lucide-react';
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
  t,
}) => {
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
  ];

  return (
    <div className="w-full flex justify-center sm:justify-start">
      <div
        className="inline-flex items-center gap-1 p-1.5 bg-stone-100 dark:bg-stone-800/80 border border-stone-200/80 dark:border-stone-800 rounded-lg max-w-full overflow-x-auto text-xs sm:text-sm font-medium shadow-2xs"
        role="tablist"
        aria-label="Filter Jenis Dokumen"
      >
        {options.map((opt) => {
          const isActive = !userMode && !categoryMode && mediaType === opt.id;
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
      </div>
    </div>
  );
};
