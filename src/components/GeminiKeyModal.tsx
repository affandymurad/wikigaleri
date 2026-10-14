import React, { useState, useEffect } from 'react';
import { Key, Eye, EyeOff, Check, X, ExternalLink, ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';
import { Translations } from '../i18n/translations';

interface GeminiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentKey: string;
  onSaveKey: (key: string) => Promise<boolean>;
  onRemoveKey: () => void;
  t: Translations;
  lastError?: string | null;
}

export const GeminiKeyModal: React.FC<GeminiKeyModalProps> = ({
  isOpen,
  onClose,
  currentKey,
  onSaveKey,
  onRemoveKey,
  t,
  lastError,
}) => {
  const [inputKey, setInputKey] = useState(currentKey);
  const [showKey, setShowKey] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    setInputKey(currentKey);
    setStatusMessage(null);
  }, [currentKey, isOpen]);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputKey.trim()) {
      setStatusMessage({ type: 'error', text: t.geminiModal.emptyKeyMsg });
      return;
    }

    setIsTesting(true);
    setStatusMessage(null);

    const success = await onSaveKey(inputKey.trim());
    setIsTesting(false);

    if (success) {
      setStatusMessage({ type: 'success', text: t.geminiModal.successMsg });
      setTimeout(() => {
        onClose();
      }, 1200);
    } else {
      setStatusMessage({ type: 'error', text: lastError || t.geminiModal.errorMsg });
    }
  };

  const handleRemove = () => {
    onRemoveKey();
    setInputKey('');
    setStatusMessage({ type: 'success', text: 'API key removed from browser storage.' });
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4 animate-fadeIn">
      <div className="w-full max-w-lg bg-white dark:bg-stone-900 rounded-lg shadow-sm border border-stone-200 dark:border-stone-800 p-6 space-y-5">
        
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent-50 dark:bg-accent-950/60 border border-accent-200 dark:border-accent-800 flex items-center justify-center text-accent-600 dark:text-accent-400">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-bold text-base sm:text-lg text-stone-900 dark:text-white">
                {t.geminiModal.title}
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                {t.geminiModal.subtitle}
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

        {/* Form */}
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-stone-700 dark:text-stone-300">
              {t.geminiModal.keyLabel}
            </label>
            <div className="relative flex items-center">
              <input
                type={showKey ? 'text' : 'password'}
                value={inputKey}
                onChange={(e) => setInputKey(e.target.value)}
                placeholder={t.geminiModal.placeholder}
                className="w-full pl-3.5 pr-20 py-2.5 text-xs font-mono rounded-lg bg-stone-50 dark:bg-stone-950 border border-stone-300 dark:border-stone-700 text-stone-900 dark:text-white placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-accent-600"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 p-1 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 text-xs flex items-center gap-1"
                title={showKey ? 'Hide' : 'Show'}
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Status Message */}
          {statusMessage && (
            <div
              className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
                statusMessage.type === 'success'
                  ? 'bg-moss-50 text-moss-800 dark:bg-moss-950/50 dark:text-moss-200 border border-moss-200 dark:border-moss-800'
                  : 'bg-accent-50 text-accent-800 dark:bg-accent-950/50 dark:text-accent-200 border border-accent-200 dark:border-accent-800'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <Check className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* Privacy & How to obtain card */}
          <div className="p-3.5 bg-stone-50 dark:bg-stone-800/40 rounded-lg border border-stone-200 dark:border-stone-800 space-y-2 text-xs text-stone-600 dark:text-stone-400">
            <div className="flex items-center gap-1.5 font-medium text-stone-800 dark:text-stone-200">
              <ShieldCheck className="w-4 h-4 text-moss-600 dark:text-moss-400" />
              <span>{t.geminiModal.privacyTitle}</span>
            </div>
            <p className="text-xs leading-relaxed">
              {t.geminiModal.privacyDesc}
            </p>
            <div className="pt-1">
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent-600 dark:text-accent-400 hover:underline inline-flex items-center gap-1 font-medium text-xs"
              >
                <span>{t.geminiModal.getKeyLink}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-2">
            {currentKey ? (
              <button
                type="button"
                onClick={handleRemove}
                className="text-xs text-accent-600 hover:text-accent-700 dark:text-accent-400 font-medium px-2 py-1 transition-colors"
              >
                {t.geminiModal.removeKey}
              </button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition-colors"
              >
                {t.geminiModal.cancel}
              </button>
              <button
                type="submit"
                disabled={isTesting}
                className="px-4 py-2 text-xs font-medium text-white bg-accent-600 hover:bg-accent-700 disabled:opacity-60 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
              >
                {isTesting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>{t.geminiModal.verifying}</span>
                  </>
                ) : (
                  <span>{t.geminiModal.saveVerify}</span>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
