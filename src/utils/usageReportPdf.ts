// PDF tabel laporan Wikivoyage dengan jsPDF + autoTable (diadaptasi dari ekspor PDF WikiAbstrak).
// Roboto dipakai untuk aksara Latin/Sirilik/Yunani; teks beraksara lain (CJK, Arab, Ibrani, Thai, Tamil)
// digambar lewat kanvas dengan font sistem lalu disisipkan sebagai gambar.

type RGB = readonly [number, number, number];
const C = { ink: [41, 36, 30], muted: [110, 100, 84], line: [221, 213, 199], head: [61, 55, 46], bg: [250, 247, 242], white: [255, 255, 255], link: [47, 82, 112] } as const;

const WIKIGALERI_URL = 'https://wikigaleri.web.app';
const CREATOR_URL = 'https://meta.wikimedia.org/wiki/User:Affandy_Murad';

const GLYPH_RANGES: [number, number][] = [[0x20,0x7E],[0xA0,0x2AF],[0x300,0x377],[0x37A,0x37F],[0x384,0x38A],[0x38C,0x38C],[0x38E,0x3A1],[0x3A3,0x3E1],[0x3F0,0x52F],[0x1E00,0x1F15],[0x2000,0x2027],[0x202F,0x205F],[0x20A0,0x20BE]];
const hasUnsupportedGlyph = (str: string) => {
  for (const ch of String(str)) {
    const cp = ch.codePointAt(0)!;
    if (cp === 9 || cp === 10 || cp === 13) continue;
    if (!GLYPH_RANGES.some(([a, b]) => cp >= a && cp <= b)) return true;
  }
  return false;
};
const isRtl = (s: string) => /[֐-ࣿיִ-﷿ﹰ-﻿]/.test(s);

const CANVAS_FONTS = '"Segoe UI", "Noto Sans", "Noto Sans CJK JP", "Yu Gothic", "Hiragino Sans", "Malgun Gothic", "Microsoft YaHei", "Noto Sans Arabic", "Noto Sans Hebrew", "Noto Sans Thai", "Noto Sans Tamil", sans-serif';
const PX = 6; // piksel kanvas per mm

const bufToBase64 = (buf: ArrayBuffer) => {
  const bytes = new Uint8Array(buf);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + 0x8000)));
  return btoa(bin);
};
let fontsPromise: Promise<{ normal: string; bold: string }> | null = null;
const loadFonts = () => {
  if (!fontsPromise) {
    fontsPromise = Promise.all(['Roboto-Regular.ttf', 'Roboto-Bold.ttf'].map(async (f) => {
      const res = await fetch(`/pdf-fonts/${f}`);
      if (!res.ok) throw new Error(`Font ${f}: ${res.status}`);
      return bufToBase64(await res.arrayBuffer());
    })).then(([normal, bold]) => ({ normal, bold })).catch((e) => {
      fontsPromise = null;
      throw e;
    });
  }
  return fontsPromise;
};

export interface ReportPdfRow {
  file: string;
  fileUrl: string;
  /** URL gambar mini; hanya dipakai di PDF */
  thumb?: string;
  articles: string;
  date: string;
  /** Tanpa caption (laporan Massal): kolom keterangan tidak dibuat, kolom "articles" dipakai sebagai kolom kedua */
  caption?: string;
  description: string;
}

export interface ReportPdfInput {
  title: string;
  subtitle: string;
  footer: string;
  headers: string[];
  rows: ReportPdfRow[];
  rtl: boolean;
  fileName: string;
}

interface PdfThumb {
  data: string;
  w: number;
  h: number;
}

// Gambar mini dimuat lewat kanvas (upload.wikimedia.org mengirim header CORS) dan dijadikan JPEG kecil; yang gagal dilewati
async function loadThumbs(urls: (string | undefined)[], concurrency = 8): Promise<(PdfThumb | null)[]> {
  const out: (PdfThumb | null)[] = urls.map(() => null);
  let next = 0;
  const one = (url: string) =>
    new Promise<PdfThumb | null>((resolve) => {
      const img = new Image();
      const timer = window.setTimeout(() => resolve(null), 8000);
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        window.clearTimeout(timer);
        try {
          const cv = document.createElement('canvas');
          cv.width = img.naturalWidth;
          cv.height = img.naturalHeight;
          const cx = cv.getContext('2d')!;
          cx.fillStyle = '#fff';
          cx.fillRect(0, 0, cv.width, cv.height);
          cx.drawImage(img, 0, 0);
          resolve({ data: cv.toDataURL('image/jpeg', 0.8), w: cv.width, h: cv.height });
        } catch {
          resolve(null);
        }
      };
      img.onerror = () => {
        window.clearTimeout(timer);
        resolve(null);
      };
      img.src = url;
    });
  const worker = async () => {
    while (next < urls.length) {
      const i = next++;
      const u = urls[i];
      if (u) out[i] = await one(u);
    }
  };
  await Promise.all(Array.from({ length: concurrency }, worker));
  return out;
}

const THUMB_BOX = 12; // mm
const THUMB_COL_PAD = THUMB_BOX + 4; // mm, ruang di kiri teks nama berkas

export async function exportUsageReportPdf(input: ReportPdfInput): Promise<void> {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' });
  let fontName = 'helvetica';
  try {
    const f = await loadFonts();
    doc.addFileToVFS('Roboto-Regular.ttf', f.normal);
    doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
    doc.addFileToVFS('Roboto-Bold.ttf', f.bold);
    doc.addFont('Roboto-Bold.ttf', 'Roboto', 'bold');
    fontName = 'Roboto';
  } catch (e) {
    console.warn('Font PDF gagal dimuat, memakai font bawaan:', e);
  }
  const canvasFallback = fontName === 'Roboto';
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const M = 12;
  const contentW = pageW - M * 2;
  const rtlDoc = input.rtl;
  const withCaption = input.rows.every((r) => r.caption !== undefined);
  const thumbs = await loadThumbs(input.rows.map((r) => r.thumb));

  // Teks bebas (judul/subjudul): vektor bila bisa, kanvas bila ada aksara lain. Mengembalikan tinggi yang terpakai.
  const drawText = (text: string, y: number, sizePt: number, bold: boolean, col: RGB): number => {
    const fontMm = sizePt * 0.3528;
    const lineH = fontMm * 1.4;
    const useCanvas = canvasFallback && hasUnsupportedGlyph(text);
    if (!useCanvas) {
      doc.setFont(fontName, bold ? 'bold' : 'normal');
      doc.setFontSize(sizePt);
      doc.setTextColor(col[0], col[1], col[2]);
      const lines = doc.splitTextToSize(text, contentW) as string[];
      lines.forEach((ln, k) => doc.text(ln, rtlDoc ? pageW - M : M, y + fontMm * 0.85 + k * lineH, { align: rtlDoc ? 'right' : 'left' }));
      return lines.length * lineH;
    }
    const measure = document.createElement('canvas').getContext('2d')!;
    const fontCss = `${bold ? '700 ' : '400 '}${fontMm * PX}px ${CANVAS_FONTS}`;
    measure.font = fontCss;
    const maxPx = contentW * PX;
    const lines: string[] = [];
    let cur = '';
    const tokens = /\s/.test(text) && !/[぀-ヿ㐀-鿿가-힯]/.test(text) ? text.split(/(\s+)/) : Array.from(text);
    for (const tok of tokens) {
      if (cur && measure.measureText(cur + tok).width > maxPx) {
        lines.push(cur.trimEnd());
        cur = tok.trimStart();
      } else cur += tok;
    }
    lines.push(cur.trimEnd());
    const cv = document.createElement('canvas');
    cv.width = Math.round(contentW * PX);
    cv.height = Math.max(1, Math.round(lines.length * lineH * PX));
    const cx = cv.getContext('2d')!;
    cx.fillStyle = '#ffffff';
    cx.fillRect(0, 0, cv.width, cv.height);
    cx.fillStyle = `rgb(${col[0]},${col[1]},${col[2]})`;
    cx.font = fontCss;
    cx.textBaseline = 'middle';
    const rtl = isRtl(text) || rtlDoc;
    if (rtl) {
      cx.direction = 'rtl';
      cx.textAlign = 'right';
    }
    lines.forEach((ln, k) => cx.fillText(ln, rtl ? cv.width : 0, (k + 0.5) * lineH * PX));
    doc.addImage(cv.toDataURL('image/jpeg', 0.85), 'JPEG', M, y, contentW, lines.length * lineH);
    return lines.length * lineH;
  };

  let y = 12;
  y += drawText(input.title, y, 15, true, C.head) + 1;
  y += drawText(input.subtitle, y, 8.5, false, C.muted) + 3;

  autoTable(doc, {
    theme: 'grid',
    startY: y,
    margin: { top: 14, left: M, right: M, bottom: 14 },
    head: [input.headers],
    body: input.rows.map((r) => (withCaption ? [r.file, r.articles, r.date, r.caption ?? '', r.description] : [r.file, r.articles, r.date, r.description])),
    styles: { font: fontName, fontSize: 8, cellPadding: 2, overflow: 'linebreak', halign: rtlDoc ? 'right' : 'left', textColor: [...C.ink], lineColor: [...C.line], lineWidth: 0.2 },
    headStyles: { fillColor: [...C.head], textColor: [...C.white], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [...C.bg] },
    columnStyles: withCaption
      ? { 0: { cellWidth: 48 }, 1: { cellWidth: 38 }, 2: { cellWidth: 24 }, 3: { cellWidth: 'auto' }, 4: { cellWidth: 'auto' } }
      : { 0: { cellWidth: 80 }, 1: { cellWidth: 60 }, 2: { cellWidth: 24 }, 3: { cellWidth: 'auto' } },
    rowPageBreak: 'avoid',
    didParseCell: (d: any) => {
      d.cell.pdfCanvas = canvasFallback && hasUnsupportedGlyph(d.cell.raw);
      // kolom berkas: sisakan ruang untuk gambar mini di sisi awal (kanan pada dokumen RTL)
      if (d.section === 'body' && d.column.index === 0 && thumbs[d.row.index]) {
        d.cell.styles.cellPadding = rtlDoc ? { top: 2, bottom: 2, left: 2, right: THUMB_COL_PAD } : { top: 2, bottom: 2, left: THUMB_COL_PAD, right: 2 };
        d.cell.styles.minCellHeight = THUMB_BOX + 4;
      }
    },
    willDrawCell: (d: any) => {
      if (d.cell.pdfCanvas) {
        // header yang diulang di tiap halaman memakai objek sel yang sama: simpan barisnya hanya sekali
        if (!d.cell.pdfLines) d.cell.pdfLines = d.cell.text.slice();
        d.cell.text = [];
      }
    },
    didDrawCell: (d: any) => {
      if (d.cell.pdfLines) {
        const lines: string[] = d.cell.pdfLines;
        const fontMm = d.cell.styles.fontSize / doc.internal.scaleFactor;
        const lineMm = fontMm * (d.cell.styles.lineHeight || 1.15);
        const padL = d.cell.padding('left');
        const padT = d.cell.padding('top');
        const padR = d.cell.padding('right');
        const wMm = d.cell.width - padL - padR;
        const cv = document.createElement('canvas');
        cv.width = Math.max(1, Math.round(wMm * PX));
        cv.height = Math.max(1, Math.round(lines.length * lineMm * PX));
        const cx = cv.getContext('2d')!;
        const bgc = d.cell.styles.fillColor;
        cx.fillStyle = Array.isArray(bgc) ? `rgb(${bgc[0]},${bgc[1]},${bgc[2]})` : '#ffffff';
        cx.fillRect(0, 0, cv.width, cv.height);
        const col = d.cell.styles.textColor;
        cx.fillStyle = Array.isArray(col) ? `rgb(${col[0]},${col[1]},${col[2]})` : '#29241e';
        cx.font = `${d.cell.styles.fontStyle === 'bold' ? '700 ' : '400 '}${fontMm * PX}px ${CANVAS_FONTS}`;
        cx.textBaseline = 'middle';
        const rtl = isRtl(lines.join('')) || rtlDoc;
        if (rtl) {
          cx.direction = 'rtl';
          cx.textAlign = 'right';
        }
        lines.forEach((ln, k) => {
          const w = cx.measureText(ln).width;
          cx.save();
          cx.translate(rtl ? cv.width : 0, (k + 0.5) * lineMm * PX);
          if (w > cv.width) cx.scale(cv.width / w, 1);
          cx.fillText(ln, 0, 0);
          cx.restore();
        });
        doc.addImage(cv.toDataURL('image/jpeg', 0.85), 'JPEG', d.cell.x + padL, d.cell.y + padT, wMm, lines.length * lineMm);
      }
      if (d.section === 'body' && d.column.index === 0) {
        const th = thumbs[d.row.index];
        if (th) {
          const k = Math.min(THUMB_BOX / th.w, THUMB_BOX / th.h);
          const w = th.w * k;
          const h = th.h * k;
          const x = rtlDoc ? d.cell.x + d.cell.width - 2 - THUMB_BOX + (THUMB_BOX - w) / 2 : d.cell.x + 2 + (THUMB_BOX - w) / 2;
          doc.addImage(th.data, 'JPEG', x, d.cell.y + 2 + (THUMB_BOX - h) / 2, w, h);
        }
        const url = input.rows[d.row.index]?.fileUrl;
        if (url) doc.link(d.cell.x, d.cell.y, d.cell.width, d.cell.height, { url });
      }
    },
  });

  const total = doc.getNumberOfPages();
  for (let pg = 1; pg <= total; pg++) {
    doc.setPage(pg);
    doc.setFont(fontName, 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(C.muted[0], C.muted[1], C.muted[2]);
    // Kaki halaman: WikiGaleri + URL-nya dan pembuat, masing-masing bertautan; lalu tanggal pembuatan
    const generated = hasUnsupportedGlyph(input.footer) ? input.footer.split(' ').pop() || '' : input.footer;
    const parts: { text: string; url?: string }[] = [
      { text: 'WikiGaleri', url: WIKIGALERI_URL },
      { text: '  |  ' },
      { text: 'wikigaleri.web.app', url: WIKIGALERI_URL },
      { text: '  |  by ' },
      { text: 'Affandy Murad', url: CREATOR_URL },
      { text: `  |  ${generated}` },
    ];
    let fx = M;
    for (const part of parts) {
      doc.text(part.text, fx, pageH - 7);
      const w = doc.getTextWidth(part.text);
      if (part.url) {
        doc.setTextColor(C.link[0], C.link[1], C.link[2]);
        doc.text(part.text, fx, pageH - 7);
        doc.setDrawColor(C.link[0], C.link[1], C.link[2]);
        doc.setLineWidth(0.1);
        doc.line(fx, pageH - 6.4, fx + w, pageH - 6.4);
        doc.link(fx, pageH - 10, w, 4, { url: part.url });
        doc.setTextColor(C.muted[0], C.muted[1], C.muted[2]);
      }
      fx += w;
    }
    doc.text(`${pg} / ${total}`, pageW - M, pageH - 7, { align: 'right' });
  }
  doc.save(input.fileName);
}
