import React, { useState } from 'react';
import { CommonsMediaItem } from '../types/wikimedia';
import { generateAttribution, getLicenseInfo } from '../utils/licenseUtils';
import { X, Copy, Check, ExternalLink, ShieldCheck } from 'lucide-react';
import { Translations } from '../i18n/translations';

interface AttributionQuickCopyModalProps {
  item: CommonsMediaItem | null;
  onClose: () => void;
  t: Translations;
}

export const AttributionQuickCopyModal: React.FC<AttributionQuickCopyModalProps> = ({
  item,
  onClose,
  t,
}) => {
  const [format, setFormat] = useState<'plain' | 'markdown' | 'html' | 'wikitext'>('plain');
  const [copied, setCopied] = useState(false);

  if (!item) return null;

  const licenseInfo = getLicenseInfo(item);
  const text = generateAttribution(item, format);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
        
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-bold text-base sm:text-lg text-slate-900 dark:text-white">
                {t.attributionModal.title}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t.attributionModal.subtitle}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Media Preview Mini */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center gap-3 text-xs">
          {item.thumbnailUrl && (
            <img
              src={item.thumbnailUrl}
              alt=""
              className="w-12 h-12 rounded-lg object-cover shrink-0 bg-slate-200 dark:bg-slate-700"
            />
          )}
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-slate-900 dark:text-white truncate">
              {item.cleanTitle}
            </div>
            <div className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
              <span>{item.author || 'Wikimedia Commons'}</span> ·{' '}
              <span className="font-medium text-slate-700 dark:text-slate-300">{licenseInfo.label}</span>
            </div>
          </div>
        </div>

        {/* Format Selector */}
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium text-slate-700 dark:text-slate-300">
            {t.attributionModal.chooseFormat}
          </span>
          <div className="flex items-center gap-1 p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg">
            {(['plain', 'markdown', 'html', 'wikitext'] as const).map((fmt) => (
              <button
                key={fmt}
                onClick={() => setFormat(fmt)}
                className={`px-2.5 py-1 text-xs rounded-md capitalize transition-all ${
                  format === fmt
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-medium shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {fmt}
              </button>
            ))}
          </div>
        </div>

        {/* Textarea preview */}
        <div className="relative">
          <textarea
            readOnly
            rows={4}
            value={text}
            className="w-full p-3 font-mono text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-1">
          <a
            href={licenseInfo.deedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-medium"
          >
            <span>{t.attributionModal.openDeed(licenseInfo.label)}</span>
            <ExternalLink className="w-3 h-3" />
          </a>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              {t.attributionModal.close}
            </button>
            <button
              onClick={handleCopy}
              className="px-4 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? t.attributionModal.copiedBtn : t.attributionModal.copyBtn}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
