import React, { useEffect, useRef, useState } from 'react';
import { useDarkMode } from './hooks/useDarkMode';
import { useLanguage } from './hooks/useLanguage';
import { useGeminiApiKey } from './hooks/useGeminiApiKey';
import { useCommonsGallery, useBookmarkLists, DEFAULT_QUERY, isBrowseOnlyType } from './hooks/useCommonsGallery';
import { Header } from './components/Header';
import { SearchBar } from './components/SearchBar';
import { CuratedTopics } from './components/CuratedTopics';
import { NearbyPhotosSection } from './components/NearbyPhotosSection';
import { MediaTypeFilter } from './components/MediaTypeFilter';
import { MediaGrid, TalkPageView, BookmarksPanel, BookmarkBackupBar } from './components/MediaGrid';
import { MediaDetailModal } from './components/MediaDetailModal';
import { GeminiKeyModal } from './components/GeminiKeyModal';
import { AI_NEEDS_KEY } from './services/geminiClient';
import { LicenseGuideModal, WikimediaTermsModal, DisclaimerModal } from './components/LicenseGuideModal';
import { AttributionQuickCopyModal } from './components/AttributionQuickCopyModal';
import { CategoryListSection } from './components/CategoryListSection';
import { CommonsMediaItem, CategorySearchMode } from './types/wikimedia';
import { CURATED_TOPICS, normalizeCategoryName, fetchMediaDetailByPageId, fetchMediaDetailByTitle } from './services/wikimediaApi';
import { buildSearch, parseSearch, detailPath, parseDetailPath, parseNearbyView, withNearbyView, type UrlSearchState } from './utils/urlState';
import { ExternalLink, Search, MapPin, LayoutGrid, FolderTree, FolderRoot, Radio, Bookmark, Shuffle } from 'lucide-react';

export default function App() {
  const { isDark, toggleDarkMode } = useDarkMode();
  const { language, setLanguage, t } = useLanguage();
  const {
    apiKey: storedGeminiKey,
    hasKey: hasStoredGeminiKey,
    saveKey: saveGeminiKey,
    removeKey: removeGeminiKey,
    lastError: geminiLastError,
  } = useGeminiApiKey();
  // In "firebase" and "api" modes the key lives on the server side, so the rest of the UI sees a key as
  // already set. The placeholder is never sent anywhere.
  const geminiApiKey = AI_NEEDS_KEY ? storedGeminiKey : 'managed-by-server';
  const hasGeminiKey = AI_NEEDS_KEY ? hasStoredGeminiKey : true;

  const {
    filter,
    activeTopicId,
    items,
    isLoading,
    error,
    currentPage,
    totalPages,
    totalHits,
    hasNextPage,
    hasPrevPage,
    itemsPerPage,
    viewLayout,
    savedCount,
    showSavedOnly,
    setViewLayout,
    setShowSavedOnly,
    toggleSaveItem,
    isItemSaved,
    goToPage,
    nextPage,
    prevPage,
    setQuery,
    setMediaType,
    setLicense,
    setSort,
    setTopic,
    refresh,
    isLatestUploads,
    liveFeed,
    setLiveFeed,
  setRandomMode,
    userMode,
    setUserMode,
  } = useCommonsGallery();
  const { savedUsers, savedCategories, toggleUser, toggleCategory, isUserSaved, isCategorySaved } = useBookmarkLists();

  // Navigation Mode: 'keywords' (Kata Kunci) | 'nearby' (Terdekat) | 'categories' (Kategori)
  type ActiveMode = 'keywords' | 'nearby' | 'categories' | 'live' | 'random' | 'bookmarks';
  const [activeMode, setActiveMode] = useState<ActiveMode>('keywords');

  // Mode Kategori sub-search mode: 'media' | 'subcategories' | 'parent_categories'
  // Mode Nama Pengguna: 'uploads' (unggahan) | 'talk' (halaman pembicaraan pengguna)
  const [userView, setUserView] = useState<'uploads' | 'talk'>('uploads');
  const [categorySearchMode, setCategorySearchMode] = useState<CategorySearchMode>('media');
  const [currentCategoryName, setCurrentCategoryName] = useState<string>('');

  // Modals state
  const [selectedDetailItem, setSelectedDetailItem] = useState<CommonsMediaItem | null>(null);
  const [quickAttributionItem, setQuickAttributionItem] = useState<CommonsMediaItem | null>(null);
  const [isGeminiModalOpen, setIsGeminiModalOpen] = useState<boolean>(false);
  const [isLicenseGuideOpen, setIsLicenseGuideOpen] = useState<boolean>(false);
  const [isTermsOpen, setIsTermsOpen] = useState<boolean>(false);
  const [isDisclaimerOpen, setIsDisclaimerOpen] = useState<boolean>(false);

  // ----- Halaman detail berkas: /file/<pageid>, tetap satu SPA (state pencarian dan posisi gulir terjaga) -----
  const itemsRef = useRef<CommonsMediaItem[]>([]);
  const savedScroll = useRef(0);
  const restoreScroll = useRef(false);
  const parseDetail = () => parseDetailPath(window.location.pathname);
  // true saat state sedang diisi dari URL: sinkronisasi URL memakai replaceState agar riwayat tidak bertambah
  const fromUrl = useRef(false);
  const [urlReady, setUrlReady] = useState(false);
  const openDetail = (item: CommonsMediaItem) => {
    savedScroll.current = window.scrollY;
    window.history.pushState({ detail: item.id }, '', detailPath(item));
    setSelectedDetailItem(item);
    window.scrollTo({ top: 0 });
  };
  // Pindah antar berkas: ganti entri riwayat agar tombol kembali langsung ke daftar
  const switchDetail = (item: CommonsMediaItem) => {
    window.history.replaceState({ detail: item.id }, '', detailPath(item));
    setSelectedDetailItem(item);
    window.scrollTo({ top: 0 });
  };
  const closeDetail = () => {
    if (window.history.state?.detail) {
      restoreScroll.current = true;
      window.history.back();
    } else {
      // dibuka lewat tautan langsung: tidak ada halaman sebelumnya di aplikasi ini
      window.history.replaceState(null, '', '/');
      setSelectedDetailItem(null);
    }
  };
  // Keluar dari halaman detail untuk berpindah ke hasil pencarian (tanpa memulihkan posisi gulir)
  const clearDetail = () => {
    if (parseDetail() !== null) window.history.replaceState(null, '', '/');
    setSelectedDetailItem(null);
  };

  const handleResetToHome = () => {
    clearDetail();
    setLiveFeed(false);
    setRandomMode(false);
    setUserMode(false);
    setUserView('uploads');
    setActiveMode('keywords');
    setCategorySearchMode('media');
    setShowSavedOnly(false);
    setQuery('Wikilokal');
    setCurrentCategoryName('');
    setMediaType('all');
    setLicense('all');
    setSort('relevance');
  };

  const handleSelectTopic = (topicId: string) => {
    setTopic(topicId);
    const tp = CURATED_TOPICS.find((t) => t.id === topicId);
    if (tp?.categoryName) {
      const cleanCat = normalizeCategoryName(tp.categoryName);
      setCurrentCategoryName(cleanCat);
      if (activeMode === 'categories') {
        setQuery(cleanCat);
      }
    }
  };

  const handleCategorySearch = (q: string) => {
    const clean = (q.trim() ? normalizeCategoryName(q) : '');
    setCurrentCategoryName(clean);
    setQuery(clean);
  };

  const handleSelectCategoryFromList = (catName: string) => {
    const clean = normalizeCategoryName(catName);
    setCurrentCategoryName(clean);
    setQuery(clean);
  };

  const handleViewMediaFromList = (catName: string) => {
    const clean = normalizeCategoryName(catName);
    setCurrentCategoryName(clean);
    setQuery(clean);
    setCategorySearchMode('media');
  };

  const handleSwitchMode = (mode: ActiveMode) => {
    setLiveFeed(mode === 'live');
    setRandomMode(mode === 'random');
    setShowSavedOnly(mode === 'bookmarks');
    if (mode === 'categories') setMediaType('all');
    if (mode !== 'keywords') { setUserMode(false); setUserView('uploads'); }
    if (mode === 'keywords' && activeMode === 'categories') setQuery('');
    setActiveMode(mode);
    if (mode === 'categories') {
      const clean = (currentCategoryName ? normalizeCategoryName(currentCategoryName) : '');
      setCurrentCategoryName(clean);
      setQuery(clean);
    }
  };

  // Buka pencarian username (mode Kata Kunci > Nama Pengguna)
  const openUserSearch = (username: string) => {
    const clean = username.replace(/^(User|Pengguna):/i, '').trim();
    if (!clean) return;
    clearDetail();
    setShowSavedOnly(false);
    setLiveFeed(false);
    setActiveMode('keywords');
    setUserView('uploads');
    setUserMode(true);
    setQuery(clean);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Buka pencarian kategori (mode Kategori > Media)
  const openCategorySearch = (catName: string) => {
    const clean = normalizeCategoryName(catName);
    if (!clean) return;
    clearDetail();
    setShowSavedOnly(false);
    setLiveFeed(false);
    setUserMode(false);
    setUserView('uploads');
    setActiveMode('categories');
    setMediaType('all');
    setCategorySearchMode('media');
    setCurrentCategoryName(clean);
    setQuery(clean);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Next / Prev detail item navigation
  const currentDetailIndex = selectedDetailItem
    ? items.findIndex((i) => i.id === selectedDetailItem.id)
    : -1;
  const hasPrevDetail = currentDetailIndex > 0;
  const hasNextDetail = currentDetailIndex >= 0 && currentDetailIndex < items.length - 1;


  const handleNextDetail = () => {
    if (hasNextDetail) {
      switchDetail(items[currentDetailIndex + 1]);
    }
  };

  const handlePrevDetail = () => {
    if (hasPrevDetail) {
      switchDetail(items[currentDetailIndex - 1]);
    }
  };

  itemsRef.current = items;

  // Terapkan state pencarian dari URL (?q=, ?type=, ?mode=, ...)
  const applySearchState = (s: UrlSearchState) => {
    fromUrl.current = true;
    setQuery(s.query);
    setMediaType(s.mediaType);
    setLicense(s.license);
    setSort(s.sort);
    setActiveMode(s.mode);
    setLiveFeed(s.mode === 'live');
    setRandomMode(s.mode === 'random');
    setShowSavedOnly(s.mode === 'bookmarks');
    setUserMode(s.userMode);
    setUserView(s.userView);
    setCategorySearchMode(s.categoryView);
    setCurrentCategoryName(s.mode === 'categories' ? s.query : '');
  };

  useEffect(() => {
    let cancelled = false;
    const loadDetail = async (ref: NonNullable<ReturnType<typeof parseDetailPath>>) => {
      const found =
        ref.kind === 'id'
          ? itemsRef.current.find((i) => i.id === ref.id)
          : itemsRef.current.find((i) => i.title.replace(/ /g, '_') === ref.title.replace(/ /g, '_'));
      const item = found ?? (ref.kind === 'id' ? await fetchMediaDetailByPageId(ref.id) : await fetchMediaDetailByTitle(ref.title));
      if (cancelled) return;
      if (item) {
        // ganti ke URL berbasis nama berkas bila dibuka lewat tautan lama /file/<id>
        if (ref.kind === 'id') window.history.replaceState(window.history.state, '', detailPath(item));
        setSelectedDetailItem(item);
      } else {
        window.history.replaceState(null, '', '/');
        setSelectedDetailItem(null);
      }
    };
    const initialDetail = parseDetail();
    if (initialDetail) void loadDetail(initialDetail);
    else applySearchState(parseSearch(window.location.search));
    setUrlReady(true);

    const onPop = () => {
      const ref = parseDetail();
      if (ref) {
        void loadDetail(ref);
      } else {
        setSelectedDetailItem(null);
        applySearchState(parseSearch(window.location.search));
      }
    };
    window.addEventListener('popstate', onPop);
    return () => {
      cancelled = true;
      window.removeEventListener('popstate', onPop);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // State pencarian -> URL. Pencarian baru menambah riwayat (tombol kembali pulih ke pencarian sebelumnya)
  useEffect(() => {
    if (!urlReady || selectedDetailItem || parseDetail()) return;
    let search = buildSearch({
      mode: activeMode,
      query: filter.query,
      mediaType: filter.mediaType,
      license: filter.license,
      sort: filter.sort,
      userMode,
      userView,
      categoryView: categorySearchMode,
    });
    // lat/lon/zoom peta Sekitar ditulis oleh petanya sendiri; jangan dihapus saat URL ditulis ulang
    if (activeMode === 'nearby') search = withNearbyView(search, parseNearbyView(window.location.search));
    if (search !== window.location.search || window.location.pathname !== '/') {
      const write = fromUrl.current ? window.history.replaceState : window.history.pushState;
      write.call(window.history, null, '', '/' + search);
    }
    fromUrl.current = false;
  }, [urlReady, selectedDetailItem, activeMode, filter.query, filter.mediaType, filter.license, filter.sort, userMode, userView, categorySearchMode]);

  // Judul tab browser mengikuti berkas yang dibuka; posisi gulir daftar dipulihkan saat kembali
  useEffect(() => {
    const base = document.title.replace(/^.* \u2013 (?=WikiGaleri)/, '');
    if (selectedDetailItem) {
      document.title = `${selectedDetailItem.cleanTitle} \u2013 ${base}`;
      return () => { document.title = base; };
    }
    if (restoreScroll.current) {
      restoreScroll.current = false;
      const y = savedScroll.current;
      requestAnimationFrame(() => window.scrollTo({ top: y }));
    }
  }, [selectedDetailItem]);

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 flex flex-col font-sans transition-colors duration-200">
      {/* 3-Zone Header Contract */}
      <Header
        isDark={isDark}
        onToggleDark={toggleDarkMode}
        hasGeminiKey={hasGeminiKey}
        keyless={!AI_NEEDS_KEY}
        onOpenGeminiModal={() => setIsGeminiModalOpen(true)}
        onOpenLicenseGuide={() => setIsLicenseGuideOpen(true)}
        onOpenTerms={() => setIsTermsOpen(true)}
        onOpenDisclaimer={() => setIsDisclaimerOpen(true)}
        onResetToHome={handleResetToHome}
        language={language}
        onSetLanguage={setLanguage}
        t={t}
      />

      {selectedDetailItem && (
        <div className="flex-1 w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
          <MediaDetailModal
            item={selectedDetailItem}
            onClose={closeDetail}
            geminiApiKey={geminiApiKey}
            onOpenGeminiModal={() => {
              clearDetail();
              setIsGeminiModalOpen(true);
            }}
            onNext={currentDetailIndex >= 0 ? handleNextDetail : undefined}
            onPrev={currentDetailIndex >= 0 ? handlePrevDetail : undefined}
            hasNext={hasNextDetail}
            hasPrev={hasPrevDetail}
            isSaved={isItemSaved(selectedDetailItem.id)}
            onToggleSave={toggleSaveItem}
            onSearchUser={openUserSearch}
            onSearchCategory={openCategorySearch}
            isUserSaved={isUserSaved}
            isCategorySaved={(c) => isCategorySaved(normalizeCategoryName(c))}
            onToggleUserSave={toggleUser}
            onToggleCategorySave={(c) => toggleCategory(normalizeCategoryName(c))}
            t={t}
            language={language}
          />
        </div>
      )}

      {/* Main Content Area */}
      <main className={`flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 ${selectedDetailItem ? 'hidden' : ''}`}>
        
        {/* Hero Section & Search Header */}
        <section className="space-y-6 pt-2">
          <div className="max-w-3xl space-y-2">
            <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-stone-900 dark:text-stone-50 leading-[1.1] text-balance">
              {t.hero.title}
            </h1>
            <p className="text-base sm:text-lg text-stone-600 dark:text-stone-400 leading-relaxed">
              {t.hero.subtitle}
            </p>
          </div>

          {/* Mode Switcher Chips & Category Sub-modes (Placed directly to the right of Categories) */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {/* Primary Navigation Tabs */}
            <div className="flex items-center gap-1.5 sm:gap-2 p-1 bg-stone-100 dark:bg-stone-900 rounded-lg border border-stone-300 dark:border-stone-800 overflow-x-auto max-w-full">
              <button
                type="button"
                onClick={() => handleSwitchMode('keywords')}
                className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  (activeMode === 'keywords' || activeMode === 'categories')
                    ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-white shadow-xs '
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white'
                }`}
              >
                <Search className="w-4 h-4 text-accent-600 dark:text-accent-400" />
                <span>{t.tabs.keywords}</span>
              </button>

              <button
                type="button"
                onClick={() => handleSwitchMode('nearby')}
                className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  activeMode === 'nearby'
                    ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-white shadow-xs '
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white'
                }`}
              >
                <MapPin className="w-4 h-4 text-accent-600 dark:text-accent-400" />
                <span>{t.tabs.nearby}</span>
              </button>


          <button
                type="button"
                onClick={() => handleSwitchMode('live')}
                className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  activeMode === 'live'
                    ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-white shadow-xs '
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white'
                }`}
              >
                <Radio className="w-4 h-4 text-accent-600 dark:text-accent-400" />
                <span>{language === 'id' ? 'Unggahan Terbaru' : 'Live Feed'}</span>
              </button>

              <button
            type="button"
            onClick={() => handleSwitchMode('random')}
            className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap ${
              activeMode === 'random'
                ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-white shadow-xs '
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white'
            }`}
          >
            <Shuffle className="w-4 h-4 text-accent-600 dark:text-accent-400" />
            <span>{language === 'id' ? 'Acak' : 'Random'}</span>
          </button>

          <button
                type="button"
                onClick={() => handleSwitchMode('bookmarks')}
                className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  activeMode === 'bookmarks'
                    ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-white shadow-xs '
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white'
                }`}
              >
                <Bookmark className="w-4 h-4 text-accent-600 dark:text-accent-400" />
                <span>{language === 'id' ? 'Markah' : 'Bookmark'}</span>
                {(savedCount + savedUsers.length + savedCategories.length) > 0 && (
                  <span className="rounded-full bg-accent-100 px-1.5 text-xs font-bold text-accent-700 dark:bg-accent-900/50 dark:text-accent-300">{savedCount + savedUsers.length + savedCategories.length}</span>
                )}
              </button>
            </div>

          </div>

          {(activeMode === 'keywords' || activeMode === 'categories') && (
            <MediaTypeFilter
              mediaType={filter.mediaType}
              onSelectMediaType={(type) => {
                if (activeMode === 'categories') handleSwitchMode('keywords');
                // Kata kunci bawaan beranda ('Wikilokal') tidak cocok dengan model 3D / panorama: kosongkan kolomnya
                // (kolom kosong = tidak ada data). Pulihkan saat kembali ke filter lain dengan kolom masih kosong.
                if (isBrowseOnlyType(type) && filter.query === DEFAULT_QUERY) setQuery('');
                else if (!isBrowseOnlyType(type) && isBrowseOnlyType(filter.mediaType) && !filter.query.trim()) setQuery(DEFAULT_QUERY);
                setMediaType(type);
              }}
              t={t}
              userMode={userMode}
              onSetUserMode={(on) => {
                if (on && activeMode === 'categories') handleSwitchMode('keywords');
                setUserMode(on);
                setUserView('uploads');
                setQuery('');
              }}
              userLabel={language === 'id' ? 'Nama Pengguna' : 'Username'}
              categoryMode={activeMode === 'categories'}
              onSetCategoryMode={(on) => {
                if (on) handleSwitchMode('categories');
                else if (activeMode === 'categories') handleSwitchMode('keywords');
              }}
              categoryLabel={language === 'id' ? 'Kategori' : 'Categories'}
            />
          )}

          {/* Mode 1: Kata Kunci (Filter jenis dokumen + Field pencarian) */}
          {/* Mode Live Feed: tanpa field pencarian & tanpa filter, langsung unggahan terbaru */}
        {activeMode === 'keywords' && (
            <div className="space-y-4 pt-1">
              <SearchBar
                currentQuery={filter.query}
                onSearch={setQuery}
                placeholder={userMode ? (language === 'id' ? 'Ketik nama pengguna Commons untuk melihat unggahannya…' : 'Type a Commons username to see their uploads…') : t.search.placeholder}
                t={t}
              />
            {userMode && filter.query.trim() !== '' && (
              <button
                type="button"
                onClick={() => toggleUser(filter.query.replace(/^(User|Pengguna):/i, ''))}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold cursor-pointer transition ${
                  isUserSaved(filter.query.replace(/^(User|Pengguna):/i, ''))
                    ? 'border-accent-400 bg-accent-50 text-accent-700 dark:border-accent-500 dark:bg-accent-900/30 dark:text-accent-300'
                    : 'border-stone-300 text-stone-600 hover:bg-stone-50 dark:border-stone-600 dark:text-stone-300 dark:hover:bg-stone-800'
                }`}
              >
                <Bookmark className={`h-3.5 w-3.5 ${isUserSaved(filter.query.replace(/^(User|Pengguna):/i, '')) ? 'fill-current' : ''}`} />
                {isUserSaved(filter.query.replace(/^(User|Pengguna):/i, ''))
                  ? (language === 'id' ? 'Nama pengguna tersimpan' : 'Username saved')
                  : (language === 'id' ? 'Simpan nama pengguna' : 'Save username')}
              </button>
            )}

            {userMode && (
              <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Tampilan pengguna">
                <button
                  type="button"
                  role="tab"
                  aria-selected={userView === 'uploads'}
                  onClick={() => setUserView('uploads')}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${userView === 'uploads' ? 'border-accent-600 bg-accent-600 text-white shadow-xs' : 'border-stone-200 bg-stone-100 text-stone-600 hover:bg-stone-200 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700'}`}
                >
                  {language === 'id' ? 'Unggahan' : 'Uploads'}
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={userView === 'talk'}
                  onClick={() => setUserView('talk')}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${userView === 'talk' ? 'border-accent-600 bg-accent-600 text-white shadow-xs' : 'border-stone-200 bg-stone-100 text-stone-600 hover:bg-stone-200 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700'}`}
                >
                  {language === 'id' ? 'Halaman Pembicaraan' : 'Talk Page'}
                </button>
              </div>
            )}
            </div>
          )}


          {/* Mode 3: Kategori (Field pencarian + Papan Koleksi Kurasi Collapsible) */}
          {activeMode === 'categories' && (
            <div className="space-y-4 pt-1">
              {/* Field Pencarian Kategori */}
              <SearchBar
                currentQuery={currentCategoryName}
                onSearch={handleCategorySearch}
                placeholder={t.search.categoryPlaceholder}
                t={t}
              />

              {currentCategoryName.trim() !== '' && (
                <button
                  type="button"
                  onClick={() => toggleCategory(currentCategoryName)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold cursor-pointer transition ${
                    isCategorySaved(currentCategoryName)
                      ? 'border-accent-400 bg-accent-50 text-accent-700 dark:border-accent-500 dark:bg-accent-900/30 dark:text-accent-300'
                      : 'border-stone-300 text-stone-600 hover:bg-stone-50 dark:border-stone-600 dark:text-stone-300 dark:hover:bg-stone-800'
                  }`}
                >
                  <Bookmark className={`h-3.5 w-3.5 ${isCategorySaved(currentCategoryName) ? 'fill-current' : ''}`} />
                  {isCategorySaved(currentCategoryName)
                    ? (language === 'id' ? 'Kategori tersimpan' : 'Category saved')
                    : (language === 'id' ? 'Simpan kategori' : 'Save category')}
                </button>
              )}

              {activeMode === 'categories' && (
                <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Mode kategori">
                  {/* 1. Media dengan ikon grid existing */}
                  <button
                    type="button"
                    onClick={() => setCategorySearchMode('media')}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                      categorySearchMode === 'media'
                        ? 'border-accent-600 bg-accent-600 text-white shadow-xs'
                        : 'border-stone-200 bg-stone-100 text-stone-600 hover:bg-stone-200 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700'
                    }`}
                  >
                    <LayoutGrid className="w-4 h-4" />
                    <span>{t.categoryModes?.media || 'Media'}</span>
                  </button>

                  {/* 2. Subkategori */}
                  <button
                    type="button"
                    onClick={() => setCategorySearchMode('subcategories')}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                      categorySearchMode === 'subcategories'
                        ? 'border-accent-600 bg-accent-600 text-white shadow-xs'
                        : 'border-stone-200 bg-stone-100 text-stone-600 hover:bg-stone-200 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700'
                    }`}
                  >
                    <FolderTree className="w-4 h-4" />
                    <span>{t.categoryModes?.subcategories || 'Subkategori'}</span>
                  </button>

                  {/* 3. Kategori Induk */}
                  <button
                    type="button"
                    onClick={() => setCategorySearchMode('parent_categories')}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                      categorySearchMode === 'parent_categories'
                        ? 'border-accent-600 bg-accent-600 text-white shadow-xs'
                        : 'border-stone-200 bg-stone-100 text-stone-600 hover:bg-stone-200 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700'
                    }`}
                  >
                    <FolderRoot className="w-4 h-4" />
                    <span>{t.categoryModes?.parentCategories || 'Kategori Induk'}</span>
                  </button>
                </div>
              )}

              {/* Papan Koleksi Kurasi dengan chip bersegmen selengkap mungkin & collapsible */}
              <CuratedTopics
                activeTopicId={activeTopicId}
                onSelectTopic={handleSelectTopic}
                t={t}
              />
            </div>
          )}
        </section>

        {/* Mode 2: Terdekat (Satu section Foto Terdekat / Nearby Photos) */}
        {activeMode === 'nearby' && (
          <section aria-label="Foto Terdekat" className="space-y-6">
            <NearbyPhotosSection
              onOpenDetail={openDetail}
              geminiApiKey={geminiApiKey}
              onOpenGeminiModal={() => setIsGeminiModalOpen(true)}
              language={language}
              t={t}
            />
          </section>
        )}

        {/* Results Section: Kata Kunci (MediaGrid) & Kategori (MediaGrid atau CategoryListSection) */}
        {activeMode === 'keywords' && userMode && userView === 'talk' && (
        <section aria-label="Talk Page Pengguna">
          {filter.query.trim() !== '' ? (
            <TalkPageView
              title={`User talk:${filter.query.trim().replace(/^(User|Pengguna)( talk)?:/i, '')}`}
              emptyHint={language === 'id' ? 'Pengguna ini belum memiliki halaman pembicaraan.' : 'This user has no talk page yet.'}
              language={language}
            />
          ) : (
            <div className="rounded-lg border border-dashed border-stone-300 bg-stone-50 p-6 text-center text-xs text-stone-500 dark:border-stone-700 dark:bg-stone-800/40 dark:text-stone-400">
              {language === 'id' ? 'Ketik nama pengguna untuk melihat halaman pembicaraannya.' : 'Type a username to see their talk page.'}
            </div>
          )}
        </section>
      )}

      {activeMode === 'bookmarks' && (
        <section aria-label="Bookmark" className="space-y-6">
          <BookmarkBackupBar language={language} />
          <BookmarksPanel
            savedUsers={savedUsers}
            savedCategories={savedCategories}
            onOpenUser={openUserSearch}
            onOpenCategory={openCategorySearch}
            onRemoveUser={toggleUser}
            onRemoveCategory={toggleCategory}
            language={language}
          />
          <MediaGrid
            language={language}
            items={items}
            isLoading={isLoading}
            error={error}
            currentPage={currentPage}
            totalPages={totalPages}
            totalHits={totalHits}
            itemsPerPage={itemsPerPage}
            hasNextPage={hasNextPage}
            hasPrevPage={hasPrevPage}
            viewLayout={viewLayout}
            savedCount={savedCount}
            showSavedOnly={true}
            onSetViewLayout={setViewLayout}
            onSetShowSavedOnly={(v) => { if (!v) handleSwitchMode('keywords'); }}
            onGoToPage={goToPage}
            onNextPage={nextPage}
            onPrevPage={prevPage}
            onRetry={refresh}
            onOpenDetail={openDetail}
            onQuickCopyAttribution={(item) => setQuickAttributionItem(item)}
            isItemSaved={isItemSaved}
            onToggleSaveItem={toggleSaveItem}
            isLatestUploads={false}
            t={t}
          />
        </section>
      )}

      {(activeMode === 'live' || activeMode === 'random' || (activeMode === 'keywords' && filter.query.trim() !== '' && !(userMode && userView === 'talk'))) && (
          <section aria-label="Media Gallery">
            {activeMode === 'random' && (
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400">{language === 'id' ? 'Berkas acak dari Wikimedia Commons, berbeda setiap kali.' : 'Random files from Wikimedia Commons, different every time.'}</p>
                <button type="button" onClick={refresh} disabled={isLoading} className="inline-flex items-center gap-1.5 rounded-full border border-stone-300 dark:border-stone-600 px-3.5 py-1.5 text-xs font-semibold text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-800 disabled:opacity-50 cursor-pointer"><Shuffle className="h-3.5 w-3.5" />{language === 'id' ? 'Acak lagi' : 'Shuffle again'}</button>
              </div>
            )}
            <MediaGrid
              language={language}
              items={items}
              isLoading={isLoading}
              error={error}
              currentPage={currentPage}
              totalPages={totalPages}
              totalHits={totalHits}
              itemsPerPage={itemsPerPage}
              hasNextPage={hasNextPage}
              hasPrevPage={hasPrevPage}
              viewLayout={viewLayout}
              savedCount={savedCount}
              showSavedOnly={showSavedOnly}
              onSetViewLayout={setViewLayout}
              onSetShowSavedOnly={setShowSavedOnly}
              onGoToPage={goToPage}
              onNextPage={nextPage}
              onPrevPage={prevPage}
              onRetry={refresh}
              onOpenDetail={openDetail}
              onQuickCopyAttribution={(item) => setQuickAttributionItem(item)}
              isItemSaved={isItemSaved}
              onToggleSaveItem={toggleSaveItem}
              isLatestUploads={isLatestUploads && !userMode}
              t={t}
            />
          </section>
        )}

{activeMode === 'categories' && currentCategoryName.trim() === '' && (
<div className="text-center text-sm text-stone-500 dark:text-stone-400 py-10">
{t.categoryModes?.emptyHint || 'Ketik nama kategori di atas atau pilih dari Koleksi Kurasi.'}
</div>
)}

        {activeMode === 'categories' && currentCategoryName.trim() !== '' && (
          <section aria-label="Category Results">
            {categorySearchMode === 'media' ? (
              <MediaGrid
                language={language}
                items={items}
                isLoading={isLoading}
                error={error}
                currentPage={currentPage}
                totalPages={totalPages}
                totalHits={totalHits}
                itemsPerPage={itemsPerPage}
                hasNextPage={hasNextPage}
                hasPrevPage={hasPrevPage}
                viewLayout={viewLayout}
                savedCount={savedCount}
                showSavedOnly={showSavedOnly}
                onSetViewLayout={setViewLayout}
                onSetShowSavedOnly={setShowSavedOnly}
                onGoToPage={goToPage}
                onNextPage={nextPage}
                onPrevPage={prevPage}
                onRetry={refresh}
                onOpenDetail={openDetail}
                onQuickCopyAttribution={(item) => setQuickAttributionItem(item)}
                isItemSaved={isItemSaved}
                onToggleSaveItem={toggleSaveItem}
                isLatestUploads={isLatestUploads}
                t={t}
              />
            ) : (
              <CategoryListSection
                currentCategory={currentCategoryName || filter.query}
                mode={categorySearchMode}
                onSelectCategory={handleSelectCategoryFromList}
                onViewMedia={handleViewMediaFromList}
                t={t}
                language={language}
              />
            )}
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 transition-colors py-8 mt-12 text-xs text-stone-500 dark:text-stone-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 text-center sm:text-left">
            <span className="font-semibold text-stone-800 dark:text-stone-200">WikiGaleri</span>
            <span className="hidden sm:inline" aria-hidden="true">·</span>
            <span>{t.footer.tagline}</span>
          </div>

          <div className="flex items-center gap-4">
            <a
              href="https://affandymurad.github.io/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-accent-600 dark:hover:text-accent-400 transition-colors"
            >
              {language === 'id' ? 'Profil Affandy Murad' : "Affandy Murad's Profile"}
            </a>
            <span aria-hidden="true">·</span>
            <a
              href="https://commons.wikimedia.org"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-accent-600 dark:hover:text-accent-400 transition-colors flex items-center gap-1"
            >
              <span>{t.footer.commonsLink}</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </footer>

      {/* Modals */}

      {quickAttributionItem && (
        <AttributionQuickCopyModal
          item={quickAttributionItem}
          onClose={() => setQuickAttributionItem(null)}
          t={t}
          language={language}
        />
      )}

      {isGeminiModalOpen && (
        <GeminiKeyModal
          isOpen={isGeminiModalOpen}
          onClose={() => setIsGeminiModalOpen(false)}
          currentKey={geminiApiKey}
          onSaveKey={saveGeminiKey}
          onRemoveKey={removeGeminiKey}
          t={t}
          lastError={geminiLastError}
        />
      )}

      {isLicenseGuideOpen && (
        <LicenseGuideModal
          isOpen={isLicenseGuideOpen}
          onClose={() => setIsLicenseGuideOpen(false)}
          t={t}
        />
      )}

      {isTermsOpen && (
        <WikimediaTermsModal isOpen={isTermsOpen} onClose={() => setIsTermsOpen(false)} language={language} />
      )}

      {isDisclaimerOpen && (
        <DisclaimerModal isOpen={isDisclaimerOpen} onClose={() => setIsDisclaimerOpen(false)} language={language} />
      )}
    </div>
  );
}
