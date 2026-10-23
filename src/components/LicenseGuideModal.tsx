import React from 'react';
import { Info, Lightbulb, Sparkles, X, ShieldCheck, CheckCircle2, AlertTriangle, ExternalLink, HelpCircle, FileText, Scale, Ban, User } from 'lucide-react';
import { Translations } from '../i18n/translations';

interface LicenseGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  t: Translations;
}

export const LicenseGuideModal: React.FC<LicenseGuideModalProps> = ({
  isOpen,
  onClose,
  t,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4 animate-fadeIn">
      <div className="w-full max-w-2xl bg-white dark:bg-stone-900 rounded-lg shadow-sm border border-stone-200 dark:border-stone-800 p-6 space-y-6 max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-stone-100 dark:border-stone-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-moss-50 dark:bg-moss-950/60 border border-moss-200 dark:border-moss-800 flex items-center justify-center text-moss-600 dark:text-moss-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-bold text-lg text-stone-900 dark:text-white">
                {t.guideModal.title}
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                {t.guideModal.subtitle}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-5 text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
          
          {/* Section 1: Types of Licenses */}
          <div className="space-y-3">
            <h4 className="font-semibold text-stone-900 dark:text-white text-sm">
              {t.guideModal.section1Title}
            </h4>

            <div className="space-y-2.5">
              <div className="p-3 rounded-lg bg-stone-50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-800">
                <div className="flex items-center justify-between font-semibold text-stone-900 dark:text-white mb-1">
                  <span>{t.guideModal.pdTitle}</span>
                  <span className="text-xs text-moss-600 dark:text-moss-400 font-mono">CC0 / PD</span>
                </div>
                <p>{t.guideModal.pdDesc}</p>
              </div>

              <div className="p-3 rounded-lg bg-stone-50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-800">
                <div className="flex items-center justify-between font-semibold text-stone-900 dark:text-white mb-1">
                  <span>{t.guideModal.ccbyTitle}</span>
                  <span className="text-xs text-accent-600 dark:text-accent-400 font-mono">CC BY</span>
                </div>
                <p>{t.guideModal.ccbyDesc}</p>
              </div>

              <div className="p-3 rounded-lg bg-stone-50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-800">
                <div className="flex items-center justify-between font-semibold text-stone-900 dark:text-white mb-1">
                  <span>{t.guideModal.ccbysaTitle}</span>
                  <span className="text-xs text-accent-600 dark:text-accent-400 font-mono">CC BY-SA</span>
                </div>
                <p>{t.guideModal.ccbysaDesc}</p>
              </div>

              <div className="p-3 rounded-lg bg-stone-50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-800">
                <div className="flex items-center justify-between font-semibold text-stone-900 dark:text-white mb-1">
                  <span>{t.guideModal.gfdlTitle}</span>
                  <span className="text-xs text-amber-600 dark:text-amber-400 font-mono">GFDL</span>
                </div>
                <p>{t.guideModal.gfdlDesc}</p>
              </div>
            </div>
          </div>

          {/* Section 2: Rule of TASL */}
          <div className="p-4 rounded-lg bg-accent-50/70 dark:bg-accent-950/40 border border-accent-200 dark:border-accent-900/60 space-y-2">
            <h4 className="font-semibold text-accent-900 dark:text-accent-200 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-accent-600 dark:text-accent-400" />
              <span>{t.guideModal.taslTitle}</span>
            </h4>
            <p className="text-stone-700 dark:text-stone-300 text-xs">
              {t.guideModal.taslDesc}
            </p>
            <ul className="list-disc pl-4 space-y-1 text-stone-700 dark:text-stone-300 text-xs">
              {t.guideModal.taslItems.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>

          {/* Section 3: Ethical AI notice */}
          <div className="p-4 rounded-lg bg-stone-100 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-800 space-y-2">
            <div className="flex items-center gap-1.5 font-semibold text-stone-900 dark:text-white">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span>{t.guideModal.aiPolicyTitle}</span>
            </div>
            <p className="text-xs leading-relaxed text-stone-600 dark:text-stone-300">
              {t.guideModal.aiPolicyDesc}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-stone-100 dark:border-stone-800 flex justify-between items-center">
          <a
            href="https://commons.wikimedia.org/wiki/Commons:Reusing_content_outside_Wikimedia"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-accent-600 dark:text-accent-400 hover:underline flex items-center gap-1 font-medium"
          >
            <span>{t.guideModal.docsLink}</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-stone-900 text-white dark:bg-white dark:text-stone-900 rounded-lg text-xs font-medium hover:opacity-90 transition-opacity"
          >
            {t.guideModal.closeBtn}
          </button>
        </div>
      </div>
    </div>
  );
};


// ---------------------------------------------------------------------------
// Modal Ketentuan Wikimedia: rangkuman "Commons:Reusing content outside Wikimedia"
// ---------------------------------------------------------------------------
const TERMS_URL = 'https://commons.wikimedia.org/wiki/Commons:Reusing_content_outside_Wikimedia';

interface WikimediaTermsModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: 'en' | 'id';
}

export const WikimediaTermsModal: React.FC<WikimediaTermsModalProps> = ({ isOpen, onClose, language }) => {
  if (!isOpen) return null;
  const id = language === 'id';

  const sections = id
    ? [
        { icon: 'file', title: '1. Cek lisensi berkasnya', body: 'Setiap berkas di Commons punya halaman sendiri yang menulis lisensi, pembuat, dan sumbernya. Berkas boleh dipakai di luar Wikimedia (web, cetak, presentasi, termasuk untuk komersial) selama Anda mengikuti syarat lisensinya.' },
        { icon: 'check', title: '2. Cantumkan kredit (TASL)', body: 'Kalau lisensinya mewajibkan, tulis Title (judul berkas), Author (pembuat), Source (tautan ke halaman berkas), dan License (nama lisensi dan tautannya). Di media cetak atau video, taruh kredit di keterangan gambar atau bagian kredit.' },
        { icon: 'scale', title: '3. Ikuti syarat lisensinya', body: 'Domain Publik/CC0 tidak mewajibkan kredit. CC BY mewajibkan kredit. CC BY-SA mewajibkan kredit, dan hasil olahan harus memakai lisensi yang sama. Kalau Anda mengubah berkas, tulis bahwa berkas itu sudah diubah.' },
        { icon: 'warn', title: '4. Ingat hak-hak lain', body: 'Lisensi hak cipta tidak menghapus hak lain: merek dan logo, hak privasi orang yang terlihat di foto, karya seni atau bangunan yang masih dilindungi di sebuah negara, dan hukum setempat. Anda yang bertanggung jawab memastikan pemakaian Anda sah.' },
        { icon: 'ban', title: '5. Jangan beri kesan didukung', body: 'Pemakaian ulang tidak boleh membuat orang mengira Wikimedia, Wikimedia Commons, atau pembuat berkas mendukung atau mensponsori Anda atau produk Anda. Logo dan nama proyek Wikimedia punya aturan merek dagang sendiri.' },
      ]
    : [
        { icon: 'file', title: '1. Check the file\u2019s license', body: 'Every Commons file has its own page that lists its license, author, and source. You can reuse files outside Wikimedia (web, print, slides, even commercially) as long as you follow that license.' },
        { icon: 'check', title: '2. Credit the creator (TASL)', body: 'If the license requires credit, include the Title, Author, Source (a link to the file page), and License (its name and a link). In print or video, put the credit in the caption or the credits.' },
        { icon: 'scale', title: '3. Follow the license', body: 'Public Domain/CC0 needs no credit. CC BY needs credit. CC BY-SA needs credit, and anything you build from the file must use the same license. If you change the file, say so.' },
        { icon: 'warn', title: '4. Watch for other rights', body: 'A copyright license does not cancel other rights: trademarks and logos, the privacy rights of people in the photo, artworks or buildings that are still protected in some countries, and local law. You are responsible for making sure your use is lawful.' },
        { icon: 'ban', title: '5. Do not suggest an endorsement', body: 'Your reuse must not make people think Wikimedia, Wikimedia Commons, or the file creator backs you or your product. Wikimedia logos and project names have their own trademark rules.' },
      ];

  const iconFor = (k: string) =>
    k === 'file' ? <FileText className="w-4 h-4" />
    : k === 'check' ? <CheckCircle2 className="w-4 h-4" />
    : k === 'scale' ? <Scale className="w-4 h-4" />
    : k === 'warn' ? <AlertTriangle className="w-4 h-4" />
    : <Ban className="w-4 h-4" />;

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4 animate-fadeIn" onClick={onClose}>
      <div
        className="w-full max-w-2xl bg-white dark:bg-stone-900 rounded-lg shadow-sm border border-stone-200 dark:border-stone-800 p-6 space-y-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between pb-3 border-b border-stone-100 dark:border-stone-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent-50 dark:bg-accent-950/60 border border-accent-200 dark:border-accent-800 flex items-center justify-center text-accent-600 dark:text-accent-400">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-bold text-lg text-stone-900 dark:text-white">
                {id ? 'Ketentuan Wikimedia' : 'Wikimedia Terms of Reuse'}
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                {id ? 'Ringkasan singkat cara memakai ulang berkas Commons di luar Wikimedia' : 'A short summary of how to reuse Commons files outside Wikimedia'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-2.5 text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
          {sections.map((s) => (
            <div key={s.title} className="p-3 rounded-lg bg-stone-50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-800">
              <div className="flex items-center gap-2 font-semibold text-stone-900 dark:text-white mb-1">
                <span className="text-accent-600 dark:text-accent-400">{iconFor(s.icon)}</span>
                <span>{s.title}</span>
              </div>
              <p>{s.body}</p>
            </div>
          ))}
          <p className="text-xs text-stone-500 dark:text-stone-400">
            {id
              ? 'Ini ringkasan, bukan nasihat hukum. Baca halaman resminya untuk ketentuan lengkap dan terbaru.'
              : 'This is a summary, not legal advice. Read the official page for the full and current terms.'}
          </p>
        </div>

        <div className="flex items-center justify-between gap-3 pt-3 border-t border-stone-100 dark:border-stone-800 flex-wrap">
          <a
            href={TERMS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-accent-600 hover:bg-accent-700 text-white rounded-lg text-xs font-medium transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            {id ? 'Buka halaman resminya di Wikimedia Commons' : 'Open the official page on Wikimedia Commons'}
          </a>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-stone-900 text-white dark:bg-white dark:text-stone-900 rounded-lg text-xs font-medium hover:opacity-90 transition-opacity"
          >
            {id ? 'Tutup' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};


// ---------------------------------------------------------------------------
// Modal Penafian: rumusan masalah, peran AI, dan batasan WikiGaleri
// ---------------------------------------------------------------------------
interface DisclaimerModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: 'en' | 'id';
}

export const DisclaimerModal: React.FC<DisclaimerModalProps> = ({ isOpen, onClose, language }) => {
  if (!isOpen) return null;
  const id = language === 'id';

  const sections = id
    ? [
      { icon: 'help', title: 'Masalah yang kami jawab', body: 'Wikimedia Commons punya jutaan berkas gratis, tapi sulit dicari dan sulit dipahami orang awam. Aturan lisensi dan cara mencantumkan kredit juga sering membingungkan, jadi berkas dipakai tanpa kredit yang benar.' },
      { icon: 'bulb', title: 'Kenapa ini penting', body: 'Media terbuka dipakai untuk belajar, mengajar, dan jurnalisme. Mencantumkan kredit dengan benar menghargai pembuatnya dan menjaga kepercayaan pada pengetahuan terbuka.' },
      { icon: 'check', title: 'Cara WikiGaleri membantu', body: 'Cari lewat kata kunci, nama pengguna, kategori, Live Feed, tab Acak, atau peta Terdekat, termasuk model 3D (STL) yang bisa diputar langsung di preview. Pahami isinya lewat penjelasan Gemini yang berjalan otomatis saat berkas dibuka. Pakai dengan benar lewat teks kredit TASL, panduan lisensi CC, dan ringkasan Ketentuan Wikimedia.' },
      { icon: 'spark', title: 'Peran Gemini', body: 'Gemini membaca metadata resmi dari Commons (judul, deskripsi, kategori, lisensi, lokasi), lalu menulis penjelasan berkas, ringkasan lisensi, dan ringkasan area sekitar. Anda tidak perlu memasukkan kunci sendiri. Bila Gemini tidak bisa menjawab, WikiGaleri menampilkan ringkasan berlabel jelas yang dibuat dari metadata, bukan oleh Gemini. Penjelasan ini tidak menggantikan halaman aslinya di Commons.' },
      { icon: 'warn', title: 'Batasan', body: 'Gemini bisa salah atau melewatkan konteks. Kalau metadatanya kosong, penjelasannya ikut terbatas. Ringkasan lisensi hanya penuntun, bukan nasihat hukum. Cek halaman berkas di Commons sebelum memakainya.' },
      { icon: 'scale', title: 'Penafian', body: 'WikiGaleri adalah proyek independen. Aplikasi ini tidak dibuat, didukung, atau dikelola oleh Wikimedia Foundation. Setiap berkas tetap tunduk pada lisensinya masing-masing.' },
      ]
    : [
      { icon: 'help', title: 'Problem we solve', body: 'Wikimedia Commons holds millions of free files, but they are hard to find and hard for most people to understand. License rules and credit lines are confusing too, so files end up reused without proper credit.' },
      { icon: 'bulb', title: 'Why it matters', body: 'Open media is used for learning, teaching, and journalism. Crediting it properly respects the people who made it and keeps open knowledge trustworthy.' },
      { icon: 'check', title: 'How WikiGaleri helps', body: 'Search by keyword, username, category, Live Feed, the Random tab, or the Nearby map, including 3D models (STL) you can rotate right in the preview. Understand a file through the Gemini explanation that starts automatically when you open it. Reuse it correctly with TASL credit text, the CC license guide, and the Wikimedia Terms summary.' },
      { icon: 'spark', title: 'Role of Gemini', body: 'Gemini reads the official Commons metadata (title, description, categories, license, location) and writes a file explanation, a license summary, and a nearby-area summary. You do not need to enter a key of your own. When Gemini cannot answer, WikiGaleri shows a clearly labelled summary built from the metadata, not written by Gemini. It does not replace the original Commons page.' },
      { icon: 'warn', title: 'Limitations', body: 'Gemini can be wrong or miss context. When the metadata is empty, the explanation is limited too. The license summary is a guide, not legal advice. Check the file page on Commons before you reuse anything.' },
      { icon: 'scale', title: 'Disclaimer', body: 'WikiGaleri is an independent project. It is not made, endorsed, or run by the Wikimedia Foundation. Every file stays under its own license.' },
      ];

  const iconFor = (k: string) =>
    k === 'check' ? <CheckCircle2 className="w-4 h-4" />
    : k === 'scale' ? <Scale className="w-4 h-4" />
    : k === 'help' ? <HelpCircle className="w-4 h-4" />
    : k === 'bulb' ? <Lightbulb className="w-4 h-4" />
    : k === 'user' ? <User className="w-4 h-4" />
    : k === 'spark' ? <Sparkles className="w-4 h-4" />
    : k === 'ai' ? <ShieldCheck className="w-4 h-4" />
    : <AlertTriangle className="w-4 h-4" />;

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4 animate-fadeIn" onClick={onClose}>
      <div
        className="w-full max-w-2xl bg-white dark:bg-stone-900 rounded-lg shadow-sm border border-stone-200 dark:border-stone-800 p-6 space-y-6 max-h-[90dvh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-label={id ? 'Apa itu WikiGaleri' : 'What is WikiGaleri'}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between pb-3 border-b border-stone-100 dark:border-stone-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent-50 dark:bg-accent-950/60 border border-accent-200 dark:border-accent-800 flex items-center justify-center text-accent-600 dark:text-accent-400">
              <Info className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-bold text-lg text-stone-900 dark:text-white">
                {id ? 'Apa itu WikiGaleri' : 'What is WikiGaleri'}
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                {id ? 'Masalah yang dijawab, peran Gemini, batasannya, dan pembuatnya' : 'The problem it solves, what Gemini does, its limits, and who made it'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label={id ? 'Tutup' : 'Close'}
            className="p-1.5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-2.5 text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
          {sections.map((s) => (
            <div key={s.title} className="p-3 rounded-lg bg-stone-50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-800">
              <div className="flex items-center gap-2 font-semibold text-stone-900 dark:text-white mb-1">
                <span className="text-accent-600 dark:text-accent-400">{iconFor(s.icon)}</span>
                <span>{s.title}</span>
              </div>
              <p>{s.body}</p>
            </div>
          ))}

          {/* Pembuat */}
          <div className="p-3 rounded-lg bg-accent-50 dark:bg-accent-950/30 border border-accent-200 dark:border-accent-900/60">
            <div className="flex items-center gap-2 font-semibold text-stone-900 dark:text-white mb-1">
              <span className="text-accent-600 dark:text-accent-400">{iconFor('user')}</span>
              <span>{id ? 'Dibuat oleh' : 'Created by'}</span>
            </div>
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <strong className="font-semibold text-stone-900 dark:text-white">Affandy Murad</strong>
              <a
                href="https://affandymurad.github.io/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-medium text-accent-700 dark:text-accent-300 underline decoration-accent-300 hover:text-accent-900 dark:hover:text-accent-100"
              >
                {id ? 'Situs web' : 'Website'}
                <ExternalLink className="w-3 h-3" />
              </a>
              <a
                href="https://meta.wikimedia.org/wiki/User:Affandy_Murad"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-medium text-accent-700 dark:text-accent-300 underline decoration-accent-300 hover:text-accent-900 dark:hover:text-accent-100"
              >
                {id ? 'Profil Wikimedia' : 'Wikimedia profile'}
                <ExternalLink className="w-3 h-3" />
              </a>
            </p>
          </div>
        </div>

        <div className="flex justify-end pt-3 border-t border-stone-100 dark:border-stone-800">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-stone-900 text-white dark:bg-white dark:text-stone-900 rounded-lg text-xs font-medium hover:opacity-90 transition-opacity"
          >
            {id ? 'Tutup' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
