import React, { useState } from 'react';
import { CURATED_TOPICS, CURATED_TOPIC_GROUPS } from '../services/wikimediaApi';
import {
  Compass,
  Camera,
  Image,
  Music,
  Video,
  FileText,
  Sparkles,
  Map,
  Globe,
  Info,
  Layers,
  Palette,
  Landmark,
  Shield,
  Utensils,
  BookOpen,
  Ship,
  Building2,
  Mountain,
  TreePine,
  Fish,
  Flame,
  CloudLightning,
  Scroll,
  PenTool,
  Cpu,
  Search,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Translations } from '../i18n/translations';
import { CuratedTopicGroup } from '../types/wikimedia';

interface CuratedTopicsProps {
  activeTopicId: string;
  onSelectTopic: (topicId: string) => void;
  t: Translations;
  defaultCollapsed?: boolean;
}

export const CuratedTopics: React.FC<CuratedTopicsProps> = ({
  activeTopicId,
  onSelectTopic,
  t,
  defaultCollapsed = false,
}) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(defaultCollapsed);
  const [selectedGroup, setSelectedGroup] = useState<CuratedTopicGroup | 'all'>('all');

  // Assign specific icon and color scheme for each topic
  const getTopicIcon = (topicId: string) => {
    switch (topicId) {
      // 1. Format Media
      case 'photographs':
        return <Camera className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />;
      case 'vintage-posters':
        return <Image className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />;
      case 'classical-audio':
        return <Music className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400" />;
      case 'historic-video':
        return <Video className="w-3.5 h-3.5 text-purple-500 dark:text-purple-400" />;
      case 'manuscripts-docs':
        return <FileText className="w-3.5 h-3.5 text-orange-500 dark:text-orange-400" />;
      case 'historical-maps':
        return <Map className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />;
      case 'diagrams-science':
        return <Layers className="w-3.5 h-3.5 text-cyan-500 dark:text-cyan-400" />;

      // 2. Budaya & Nusantara
      case 'indonesia-heritage':
        return <Compass className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />;
      case 'batik-textiles':
        return <Palette className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />;
      case 'wayang-puppet':
        return <Sparkles className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />;
      case 'candi-heritage':
        return <Landmark className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />;
      case 'traditional-arch-id':
        return <Building2 className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />;
      case 'indonesian-heroes':
        return <Shield className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />;
      case 'indonesian-cuisine':
        return <Utensils className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />;

      // 3. Alam & Sains
      case 'astronomy':
        return <Sparkles className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />;
      case 'wildlife':
        return <Globe className="w-3.5 h-3.5 text-teal-500 dark:text-teal-400" />;
      case 'botany-flora':
        return <TreePine className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />;
      case 'marine-life':
        return <Fish className="w-3.5 h-3.5 text-cyan-500 dark:text-cyan-400" />;
      case 'volcanoes-geology':
        return <Flame className="w-3.5 h-3.5 text-red-500 dark:text-red-400" />;
      case 'microscopy':
        return <Cpu className="w-3.5 h-3.5 text-violet-500 dark:text-violet-400" />;
      case 'weather-phenomena':
        return <CloudLightning className="w-3.5 h-3.5 text-yellow-500 dark:text-yellow-400" />;

      // 4. Sejarah Dunia
      case 'ancient-egypt':
        return <Landmark className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />;
      case 'renaissance-art':
        return <Palette className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400" />;
      case 'world-war-history':
        return <Shield className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />;
      case 'industrial-heritage':
        return <Building2 className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-400" />;
      case 'ancient-rome':
        return <Scroll className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />;
      case 'maritime-history':
        return <Ship className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />;

      // 5. Tempat & Geografi
      case 'mountains-peaks':
        return <Mountain className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />;
      case 'unesco-world-heritage':
        return <Globe className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />;
      case 'bridges-viaducts':
        return <Building2 className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />;
      case 'islands-archipelago':
        return <Ship className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />;
      case 'historic-castles':
        return <Landmark className="w-3.5 h-3.5 text-stone-600 dark:text-stone-400" />;

      // 6. Seni Rupa
      case 'paintings-fine-art':
        return <Palette className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400" />;
      case 'sculptures-statues':
        return <Building2 className="w-3.5 h-3.5 text-stone-500 dark:text-stone-400" />;
      case 'calligraphy-arts':
        return <PenTool className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />;
      case 'drawings-sketches':
        return <BookOpen className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />;

      default:
        return <Compass className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />;
    }
  };

  const activeTopic = CURATED_TOPICS.find((topic) => topic.id === activeTopicId);
  const activeTopicI18n = activeTopic
    ? t.curated.topics[activeTopic.id] || {
        label: activeTopic.label,
        description: activeTopic.description,
        typeLabel: 'Koleksi Kurasi',
      }
    : null;

  // Filter topics based on active group
  const displayedTopics =
    selectedGroup === 'all'
      ? CURATED_TOPICS
      : CURATED_TOPICS.filter((t) => t.group === selectedGroup);

  return (
    <section
      className="w-full space-y-3 pt-1 rounded-2xl transition-all"
      aria-label="Papan Koleksi Kurasi"
    >
      {/* Collapsible Header with Toggle Button */}
      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 select-none">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-6 h-6 rounded-lg bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shadow-2xs shrink-0">
            <Compass className="w-3.5 h-3.5" />
          </div>
          <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs sm:text-sm">
            {t.curated.title}
          </span>
          <span className="font-mono text-[11px] tabular-nums text-slate-500 dark:text-slate-400 bg-slate-200/60 dark:bg-slate-800/60 px-2 py-0.5 rounded-full shrink-0">
            {CURATED_TOPICS.length} topik
          </span>

          {/* If collapsed and topic is active, show compact badge */}
          {isCollapsed && activeTopic && activeTopicI18n && (
            <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200/50 dark:border-purple-800/40 text-[11px] truncate">
              {getTopicIcon(activeTopic.id)}
              <span className="font-medium truncate">{activeTopicI18n.label}</span>
            </div>
          )}
        </div>

        {/* Collapsible Trigger Button */}
        <button
          type="button"
          onClick={() => setIsCollapsed((prev) => !prev)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 hover:bg-slate-200/70 dark:bg-slate-800 dark:hover:bg-slate-700/80 border border-slate-200/80 dark:border-slate-700 transition-all cursor-pointer shadow-2xs"
          aria-expanded={!isCollapsed}
          title={isCollapsed ? t.curated.show : t.curated.hide}
        >
          <span>{isCollapsed ? t.curated.show : t.curated.hide}</span>
          {isCollapsed ? (
            <ChevronDown className="w-3.5 h-3.5 text-slate-500 transition-transform duration-200" />
          ) : (
            <ChevronUp className="w-3.5 h-3.5 text-slate-500 transition-transform duration-200" />
          )}
        </button>
      </div>

      {/* Collapsible Content */}
      {!isCollapsed && (
        <div className="space-y-3.5 animate-in fade-in slide-in-from-top-1 duration-200">
          {/* Group Selector Chips (Tipe Koleksi) */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-200/60 dark:bg-slate-800/60 rounded-xl overflow-x-auto max-w-full text-xs scrollbar-none">
            <button
              type="button"
              onClick={() => setSelectedGroup('all')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer whitespace-nowrap ${
                selectedGroup === 'all'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {t.curated.groups?.all || 'Semua Koleksi'}
            </button>

            {CURATED_TOPIC_GROUPS.map((group) => {
              const isGroupActive = selectedGroup === group.id;
              const groupName = t.curated.groups?.[group.id] || group.labelId;
              const countInGroup = CURATED_TOPICS.filter((tp) => tp.group === group.id).length;

              return (
                <button
                  key={group.id}
                  type="button"
                  onClick={() => setSelectedGroup(group.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer whitespace-nowrap ${
                    isGroupActive
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <span>{groupName}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                      isGroupActive
                        ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300'
                        : 'bg-slate-200/80 dark:bg-slate-800 text-slate-500'
                    }`}
                  >
                    {countInGroup}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Segmented Category Chips */}
          <div
            className="flex flex-wrap items-center gap-1.5 sm:gap-2 p-2 bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-800 rounded-2xl max-w-full shadow-2xs"
            role="tablist"
            aria-label="Koleksi Kurasi Wikimedia"
          >
            {displayedTopics.map((topic) => {
              const isActive = activeTopicId === topic.id;
              const topicI18n = t.curated.topics[topic.id] || {
                label: topic.label,
                description: topic.description,
                typeLabel: 'Curated',
              };

              return (
                <button
                  key={topic.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => onSelectTopic(topic.id)}
                  className={`flex items-center gap-2 px-3 sm:px-3.5 py-2 rounded-xl text-xs sm:text-sm transition-all cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-semibold scale-[1.01] ring-1 ring-black/5 dark:ring-white/10'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-700/60 font-medium'
                  }`}
                  title={topicI18n.description}
                >
                  <span className="shrink-0">{getTopicIcon(topic.id)}</span>
                  <span>{topicI18n.label}</span>
                  {isActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Active Topic Description Banner */}
          {activeTopic && activeTopicI18n && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-800/70 text-xs text-slate-600 dark:text-slate-400 animate-fadeIn">
              <div className="flex items-center gap-2.5 min-w-0">
                <Info className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                <div className="flex items-center gap-2 min-w-0 flex-wrap">
                  <span className="font-semibold text-slate-900 dark:text-slate-100 shrink-0">
                    {activeTopicI18n.label}:
                  </span>
                  <span className="truncate">{activeTopicI18n.description}</span>
                </div>
              </div>

              {activeTopic.categoryName && (
                <div className="flex items-center gap-1.5 shrink-0 self-start sm:self-auto text-[11px] font-mono text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 px-2 py-0.5 rounded-lg border border-purple-200/50 dark:border-purple-900/40">
                  <Search className="w-3 h-3" />
                  <span>Category:{activeTopic.categoryName}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
};
