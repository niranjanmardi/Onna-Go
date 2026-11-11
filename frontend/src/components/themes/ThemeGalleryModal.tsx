import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Search,
  Check,
  RotateCcw,
  Sparkles,
  Eye,
  ArrowLeft,
  ChevronRight,
  Palette,
  Image as ImageIcon,
} from 'lucide-react';
import {
  THEMES_CATALOG,
  THEME_CATEGORIES,
  ThemeCategory,
  ThemeItem,
  FEATURED_THEME,
  DEFAULT_THEME,
  searchThemes,
} from '@/config/themes';
import { useTheme } from '@/context/ThemeContext';
import { useFeedback } from '@/context/FeedbackContext';

interface ThemeGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ThemeGalleryModal: React.FC<ThemeGalleryModalProps> = ({ isOpen, onClose }) => {
  const {
    activeThemeId,
    activeTheme,
    overlayOpacity,
    overlayStyle,
    blurLevel,
    setWallpaperTheme,
    resetWallpaperTheme,
  } = useTheme();

  const { playClick, showConfirmation } = useFeedback();

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ThemeCategory>('all');

  // Preview Drawer State (null = no preview open)
  const [previewTheme, setPreviewTheme] = useState<ThemeItem | null>(null);
  const [previewOpacity, setPreviewOpacity] = useState<number>(overlayOpacity);
  const [previewStyle, setPreviewStyle] = useState<'dark' | 'light' | 'glass'>(overlayStyle);
  const [previewBlur, setPreviewBlur] = useState<number>(blurLevel);
  const [isApplying, setIsApplying] = useState(false);

  // Filtered themes
  const filteredThemes = useMemo(() => {
    return searchThemes(searchQuery, selectedCategory);
  }, [searchQuery, selectedCategory]);

  // Completely hide application bottom navigation when gallery or preview is open
  useEffect(() => {
    if (isOpen) {
      window.dispatchEvent(new CustomEvent('onnago_toggle_bottom_nav', { detail: { hide: true } }));
    }
    return () => {
      window.dispatchEvent(new CustomEvent('onnago_toggle_bottom_nav', { detail: { hide: false } }));
    };
  }, [isOpen]);

  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  const handleOpenPreview = (theme: ThemeItem) => {
    playClick();
    setPreviewTheme(theme);
    setPreviewOpacity(theme.default_opacity ?? overlayOpacity);
    setPreviewStyle(theme.overlay_style ?? 'dark');
    setPreviewBlur(0);
  };

  const handleApplyPreview = async () => {
    if (!previewTheme) return;
    setIsApplying(true);
    try {
      await setWallpaperTheme(previewTheme.id, {
        overlayOpacity: previewOpacity,
        overlayStyle: previewStyle,
        blurLevel: previewBlur,
      });
      showConfirmation({
        title: 'Wallpaper Applied',
        message: `Applied "${previewTheme.name}" as your active wallpaper.`,
        sound: 'trip_success',
      });
      setPreviewTheme(null);
    } finally {
      setIsApplying(false);
    }
  };

  const handleResetToDefault = async () => {
    playClick();
    await resetWallpaperTheme();
    showConfirmation({
      title: 'Default Theme Restored',
      message: `Reset wallpaper to "${DEFAULT_THEME.name}".`,
      sound: 'notification',
    });
    setPreviewTheme(null);
  };

  // =========================================================================
  // VIEW 1: DEDICATED FULL-SCREEN WALLPAPER PREVIEW OVERLAY
  // When a wallpaper is selected for preview, render this true full-screen
  // viewport-constrained modal portal above the entire application shell.
  // =========================================================================
  if (previewTheme) {
    return createPortal(
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Wallpaper Preview"
        className="fixed inset-0 z-[10000] flex flex-col h-[100dvh] w-full bg-[#0A0A0C] text-white overflow-hidden select-none animate-in fade-in duration-150"
      >
        {/* Fixed Non-Scrolling Header */}
        <header className="h-14 shrink-0 px-4 sm:px-6 flex items-center justify-between border-b border-white/10 bg-[#121216]/95 backdrop-blur-xl z-20">
          <button
            type="button"
            onClick={() => setPreviewTheme(null)}
            className="flex items-center gap-2 text-xs font-bold text-white/80 hover:text-white cursor-pointer px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 transition-all"
            aria-label="Back to gallery"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to gallery</span>
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#22C55E] flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Wallpaper Preview</span>
            </span>
          </div>
        </header>

        {/* Independently Scrollable Canvas Body */}
        <main className="relative flex-1 min-h-0 overflow-y-auto overscroll-contain flex items-center justify-center p-4 sm:p-6 z-10">
          {/* Full Background Wallpaper with Live Filter settings */}
          <div className="absolute inset-0 overflow-hidden select-none pointer-events-none">
            <img
              src={previewTheme.full_url}
              alt={previewTheme.name}
              className="w-full h-full object-cover object-center transition-all duration-300"
              style={{
                filter: previewBlur > 0 ? `blur(${previewBlur}px)` : 'none',
                transform: previewBlur > 0 ? 'scale(1.04)' : 'none',
              }}
            />
            {/* Contrast overlay */}
            <div
              className="absolute inset-0 transition-colors duration-200"
              style={{
                backgroundColor:
                  previewStyle === 'light'
                    ? `rgba(247, 247, 248, ${previewOpacity})`
                    : `rgba(11, 11, 12, ${previewOpacity})`,
                backdropFilter: previewStyle === 'glass' ? 'blur(10px)' : 'none',
              }}
            />
          </div>

          {/* Sample ONNA-GO Card to verify contrast */}
          <div className="glass-solid relative z-10 w-full max-w-sm rounded-3xl p-5 shadow-2xl space-y-3.5 border border-white/40 text-white my-auto">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#22C55E] block">
                  {previewTheme.category_label}
                </span>
                <h3 className="text-base font-bold text-white drop-shadow-xs truncate">
                  {previewTheme.name}
                </h3>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {previewTheme.palette.map((color, idx) => (
                  <span
                    key={idx}
                    className="w-3.5 h-3.5 rounded-full border border-black/20"
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
            </div>

            <p className="text-xs text-white/80 leading-relaxed font-medium">
              {previewTheme.description}
            </p>

            {/* Sample Financial Balance Card preview */}
            <div className="p-3.5 rounded-2xl glass-card border border-white/20 flex items-center justify-between shadow-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-white/60 block mb-0.5">
                  Readability Preview
                </span>
                <p className="text-xs font-bold text-white">
                  Trip Total: <span className="font-mono text-[#22C55E]">₹ 14,850.00</span>
                </p>
              </div>
              <span className="text-[10px] font-extrabold px-2 py-1 rounded-md bg-[#22C55E]/20 text-[#22C55E] border border-[#22C55E]/30">
                WCAG AAA OK
              </span>
            </div>
          </div>
        </main>

        {/* Fixed Non-Scrolling Action Footer with Safe-Area Padding */}
        <footer className="shrink-0 border-t border-white/15 bg-[#121216] p-4 space-y-3 z-30 pb-[calc(1rem+env(safe-area-inset-bottom,16px))]">
          <div className="max-w-md mx-auto space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Opacity slider */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-white/70">Dimming / Contrast Overlay</span>
                  <span className="font-mono text-white font-bold">
                    {Math.round(previewOpacity * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  aria-label="Dimming / Contrast Overlay"
                  min="0.20"
                  max="0.90"
                  step="0.05"
                  value={previewOpacity}
                  onChange={(e) => setPreviewOpacity(parseFloat(e.target.value))}
                  className="w-full accent-[#22C55E] cursor-pointer"
                />
              </div>

              {/* Blur slider */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-white/70">Background Softness</span>
                  <span className="font-mono text-white font-bold">
                    {previewBlur}px
                  </span>
                </div>
                <input
                  type="range"
                  aria-label="Background Softness"
                  min="0"
                  max="8"
                  step="1"
                  value={previewBlur}
                  onChange={(e) => setPreviewBlur(parseInt(e.target.value))}
                  className="w-full accent-[#22C55E] cursor-pointer"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-1">
              <button
                type="button"
                data-testid="cancel-preview-button"
                onClick={() => setPreviewTheme(null)}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-white/80 hover:text-white bg-white/10 hover:bg-white/20 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                id="apply-wallpaper-button"
                data-testid="apply-wallpaper-button"
                disabled={isApplying}
                onClick={handleApplyPreview}
                className="px-6 py-2.5 rounded-xl bg-[#22C55E] hover:bg-[#16A34A] text-[#0A0A0A] font-extrabold text-xs shadow-lg transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 active:scale-95"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                {isApplying ? 'Applying...' : activeThemeId === previewTheme.id ? 'Reapply Settings' : 'Apply Wallpaper'}
              </button>
            </div>
          </div>
        </footer>
      </div>,
      document.body
    );
  }

  // =========================================================================
  // VIEW 2: THEME GALLERY MODAL CATALOG
  // Rendered in a portal above main layout to ensure z-index priority.
  // =========================================================================
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="gallery-title"
      className="fixed inset-0 z-[9999] flex items-center justify-center p-0 md:p-6 bg-black/80 backdrop-blur-xl animate-in fade-in duration-200"
    >
      <div className="glass-modal relative w-full h-full md:max-w-5xl md:h-[90vh] md:rounded-3xl border border-white/30 flex flex-col overflow-hidden shadow-2xl">
        {/* --- Top App Bar (Apple Glass Navigation) --- */}
        <header className="px-5 py-4 border-b border-white/20 flex items-center justify-between shrink-0 glass-nav">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                playClick();
                onClose();
              }}
              className="p-2 -ml-2 rounded-2xl text-white/80 hover:text-white glass-interactive transition-colors cursor-pointer"
              aria-label="Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 id="gallery-title" className="text-xl font-extrabold text-white tracking-tight drop-shadow-xs">
                Your World
              </h1>
              <p className="text-xs text-white/80 font-medium">
                Choose the static travel wallpaper for your journeys
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {activeThemeId !== DEFAULT_THEME.id && (
              <button
                onClick={handleResetToDefault}
                title="Reset to default theme"
                className="px-3 py-1.5 text-xs font-bold text-white/80 hover:text-red-300 rounded-xl glass-interactive transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Reset</span>
              </button>
            )}
            <button
              onClick={() => {
                playClick();
                onClose();
              }}
              className="p-2 rounded-2xl text-white/80 hover:text-white glass-interactive transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* --- Main Scrollable Gallery Body --- */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
          {/* Search Input Bar (Frosted Glass Input) */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search wallpapers by monument, city, vibe..."
              className="glass-input w-full pl-10 pr-4 py-3 rounded-2xl text-sm placeholder:text-white/50 focus:outline-hidden"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full text-white/60 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Category Filter Pills (Apple Segmented Glass Control) */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            {THEME_CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    playClick();
                    setSelectedCategory(cat.id);
                  }}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-white text-[#0A0A0A] shadow-md font-bold'
                      : 'glass-interactive text-white/80 hover:text-white'
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>

          {/* --- Featured Wallpaper Hero Card (Howrah Bridge Master Reference) --- */}
          {!searchQuery && selectedCategory === 'all' && (
            <div className="relative rounded-3xl overflow-hidden glass-card border border-white/30 shadow-2xl">
              <div className="relative aspect-[16/9] md:aspect-[21/9] w-full bg-black/30 overflow-hidden">
                <img
                  src={FEATURED_THEME.thumbnail_url}
                  alt={FEATURED_THEME.name}
                  className="w-full h-full object-cover object-center"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />
                <div className="absolute top-3 left-3 flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-[#22C55E] text-[#0A0A0A] flex items-center gap-1 shadow-md">
                    <Sparkles className="w-3 h-3" />
                    Featured Travel Wallpaper
                  </span>
                  {activeThemeId === FEATURED_THEME.id && (
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-white/90 text-[#0A0A0A] flex items-center gap-1 shadow-md">
                      <Check className="w-3 h-3 stroke-[3]" />
                      Active Wallpaper
                    </span>
                  )}
                </div>
              </div>

              <div className="p-4 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#22C55E]">
                    {FEATURED_THEME.category_label}
                  </span>
                  <h3 className="text-lg md:text-xl font-bold text-white drop-shadow-xs">
                    {FEATURED_THEME.name}
                  </h3>
                  <p className="text-xs text-white/80 max-w-xl leading-relaxed">
                    {FEATURED_THEME.description}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleOpenPreview(FEATURED_THEME)}
                    className="px-4 py-2.5 rounded-xl bg-white/20 hover:bg-white/30 text-white font-medium text-xs transition-colors cursor-pointer flex items-center gap-1.5 backdrop-blur-xs shadow-xs"
                  >
                    <Eye className="w-4 h-4" />
                    Preview
                  </button>
                  <button
                    onClick={() => {
                      playClick();
                      setWallpaperTheme(FEATURED_THEME.id);
                      showConfirmation({
                        title: 'Wallpaper Applied',
                        message: `Applied "${FEATURED_THEME.name}" as your active wallpaper.`,
                        sound: 'trip_success',
                      });
                    }}
                    className="px-5 py-2.5 rounded-xl bg-[#22C55E] hover:bg-[#16A34A] text-[#0A0A0A] font-bold text-xs shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4 stroke-[3]" />
                    {activeThemeId === FEATURED_THEME.id ? 'Active' : 'Apply'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* --- Themes Grid --- */}
          <div>
            <div className="flex items-center justify-between pb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#71717A] dark:text-[#A1A1AA]">
                {selectedCategory === 'all' ? 'All Wallpapers' : `${selectedCategory.toUpperCase()} COLLECTION`}
              </span>
              <span className="text-xs text-[#71717A] dark:text-[#A1A1AA] font-mono">
                {filteredThemes.length} {filteredThemes.length === 1 ? 'wallpaper' : 'wallpapers'}
              </span>
            </div>

            {filteredThemes.length === 0 ? (
              <div className="py-16 text-center space-y-3">
                <Palette className="w-10 h-10 mx-auto text-[#71717A] dark:text-[#A1A1AA] opacity-50" />
                <h4 className="text-sm font-semibold text-[#18181B] dark:text-[#F5F5F7]">
                  No matching wallpapers found
                </h4>
                <p className="text-xs text-[#71717A] dark:text-[#A1A1AA] max-w-xs mx-auto">
                  Try searching with different keywords like &ldquo;train&rdquo;, &ldquo;monsoon&rdquo;, &ldquo;beach&rdquo;, or &ldquo;highway&rdquo;.
                </p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('all');
                  }}
                  className="px-4 py-2 text-xs font-semibold text-[#16834A] dark:text-[#22C55E] hover:underline cursor-pointer"
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
                {filteredThemes.map((theme) => {
                  const isActive = activeThemeId === theme.id;
                  return (
                    <div
                      key={theme.id}
                      onClick={() => handleOpenPreview(theme)}
                      className={`group relative rounded-2xl overflow-hidden glass-card cursor-pointer transition-all duration-300 flex flex-col ${
                        isActive
                          ? 'ring-2 ring-[#22C55E] border-white/60 shadow-xl scale-[1.02]'
                          : 'border-white/20 hover:border-white/50 hover:shadow-lg'
                      }`}
                    >
                      {/* Thumbnail Image Box (9:14 portrait ratio) */}
                      <div className="relative aspect-[9/14] w-full bg-black/20 overflow-hidden">
                        <img
                          src={theme.thumbnail_url}
                          alt={theme.name}
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />

                        {/* Top Badge: Active or Category */}
                        <div className="absolute top-2 left-2 right-2 flex items-center justify-between pointer-events-none">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-black/60 text-white backdrop-blur-xs flex items-center gap-1">
                            {theme.is_travel_wallpaper && <Sparkles className="w-2.5 h-2.5 text-[#22C55E]" />}
                            {theme.category_label}
                          </span>
                          {isActive && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#22C55E] text-[#0A0A0A] flex items-center gap-1 shadow-sm">
                              <Check className="w-3 h-3 stroke-[3]" />
                              Active
                            </span>
                          )}
                        </div>

                        {/* Palette dots preview */}
                        <div className="absolute bottom-2 left-2 flex items-center gap-1 pointer-events-none">
                          {theme.palette.slice(0, 4).map((c, idx) => (
                            <span
                              key={idx}
                              className="w-2.5 h-2.5 rounded-full border border-black/40 shadow-xs"
                              style={{ backgroundColor: c }}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Info Content Box */}
                      <div className="p-3 flex-1 flex flex-col justify-between space-y-1">
                        <div>
                          <h4 className="text-xs font-bold text-white drop-shadow-xs line-clamp-1 group-hover:text-[#22C55E] transition-colors">
                            {theme.name}
                          </h4>
                          <p className="text-[11px] text-white/70 line-clamp-2 mt-0.5 font-medium">
                            {theme.description}
                          </p>
                        </div>

                        <div className="pt-2 flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-white/60">
                            {theme.overlay_style}
                          </span>
                          <ChevronRight className="w-3.5 h-3.5 text-white/60 group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
