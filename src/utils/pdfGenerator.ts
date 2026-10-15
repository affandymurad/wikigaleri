import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import { CommonsMediaItem } from '../types/wikimedia';
import {
  UnifiedMediaAiAnalysis,
  GEMINI_ASSISTANT_NAME,
  GEMINI_MODEL_NAME,
  GEMINI_MODEL_VERSION,
  AI_DISCLAIMER_TEXT_ID,
  AI_DISCLAIMER_TEXT_EN,
} from '../services/geminiClient';
import { WikiGlobalUsageItem } from '../services/wikimediaApi';
import { formatBytes } from './licenseUtils';

/**
 * Clean text for standard jsPDF fonts (Latin-1 safe)
 */
function sanitizeForPdf(text: string | undefined | null): string {
  if (!text) return '';
  return text
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[—–]/g, '-')
    .replace(/[•]/g, '-')
    .replace(/[…]/g, '...')
    .replace(/[×]/g, 'x')
    .replace(/[·]/g, '|')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/[^\x00-\x7F\xA0-\xFF]/g, ' ')
    .trim();
}

/**
 * Safely load an image into a base64 JPEG data URL for embedding in jsPDF
 */
async function loadImageAsDataUrl(
  url: string
): Promise<{ dataUrl: string; width: number; height: number } | null> {
  if (!url || typeof window === 'undefined') return null;

  try {
    const imgData = await new Promise<{ dataUrl: string; width: number; height: number }>(
      (resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';

        const timer = setTimeout(() => {
          img.src = '';
          reject(new Error('Image timeout'));
        }, 5000);

        img.onload = () => {
          clearTimeout(timer);
          try {
            const canvas = document.createElement('canvas');
            const maxDim = 800;
            let w = img.naturalWidth || 400;
            let h = img.naturalHeight || 300;

            if (w > maxDim || h > maxDim) {
              if (w > h) {
                h = Math.round((h * maxDim) / w);
                w = maxDim;
              } else {
                w = Math.round((w * maxDim) / h);
                h = maxDim;
              }
            }

            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              reject(new Error('No canvas context'));
              return;
            }
            ctx.drawImage(img, 0, 0, w, h);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
            resolve({ dataUrl, width: w, height: h });
          } catch (canvasErr) {
            reject(canvasErr);
          }
        };

        img.onerror = () => {
          clearTimeout(timer);
          reject(new Error('Image load error'));
        };

        img.src = url;
      }
    );
    return imgData;
  } catch {
    try {
      const resp = await fetch(url, { mode: 'cors' });
      if (!resp.ok) return null;
      const blob = await resp.blob();
      return await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          resolve({
            dataUrl: reader.result as string,
            width: 400,
            height: 300,
          });
        };
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
  }
}

/**
 * Generate QR code as base64 PNG data URL
 */
async function generateQrCodeDataUrl(text: string): Promise<string | null> {
  try {
    return await QRCode.toDataURL(text, {
      width: 280,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#0f172a', // stone-900
        light: '#ffffff',
      },
    });
  } catch (err) {
    console.error('Failed to generate QR Code:', err);
    return null;
  }
}

/**
 * Export unified media analysis report to PDF using jsPDF
 * Supports dynamic language ('id' | 'en') matching interface selection.
 */
export async function exportMediaAnalysisPdf(
  item: CommonsMediaItem,
  analysis: UnifiedMediaAiAnalysis,
  wikiUsages: WikiGlobalUsageItem[],
  categories: string[],
  lang: 'en' | 'id' = 'id'
): Promise<void> {
  const isEn = lang === 'en';

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  const bottomMargin = 18;

  let currentY = 14;

  const commonsUrl =
    item.pageUrl || `https://commons.wikimedia.org/wiki/${encodeURIComponent(item.title)}`;
  const directFileUrl = item.fileUrl || commonsUrl;

  const [thumbImage, qrDataUrl] = await Promise.all([
    loadImageAsDataUrl(item.thumbnailUrl || item.fileUrl),
    generateQrCodeDataUrl(commonsUrl),
  ]);

  const ensureSpace = (neededHeight: number) => {
    if (currentY + neededHeight > pageHeight - bottomMargin) {
      doc.addPage();
      currentY = 16;
      drawPageHeaderMini();
    }
  };

  const drawPageHeaderMini = () => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    const headerPrefix = isEn
      ? 'Wikimedia Commons Media Analysis Report'
      : 'Laporan Analisis Media Wikimedia Commons';
    doc.text(
      `${headerPrefix} - ${sanitizeForPdf(item.cleanTitle || item.title)}`,
      margin,
      10
    );
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.2);
    doc.line(margin, 12, pageWidth - margin, 12);
  };

  // --- 1. COVER / HEADER BANNER ---
  doc.setFillColor(15, 23, 42);
  doc.roundedRect(margin, currentY, contentWidth, 22, 2, 2, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12.5);
  doc.text(
    isEn
      ? 'WIKIMEDIA COMMONS MEDIA CURATION & ANALYSIS REPORT'
      : 'LAPORAN KURASI & ANALISIS MEDIA WIKIMEDIA COMMONS',
    margin + 6,
    currentY + 8.5
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(203, 213, 225);
  doc.text(
    isEn
      ? 'Comprehensive AI Analysis • Plain Summary • License & Attribution • WCAG Accessibility • Wiki Projects'
      : 'Analisis Komprehensif AI • Ringkasan Awam • Lisensi & Atribusi • Aksesibilitas WCAG • Proyek Wiki',
    margin + 6,
    currentY + 15
  );

  currentY += 26;

  // --- 2. FILE SUMMARY BOX WITH THUMBNAIL, DETAILS, & QR CODE ---
  const boxHeight = 58;
  ensureSpace(boxHeight);

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, currentY, contentWidth, boxHeight, 2, 2, 'FD');

  const cardPadding = 4;
  const thumbBoxWidth = 38;
  const thumbBoxHeight = 38;
  const thumbBoxX = margin + cardPadding;
  const thumbBoxY = currentY + cardPadding;

  // Ukuran bingkai dihitung dari rasio gambar agar gambar mengisi bingkai penuh
  let frameW = thumbBoxWidth;
  let frameH = thumbBoxHeight;
  if (thumbImage?.dataUrl && thumbImage.width > 0 && thumbImage.height > 0) {
    const aspect = thumbImage.width / thumbImage.height;
    if (aspect > 1) {
      frameH = Math.max(20, thumbBoxWidth / aspect);
    } else {
      frameW = Math.max(20, thumbBoxHeight * aspect);
    }
  }

  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(thumbBoxX, thumbBoxY, frameW, frameH, 1.5, 1.5, 'FD');

  if (thumbImage?.dataUrl) {
    try {
      doc.addImage(thumbImage.dataUrl, 'JPEG', thumbBoxX, thumbBoxY, frameW, frameH);
    } catch {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(item.mediaType.toUpperCase(), thumbBoxX + 10, thumbBoxY + 20);
    }
  } else {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(item.mediaType.toUpperCase(), thumbBoxX + 9, thumbBoxY + 18);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.text(isEn ? 'File Thumbnail' : 'Thumbnail Berkas', thumbBoxX + 7, thumbBoxY + 23);
  }

  // QR Code Box (Right Side)
  const qrBoxWidth = 34;
  const qrBoxX = margin + contentWidth - qrBoxWidth - cardPadding;
  const qrBoxY = currentY + cardPadding;

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(qrBoxX, qrBoxY, qrBoxWidth, thumbBoxHeight, 1.5, 1.5, 'FD');

  if (qrDataUrl) {
    try {
      const qrDim = 26;
      const qrX = qrBoxX + (qrBoxWidth - qrDim) / 2;
      doc.addImage(qrDataUrl, 'PNG', qrX, qrBoxY + 2, qrDim, qrDim);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(15, 23, 42);
      doc.text(isEn ? 'Scan File QR' : 'Pindai QR Berkas', qrBoxX + qrBoxWidth / 2, qrBoxY + 31, { align: 'center' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5.5);
      doc.setTextColor(100, 116, 139);
      doc.text(isEn ? 'Open in Commons' : 'Buka di Commons', qrBoxX + qrBoxWidth / 2, qrBoxY + 35, { align: 'center' });
    } catch (err) {
      console.error('Failed to draw QR image to PDF:', err);
    }
  }

  // Metadata Details (Center Column)
  const metaX = thumbBoxX + thumbBoxWidth + 5;
  const metaWidth = qrBoxX - metaX - 4;
  const metaY = currentY + cardPadding + 2;

  // Title
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  const titleText = sanitizeForPdf(item.cleanTitle || item.title);
  const titleLines = doc.splitTextToSize(titleText, metaWidth);
  doc.text(titleLines.slice(0, 2), metaX, metaY);

  const titleOffset = Math.min(titleLines.length, 2) * 4.2;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);

  let metaItemY = metaY + titleOffset + 1.5;
  const lineHeight = 3.8;

  doc.text(`${isEn ? 'File Type' : 'Tipe Berkas'}: ${item.mediaType.toUpperCase()} (${item.mimeType})`, metaX, metaItemY);
  metaItemY += lineHeight;

  doc.text(
    `${isEn ? 'Dimensions' : 'Dimensi & Resolusi'}: ${item.width ? `${item.width} x ${item.height} px` : 'N/A'}`,
    metaX,
    metaItemY
  );
  metaItemY += lineHeight;

  doc.text(`${isEn ? 'File Size' : 'Ukuran Berkas'}: ${formatBytes(item.fileSize)}`, metaX, metaItemY);
  metaItemY += lineHeight;

  const authorText = sanitizeForPdf(item.author || item.credit || 'Wikimedia Commons');
  doc.text(
    `${isEn ? 'Author' : 'Pembuat'}: ${authorText.length > 36 ? authorText.slice(0, 33) + '...' : authorText}`,
    metaX,
    metaItemY
  );
  metaItemY += lineHeight;

  const licenseText = sanitizeForPdf(item.licenseShort || item.licenseFull || 'CC BY-SA');
  doc.text(
    `${isEn ? 'License' : 'Lisensi'}: ${licenseText.length > 36 ? licenseText.slice(0, 33) + '...' : licenseText}`,
    metaX,
    metaItemY
  );

  // Bottom Link Strip inside summary card
  const linkStripY = currentY + 45;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.2);
  doc.line(margin + cardPadding, linkStripY, margin + contentWidth - cardPadding, linkStripY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  doc.text(isEn ? 'Commons Page URL:' : 'URL Halaman Commons:', margin + cardPadding, linkStripY + 4.2);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(37, 99, 235);
  const shortCommonsUrl = commonsUrl.length > 75 ? commonsUrl.slice(0, 72) + '...' : commonsUrl;
  doc.textWithLink(shortCommonsUrl, margin + cardPadding + 32, linkStripY + 4.2, {
    url: commonsUrl,
  });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  doc.text(isEn ? 'Direct Download URL:' : 'URL Unduhan Berkas:', margin + cardPadding, linkStripY + 8.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(37, 99, 235);
  const shortDirectUrl =
    directFileUrl.length > 75 ? directFileUrl.slice(0, 72) + '...' : directFileUrl;
  doc.textWithLink(shortDirectUrl, margin + cardPadding + 32, linkStripY + 8.5, {
    url: directFileUrl,
  });

  currentY += boxHeight + 4;

  // --- ASSISTANT & LLM MODEL BANNER WITH AI DISCLAIMER ---
  const assistantName = sanitizeForPdf(analysis.modelMeta?.assistantName || GEMINI_ASSISTANT_NAME);
  const modelName = sanitizeForPdf(analysis.modelMeta?.modelName || GEMINI_MODEL_NAME);
  const modelVersion = sanitizeForPdf(analysis.modelMeta?.modelVersion || GEMINI_MODEL_VERSION);
  const disclaimerText = sanitizeForPdf(
    analysis.modelMeta?.disclaimer || (isEn ? AI_DISCLAIMER_TEXT_EN : AI_DISCLAIMER_TEXT_ID)
  );

  const discLines = doc.splitTextToSize(disclaimerText, contentWidth - 8);
  const discBoxH = Math.max(22, discLines.length * 3.4 + 17);
  ensureSpace(discBoxH + 4);

  doc.setFillColor(254, 243, 199); // amber-100/50
  doc.setDrawColor(245, 158, 11); // amber-500
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, currentY, contentWidth, discBoxH, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(146, 64, 14);
  doc.text(
    isEn
      ? `Assistant: ${assistantName}  |  Model: ${modelName} (${modelVersion})`
      : `Asisten: ${assistantName}  |  Model: ${modelName} (${modelVersion})`,
    margin + 4,
    currentY + 4.8
  );

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(180, 83, 9);
  doc.text(
    isEn ? 'ARTIFICIAL INTELLIGENCE DISCLAIMER:' : 'PENAFIAN KECERDASAN BUATAN (AI DISCLAIMER):',
    margin + 4,
    currentY + 8.8
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(120, 53, 15);
  doc.text(discLines, margin + 4, currentY + 12.5);

  const linkY = currentY + 13 + discLines.length * 3.4;
  const policyLabel = isEn
    ? 'Wikimedia AI Policy & Guidelines: https://meta.wikimedia.org/wiki/Artificial_intelligence/Guidelines'
    : 'Ketentuan Penggunaan AI di Proyek Wikimedia: https://meta.wikimedia.org/wiki/Artificial_intelligence/Guidelines';
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(180, 83, 9);
  doc.textWithLink(policyLabel, margin + 4, linkY, {
    url: 'https://meta.wikimedia.org/wiki/Artificial_intelligence/Guidelines',
  });

  currentY += discBoxH + 5;

  const drawSectionTitle = (
    num: string,
    title: string,
    subtitle: string,
    colorRgb: [number, number, number]
  ) => {
    ensureSpace(28);
    doc.setFillColor(colorRgb[0], colorRgb[1], colorRgb[2]);
    doc.roundedRect(margin, currentY, 5, 10, 1, 1, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text(`${num}. ${title}`, margin + 8, currentY + 4.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(subtitle, margin + 8, currentY + 8.5);

    currentY += 17;
  };

  // --- SECTION 1: PENJELASAN OBJEK UNTUK PENGGUNA AWAM ---
  drawSectionTitle(
    '1',
    isEn ? 'OBJECT EXPLANATION FOR GENERAL AUDIENCE' : 'PENJELASAN OBJEK UNTUK PENGGUNA AWAM',
    isEn ? 'Visual essence, layman narrative, & factual highlights' : 'Intisari visual, narasi awam yang ramah, & fitur penting yang tampak',
    [59, 130, 246]
  );

  ensureSpace(14);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  doc.text(isEn ? 'Summary / Plain Explanation:' : 'Ringkasan Intisari Awam:', margin, currentY);
  currentY += 4.2;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  const laymanLines = doc.splitTextToSize(
    sanitizeForPdf(analysis.objectDescription.laymanSummary),
    contentWidth
  );
  doc.text(laymanLines, margin, currentY);
  currentY += laymanLines.length * 3.8 + 3;

  ensureSpace(14);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  doc.text(isEn ? 'Factual Visual Description:' : 'Deskripsi Rinci Visual & Estetika:', margin, currentY);
  currentY += 4.2;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  const visualLines = doc.splitTextToSize(
    sanitizeForPdf(analysis.objectDescription.detailedVisuals),
    contentWidth
  );
  doc.text(visualLines, margin, currentY);
  currentY += visualLines.length * 3.8 + 2;

  // Key highlights
  if (analysis.objectDescription.keyHighlights?.length > 0) {
    ensureSpace(12);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(51, 65, 85);
    doc.text(isEn ? 'Key Highlights / Notable Features:' : 'Poin Kunci / Fitur Penting:', margin, currentY);
    currentY += 4.2;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    for (const h of analysis.objectDescription.keyHighlights) {
      ensureSpace(4.5);
      const hLines = doc.splitTextToSize(`- ${sanitizeForPdf(h)}`, contentWidth - 4);
      doc.text(hLines, margin + 2, currentY);
      currentY += hLines.length * 3.8;
    }
    currentY += 3;
  }

  // --- SECTION 2: AKSESIBILITAS WEB & WCAG ALT-TEXT ---
  drawSectionTitle(
    '2',
    isEn ? 'WEB ACCESSIBILITY & WCAG ALT-TEXT' : 'AKSESIBILITAS WEB & WCAG ALT-TEXT',
    isEn ? 'Screen reader alternative text conforming to WCAG 2.1 AA standards' : 'Teks alternatif ramah pembaca layar untuk kepatuhan standar WCAG 2.1 AA',
    [147, 51, 234]
  );

  const altLines = doc.splitTextToSize(
    sanitizeForPdf(analysis.accessibilityWcag.shortAltText),
    contentWidth - 8
  );
  const altBoxH = Math.max(14, altLines.length * 3.8 + 7);
  ensureSpace(altBoxH + 4);

  doc.setFillColor(250, 245, 255);
  doc.setDrawColor(233, 213, 255);
  doc.roundedRect(margin, currentY, contentWidth, altBoxH, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(107, 33, 168);
  doc.text(isEn ? 'Concise Alt-Text (<img alt="..."> tag):' : 'Alt-Text Ringkas (tag <img alt="...">):', margin + 4, currentY + 4.8);

  doc.setFont('courier', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(30, 41, 59);
  doc.text(altLines, margin + 4, currentY + 9.2);
  currentY += altBoxH + 4;

  ensureSpace(16);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  doc.text(isEn ? 'Extended Narrative Description (Screen Reader):' : 'Deskripsi Naratif Panjang (Screen Reader):', margin, currentY);
  currentY += 4.2;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  const extLines = doc.splitTextToSize(
    sanitizeForPdf(analysis.accessibilityWcag.extendedDescription),
    contentWidth
  );
  for (const line of extLines) {
    ensureSpace(4.2);
    doc.text(line, margin, currentY);
    currentY += 3.8;
  }
  currentY += 4;

  // --- SECTION 3: PENGGUNAAN DI PROYEK WIKIMEDIA & KATEGORI ---
  drawSectionTitle(
    '3',
    isEn ? 'WIKIMEDIA PROJECTS USAGE & CATEGORIES' : 'PENGGUNAAN DI PROYEK WIKIMEDIA & KATEGORI',
    isEn ? 'Encyclopedia articles, Commons categories, & file roles' : 'Artikel ensiklopedia, kategori Wikimedia Commons, & peran berkas',
    [217, 119, 6]
  );

  ensureSpace(16);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);
  const wikiSummaryLines = doc.splitTextToSize(
    sanitizeForPdf(analysis.wikiUsage.summary),
    contentWidth
  );
  doc.text(wikiSummaryLines, margin, currentY);
  currentY += wikiSummaryLines.length * 3.8 + 3;

  // 4a. Categories list (clickable link to Commons category)
  const displayCats = categories.length > 0 ? categories : item.categories || [];
  if (displayCats.length > 0) {
    ensureSpace(14);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(180, 83, 9);
    doc.text(
      isEn
        ? `Wikimedia Commons Categories (${displayCats.length}):`
        : `Kategori Wikimedia Commons (${displayCats.length}):`,
      margin,
      currentY
    );
    currentY += 4.2;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);

    for (const cat of displayCats.slice(0, 20)) {
      ensureSpace(4);
      const cleanCat = cat.replace(/^Category:/i, '');
      const catLabel = `[Cat] ${sanitizeForPdf(cleanCat)}`;
      const catUrl = `https://commons.wikimedia.org/wiki/Category:${encodeURIComponent(cleanCat.replace(/ /g, '_'))}`;

      doc.setTextColor(30, 41, 59);
      doc.text(catLabel, margin + 2, currentY);

      doc.setTextColor(37, 99, 235);
      const linkLabel = isEn ? ' (view category)' : ' (buka kategori)';
      doc.textWithLink(linkLabel, margin + 2 + doc.getTextWidth(catLabel), currentY, {
        url: catUrl,
      });
      currentY += 3.6;
    }
    currentY += 3;
  }

  // 4b. Live Global Usage Articles
  if (wikiUsages.length > 0) {
    ensureSpace(14);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(180, 83, 9);
    doc.text(
      isEn
        ? `Wikimedia Articles Using This File (${wikiUsages.length}):`
        : `Artikel Wikimedia yang Menggunakan Berkas Ini (${wikiUsages.length}):`,
      margin,
      currentY
    );
    currentY += 4.2;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    for (const u of wikiUsages.slice(0, 15)) {
      ensureSpace(4.5);
      const articleLabel = `- [${sanitizeForPdf(u.wiki)}] ${sanitizeForPdf(u.title)}`;
      doc.setTextColor(30, 41, 59);
      doc.text(articleLabel, margin + 2, currentY);

      if (u.url) {
        doc.setTextColor(37, 99, 235);
        const linkLabel = isEn ? ' (open article)' : ' (buka artikel)';
        doc.textWithLink(linkLabel, margin + 2 + doc.getTextWidth(articleLabel), currentY, {
          url: u.url,
        });
      }
      currentY += 3.8;
    }
    currentY += 2;
  }

  // 4c. Project Roles / Context (Clickable links)
  if (analysis.wikiUsage.projectRoles?.length > 0) {
    ensureSpace(14);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(180, 83, 9);
    doc.text(
      isEn
        ? 'Context & Encyclopedic Utilization:'
        : 'Konteks & Rekomendasi Pemanfaatan Proyek Wiki:',
      margin,
      currentY
    );
    currentY += 4.2;

    for (const role of analysis.wikiUsage.projectRoles) {
      const roleHeading = `• ${sanitizeForPdf(role.wikiName)} : "${sanitizeForPdf(role.article)}"`;
      const linkLabel = isEn ? ' (search wiki)' : ' (buka wiki)';
      const roleLines = doc.splitTextToSize(sanitizeForPdf(role.role), contentWidth - 6);
      ensureSpace(14 + roleLines.length * 3.4);

      // Judul (tebal), dibungkus bila panjang. Lebar diukur dengan font yang sama saat menggambar.
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(15, 23, 42);
      const headingLines = doc.splitTextToSize(roleHeading, contentWidth - 4);
      doc.text(headingLines, margin + 2, currentY);
      const lastHeadingWidth = doc.getTextWidth(headingLines[headingLines.length - 1]);
      currentY += (headingLines.length - 1) * 3.4;

      // Tautan (kecil), di akhir baris terakhir judul atau di baris baru bila tidak muat
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(37, 99, 235);
      const linkWidth = doc.getTextWidth(linkLabel);
      const articleUrl = `https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(role.article)}`;
      if (margin + 2 + lastHeadingWidth + linkWidth <= margin + contentWidth) {
        doc.textWithLink(linkLabel, margin + 2 + lastHeadingWidth, currentY, { url: articleUrl });
      } else {
        currentY += 3.4;
        doc.textWithLink(linkLabel.trim(), margin + 2, currentY, { url: articleUrl });
      }

      currentY += 4;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(71, 85, 105);
      doc.text(roleLines, margin + 5, currentY);
      currentY += roleLines.length * 3.4 + 2.5;
    }
  }

  // --- FOOTER ON ALL PAGES ---
  const totalPages = doc.getNumberOfPages();
  const dateStr = new Date().toLocaleDateString(isEn ? 'en-US' : 'id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.2);
    doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);

    doc.text(
      isEn
        ? `Wikimedia Commons Media Curator | Export Date: ${dateStr}`
        : `Kurator Media Wikimedia Commons | Tanggal Ekspor: ${dateStr}`,
      margin,
      pageHeight - 8
    );
    doc.text(
      isEn ? `Page ${i} of ${totalPages}` : `Halaman ${i} dari ${totalPages}`,
      pageWidth - margin - 22,
      pageHeight - 8
    );
  }

  const safeFilename = (item.cleanTitle || 'Wikimedia-Media')
    .replace(/[^a-zA-Z0-9_\-]/g, '_')
    .slice(0, 40);
  doc.save(`${safeFilename}-analysis-wikimedia.pdf`);
}
