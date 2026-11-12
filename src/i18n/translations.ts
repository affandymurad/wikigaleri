export type Language = 'en' | 'id';

export interface Translations {
  nav: {
    brand: string;
    gallery: string;
    licenseGuide: string;
    wikimediaTerms: string;
    toggleDark: string;
    toggleLight: string;
    language: string;
  };
  hero: {
    title: string;
    subtitle: string;
  };
  search: {
    placeholder: string;
    homePlaceholder: (example: string) => string;
    categoryPlaceholder: string;
    searchBtn: string;
  };
  tabs: {
    keywords: string;
    nearby: string;
    categories: string;
    live: string;
  };
  categoryModes: {
    media: string;
    subcategories: string;
    parentCategories: string;
    subcatTitle: (category: string) => string;
    parentTitle: (category: string) => string;
    noSubcats: string;
    noParents: string;
    searchThisCategory: string;
    viewMedia: string;
    exploreSubcats: string;
    filesCount: (count: number) => string;
    subcatsCount: (count: number) => string;
    loadingCategories: string;
    parentHint: string;
    subcatHint: string;
    filterPlaceholder: string;
    totalFound: (count: number) => string;
    currentCategoryLabel: string;
    emptyHint: string;
  };
  curated: {
    title: string;
    countLabel: string;
    show: string;
    hide: string;
    groups: Record<string, string>;
    topics: Record<
      string,
      {
        label: string;
        description: string;
        typeLabel: string;
      }
    >;
  };

  nearby: {
    title: string;
    subtitle: string;
    locationBtn: string;
    findCommonsBtn: string;
    locating: string;
    searching: string;
    locationError: string;
    noPhotosFound: string;
    foundPhotos: (count: number) => string;
    viewInModal: string;
    dismiss: string;
    clusterCount: (count: number) => string;
    radiusHint: string;
    coordinates: string;
    author: string;
    license: string;
    ipLocationFallbackNotice: (city?: string) => string;
    clickMapHint: string;
    previewTitle: string;
    previewRange: (start: number, end: number, total: number) => string;
    previewPrev: string;
    previewNext: string;
    sideEmptyHint: string;
    areaCatBtn: string;
    areaCatTitle: string;
    areaCatNote: string;
    areaCatLoading: string;
    areaCatEmpty: string;
    areaCatError: string;
    areaCatRetry: string;
    areaCatTooWide: (maxKm: number) => string;
    areaCatPhotos: (count: number) => string;
    areaCatBasedOn: (files: number) => string;
    areaCatTruncated: string;
    areaCatWikidataFailed: string;
    areaCatWikidataSkipped: string;
    areaCatSearchIn: string;
    areaCatRange: (start: number, end: number, total: number) => string;
    tabPhotos: string;
    tabCategories: string;
    tabNoPhoto: string;
    noPhotoTitle: string;
    noPhotoNote: string;
    noPhotoEmpty: string;
    noPhotoSkipped: string;
    noPhotoRange: (start: number, end: number, total: number) => string;
    noPhotoOpen: string;
    noPhotoCardHint: string;
  };
  filters: {
    allMedia: string;
    photos: string;
    audio: string;
    video: string;
    document: string;
    model3d: string;
    panorama360: string;
    pd: string;
    cc_by: string;
    cc_by_sa: string;
    gfdl: string;
    sortRelevance: string;
    sortNewest: string;
    resetFilters: string;
    mediaLabel: string;
    licenseLabel: string;
    namespaceLabel: string;
  };
  gallery: {
    catalog: string;
    savedCollection: string;
    itemsCount: (start: number, end: number, total?: number) => string;
    savedCount: (count: number) => string;
    savedBtn: string;
    masonryView: string;
    gridView: string;
    previous: string;
    next: string;
    jumpTo: string;
    emptyTitle: string;
    emptyDesc: string;
    emptySavedTitle: string;
    emptySavedDesc: string;
    backToAll: string;
    reloadSelection: string;
    retryBtn: string;
    errorTitle: string;
    latestUploads: string;
    latestUploadsSubtitle: string;
  };
  card: {
    download: string;
    save: string;
    saved: string;
    copyAttribution: string;
    copied: string;
    zoom: string;
    audioCard: string;
    documentCard: string;
    videoCard: string;
    model3dCard: string;
    panorama360: string;
    panoramaWide: string;
    openDetails: string;
  };
  modal: {
    downloadTab: string;
    licenseTab: string;
    downloadTitle: string;
    downloadOriginal: string;
    copyDirectLink: string;
    copied: string;
    commonsPage: string;
    sourceInfo: string;
    creator: string;
    createdDate: string;
    fileExtension: string;
    description: string;
    coordinates: string;
    legalDeed: string;
    termsTitle: string;
    commercialAllowed: string;
    commercialDesc: string;
    remixAllowed: string;
    remixDesc: string;
    attributionRule: string;
    attributionDesc: string;
    shareAlikeRule: string;
    shareAlikeDesc: string;
    taslTitle: string;
    copyAttributionBtn: string;
    prevTooltip: string;
    nextTooltip: string;
  };
  guideModal: {
    title: string;
    subtitle: string;
    section1Title: string;
    pdTitle: string;
    pdDesc: string;
    ccbyTitle: string;
    ccbyDesc: string;
    ccbysaTitle: string;
    ccbysaDesc: string;
    gfdlTitle: string;
    gfdlDesc: string;
    taslTitle: string;
    taslDesc: string;
    taslItems: string[];
    docsLink: string;
    closeBtn: string;
  };
  attributionModal: {
    title: string;
    subtitle: string;
    chooseFormat: string;
    openDeed: (license: string) => string;
    close: string;
    copyBtn: string;
    copiedBtn: string;
  };
  footer: {
    tagline: string;
    attributionGuide: string;
    commonsLink: string;
  };
}

export const translations: Record<Language, Translations> = {
  en: {
    nav: {
      brand: 'WikiGaleri',
      gallery: 'Open Gallery',
      licenseGuide: 'CC License Guide',
      wikimediaTerms: 'Wikimedia Terms',
      toggleDark: 'Switch to Dark Mode',
      toggleLight: 'Switch to Light Mode',
      language: 'Language',
    },
    hero: {
      title: 'Wikimedia Commons Multimedia Gallery',
      subtitle:
        'Search the open media on Wikimedia Commons, narrow it down by media type, check the license of each file, and download files with the credit line already written for you.',
    },
    search: {
      placeholder: 'Search photos, audio, videos, or old documents...',
      homePlaceholder: (example: string) => `Try “${example}”, or search photos, audio, videos, and old documents…`,
      categoryPlaceholder: 'Category, e.g. Batik, Temples, Traditional dance',
      searchBtn: 'Search',
    },
    tabs: {
      keywords: 'Keywords',
      nearby: 'Nearby',
      categories: 'Categories',
      live: 'Live Feed',
    },
    categoryModes: {
      media: 'Media',
      subcategories: 'Subcategories',
      parentCategories: 'Parent Categories',
      subcatTitle: (cat: string) => `Subcategories of ${cat}`,
      parentTitle: (cat: string) => `Parent Categories of ${cat}`,
      noSubcats: 'No direct subcategories found for this category.',
      noParents: 'No parent categories found for this category.',
      searchThisCategory: 'Search this Category',
      viewMedia: 'View Media',
      exploreSubcats: 'Explore Subcategories',
      filesCount: (count: number) => `${count.toLocaleString()} files`,
      subcatsCount: (count: number) => `${count.toLocaleString()} subcategories`,
      loadingCategories: 'Loading categories from Wikimedia Commons...',
      parentHint: 'Broader categories that include this one.',
      subcatHint: 'Narrower categories inside this one. Click one to search it.',
      filterPlaceholder: 'Filter list by name...',
      totalFound: (count: number) => `${count} categories found`,
      currentCategoryLabel: 'Category',
      emptyHint: 'Type a category name above or pick one from Curated Collections.',
    },
    curated: {
      title: 'Curated Collection Boards',
      countLabel: '37 Curated Collections',
      show: 'Show',
      hide: 'Hide',
      groups: {
        all: 'All Collections',
        media_type: 'Media Formats',
        culture: 'Culture & Nusantara',
        nature_science: 'Nature & Science',
        history: 'World History',
        geography: 'Geography & Places',
        arts: 'Fine Arts & Design',
      },
      topics: {
        // 1. Media Formats
        photographs: {
          label: 'Photos & Photography',
          description: 'Historical and modern photographs.',
          typeLabel: 'Photography',
        },
        'vintage-posters': {
          label: 'Posters & Illustrations',
          description: 'Prints, lithographs, and classic illustrations.',
          typeLabel: 'Graphic Art',
        },
        'classical-audio': {
          label: 'Audio & Classical Music',
          description: 'Classical recordings, instruments, and natural sounds.',
          typeLabel: 'Audio Archive',
        },
        'historic-video': {
          label: 'Historical Video Archives',
          description: 'Archive footage, science films, and nature documentaries.',
          typeLabel: 'Video Archives',
        },
        'manuscripts-docs': {
          label: 'Ancient Manuscripts & Texts',
          description: 'Handwritten manuscripts, old treaties, and charters.',
          typeLabel: 'Manuscripts',
        },
        'historical-maps': {
          label: 'Historic Maps & Cartography',
          description: 'Old maps from the 16th to 19th century, in the public domain.',
          typeLabel: 'Cartography',
        },
        'visa-policy-maps': {
          label: 'Visa Policy Maps',
          description: 'Visa policy maps by country, used on Wikipedia and Wikivoyage.',
          typeLabel: 'Maps',
        },
        'diagrams-science': {
          label: 'Diagrams & Infographics',
          description: 'Technical diagrams, anatomy charts, and science illustrations.',
          typeLabel: 'Diagrams',
        },

        // 2. Culture & Nusantara
        'indonesia-heritage': {
          label: 'Culture',
          description: 'Local heritage, traditions, historic sites, and folklore of the archipelago.',
          typeLabel: 'Indonesian Heritage',
        },
        'batik-textiles': {
          label: 'Batik & Traditional Textiles',
          description: 'Indonesian batik, woven ikat, and traditional textiles.',
          typeLabel: 'Textile Art',
        },
        'wayang-puppet': {
          label: 'Wayang & Traditional Theater',
          description: 'Shadow puppets, wayang golek, and stage performance.',
          typeLabel: 'Puppetry & Theater',
        },
        'candi-heritage': {
          label: 'Temples & Archaeology',
          description: 'Temples, stone reliefs, and archaeological sites.',
          typeLabel: 'Archaeology',
        },
        'traditional-arch-id': {
          label: 'Traditional Vernacular Houses',
          description: 'Traditional houses from across Indonesia.',
          typeLabel: 'Architecture',
        },
        'indonesian-heroes': {
          label: 'National Heroes & Figures',
          description: 'Portraits and records of national heroes.',
          typeLabel: 'Biographical Archives',
        },
        'indonesian-cuisine': {
          label: 'Traditional Cuisine & Spices',
          description: 'Street food, spices, and traditional cooking.',
          typeLabel: 'Culinary Heritage',
        },

        // 3. Nature & Science
        astronomy: {
          label: 'Astronomy & Cosmos',
          description: 'Deep space images from space telescopes.',
          typeLabel: 'Astrophysics',
        },
        wildlife: {
          label: 'Wildlife & Biodiversity',
          description: 'Wildlife and biodiversity from around the world.',
          typeLabel: 'Fauna',
        },
        'botany-flora': {
          label: 'Flora & Botanical Art',
          description: 'Classic botanical illustrations and plant diversity.',
          typeLabel: 'Botany',
        },
        'marine-life': {
          label: 'Marine Life & Oceans',
          description: 'Underwater life, coral reefs, and ocean animals.',
          typeLabel: 'Marine Biology',
        },
        'volcanoes-geology': {
          label: 'Volcanoes & Earth Geology',
          description: 'Volcanoes, calderas, and rock layers.',
          typeLabel: 'Geology',
        },
        microscopy: {
          label: 'Microscopy & Cell Biology',
          description: 'Cells, microorganisms, and microscope images.',
          typeLabel: 'Microbiology',
        },
        'weather-phenomena': {
          label: 'Meteorology & Weather',
          description: 'Auroras, lightning, storms, and other weather events.',
          typeLabel: 'Atmosphere',
        },

        // 4. World History
        'ancient-egypt': {
          label: 'Ancient Egypt & Hieroglyphs',
          description: 'Pyramids, hieroglyphs, and artifacts from ancient Egypt.',
          typeLabel: 'Egyptology',
        },
        'classical-antiquity': {
          label: 'Classical Greece & Rome',
          description: 'Marble ruins, amphitheaters, and ancient Greece and Rome.',
          typeLabel: 'Classical Era',
        },
        'renaissance-era': {
          label: 'European Renaissance',
          description: 'Art, frescoes, and inventions from the Renaissance.',
          typeLabel: 'Renaissance',
        },
        'world-wars': {
          label: 'World Wars Photography',
          description: 'Photos and documents from World War I and II.',
          typeLabel: 'Military History',
        },
        'illuminated-manuscripts': {
          label: 'Illuminated Manuscripts',
          description: 'Medieval manuscripts with gold-leaf decoration.',
          typeLabel: 'Medieval Art',
        },
        'maritime-history': {
          label: 'Maritime & Age of Sail',
          description: 'Tall ships, sea charts, and famous voyages.',
          typeLabel: 'Naval History',
        },

        // 5. Geography & Places
        'unesco-heritage': {
          label: 'UNESCO World Heritage',
          description: 'World Heritage sites and protected cultural landmarks.',
          typeLabel: 'UNESCO Landmarks',
        },
        'castles-palaces': {
          label: 'Castles & Historic Palaces',
          description: 'Medieval fortresses, royal palaces, and castles.',
          typeLabel: 'Fortifications',
        },
        'mountains-alpine': {
          label: 'Mountains & Alpine Glaciers',
          description: 'Mountain peaks, ranges, and alpine valleys.',
          typeLabel: 'Mountains',
        },
        'historic-towns': {
          label: 'Historic Towns & Old Quarters',
          description: 'Old town centers, cobblestone streets, and historic quarters.',
          typeLabel: 'Urban History',
        },
        'historic-bridges': {
          label: 'Bridges & Ancient Aqueducts',
          description: 'Stone bridges, Roman aqueducts, and old engineering works.',
          typeLabel: 'Civil Engineering',
        },

        // 6. Fine Arts & Design
        'masterpiece-paintings': {
          label: 'Masterpiece Paintings',
          description: 'Famous oil paintings and fine art from museums.',
          typeLabel: 'Oil Paintings',
        },
        'sculptures-statues': {
          label: 'Sculptures & Classical Statues',
          description: 'Marble carvings, bronze casts, and monument reliefs.',
          typeLabel: 'Sculptures',
        },
        'calligraphy-arts': {
          label: 'Calligraphy & Lettering Arts',
          description: 'Decorative lettering, including Arabic and East Asian calligraphy.',
          typeLabel: 'Calligraphy',
        },
        'drawings-sketches': {
          label: 'Drawings & Etchings',
          description: 'Architectural drawings, pen-and-ink sketches, and prints.',
          typeLabel: 'Drawings',
        },
      },
    },

    nearby: {
      title: 'Nearby Photos',
      subtitle: 'Find geotagged Wikimedia Commons photos near you or anywhere on the map.',
      locationBtn: 'My Location',
      findCommonsBtn: 'Find Nearby Commons',
      locating: 'Locating GPS...',
      searching: 'Searching Wikimedia...',
      locationError: 'Could not get your location. Allow location access in your browser and try again.',
      noPhotosFound: 'No geotagged files here. Try moving the map or searching another place.',
      foundPhotos: (count: number) => `Found ${count} nearby photos`,
      viewInModal: 'View Details',
      dismiss: 'Dismiss',
      clusterCount: (count: number) => `${count} photos in this cluster`,
      radiusHint: 'Searching the visible map area (up to ~3 km radius from the map center)',
      coordinates: 'Coordinates',
      author: 'Author',
      license: 'License',
      ipLocationFallbackNotice: (city?: string) =>
        `GPS permission restricted by browser/iframe. Switched to network approximate location${city ? ` (${city})` : ''}.`,
      clickMapHint: 'Click the map to set a location',
      previewTitle: 'Quick Photo Previews (click to open)',
      previewRange: (start: number, end: number, total: number) => `Showing ${start}–${end} of ${total} files`,
      previewPrev: 'Previous',
      previewNext: 'Next',
      sideEmptyHint: 'Click "Find Nearby Commons" to search this map area. Photos, categories, and Wikidata places without a photo will appear here.',
      areaCatBtn: 'Find categories in this area',
      areaCatTitle: 'Categories in this area',
      areaCatNote: 'Categories are inferred from geotagged photos in this area, not from category coordinates.',
      areaCatLoading: 'Collecting categories…',
      areaCatEmpty: 'No categories found for this area. Try zooming out a little or moving the map.',
      areaCatError: 'Could not load categories. Check your connection and try again.',
      areaCatRetry: 'Try again',
      areaCatTooWide: (maxKm: number) => `This area is too wide. Zoom in until the map is under about ${maxKm} km across.`,
      areaCatPhotos: (count: number) => `${count} ${count === 1 ? 'photo' : 'photos'}`,
      areaCatBasedOn: (files: number) => `Based on ${files} geotagged files`,
      areaCatTruncated: 'The area has more files than can be loaded, so counts are partial. Zoom in for fuller results.',
      areaCatWikidataFailed: 'Wikidata could not be loaded (timeout or error), showing photo results only.',
      areaCatSearchIn: 'Search in category',
      areaCatRange: (start: number, end: number, total: number) => `Showing ${start}–${end} of ${total} categories`,
      tabPhotos: 'Photos',
      tabCategories: 'Categories',
      tabNoPhoto: 'Wikidata without photo',
      noPhotoTitle: 'Places on Wikidata without a photo (P18)',
      noPhotoNote: 'Wikidata items with coordinates in this area that have no image (P18). Good candidates for new photos.',
      noPhotoEmpty: 'No Wikidata items without a photo were found in this area.',
      noPhotoSkipped: 'Wikidata is only checked for small areas; zoom in to see items without a photo.',
      noPhotoRange: (start: number, end: number, total: number) => `Showing ${start}–${end} of ${total} items`,
      noPhotoOpen: 'Open in Wikidata',
      noPhotoCardHint: 'This item has coordinates but no image (P18) on Wikidata. A good place for a new photo.',
      areaCatWikidataSkipped: 'Wikidata is only checked for small areas; zoom in to include it.',
    },
    filters: {
      allMedia: 'All Media',
      photos: 'Photos & Art',
      audio: 'Audio & Music',
      video: 'Archive Video',
      document: 'Documents & Texts',
      model3d: '3D Models',
      panorama360: '360° Panoramas',
      pd: 'Public Domain & CC0 (No Restrictions)',
      cc_by: 'CC BY (Attribution Required)',
      cc_by_sa: 'CC BY-SA (Attribution & ShareAlike)',
      gfdl: 'GNU FDL & Documentation Licenses',
      sortRelevance: 'Sort: Relevance',
      sortNewest: 'Sort: Newest',
      resetFilters: 'Reset Filters',
      mediaLabel: 'Media',
      licenseLabel: 'License',
      namespaceLabel: 'Wikimedia Commons Namespace 6',
    },
    gallery: {
      catalog: 'Media Catalog',
      savedCollection: 'My Saved Collection',
      itemsCount: (start, end, total) =>
        total !== undefined
          ? `Items ${start.toLocaleString()}–${end.toLocaleString()} of ${total.toLocaleString()}`
          : `${start}–${end} items`,
      savedCount: (count) => `${count} saved items`,
      savedBtn: 'Saved',
      masonryView: 'Pinterest Masonry Column View',
      gridView: 'Standard Grid View',
      previous: 'Previous',
      next: 'Next',
      jumpTo: 'Go to:',
      emptyTitle: 'No matching media found',
      emptyDesc: 'Try a broader search term or pick one of the collections above.',
      emptySavedTitle: 'No saved media yet',
      emptySavedDesc: 'Click the bookmark icon on a card to save it here.',
      backToAll: 'Back to All Collections',
      reloadSelection: 'Reload Featured Collection',
      retryBtn: 'Retry Loading',
      errorTitle: 'Failed to Load Wikimedia Media',
      latestUploads: 'Latest Wikimedia Commons Uploads',
      latestUploadsSubtitle: 'Files just uploaded to Wikimedia Commons',
    },
    card: {
      download: 'Download',
      save: 'Save',
      saved: 'Saved',
      copyAttribution: 'Copy Attribution',
      copied: 'Copied!',
      zoom: 'Zoom Preview',
      audioCard: 'Open Audio Recording',
      documentCard: 'PDF Document',
      videoCard: 'Video Archive',
      model3dCard: '3D Model',
      panorama360: '360° Panorama',
      panoramaWide: 'Panorama',
      openDetails: 'Open Details & Attribution',
    },
    modal: {
      downloadTab: 'Download & Info',
      licenseTab: 'CC Attribution',
      downloadTitle: 'File Download Options',
      downloadOriginal: 'Download Original Resolution',
      copyDirectLink: 'Copy Direct URL',
      copied: 'Copied',
      commonsPage: 'Commons Page',
      sourceInfo: 'Media Source Information',
      creator: 'Creator / Contributor:',
      createdDate: 'Date Created:',
      fileExtension: 'File Extension:',
      description: 'Archive Description:',
      coordinates: 'Geographic Coordinates:',
      legalDeed: 'Legal Deed',
      termsTitle: 'Legal Terms of Use',
      commercialAllowed: '✓ Commercial Use',
      commercialDesc: 'Allowed for projects & business',
      remixAllowed: '✓ Remix & Adaptation',
      remixDesc: 'Allowed to modify or crop',
      attributionRule: 'Attribution Required',
      attributionDesc: 'Must credit original author',
      shareAlikeRule: 'ShareAlike Clause',
      shareAlikeDesc: 'Derivatives must use same license',
      taslTitle: 'Attribution Citation Generator (TASL)',
      copyAttributionBtn: 'Copy Citation',
      prevTooltip: 'Previous File (Left Arrow)',
      nextTooltip: 'Next File (Right Arrow)',
    },
    guideModal: {
      title: 'CC License Guide',
      subtitle: 'What each license lets you do with a file',
      section1Title: 'The main licenses on Commons',
      pdTitle: '1. Public Domain and CC0',
      pdDesc:
        'No one holds the rights, or the creator has given them up. You can use the file for anything, and you do not have to credit anyone (though crediting is still polite).',
      ccbyTitle: '2. CC BY (credit required)',
      ccbyDesc:
        'You can copy, share, and edit the file, including for commercial use, as long as you credit the creator.',
      ccbysaTitle: '3. CC BY-SA (credit, share alike)',
      ccbysaDesc:
        'The most common license on Wikimedia. Same as CC BY, with one extra rule: if you edit the file or build on it, you must share your version under the same or a compatible license.',
      gfdlTitle: '4. GFDL (GNU Free Documentation License)',
      gfdlDesc:
        'An older license for documentation. If you reuse the file, you must include the full license text and the version history.',
      taslTitle: 'How to write a credit: TASL',
      taslDesc: 'Creative Commons suggests the TASL format:',
      taslItems: [
        'Title: the name of the work.',
        'Author: who made it.',
        'Source: a link to the file page on Wikimedia Commons.',
        'License: the license name, linked to its official page.',
      ],
      docsLink: 'Wikimedia Commons guide to reusing content',
      closeBtn: 'Got it',
    },
    attributionModal: {
      title: 'Copy CC License Attribution',
      subtitle: 'How to credit the creator using the TASL format',
      chooseFormat: 'Select Attribution Format:',
      openDeed: (license: string) => `Open License Deed (${license})`,
      close: 'Close',
      copyBtn: 'Copy Attribution',
      copiedBtn: 'Copied to Clipboard!',
    },
    footer: {
      tagline: 'Built on Wikimedia Commons and Creative Commons licenses',
      attributionGuide: 'TASL Attribution Guide',
      commonsLink: 'Wikimedia Commons',
    },
  },

  id: {
    nav: {
      brand: 'WikiGaleri',
      gallery: 'Galeri Terbuka',
      licenseGuide: 'Panduan Lisensi CC',
      wikimediaTerms: 'Ketentuan Wikimedia',
      toggleDark: 'Ganti ke Mode Gelap',
      toggleLight: 'Ganti ke Mode Terang',
      language: 'Bahasa',
    },
    hero: {
      title: 'Galeri Multimedia Wikimedia Commons',
      subtitle:
        'Cari media terbuka di Wikimedia Commons, saring menurut jenis media, lihat lisensi tiap berkas, lalu unduh berkas lengkap dengan teks kreditnya.',
    },
    search: {
      placeholder: 'Cari foto, audio, video, atau dokumen lama...',
      homePlaceholder: (example: string) => `Coba “${example}”, atau cari foto, audio, video, dan dokumen lama…`,
      categoryPlaceholder: 'Kategori, misalnya Batik, Candi, Tari tradisional',
      searchBtn: 'Cari',
    },
    tabs: {
      keywords: 'Kata Kunci',
      nearby: 'Terdekat',
      categories: 'Kategori',
      live: 'Live Feed',
    },
    categoryModes: {
      media: 'Media',
      subcategories: 'Subkategori',
      parentCategories: 'Kategori Induk',
      subcatTitle: (cat: string) => `Subkategori dari ${cat}`,
      parentTitle: (cat: string) => `Kategori Induk dari ${cat}`,
      noSubcats: 'Tidak ada subkategori langsung ditemukan untuk kategori ini.',
      noParents: 'Tidak ada kategori induk langsung ditemukan untuk kategori ini.',
      searchThisCategory: 'Cari Kategori Ini',
      viewMedia: 'Lihat Media',
      exploreSubcats: 'Jelajahi Subkategori',
      filesCount: (count: number) => `${count.toLocaleString()} berkas`,
      subcatsCount: (count: number) => `${count.toLocaleString()} subkategori`,
      loadingCategories: 'Memuat kategori dari Wikimedia Commons...',
      parentHint: 'Kategori yang lebih luas dan memuat kategori ini.',
      subcatHint: 'Kategori yang lebih sempit di dalam kategori ini. Klik salah satunya untuk mencarinya.',
      filterPlaceholder: 'Saring daftar berdasarkan nama...',
      totalFound: (count: number) => `${count} kategori ditemukan`,
      currentCategoryLabel: 'Kategori',
      emptyHint: 'Ketik nama kategori di atas atau pilih dari Koleksi Kurasi.',
    },
    curated: {
      title: 'Papan Koleksi Kurasi',
      countLabel: '37 Koleksi Pilihan',
      show: 'Tampilkan',
      hide: 'Sembunyikan',
      groups: {
        all: 'Semua Koleksi',
        media_type: 'Format Media',
        culture: 'Budaya & Nusantara',
        nature_science: 'Alam & Sains',
        history: 'Sejarah Dunia',
        geography: 'Geografi & Tempat',
        arts: 'Seni Rupa & Desain',
      },
      topics: {
        // 1. Format Media
        photographs: {
          label: 'Foto & Fotografi',
          description: 'Foto sejarah dan foto masa kini.',
          typeLabel: 'Fotografi',
        },
        'vintage-posters': {
          label: 'Poster & Ilustrasi',
          description: 'Cetakan, litografi, dan ilustrasi klasik.',
          typeLabel: 'Litografi & Seni Grafis',
        },
        'classical-audio': {
          label: 'Audio & Musik Klasik',
          description: 'Rekaman musik klasik, alat musik, dan suara alam.',
          typeLabel: 'Fonoteka & Musik Klasik',
        },
        'historic-video': {
          label: 'Video Arsip Bersejarah',
          description: 'Rekaman arsip, film sains, dan dokumenter alam.',
          typeLabel: 'Rekaman Arsip Video',
        },
        'manuscripts-docs': {
          label: 'Manuskrip & Dokumen Kuno',
          description: 'Naskah tulisan tangan, perjanjian lama, dan piagam.',
          typeLabel: 'Naskah Kuno & PDF',
        },
        'historical-maps': {
          label: 'Peta Kuno & Kartografi',
          description: 'Peta lama abad ke-16 sampai ke-19 yang berstatus domain publik.',
          typeLabel: 'Kartografi Kuno',
        },
        'visa-policy-maps': {
          label: 'Peta Kebijakan Visa',
          description: 'Peta kebijakan visa per negara, dipakai di Wikipedia dan Wikivoyage.',
          typeLabel: 'Peta',
        },
        'diagrams-science': {
          label: 'Diagram & Infografik',
          description: 'Diagram teknis, bagan anatomi, dan ilustrasi sains.',
          typeLabel: 'Diagram Ilmiah',
        },

        // 2. Budaya & Nusantara
        'indonesia-heritage': {
          label: 'Budaya',
          description: 'Warisan lokal, tradisi, situs bersejarah, dan cerita rakyat Nusantara.',
          typeLabel: 'Warisan Lokal & Budaya',
        },
        'batik-textiles': {
          label: 'Batik & Tekstil Nusantara',
          description: 'Batik, tenun ikat, dan kain tradisional Indonesia.',
          typeLabel: 'Seni Tekstil',
        },
        'wayang-puppet': {
          label: 'Wayang & Seni Tradisi',
          description: 'Wayang kulit, wayang golek, dan seni pertunjukan.',
          typeLabel: 'Wayang & Teater',
        },
        'candi-heritage': {
          label: 'Candi & Arkeologi RI',
          description: 'Candi, relief batu, dan situs arkeologi.',
          typeLabel: 'Arkeologi',
        },
        'traditional-arch-id': {
          label: 'Rumah Adat Nusantara',
          description: 'Rumah adat dari berbagai daerah di Indonesia.',
          typeLabel: 'Arsitektur Adat',
        },
        'indonesian-heroes': {
          label: 'Pahlawan & Tokoh Nasional',
          description: 'Potret dan arsip para pahlawan nasional.',
          typeLabel: 'Biografi & Sejarah',
        },
        'indonesian-cuisine': {
          label: 'Kuliner Tradisional',
          description: 'Jajanan, rempah, dan masakan tradisional.',
          typeLabel: 'Warisan Kuliner',
        },

        // 3. Alam & Sains
        astronomy: {
          label: 'Astronomi & Antariksa',
          description: 'Foto luar angkasa dari teleskop antariksa.',
          typeLabel: 'Citra Antariksa HD',
        },
        wildlife: {
          label: 'Satwa Liar & Fauna',
          description: 'Satwa liar dan keanekaragaman hayati dari seluruh dunia.',
          typeLabel: 'Fauna & Alam Bebas',
        },
        'botany-flora': {
          label: 'Flora & Ilustrasi Botani',
          description: 'Ilustrasi botani klasik dan ragam tumbuhan.',
          typeLabel: 'Botani & Flora',
        },
        'marine-life': {
          label: 'Biologi Laut & Bahari',
          description: 'Kehidupan bawah laut, terumbu karang, dan hewan laut.',
          typeLabel: 'Biologi Laut',
        },
        'volcanoes-geology': {
          label: 'Gunung Api & Geologi',
          description: 'Gunung berapi, kaldera, dan lapisan batuan.',
          typeLabel: 'Geologi Bumi',
        },
        microscopy: {
          label: 'Mikroskopi & Seluler',
          description: 'Sel, mikroorganisme, dan foto mikroskop.',
          typeLabel: 'Mikrobiologi',
        },
        'weather-phenomena': {
          label: 'Meteorologi & Cuaca',
          description: 'Aurora, petir, badai, dan fenomena cuaca lain.',
          typeLabel: 'Atmosfer & Cuaca',
        },

        // 4. Sejarah Dunia
        'ancient-egypt': {
          label: 'Mesir Kuno & Hieroglif',
          description: 'Piramida, hieroglif, dan artefak Mesir kuno.',
          typeLabel: 'Peradaban Mesir',
        },
        'classical-antiquity': {
          label: 'Yunani & Romawi Kuno',
          description: 'Reruntuhan marmer, amfiteater, dan peradaban Yunani-Romawi kuno.',
          typeLabel: 'Antikuitas Klasik',
        },
        'renaissance-era': {
          label: 'Renaisans Eropa',
          description: 'Karya seni, lukisan dinding, dan penemuan dari zaman Renaisans.',
          typeLabel: 'Zaman Renaisans',
        },
        'world-wars': {
          label: 'Arsip Perang Dunia',
          description: 'Foto dan dokumen dari Perang Dunia I dan II.',
          typeLabel: 'Arsip Militer',
        },
        'illuminated-manuscripts': {
          label: 'Naskah Beriluminasi',
          description: 'Naskah abad pertengahan dengan hiasan emas.',
          typeLabel: 'Seni Naskah',
        },
        'maritime-history': {
          label: 'Sejarah Maritim Dunia',
          description: 'Kapal layar tinggi, peta laut, dan pelayaran terkenal.',
          typeLabel: 'Sejarah Maritim',
        },

        // 5. Geografi & Tempat
        'unesco-heritage': {
          label: 'Warisan Dunia UNESCO',
          description: 'Situs warisan dunia dan cagar budaya yang dilindungi.',
          typeLabel: 'Cagar Budaya UNESCO',
        },
        'castles-palaces': {
          label: 'Kastil & Istana',
          description: 'Benteng abad pertengahan, istana kerajaan, dan kastil.',
          typeLabel: 'Benteng & Istana',
        },
        'mountains-alpine': {
          label: 'Pegunungan & Lembah',
          description: 'Puncak gunung, pegunungan, dan lembah alpen.',
          typeLabel: 'Lanskap Pegunungan',
        },
        'historic-towns': {
          label: 'Kota Kuno Bersejarah',
          description: 'Pusat kota tua, jalan berbatu, dan kawasan bersejarah.',
          typeLabel: 'Kota Sejarah',
        },
        'historic-bridges': {
          label: 'Jembatan & Akuaduk',
          description: 'Jembatan batu, saluran air Romawi, dan karya rekayasa kuno.',
          typeLabel: 'Rekayasa Bangunan',
        },

        // 6. Seni Rupa & Desain
        'masterpiece-paintings': {
          label: 'Mahakarya Seni Lukis',
          description: 'Lukisan cat minyak terkenal dan seni rupa koleksi museum.',
          typeLabel: 'Lukisan Klasik',
        },
        'sculptures-statues': {
          label: 'Seni Patung & Relief',
          description: 'Pahatan marmer, patung perunggu, dan relief monumen.',
          typeLabel: 'Pahatan & Patung',
        },
        'calligraphy-arts': {
          label: 'Kaligrafi & Tipografi',
          description: 'Seni tulisan hias, termasuk kaligrafi Arab dan Asia Timur.',
          typeLabel: 'Seni Kaligrafi',
        },
        'drawings-sketches': {
          label: 'Sketsa & Gambar Tangan',
          description: 'Gambar arsitektur, sketsa pena, dan cetakan.',
          typeLabel: 'Etsa & Sketsa',
        },
      },
    },

    nearby: {
      title: 'Foto Terdekat (Nearby Photos)',
      subtitle: 'Temukan foto bergeotag di Wikimedia Commons di dekat Anda atau di titik mana pun pada peta.',
      locationBtn: 'Lokasi Saya',
      findCommonsBtn: 'Cari Commons Terdekat',
      locating: 'Mendeteksi GPS...',
      searching: 'Mencari Berkas Commons...',
      locationError: 'Lokasi Anda tidak terbaca. Izinkan akses lokasi di peramban lalu coba lagi.',
      noPhotosFound: 'Tidak ada berkas bergeotag di sini. Coba geser peta atau cari tempat lain.',
      foundPhotos: (count: number) => `Ditemukan ${count} foto di sekitar area`,
      viewInModal: 'Buka Detail Berkas',
      dismiss: 'Tutup Popup',
      clusterCount: (count: number) => `${count} foto di klaster ini`,
      radiusHint: 'Mencari di area peta yang terlihat (sampai radius ~3 km dari titik tengah peta)',
      coordinates: 'Koordinat',
      author: 'Fotografer / Pembuat',
      license: 'Lisensi',
      ipLocationFallbackNotice: (city?: string) =>
        `Izin GPS dibatasi peramban/iframe. Beralih otomatis ke perkiraan lokasi jaringan${city ? ` (${city})` : ''}.`,
      clickMapHint: 'Klik peta untuk menentukan lokasi',
      previewTitle: 'Pratinjau Cepat Foto Terdekat (klik untuk buka)',
      previewRange: (start: number, end: number, total: number) => `Menampilkan ${start}–${end} dari ${total} berkas`,
      previewPrev: 'Sebelumnya',
      previewNext: 'Berikutnya',
      sideEmptyHint: 'Klik "Cari Commons Terdekat" untuk mencari di area peta ini. Foto, kategori, dan tempat Wikidata tanpa foto akan tampil di sini.',
      areaCatBtn: 'Cari kategori di area ini',
      areaCatTitle: 'Kategori di area ini',
      areaCatNote: 'Kategori disimpulkan dari foto bergeotag di area ini, bukan dari koordinat kategori.',
      areaCatLoading: 'Mengumpulkan kategori…',
      areaCatEmpty: 'Tidak ada kategori ditemukan di area ini. Coba perkecil zoom sedikit atau geser peta.',
      areaCatError: 'Kategori tidak dapat dimuat. Periksa koneksi lalu coba lagi.',
      areaCatRetry: 'Coba lagi',
      areaCatTooWide: (maxKm: number) => `Area terlalu luas. Perbesar peta sampai lebarnya kurang dari sekitar ${maxKm} km.`,
      areaCatPhotos: (count: number) => `${count} foto`,
      areaCatBasedOn: (files: number) => `Berdasarkan ${files} berkas bergeotag`,
      areaCatTruncated: 'Berkas di area ini lebih banyak daripada yang bisa dimuat, jadi hitungan tidak lengkap. Perbesar peta untuk hasil yang lebih lengkap.',
      areaCatWikidataFailed: 'Wikidata tidak dapat dimuat (waktu habis atau galat), hanya menampilkan hasil dari foto.',
      areaCatSearchIn: 'Cari di kategori',
      areaCatRange: (start: number, end: number, total: number) => `Menampilkan ${start}–${end} dari ${total} kategori`,
      tabPhotos: 'Foto',
      tabCategories: 'Kategori',
      tabNoPhoto: 'Wikidata tanpa foto',
      noPhotoTitle: 'Tempat di Wikidata tanpa foto (P18)',
      noPhotoNote: 'Item Wikidata bertitik koordinat di area ini yang belum punya gambar (P18). Calon sasaran foto baru.',
      noPhotoEmpty: 'Tidak ada item Wikidata tanpa foto di area ini.',
      noPhotoSkipped: 'Wikidata hanya diperiksa untuk area kecil; perbesar peta untuk melihat item tanpa foto.',
      noPhotoRange: (start: number, end: number, total: number) => `Menampilkan ${start}–${end} dari ${total} item`,
      noPhotoOpen: 'Buka di Wikidata',
      noPhotoCardHint: 'Item ini punya koordinat tetapi belum punya gambar (P18) di Wikidata. Tempat yang cocok untuk foto baru.',
      areaCatWikidataSkipped: 'Wikidata hanya diperiksa untuk area kecil; perbesar peta agar ikut disertakan.',
    },
    filters: {
      allMedia: 'Semua Media',
      photos: 'Foto & Seni',
      audio: 'Audio & Musik',
      video: 'Video Arsip',
      document: 'Dokumen & Naskah',
      model3d: 'Model 3D',
      panorama360: 'Panorama 360°',
      pd: 'Domain Publik & CC0 (Tanpa Syarat)',
      cc_by: 'CC BY (Wajib Atribusi)',
      cc_by_sa: 'CC BY-SA (Atribusi & BerbagiSerupa)',
      gfdl: 'GNU FDL & Lisensi Dokumentasi',
      sortRelevance: 'Urutkan: Relevansi',
      sortNewest: 'Urutkan: Terbaru',
      resetFilters: 'Reset Filter',
      mediaLabel: 'Media',
      licenseLabel: 'Lisensi',
      namespaceLabel: 'Wikimedia Commons Namespace 6',
    },
    gallery: {
      catalog: 'Katalog Media',
      savedCollection: 'Koleksi Tersimpan Saya',
      itemsCount: (start, end, total) =>
        total !== undefined
          ? `Item ${start.toLocaleString()}–${end.toLocaleString()} dari ${total.toLocaleString()}`
          : `${start}–${end} berkas`,
      savedCount: (count) => `${count} berkas disimpan`,
      savedBtn: 'Tersimpan',
      masonryView: 'Tampilan Kolom Masonry Pinterest',
      gridView: 'Tampilan Grid Standar',
      previous: 'Sebelumnya',
      next: 'Berikutnya',
      jumpTo: 'Ke hal:',
      emptyTitle: 'Tidak Ada Berkas yang Cocok',
      emptyDesc: 'Coba kata kunci yang lebih umum atau pilih salah satu koleksi di atas.',
      emptySavedTitle: 'Belum Ada Berkas yang Disimpan',
      emptySavedDesc: 'Klik ikon bookmark pada kartu untuk menyimpannya di sini.',
      backToAll: 'Kembali ke Semua Koleksi',
      reloadSelection: 'Muat Ulang Koleksi Pilihan',
      retryBtn: 'Coba Muat Ulang',
      errorTitle: 'Gagal Memuat Berkas Commons',
      latestUploads: 'Unggahan Terbaru Wikimedia Commons',
      latestUploadsSubtitle: 'Berkas yang baru saja diunggah ke Wikimedia Commons',
    },
    card: {
      download: 'Unduh',
      save: 'Simpan',
      saved: 'Tersimpan',
      copyAttribution: 'Salin Atribusi',
      copied: 'Tersalin!',
      zoom: 'Perbesar & Detail',
      audioCard: 'Koleksi Audio Terbuka',
      documentCard: 'Dokumen PDF',
      videoCard: 'Video Arsip',
      model3dCard: 'Model 3D',
      panorama360: 'Panorama 360°',
      panoramaWide: 'Panorama',
      openDetails: 'Buka Detail & Atribusi',
    },
    modal: {
      downloadTab: 'Unduh & Info',
      licenseTab: 'Atribusi CC',
      downloadTitle: 'Opsi Unduhan Berkas',
      downloadOriginal: 'Unduh Resolusi Asli',
      copyDirectLink: 'Salin Tautan Langsung',
      copied: 'Tersalin',
      commonsPage: 'Halaman Commons',
      sourceInfo: 'Informasi Sumber Media',
      creator: 'Pembuat / Kontributor:',
      createdDate: 'Tanggal Pembuatan:',
      fileExtension: 'Ekstensi Berkas:',
      description: 'Deskripsi Arsip:',
      coordinates: 'Koordinat Geografis:',
      legalDeed: 'Akta Hukum (Legal Deed)',
      termsTitle: 'Ketentuan Hukum Penggunaan',
      commercialAllowed: '✓ Penggunaan Komersial',
      commercialDesc: 'Diizinkan untuk bisnis/proyek',
      remixAllowed: '✓ Modifikasi / Remix',
      remixDesc: 'Boleh diolah atau disunting',
      attributionRule: 'Wajib Atribusi (Kredit)',
      attributionDesc: 'Harus mencantumkan pencipta',
      shareAlikeRule: 'Klausul BerbagiSerupa',
      shareAlikeDesc: 'Karya turunan harus lisensi serupa',
      taslTitle: 'Generator Teks Atribusi (TASL)',
      copyAttributionBtn: 'Salin Atribusi',
      prevTooltip: 'Berkas Sebelumnya (Tombol Panah Kiri)',
      nextTooltip: 'Berkas Berikutnya (Tombol Panah Kanan)',
    },
    guideModal: {
      title: 'Panduan Lisensi CC',
      subtitle: 'Apa yang boleh Anda lakukan dengan berkas, menurut tiap lisensi',
      section1Title: 'Lisensi utama di Commons',
      pdTitle: '1. Domain Publik dan CC0',
      pdDesc:
        'Tidak ada pihak yang memegang haknya, atau pembuatnya sudah melepaskannya. Berkas boleh dipakai untuk apa saja dan tidak wajib mencantumkan kredit (meski mencantumkannya tetap sopan).',
      ccbyTitle: '2. CC BY (wajib kredit)',
      ccbyDesc:
        'Berkas boleh disalin, dibagikan, dan diubah, termasuk untuk komersial, asal Anda mencantumkan kredit pembuatnya.',
      ccbysaTitle: '3. CC BY-SA (wajib kredit, bagikan serupa)',
      ccbysaDesc:
        'Lisensi yang paling umum di Wikimedia. Aturannya sama seperti CC BY, ditambah satu: kalau Anda mengubah berkas atau membuat karya turunan, hasilnya harus dibagikan dengan lisensi yang sama atau yang kompatibel.',
      gfdlTitle: '4. GFDL (GNU Free Documentation License)',
      gfdlDesc:
        'Lisensi lama untuk dokumentasi. Kalau Anda memakai ulang berkas ini, sertakan teks lengkap lisensi dan riwayat versinya.',
      taslTitle: 'Cara menulis kredit: TASL',
      taslDesc: 'Creative Commons menyarankan format TASL:',
      taslItems: [
        'Title (judul): nama karyanya.',
        'Author (pembuat): siapa yang membuatnya.',
        'Source (sumber): tautan ke halaman berkas di Wikimedia Commons.',
        'License (lisensi): nama lisensi, dengan tautan ke halaman resminya.',
      ],
      docsLink: 'Panduan Wikimedia Commons tentang memakai ulang konten',
      closeBtn: 'Mengerti',
    },
    attributionModal: {
      title: 'Salin Atribusi Lisensi CC',
      subtitle: 'Cara mencantumkan kredit pembuat dengan format TASL',
      chooseFormat: 'Pilih Format Atribusi:',
      openDeed: (license: string) => `Buka Ketentuan Lisensi (${license})`,
      close: 'Tutup',
      copyBtn: 'Salin Atribusi',
      copiedBtn: 'Tersalin ke Clipboard!',
    },
    footer: {
      tagline: 'Dibangun di atas Wikimedia Commons dan lisensi Creative Commons',
      attributionGuide: 'Panduan Atribusi TASL',
      commonsLink: 'Wikimedia Commons',
    },
  },
};
