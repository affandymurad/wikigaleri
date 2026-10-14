import React, { useEffect, useState, useMemo } from 'react';
import {
  fetchCategorySubcategories,
  fetchCategoryParents,
  normalizeCategoryName,
} from '../services/wikimediaApi';
import { CommonsCategoryItem } from '../types/wikimedia';
import { Translations } from '../i18n/translations';
import {
  FolderTree,
  FolderRoot,
  Search,
  FileImage,
  ArrowRight,
  Folder,
  Loader2,
  AlertCircle,
  LayoutGrid,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';

interface CategoryListSectionProps {
  currentCategory: string;
  mode: 'subcategories' | 'parent_categories';
  onSelectCategory: (categoryName: string) => void;
  onViewMedia: (categoryName: string) => void;
  t: Translations;
  language?: 'en' | 'id';
}

export const CategoryListSection: React.FC<CategoryListSectionProps> = ({
  currentCategory,
  mode,
  onSelectCategory,
  onViewMedia,
  t,
  language = 'id',
}) => {
  const en = language === 'en';
  const [categories, setCategories] = useState<CommonsCategoryItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filterQuery, setFilterQuery] = useState<string>('');

  const cleanCurrentName = useMemo(
    () => normalizeCategoryName(currentCategory) || '',
    [currentCategory]
  );

  const isSubcat = mode === 'subcategories';

  useEffect(() => {
    let isCancelled = false;

    async function loadData() {
if (!cleanCurrentName) {
setCategories([]);
setIsLoading(false);
return;
}
      setIsLoading(true);
      setError(null);
      setFilterQuery('');

      try {
        let items: CommonsCategoryItem[] = [];
        if (isSubcat) {
          items = await fetchCategorySubcategories(cleanCurrentName, 60);
        } else {
          items = await fetchCategoryParents(cleanCurrentName, 40);
        }

        if (!isCancelled) {
          setCategories(items);
        }
      } catch (err) {
        if (!isCancelled) {
          console.error('Error fetching categories:', err);
          setError(
            err instanceof Error
              ? err.message
              : (en ? 'Failed to load categories from Wikimedia Commons.' : 'Gagal memuat kategori dari Wikimedia Commons.')
          );
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    loadData();

    return () => {
      isCancelled = true;
    };
  }, [cleanCurrentName, isSubcat]);

  // Filter categories by local query if user types in search box
  const filteredCategories = useMemo(() => {
    if (!filterQuery.trim()) return categories;
    const q = filterQuery.toLowerCase();
    return categories.filter(
      (c) =>
        c.cleanName.toLowerCase().includes(q) ||
        c.title.toLowerCase().includes(q)
    );
  }, [categories, filterQuery]);

  return (
    <section
      className="w-full space-y-4 pt-2"
      aria-label={
        isSubcat
          ? t.categoryModes?.subcategories || 'Subkategori'
          : t.categoryModes?.parentCategories || 'Kategori Induk'
      }
    >
      {/* Header Context Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-lg bg-stone-100 dark:bg-stone-800/80 border border-stone-200/80 dark:border-stone-800 shadow-2xs">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
              isSubcat
                ? 'bg-moss-100 dark:bg-moss-950/60 text-moss-600 dark:text-moss-400'
                : 'bg-accent-100 dark:bg-accent-950/60 text-accent-600 dark:text-accent-400'
            }`}
          >
            {isSubcat ? (
              <FolderTree className="w-5 h-5" />
            ) : (
              <FolderRoot className="w-5 h-5" />
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-xs text-stone-500 dark:text-stone-400">
              <span>{t.categoryModes?.currentCategoryLabel || 'Kategori'}:</span>
              <span className="font-semibold text-stone-800 dark:text-stone-200 truncate">
                Category:{cleanCurrentName}
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-stone-900 dark:text-white truncate">
              {isSubcat
                ? t.categoryModes?.subcatTitle?.(cleanCurrentName) ||
                  (en ? `Subcategories of ${cleanCurrentName}` : `Subkategori dari ${cleanCurrentName}`)
                : t.categoryModes?.parentTitle?.(cleanCurrentName) ||
                  (en ? `Parent categories of ${cleanCurrentName}` : `Kategori Induk dari ${cleanCurrentName}`)}
            </h2>
          </div>
        </div>

        {/* Quick Filter Box */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder={t.categoryModes?.filterPlaceholder || 'Saring kategori...'}
              className="w-full pl-9 pr-3 py-1.5 text-xs sm:text-sm rounded-lg bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-accent-500"
            />
          </div>

          <button
            type="button"
            onClick={() => onViewMedia(cleanCurrentName)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-accent-600 hover:bg-accent-700 text-white shrink-0 transition-colors shadow-2xs cursor-pointer"
            title={en ? 'View media files in this category' : 'Lihat berkas media dari kategori ini'}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">
              {t.categoryModes?.viewMedia || (en ? 'View Media' : 'Lihat Media')}
            </span>
          </button>
        </div>
      </div>

      {/* Explanatory Hint */}
      <p className="text-xs text-stone-500 dark:text-stone-400 px-1">
        {isSubcat
          ? t.categoryModes?.subcatHint ||
            (en ? 'Subcategories of this category. Click any category to search and browse it.' : 'Daftar subkategori turunan. Klik kategori apa pun untuk langsung mencari dan menjelajahinya.')
          : t.categoryModes?.parentHint ||
            (en ? 'Higher-level categories that contain the current category.' : 'Kategori tingkat atas yang menaungi kategori saat ini.')}
      </p>

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 py-4">
          {Array.from({ length: 9 }).map((_, i) => (
            <div
              key={i}
              className="h-24 rounded-lg bg-stone-100 dark:bg-stone-800/60 animate-pulse border border-stone-200/60 dark:border-stone-800 p-4 flex flex-col justify-between"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-stone-200 dark:bg-stone-700" />
                <div className="h-4 bg-stone-200 dark:bg-stone-700 rounded-md w-3/4" />
              </div>
              <div className="h-3 bg-stone-200 dark:bg-stone-700 rounded-md w-1/2" />
            </div>
          ))}
        </div>
      )}

      {/* Error State */}
      {!isLoading && error && (
        <div className="p-6 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
          <p className="text-sm text-red-600 dark:text-red-400 font-medium">
            {error}
          </p>
          <button
            type="button"
            onClick={() => onSelectCategory(cleanCurrentName)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-200 border border-stone-200 dark:border-stone-700 shadow-2xs hover:bg-stone-50 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>{en ? 'Try again' : 'Coba lagi'}</span>
          </button>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && filteredCategories.length === 0 && (
        <div className="p-8 rounded-lg bg-stone-100/70 dark:bg-stone-800/40 border border-stone-200/80 dark:border-stone-800 text-center space-y-3">
          <Folder className="w-10 h-10 text-stone-400 mx-auto" />
          <p className="text-sm font-medium text-stone-700 dark:text-stone-300">
            {isSubcat
              ? t.categoryModes?.noSubcats ||
                (en ? 'No direct subcategories found for this category.' : 'Tidak ada subkategori langsung ditemukan untuk kategori ini.')
              : t.categoryModes?.noParents ||
                (en ? 'No direct parent categories found for this category.' : 'Tidak ada kategori induk langsung ditemukan untuk kategori ini.')}
          </p>
          <p className="text-xs text-stone-500 dark:text-stone-400 max-w-md mx-auto">
            {en ? 'You can view the media files in this category directly, or pick a category from the curated collections above.' : 'Anda dapat melihat berkas media kategori ini secara langsung atau memilih kategori dari Papan Koleksi Kurasi di atas.'}
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => onViewMedia(cleanCurrentName)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-accent-600 hover:bg-accent-700 text-white shadow-2xs transition-colors cursor-pointer"
            >
              <LayoutGrid className="w-4 h-4" />
              <span>{t.categoryModes?.viewMedia || (en ? 'View Media' : 'Lihat Media')}</span>
            </button>
          </div>
        </div>
      )}

      {/* Categories Grid List */}
      {!isLoading && !error && filteredCategories.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400 px-1">
            <span>
              {t.categoryModes?.totalFound?.(filteredCategories.length) ||
                (en ? `${filteredCategories.length} categories found` : `${filteredCategories.length} kategori ditemukan`)}
            </span>
            <span className="text-xs">
              {en ? 'Click a card to search it directly' : 'Klik kartu untuk langsung mencari'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredCategories.map((item) => (
              <div
                key={item.id || item.cleanName}
                onClick={() => onSelectCategory(item.cleanName)}
                className="group relative p-3.5 rounded-lg bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 hover:border-accent-400 dark:hover:border-accent-500 transition-all shadow-2xs hover:shadow-sm cursor-pointer flex flex-col justify-between gap-3 text-left"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectCategory(item.cleanName);
                  }
                }}
              >
                {/* Top Info */}
                <div className="flex items-start gap-2.5 min-w-0">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                      isSubcat
                        ? 'bg-moss-50 dark:bg-moss-950/50 text-moss-600 dark:text-moss-400 group-hover:bg-moss-100'
                        : 'bg-accent-50 dark:bg-accent-950/50 text-accent-600 dark:text-accent-400 group-hover:bg-accent-100'
                    }`}
                  >
                    {isSubcat ? (
                      <FolderTree className="w-4 h-4" />
                    ) : (
                      <FolderRoot className="w-4 h-4" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="text-xs sm:text-sm font-semibold text-stone-800 dark:text-stone-100 group-hover:text-accent-600 dark:group-hover:text-accent-400 transition-colors line-clamp-2 leading-snug">
                      {item.cleanName}
                    </h3>
                    <p className="text-xs font-mono text-stone-400 dark:text-stone-500 truncate mt-0.5">
                      Category:{item.cleanName}
                    </p>
                  </div>
                </div>

                {/* Bottom Metadata & Actions */}
                <div className="flex items-center justify-between pt-2 border-t border-stone-100 dark:border-stone-800/60 text-xs text-stone-500 dark:text-stone-400">
                  <div className="flex items-center gap-2">
                    {item.filesCount !== undefined && item.filesCount > 0 && (
                      <span className="flex items-center gap-1 font-mono">
                        <FileImage className="w-3 h-3 text-stone-400" />
                        <span>{item.filesCount.toLocaleString()}</span>
                      </span>
                    )}

                    {item.subcatsCount !== undefined && item.subcatsCount > 0 && (
                      <span className="flex items-center gap-1 font-mono text-moss-600 dark:text-moss-400">
                        <Folder className="w-3 h-3" />
                        <span>{item.subcatsCount.toLocaleString()} sub</span>
                      </span>
                    )}

                    {item.filesCount === undefined && item.subcatsCount === undefined && (
                      <span className="text-xs text-stone-400">Wikimedia Commons</span>
                    )}
                  </div>

                  {/* Immediate Search Action Icon */}
                  <div className="flex items-center gap-1 text-accent-600 dark:text-accent-400 font-semibold group-hover:translate-x-0.5 transition-transform text-xs">
                    <span>{t.categoryModes?.searchThisCategory || 'Cari'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};
