import { useState, useEffect, useCallback, useRef } from 'react';
import {
  CommonsMediaItem,
  GalleryFilterState,
  MediaType,
  LicenseCategory,
  SortOrder,
} from '../types/wikimedia';
import { searchCommonsMedia, fetchRandomCommonsMedia, CURATED_TOPICS } from '../services/wikimediaApi';

import { DEFAULT_QUERY } from '../utils/urlState';

/** Kata kunci bawaan beranda */
export { DEFAULT_QUERY };

/** Filter 3D dan panorama 360°: kata kunci bawaan beranda tidak cocok dengannya */
export const isBrowseOnlyType = (type: string) => type === '3d' || type === 'panorama';

const DEFAULT_FILTER: GalleryFilterState = {
  query: DEFAULT_QUERY,
  mediaType: 'all',
  license: 'all',
  sort: 'relevance',
};

const ITEMS_PER_PAGE = 24;
const SAVED_ITEMS_KEY = 'wikigaleri_saved_favorites';

export function useCommonsGallery() {
  const [filter, setFilter] = useState<GalleryFilterState>(DEFAULT_FILTER);
  const [activeTopicId, setActiveTopicId] = useState<string>('indonesia-heritage');
  const [items, setItems] = useState<CommonsMediaItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isLatestUploads, setIsLatestUploads] = useState<boolean>(false);
  // Mode Live Feed: tampilkan unggahan terbaru tanpa kata kunci
  const [liveFeed, setLiveFeed] = useState<boolean>(false);
  const [userMode, setUserMode] = useState<boolean>(false);
  const userModeRef = useRef<boolean>(false);
  userModeRef.current = userMode;
  const liveFeedRef = useRef<boolean>(false);
  liveFeedRef.current = liveFeed;
  const [randomMode, setRandomMode] = useState<boolean>(false);
  const randomRef = useRef<boolean>(false);
  randomRef.current = randomMode;
  // Penjaga respons usang: hanya permintaan terbaru yang boleh mengubah hasil
  const requestIdRef = useRef<number>(0);

  // Pagination states
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalHits, setTotalHits] = useState<number | undefined>(undefined);
  const [hasNextPage, setHasNextPage] = useState<boolean>(true);

  // Cache continuation tokens for page numbers (crucial for Wikimedia Commons allimages API)
  const pageTokensRef = useRef<{ [page: number]: string }>({});

  // Favorites / Saved bookmarks
  const [savedItems, setSavedItems] = useState<CommonsMediaItem[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(SAVED_ITEMS_KEY);
        return stored ? JSON.parse(stored) : [];
      } catch {
        return [];
      }
    }
    return [];
  });
  const [showSavedOnly, setShowSavedOnly] = useState<boolean>(false);

  // View style: 'masonry' (Pinterest style) | 'grid'
  const [viewLayout, setViewLayout] = useState<'masonry' | 'grid'>('masonry');

  const fetchPage = useCallback(
    async (currentFilter: GalleryFilterState, pageNumber: number) => {
      const reqId = ++requestIdRef.current;
      if (pageNumber === 1) pageTokensRef.current = {};
      setIsLoading(true);
      setError(null);

      if (!liveFeedRef.current && !randomRef.current && !currentFilter.query.trim()) {
        // Field pencarian kosong -> tampil kosong
        setItems([]);
        setIsLatestUploads(false);
        setHasNextPage(false);
        setTotalHits(0);
        setIsLoading(false);
        return;
      }
      const effectiveFilter = liveFeedRef.current
        ? { ...currentFilter, query: '', username: undefined, mediaType: 'all' as const, license: 'all' as const }
        : userModeRef.current
          ? { ...currentFilter, query: '', username: currentFilter.query.trim(), mediaType: 'all' as const }
          : currentFilter;

      try {
        const offset = (pageNumber - 1) * ITEMS_PER_PAGE;
        const continueToken = pageNumber > 1 ? pageTokensRef.current[pageNumber] : undefined;
        const res = randomRef.current ? await fetchRandomCommonsMedia(ITEMS_PER_PAGE) : await searchCommonsMedia(effectiveFilter, offset, ITEMS_PER_PAGE, continueToken);
        if (reqId !== requestIdRef.current) return;

        setItems(res.items);
        setIsLatestUploads(Boolean(res.isLatestUploads));
        setHasNextPage(
          Boolean(res.continueToken) ||
            res.nextOffset !== null ||
            (res.totalHits ? offset + ITEMS_PER_PAGE < res.totalHits : false)
        );
        if (res.continueToken) {
          pageTokensRef.current[pageNumber + 1] = res.continueToken;
        }
        setTotalHits(res.totalHits);
      } catch (err) {
        console.error('Gallery fetch error:', err);
        if (reqId !== requestIdRef.current) return;
        setError(err instanceof Error ? err.message : 'Gagal memuat media dari Wikimedia Commons.');
      } finally {
        if (reqId === requestIdRef.current) setIsLoading(false);
      }
    },
    []
  );

  // When filters change, reset page tokens, reset to page 1 and fetch
  useEffect(() => {
    pageTokensRef.current = {};
    setCurrentPage(1);
    fetchPage(filter, 1);
  }, [filter.query, filter.mediaType, filter.license, filter.sort, liveFeed, userMode, randomMode]);

  const goToPage = useCallback(
    (page: number) => {
      const targetPage = Math.max(1, page);
      setCurrentPage(targetPage);
      fetchPage(filter, targetPage);

      // Scroll smoothly to gallery section
      const galleryElem = document.getElementById('gallery-content');
      if (galleryElem) {
        galleryElem.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        window.scrollTo({ top: 350, behavior: 'smooth' });
      }
    },
    [fetchPage, filter]
  );

  const nextPage = useCallback(() => {
    goToPage(currentPage + 1);
  }, [goToPage, currentPage]);

  const prevPage = useCallback(() => {
    if (currentPage > 1) {
      goToPage(currentPage - 1);
    }
  }, [goToPage, currentPage]);

  const setQuery = useCallback((query: string) => {
    setActiveTopicId('');
    setShowSavedOnly(false);
    setFilter((prev) => ({ ...prev, query }));
  }, []);

  const setMediaType = useCallback((mediaType: MediaType) => {
    setFilter((prev) => ({ ...prev, mediaType }));
  }, []);

  const setLicense = useCallback((license: LicenseCategory) => {
    setFilter((prev) => ({ ...prev, license }));
  }, []);

  const setSort = useCallback((sort: SortOrder) => {
    setFilter((prev) => ({ ...prev, sort }));
  }, []);

  const setTopic = useCallback((topicId: string) => {
    const topic = CURATED_TOPICS.find((t) => t.id === topicId);
    if (topic) {
      setActiveTopicId(topicId);
      setShowSavedOnly(false);
      setFilter((prev) => ({
        ...prev,
        query: topic.query,
        mediaType: topic.mediaType,
      }));
    }
  }, []);

  const refresh = useCallback(() => {
    fetchPage(filter, currentPage);
  }, [fetchPage, filter, currentPage]);

  // Save / Bookmark item
  const toggleSaveItem = useCallback((item: CommonsMediaItem) => {
    setSavedItems((prev) => {
      const exists = prev.some((i) => i.id === item.id);
      let updated: CommonsMediaItem[];
      if (exists) {
        updated = prev.filter((i) => i.id !== item.id);
      } else {
        updated = [item, ...prev];
      }
      try {
        localStorage.setItem(SAVED_ITEMS_KEY, JSON.stringify(updated));
      } catch {
        // quota exceeded fallback
      }
      return updated;
    });
  }, []);

  const isItemSaved = useCallback(
    (id: number) => {
      return savedItems.some((i) => i.id === id);
    },
    [savedItems]
  );

  const knownTokenPages = Object.keys(pageTokensRef.current)
    .map((k) => Number(k))
    .filter((n) => !isNaN(n) && n > 0);
  const maxKnownPage = Math.max(currentPage, ...knownTokenPages, 1);

  const totalPages = totalHits
    ? Math.min(Math.ceil(totalHits / ITEMS_PER_PAGE), 50)
    : hasNextPage
    ? Math.max(currentPage + 1, maxKnownPage)
    : maxKnownPage;

  // Active items: show saved items if toggle is active, else search items
  const displayedItems = showSavedOnly ? savedItems : items;

  return {
    filter,
    activeTopicId,
    items: displayedItems,
    isLoading: showSavedOnly ? false : isLoading,
    isLatestUploads,
    error,
    currentPage,
    totalPages,
    totalHits: showSavedOnly ? savedItems.length : totalHits,
    hasNextPage,
    hasPrevPage: currentPage > 1,
    itemsPerPage: ITEMS_PER_PAGE,
    viewLayout,
    savedCount: savedItems.length,
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
    liveFeed,
    randomMode,
    setRandomMode,
    setLiveFeed,
    userMode,
    setUserMode,
    refresh,
  };
}

// ===== Bookmark daftar username & kategori (disimpan di localStorage) =====
const BM_USERS_KEY = 'wikigaleri_saved_users';
const BM_CATS_KEY = 'wikigaleri_saved_categories';

function loadBmList(key: string): string[] {
  try {
    const s = localStorage.getItem(key);
    const a = s ? JSON.parse(s) : [];
    return Array.isArray(a) ? a.filter((x: unknown) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function saveBmList(key: string, v: string[]) {
  try {
    localStorage.setItem(key, JSON.stringify(v));
  } catch {
    // abaikan jika storage penuh / tidak tersedia
  }
}

export function useBookmarkLists() {
  const [savedUsers, setSavedUsers] = useState<string[]>(() => loadBmList(BM_USERS_KEY));
  const [savedCategories, setSavedCategories] = useState<string[]>(() => loadBmList(BM_CATS_KEY));

  const toggleUser = useCallback((u: string) => {
    const name = u.trim();
    if (!name) return;
    setSavedUsers((prev) => {
      const next = prev.includes(name) ? prev.filter((x) => x !== name) : [name, ...prev];
      saveBmList(BM_USERS_KEY, next);
      return next;
    });
  }, []);

  const toggleCategory = useCallback((c: string) => {
    const name = c.trim();
    if (!name) return;
    setSavedCategories((prev) => {
      const next = prev.includes(name) ? prev.filter((x) => x !== name) : [name, ...prev];
      saveBmList(BM_CATS_KEY, next);
      return next;
    });
  }, []);

  const isUserSaved = useCallback((u: string) => savedUsers.includes(u.trim()), [savedUsers]);
  const isCategorySaved = useCallback((c: string) => savedCategories.includes(c.trim()), [savedCategories]);

  return { savedUsers, savedCategories, toggleUser, toggleCategory, isUserSaved, isCategorySaved };
}
