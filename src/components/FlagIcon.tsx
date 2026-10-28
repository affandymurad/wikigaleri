import React from 'react';

interface FlagIconProps {
  countryCode: string;
  className?: string;
}

export const FlagIcon: React.FC<FlagIconProps> = ({
  countryCode,
  className = 'w-5 h-3.5 inline-block shrink-0 rounded-xs overflow-hidden shadow-xs border border-black/10',
}) => {
  const code = (countryCode || '').toLowerCase().trim();

  // Regional Indonesian languages map to Indonesian flag
  if (['id', 'jv', 'su', 'min', 'ace', 'ban', 'bjn', 'bug', 'gor', 'mad'].includes(code)) {
    return (
      <svg viewBox="0 0 36 24" className={className} xmlns="http://www.w3.org/2000/svg">
        <rect width="36" height="12" fill="#E70011" />
        <rect y="12" width="36" height="12" fill="#FFFFFF" />
      </svg>
    );
  }

  // Bendera resmi dari Wikimedia Commons (Korea Selatan, Amerika Serikat)
  const OFFICIAL: Record<string, string> = {
    kr: 'Flag_of_South_Korea.svg',
    ko: 'Flag_of_South_Korea.svg',
    us: 'Flag_of_the_United_States.svg',
    il: 'Flag_of_Israel.svg',
    he: 'Flag_of_Israel.svg',
    en: 'Flag_of_the_United_States.svg',
  };
  if (OFFICIAL[code]) {
    return (
      <img
        src={`https://commons.wikimedia.org/wiki/Special:FilePath/${OFFICIAL[code]}?width=80`}
        alt=""
        loading="lazy"
        referrerPolicy="no-referrer"
        className={`${className} object-cover`}
      />
    );
  }

  // Malaysia Flag
  if (code === 'my' || code === 'ms') {
    return (
      <svg viewBox="0 0 36 24" className={className} xmlns="http://www.w3.org/2000/svg">
        {Array.from({ length: 14 }).map((_, i) => (
          <rect
            key={i}
            y={(i * 24) / 14}
            width="36"
            height={24 / 14 + 0.1}
            fill={i % 2 === 0 ? '#CC0000' : '#FFFFFF'}
          />
        ))}
        <rect width="18" height={13.7} fill="#000066" />
        <circle cx="7.5" cy="6.8" r="4.2" fill="#FFCC00" />
        <circle cx="8.6" cy="6.8" r="3.6" fill="#000066" />
        <polygon
          points="12,4.5 12.8,6.2 14.5,5.8 13.8,7.4 15.3,8.2 13.6,8.7 14,10.4 12.5,9.6 12,11.3 11.5,9.6 10,10.4 10.4,8.7 8.7,8.2 10.2,7.4 9.5,5.8 11.2,6.2"
          fill="#FFCC00"
        />
      </svg>
    );
  }

  // United Kingdom Flag
  if (code === 'gb' || code === 'uk') {
    return (
      <svg viewBox="0 0 36 24" className={className} xmlns="http://www.w3.org/2000/svg">
        <rect width="36" height="24" fill="#012169" />
        <path d="M0 0 L36 24 M36 0 L0 24" stroke="#FFFFFF" strokeWidth="4" />
        <path d="M0 0 L36 24 M36 0 L0 24" stroke="#C8102E" strokeWidth="2.2" />
        <path d="M18 0 V24 M0 12 H36" stroke="#FFFFFF" strokeWidth="6.5" />
        <path d="M18 0 V24 M0 12 H36" stroke="#C8102E" strokeWidth="3.8" />
      </svg>
    );
  }

  // Spain Flag
  if (code === 'es') {
    return (
      <svg viewBox="0 0 36 24" className={className} xmlns="http://www.w3.org/2000/svg">
        <rect width="36" height="6" fill="#AA151B" />
        <rect y="6" width="36" height="12" fill="#F1BF00" />
        <rect y="18" width="36" height="6" fill="#AA151B" />
        <circle cx="10" cy="12" r="2.2" fill="#AA151B" opacity="0.6" />
      </svg>
    );
  }

  // France Flag
  if (code === 'fr') {
    return (
      <svg viewBox="0 0 36 24" className={className} xmlns="http://www.w3.org/2000/svg">
        <rect width="12" height="24" fill="#002654" />
        <rect x="12" width="12" height="24" fill="#FFFFFF" />
        <rect x="24" width="12" height="24" fill="#CE1126" />
      </svg>
    );
  }

  // Germany Flag
  if (code === 'de') {
    return (
      <svg viewBox="0 0 36 24" className={className} xmlns="http://www.w3.org/2000/svg">
        <rect width="36" height="8" fill="#000000" />
        <rect y="8" width="36" height="8" fill="#DD0000" />
        <rect y="16" width="36" height="8" fill="#FFCC00" />
      </svg>
    );
  }

  // Japan Flag
  if (code === 'jp' || code === 'ja') {
    return (
      <svg viewBox="0 0 36 24" className={className} xmlns="http://www.w3.org/2000/svg">
        <rect width="36" height="24" fill="#FFFFFF" />
        <circle cx="18" cy="12" r="7" fill="#BC002D" />
      </svg>
    );
  }

  // China Flag
  if (code === 'cn' || code === 'zh') {
    return (
      <svg viewBox="0 0 36 24" className={className} xmlns="http://www.w3.org/2000/svg">
        <rect width="36" height="24" fill="#DE2910" />
        <polygon points="6,3.5 7,6 9.5,6 7.5,7.5 8.2,10 6,8.5 3.8,10 4.5,7.5 2.5,6 5,6" fill="#FFDE00" />
        <circle cx="12" cy="3.5" r="0.8" fill="#FFDE00" />
        <circle cx="14" cy="5.5" r="0.8" fill="#FFDE00" />
        <circle cx="14" cy="8.5" r="0.8" fill="#FFDE00" />
        <circle cx="12" cy="10.5" r="0.8" fill="#FFDE00" />
      </svg>
    );
  }

  // Arabic / Saudi Flag
  if (code === 'ar' || code === 'sa') {
    return (
      <svg viewBox="0 0 36 24" className={className} xmlns="http://www.w3.org/2000/svg">
        <rect width="36" height="24" fill="#006C35" />
        <path d="M8 12 h20 M12 15 h12" stroke="#FFFFFF" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    );
  }

  // Netherlands Flag
  if (code === 'nl') {
    return (
      <svg viewBox="0 0 36 24" className={className} xmlns="http://www.w3.org/2000/svg">
        <rect width="36" height="8" fill="#AE1C28" />
        <rect y="8" width="36" height="8" fill="#FFFFFF" />
        <rect y="16" width="36" height="8" fill="#21468B" />
      </svg>
    );
  }

  // Italy Flag
  if (code === 'it') {
    return (
      <svg viewBox="0 0 36 24" className={className} xmlns="http://www.w3.org/2000/svg">
        <rect width="12" height="24" fill="#009246" />
        <rect x="12" width="12" height="24" fill="#FFFFFF" />
        <rect x="24" width="12" height="24" fill="#CE2B37" />
      </svg>
    );
  }

  // Portugal Flag
  if (code === 'pt') {
    return (
      <svg viewBox="0 0 36 24" className={className} xmlns="http://www.w3.org/2000/svg">
        <rect width="14" height="24" fill="#046A38" />
        <rect x="14" width="22" height="24" fill="#DA291C" />
        <circle cx="14" cy="12" r="3.5" fill="#FFDD00" />
      </svg>
    );
  }

  // Russia Flag
  if (code === 'ru') {
    return (
      <svg viewBox="0 0 36 24" className={className} xmlns="http://www.w3.org/2000/svg">
        <rect width="36" height="8" fill="#FFFFFF" />
        <rect y="8" width="36" height="8" fill="#0039A6" />
        <rect y="16" width="36" height="8" fill="#D52B1E" />
      </svg>
    );
  }

  // Vietnam Flag
  if (code === 'vi') {
    return (
      <svg viewBox="0 0 36 24" className={className} xmlns="http://www.w3.org/2000/svg">
        <rect width="36" height="24" fill="#DA251D" />
        <polygon points="18,5 19.8,10.6 25.6,10.6 20.9,14.1 22.7,19.7 18,16.2 13.3,19.7 15.1,14.1 10.4,10.6 16.2,10.6" fill="#FFFF00" />
      </svg>
    );
  }

  // Thailand Flag
  if (code === 'th') {
    return (
      <svg viewBox="0 0 36 24" className={className} xmlns="http://www.w3.org/2000/svg">
        <rect width="36" height="4" fill="#A51931" />
        <rect y="4" width="36" height="4" fill="#F4F5F8" />
        <rect y="8" width="36" height="8" fill="#2D2A4A" />
        <rect y="16" width="36" height="4" fill="#F4F5F8" />
        <rect y="20" width="36" height="4" fill="#A51931" />
      </svg>
    );
  }

  // Turkey Flag
  if (code === 'tr') {
    return (
      <svg viewBox="0 0 36 24" className={className} xmlns="http://www.w3.org/2000/svg">
        <rect width="36" height="24" fill="#E30A17" />
        <circle cx="15" cy="12" r="6" fill="#FFFFFF" />
        <circle cx="16.5" cy="12" r="4.8" fill="#E30A17" />
        <polygon points="21,12 24,11 22.2,13.5 22.2,10.5 24,13" fill="#FFFFFF" />
      </svg>
    );
  }

  // Poland Flag
  if (code === 'pl') {
    return (
      <svg viewBox="0 0 36 24" className={className} xmlns="http://www.w3.org/2000/svg">
        <rect width="36" height="12" fill="#FFFFFF" />
        <rect y="12" width="36" height="12" fill="#DC143C" />
      </svg>
    );
  }

  // Sweden Flag
  if (code === 'sv' || code === 'se') {
    return (
      <svg viewBox="0 0 36 24" className={className} xmlns="http://www.w3.org/2000/svg">
        <rect width="36" height="24" fill="#006AA7" />
        <rect x="10" width="4" height="24" fill="#FECC00" />
        <rect y="10" width="36" height="4" fill="#FECC00" />
      </svg>
    );
  }

  // Ukraine Flag
  if (code === 'uk' || code === 'ua') {
    return (
      <svg viewBox="0 0 36 24" className={className} xmlns="http://www.w3.org/2000/svg">
        <rect width="36" height="12" fill="#005BBB" />
        <rect y="12" width="36" height="12" fill="#FFD500" />
      </svg>
    );
  }

  // India Flag
  if (code === 'hi' || code === 'in' || code === 'ta') {
    return (
      <svg viewBox="0 0 36 24" className={className} xmlns="http://www.w3.org/2000/svg">
        <rect width="36" height="8" fill="#FF9933" />
        <rect y="8" width="36" height="8" fill="#FFFFFF" />
        <rect y="16" width="36" height="8" fill="#128807" />
        <circle cx="18" cy="12" r="3" fill="#000080" />
      </svg>
    );
  }

  // Multilingual or Wikimedia Project (Commons, Meta, Wikispecies)
  if (['commons', 'species', 'meta', 'wikidata', 'multilingual', 'incubator'].includes(code)) {
    return (
      <svg viewBox="0 0 36 24" className={className} xmlns="http://www.w3.org/2000/svg">
        <rect width="36" height="24" fill="#E8F0FE" />
        <circle cx="18" cy="12" r="7.5" fill="none" stroke="#1A73E8" strokeWidth="1.5" />
        <path d="M10.5 12 h15 M18 4.5 c-3 3.5 -3 11.5 0 15 M18 4.5 c3 3.5 3 11.5 0 15" fill="none" stroke="#1A73E8" strokeWidth="1" />
      </svg>
    );
  }

  // Neutral Flag / Unknown code fallback
  return (
    <svg viewBox="0 0 36 24" className={className} xmlns="http://www.w3.org/2000/svg">
      <rect width="36" height="24" fill="#ECE7DE" />
      <text
        x="18"
        y="15"
        fontSize="9"
        textAnchor="middle"
        fill="#5C5346"
        fontWeight="bold"
        fontFamily="monospace"
      >
        {code.toUpperCase().slice(0, 2)}
      </text>
    </svg>
  );
};
