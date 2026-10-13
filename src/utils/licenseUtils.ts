import { CommonsMediaItem, LicenseCategory } from '../types/wikimedia';

/**
 * Remove HTML tags from string safely and decode common entities
 */
export function stripHtml(htmlStr: string | undefined): string {
  if (!htmlStr) return '';
  const doc = new DOMParser().parseFromString(htmlStr, 'text/html');
  const text = doc.body.textContent || '';
  return text.replace(/\s+/g, ' ').trim();
}

/**
 * Format bytes into human readable file size
 */
export function formatBytes(bytes: number, decimals = 1): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Clean up Wikimedia "File:..." title
 */
export function cleanCommonsTitle(rawTitle: string): string {
  if (!rawTitle) return '';
  let cleaned = rawTitle.replace(/^File:/i, '');
  // remove extension
  cleaned = cleaned.replace(/\.(jpe?g|png|gif|svg|webp|tiff?|ogg|oga|ogv|webm|mp4|mp3|flac|mid|pdf)$/i, '');
  // replace underscores with spaces
  cleaned = cleaned.replace(/_/g, ' ');
  return cleaned.trim();
}

/**
 * Extract clean uppercase file extension (e.g. JPG, PNG, WEBP, SVG, MP4, PDF, OGG)
 */
export function getFileExtension(
  title?: string,
  fileUrl?: string,
  mimeType?: string
): string {
  // 1. Try from title
  if (title) {
    const match = title.match(/\.([a-z0-9]{2,5})(?:[?#]|$)/i);
    if (match && match[1]) {
      const ext = match[1].toUpperCase();
      return ext === 'JPEG' ? 'JPG' : ext;
    }
  }

  // 2. Try from fileUrl
  if (fileUrl) {
    const cleanUrl = fileUrl.split('?')[0].split('#')[0];
    const match = cleanUrl.match(/\.([a-z0-9]{2,5})$/i);
    if (match && match[1]) {
      const ext = match[1].toUpperCase();
      return ext === 'JPEG' ? 'JPG' : ext;
    }
  }

  // 3. Try from MIME type
  if (mimeType) {
    const m = mimeType.toLowerCase();
    if (m.includes('jpeg')) return 'JPG';
    if (m.includes('png')) return 'PNG';
    if (m.includes('webp')) return 'WEBP';
    if (m.includes('svg')) return 'SVG';
    if (m.includes('gif')) return 'GIF';
    if (m.includes('pdf')) return 'PDF';
    if (m.includes('ogg') || m.includes('oga') || m.includes('ogv')) return 'OGG';
    if (m.includes('webm')) return 'WEBM';
    if (m.includes('mp4')) return 'MP4';
    if (m.includes('mp3')) return 'MP3';
    if (m.includes('flac')) return 'FLAC';
    if (m.includes('tiff')) return 'TIF';
    const sub = m.split('/')[1];
    if (sub && sub.length <= 4) return sub.toUpperCase();
  }

  return 'FILE';
}

/**
 * Categorize license into one of our filter categories
 */
export function categorizeLicense(
  shortName: string = '',
  usageTerms: string = '',
  licenseUrl: string = ''
): LicenseCategory {
  const combined = `${shortName} ${usageTerms} ${licenseUrl}`.toLowerCase();

  // Public Domain & CC0
  if (
    combined.includes('public domain') ||
    combined.includes('pd') ||
    combined.includes('cc0') ||
    combined.includes('no rights reserved') ||
    combined.includes('cc-zero')
  ) {
    return 'pd';
  }

  // CC BY-SA (must check before CC BY)
  if (
    combined.includes('by-sa') ||
    combined.includes('by sa') ||
    combined.includes('attribution-sharealike') ||
    combined.includes('attribution-share alike')
  ) {
    return 'cc_by_sa';
  }

  // CC BY
  if (
    combined.includes('cc by') ||
    combined.includes('cc-by') ||
    combined.includes('attribution')
  ) {
    return 'cc_by';
  }

  // GNU FDL
  if (
    combined.includes('gfdl') ||
    combined.includes('gnu free documentation')
  ) {
    return 'gfdl';
  }

  return 'other';
}

/**
 * Get human-readable license label & badge styling
 */
export function getLicenseInfo(item: CommonsMediaItem): {
  label: string;
  badgeClass: string;
  isFreeForCommercial: boolean;
  requiresAttribution: boolean;
  requiresShareAlike: boolean;
  allowsRemix: boolean;
  deedUrl: string;
} {
  const short = item.licenseShort || item.licenseCategory;
  const cat = item.licenseCategory;

  let deedUrl = item.licenseUrl || '';
  if (!deedUrl) {
    if (cat === 'pd') deedUrl = 'https://creativecommons.org/publicdomain/mark/1.0/';
    else if (cat === 'cc_by') deedUrl = 'https://creativecommons.org/licenses/by/4.0/';
    else if (cat === 'cc_by_sa') deedUrl = 'https://creativecommons.org/licenses/by-sa/4.0/';
    else if (cat === 'gfdl') deedUrl = 'https://www.gnu.org/licenses/fdl-1.3.html';
  }

  switch (cat) {
    case 'pd':
      return {
        label: short || 'Domain Publik / CC0',
        badgeClass: 'text-emerald-700 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60',
        isFreeForCommercial: true,
        requiresAttribution: false,
        requiresShareAlike: false,
        allowsRemix: true,
        deedUrl,
      };
    case 'cc_by':
      return {
        label: short || 'CC BY (Atribusi)',
        badgeClass: 'text-blue-700 bg-blue-50 dark:text-blue-300 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/60',
        isFreeForCommercial: true,
        requiresAttribution: true,
        requiresShareAlike: false,
        allowsRemix: true,
        deedUrl,
      };
    case 'cc_by_sa':
      return {
        label: short || 'CC BY-SA (BerbagiSerupa)',
        badgeClass: 'text-indigo-700 bg-indigo-50 dark:text-indigo-300 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/60',
        isFreeForCommercial: true,
        requiresAttribution: true,
        requiresShareAlike: true,
        allowsRemix: true,
        deedUrl,
      };
    case 'gfdl':
      return {
        label: short || 'GNU FDL',
        badgeClass: 'text-amber-700 bg-amber-50 dark:text-amber-300 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/60',
        isFreeForCommercial: true,
        requiresAttribution: true,
        requiresShareAlike: true,
        allowsRemix: true,
        deedUrl,
      };
    default:
      return {
        label: short || 'Lisensi Bebas',
        badgeClass: 'text-slate-700 bg-slate-100 dark:text-slate-300 dark:bg-slate-800 border border-slate-200 dark:border-slate-700',
        isFreeForCommercial: true,
        requiresAttribution: true,
        requiresShareAlike: false,
        allowsRemix: true,
        deedUrl,
      };
  }
}

/**
 * Generate standard TASL compliant attribution text
 * TASL = Title, Author, Source, License
 */
export function generateAttribution(
  item: CommonsMediaItem,
  format: 'plain' | 'markdown' | 'html' | 'wikitext' = 'plain'
): string {
  const title = item.cleanTitle || item.title.replace(/^File:/i, '');
  const author = item.author || item.credit || 'Kontributor Wikimedia Commons';
  const sourceUrl = item.pageUrl || `https://commons.wikimedia.org/wiki/${encodeURIComponent(item.title)}`;
  const licenseName = item.licenseShort || item.licenseFull || 'Lisensi Terbuka';
  const licenseUrl = item.licenseUrl || 'https://commons.wikimedia.org/';

  switch (format) {
    case 'markdown':
      return `"${title}" oleh [${author}](${sourceUrl}) dilisensikan di bawah [${licenseName}](${licenseUrl}) via Wikimedia Commons.`;

    case 'html':
      return `<p>"<a href="${sourceUrl}" target="_blank" rel="noopener noreferrer">${title}</a>" oleh ${author}, dilisensikan di bawah <a href="${licenseUrl}" target="_blank" rel="noopener noreferrer">${licenseName}</a> via Wikimedia Commons.</p>`;

    case 'wikitext':
      return `{{Information\n|description = ${title}\n|source = {{own}}\n|author = ${author}\n|permission = {{${item.licenseShort ? item.licenseShort.toLowerCase().replace(/\s+/g, '-') : 'cc-by-sa-4.0'}}}\n}}`;

    case 'plain':
    default:
      return `"${title}" oleh ${author}, Sumber: ${sourceUrl}, Lisensi: ${licenseName} (${licenseUrl})`;
  }
}
