import React, { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { Translations } from '../i18n/translations';

interface SearchBarProps {
  currentQuery: string;
  onSearch: (query: string) => void;
  placeholder?: string;
  t: Translations;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  currentQuery,
  onSearch,
  placeholder,
  t,
}) => {
  const [inputValue, setInputValue] = useState(currentQuery);

  useEffect(() => {
    setInputValue(currentQuery);
  }, [currentQuery]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(inputValue.trim());
  };

  const handleClear = () => {
    setInputValue('');
    onSearch('');
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        {/* Main Search Input */}
        <div className="relative flex-1 flex items-center">
          <div className="absolute left-4 pointer-events-none text-stone-400">
            <Search className="w-5 h-5" />
          </div>

          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={placeholder || t.search.placeholder}
            className="w-full pl-12 pr-10 py-3.5 text-base rounded-lg bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-800 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-accent-600 focus:border-transparent transition-all shadow-xs"
          />

          {inputValue && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-3 p-1 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 rounded-md transition-colors cursor-pointer"
              title="Clear input"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Regular "Cari / Search" Button */}
        <button
          type="submit"
          className="px-6 py-3.5 text-sm sm:text-base font-semibold text-white bg-accent-600 hover:bg-accent-700 active:bg-accent-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          {t.search.searchBtn}
        </button>
      </form>
    </div>
  );
};
