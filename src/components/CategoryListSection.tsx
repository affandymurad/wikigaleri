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
}

export const CategoryListSection: React.FC<CategoryListSectionProps> = ({
  currentCategory,
  mode,
  onSelectCategory,
  onViewMedia,
  t,
}) => {
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
              : 'Gagal memuat kategori dari Wikimedia Commons.'
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              isSubcat
                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                : 'bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400'
            }`}
          >
            {isSubcat ? (
              <FolderTree className="w-5 h-5" />
            ) : (
              <FolderRoot className="w-5 h-5" />
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <span>{t.categoryModes?.currentCategoryLabel || 'Kategori'}:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                Category:{cleanCurrentName}
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white truncate">
              {isSubcat
                ? t.categoryModes?.subcatTitle?.(cleanCurrentName) ||
                  `Subkategori dari ${cleanCurrentName}`
                : t.categoryModes?.parentTitle?.(cleanCurrentName) ||
                  `Kategori Induk dari ${cleanCurrentName}`}
            </h2>
          </div>
        </div>

        {/* Quick Filter Box */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder={t.categoryModes?.filterPlaceholder || 'Saring kategori...'}
              className="w-full pl-9 pr-3 py-1.5 text-xs sm:text-sm rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <button
            type="button"
            onClick={() => onViewMedia(cleanCurrentName)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white shrink-0 transition-colors shadow-2xs cursor-pointer"
            title="Lihat berkas media dari kategori ini"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">
              {t.categoryModes?.viewMedia || 'Lihat Media'}
            </span>
          </button>
        </div>
      </div>

      {/* Explanatory Hint */}
      <p className="text-xs text-slate-500 dark:text-slate-400 px-1">
        {isSubcat
          ? t.categoryModes?.subcatHint ||
            'Daftar subkategori turunan. Klik kategori apa pun untuk langsung mencari dan menjelajahinya.'
          : t.categoryModes?.parentHint ||
            'Kategori tingkat atas yang menaungi kategori saat ini.'}
      </p>

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 py-4">
          {Array.from({ length: 9 }).map((_, i) => (
            <div
              key={i}
              className="h-24 rounded-2xl bg-slate-100 dark:bg-slate-800/60 animate-pulse border border-slate-200/60 dark:border-slate-800 p-4 flex flex-col justify-between"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-700" />
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-md w-3/4" />
              </div>
              <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-md w-1/2" />
            </div>
          ))}
        </div>
      )}

      {/* Error State */}
      {!isLoading && error && (
        <div className="p-6 rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
          <p className="text-sm text-red-600 dark:text-red-400 font-medium">
            {error}
          </p>
          <button
            type="button"
            onClick={() => onSelectCategory(cleanCurrentName)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-2xs hover:bg-slate-50 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Coba lagi</span>
          </button>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && filteredCategories.length === 0 && (
        <div className="p-8 rounded-2xl bg-slate-100/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 text-center space-y-3">
          <Folder className="w-10 h-10 text-slate-400 mx-auto" />
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
            {isSubcat
              ? t.categoryModes?.noSubcats ||
                'Tidak ada subkategori langsung ditemukan untuk kategori ini.'
              : t.categoryModes?.noParents ||
                'Tidak ada kategori induk langsung ditemukan untuk kategori ini.'}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Anda dapat melihat berkas media kategori ini secara langsung atau memilih kategori dari Papan Koleksi Kurasi di atas.
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => onViewMedia(cleanCurrentName)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white shadow-2xs transition-colors cursor-pointer"
            >
              <LayoutGrid className="w-4 h-4" />
              <span>{t.categoryModes?.viewMedia || 'Lihat Media'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Categories Grid List */}
      {!isLoading && !error && filteredCategories.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
            <span>
              {t.categoryModes?.totalFound?.(filteredCategories.length) ||
                `${filteredCategories.length} kategori ditemukan`}
            </span>
            <span className="text-[11px]">
              Klik kartu untuk langsung mencari
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredCategories.map((item) => (
              <div
                key={item.id || item.cleanName}
                onClick={() => onSelectCategory(item.cleanName)}
                className="group relative p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-purple-400 dark:hover:border-purple-500 transition-all shadow-2xs hover:shadow-sm cursor-pointer flex flex-col justify-between gap-3 text-left"
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
                    className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                      isSubcat
                        ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-100'
                        : 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 group-hover:bg-blue-100'
                    }`}
                  >
                    {isSubcat ? (
                      <FolderTree className="w-4 h-4" />
                    ) : (
                      <FolderRoot className="w-4 h-4" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-100 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors line-clamp-2 leading-snug">
                      {item.cleanName}
                    </h3>
                    <p className="text-[11px] font-mono text-slate-400 dark:text-slate-500 truncate mt-0.5">
                      Category:{item.cleanName}
                    </p>
                  </div>
                </div>

                {/* Bottom Metadata & Actions */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/60 text-[11px] text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-2">
                    {item.filesCount !== undefined && item.filesCount > 0 && (
                      <span className="flex items-center gap-1 font-mono">
                        <FileImage className="w-3 h-3 text-slate-400" />
                        <span>{item.filesCount.toLocaleString()}</span>
                      </span>
                    )}

                    {item.subcatsCount !== undefined && item.subcatsCount > 0 && (
                      <span className="flex items-center gap-1 font-mono text-emerald-600 dark:text-emerald-400">
                        <Folder className="w-3 h-3" />
                        <span>{item.subcatsCount.toLocaleString()} sub</span>
                      </span>
                    )}

                    {item.filesCount === undefined && item.subcatsCount === undefined && (
                      <span className="text-[10px] text-slate-400">Wikimedia Commons</span>
                    )}
                  </div>

                  {/* Immediate Search Action Icon */}
                  <div className="flex items-center gap-1 text-purple-600 dark:text-purple-400 font-semibold group-hover:translate-x-0.5 transition-transform text-xs">
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
