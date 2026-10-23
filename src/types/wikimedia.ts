export type MediaType = 'all' | 'image' | 'audio' | 'video' | 'document' | '3d' | 'panorama';

export type LicenseCategory =
  | 'all'
  | 'pd'        // Public Domain & CC0
  | 'cc_by'     // Creative Commons Attribution
  | 'cc_by_sa'  // Creative Commons Attribution-ShareAlike
  | 'gfdl'      // GNU Free Documentation License
  | 'other';

export type SortOrder = 'relevance' | 'newest';

export interface CommonsExtMetadata {
  DateTime?: { value: string };
  DateTimeOriginal?: { value: string };
  ObjectName?: { value: string };
  ImageDescription?: { value: string };
  Artist?: { value: string };
  Credit?: { value: string };
  LicenseShortName?: { value: string };
  UsageTerms?: { value: string };
  LicenseUrl?: { value: string };
  License?: { value: string };
  AttributionRequired?: { value: string };
  Copyrighted?: { value: string };
  Restrictions?: { value: string };
  Categories?: { value: string };
  GPSLatitude?: { value: string };
  GPSLongitude?: { value: string };
}

export interface CommonsImageInfo {
  url: string;
  descriptionurl: string;
  descriptionshorturl?: string;
  size: number;
  width: number;
  height: number;
  mime: string;
  thumburl?: string;
  thumbwidth?: number;
  thumbheight?: number;
  timestamp?: string;
  extmetadata?: CommonsExtMetadata;
}

export interface CommonsPage {
  pageid: number;
  ns: number;
  title: string;
  index?: number;
  imageinfo?: CommonsImageInfo[];
}

export interface CommonsMediaItem {
  id: number;
  title: string;
  cleanTitle: string;
  pageUrl: string;
  fileUrl: string;
  thumbnailUrl: string;
  mimeType: string;
  mediaType: 'image' | 'audio' | 'video' | 'document' | '3d';
  /** 'sphere': panorama 360° (equirectangular); 'wide': panorama lebar biasa */
  panorama?: 'sphere' | 'wide';
  fileSize: number;
  width: number;
  height: number;
  author: string;
  authorHtml: string;
  description: string;
  descriptionHtml: string;
  date: string;
  licenseShort: string;
  licenseFull: string;
  licenseUrl: string;
  licenseCategory: LicenseCategory;
  attributionRequired: boolean;
  categories: string[];
  credit: string;
  latitude?: number;
  longitude?: number;
}

export interface GalleryFilterState {
  query: string;
  mediaType: MediaType;
  license: LicenseCategory;
  sort: SortOrder;
  minWidth?: number;
  username?: string;
}

export type CategorySearchMode = 'media' | 'subcategories' | 'parent_categories';

export interface CommonsCategoryItem {
  id: number;
  title: string;
  cleanName: string;
  filesCount?: number;
  subcatsCount?: number;
  totalSize?: number;
}

export type CuratedTopicGroup =
  | 'media_type'
  | 'culture'
  | 'nature_science'
  | 'history'
  | 'geography'
  | 'arts';

export interface CuratedTopic {
  id: string;
  label: string;
  query: string;
  categoryName?: string;
  mediaType: MediaType;
  description: string;
  group?: CuratedTopicGroup;
  icon?: string;
}

