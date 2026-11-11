// ONNA-GO EXACTLY 13 PREMIUM STATIC TRAVEL ARTWORK THEMES
// Master Impressionist Oil Painting Series with Automatic Adaptive Liquid Glass Tokens

export interface ThemeColorTokens {
  mode: 'light' | 'dark' | 'balanced';
  
  // Adaptive Typography
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textShadow: string;
  
  // Accents & Actions
  accent: string;
  accentHover: string;
  accentText: string;
  accentSoft: string;
  iconColor: string;
  
  // Frosted Glass Surfaces (Translucent with specular borders)
  glassPrimaryBg: string;
  glassPrimaryBorder: string;
  glassPrimaryHighlight: string;
  glassPrimaryShadow: string;
  
  glassSecondaryBg: string;
  glassSecondaryBorder: string;
  glassSecondaryHighlight: string;
  glassSecondaryShadow: string;
  
  glassInteractiveBg: string;
  glassInteractiveHover: string;
  glassInteractiveBorder: string;
  
  glassNavBg: string;
  glassNavBorder: string;
  
  glassModalBg: string;
  glassModalBorder: string;
  
  glassSolidBg: string;
  glassSolidBorder: string;
  
  // Hairline Form Inputs
  glassInputBg: string;
  glassInputBorder: string;
  glassInputText: string;
  glassInputPlaceholder: string;
  glassInputFocusBorder: string;
  
  // Financial Indicators
  moneyPositive: string;
  moneyOwed: string;
  moneyNeutral: string;
}

export interface ThemeItem {
  id: string;
  name: string;
  category: string;
  category_label: string;
  description: string;
  palette: string[];
  tags: string[];
  thumbnail_url: string;
  full_url: string;
  overlay_style: 'dark' | 'light' | 'glass';
  default_opacity: number;
  is_featured?: boolean;
  is_travel_wallpaper?: boolean;
  tokens: ThemeColorTokens;
}

export type ThemeCategory =
  | 'all'
  | 'kolkata'
  | 'chennai'
  | 'mumbai'
  | 'kochi'
  | 'kanyakumari'
  | 'tamil_nadu'
  | 'karnataka'
  | 'odisha'
  | 'punjab'
  | 'western_ghats'
  | 'rajasthan';

export interface ThemeCategoryInfo {
  id: ThemeCategory;
  label: string;
}

export const THEME_CATEGORIES: ThemeCategoryInfo[] = [
  { id: 'all', label: 'All Themes (14)' },
  { id: 'kolkata', label: 'Kolkata' },
  { id: 'chennai', label: 'Chennai' },
  { id: 'mumbai', label: 'Mumbai' },
  { id: 'kochi', label: 'Kochi' },
  { id: 'kanyakumari', label: 'Kanyakumari' },
  { id: 'tamil_nadu', label: 'Tamil Nadu' },
  { id: 'karnataka', label: 'Karnataka' },
  { id: 'odisha', label: 'Odisha' },
  { id: 'punjab', label: 'Punjab' },
  { id: 'western_ghats', label: 'Western Ghats' },
  { id: 'rajasthan', label: 'Rajasthan' },
];

export const THEMES_CATALOG: ThemeItem[] = [
  {
    id: 'howrah_bridge',
    name: 'Howrah Bridge — Golden Sunset',
    category: 'kolkata',
    category_label: 'Kolkata',
    description: 'Traditional impressionist oil painting of the complete iconic Howrah Bridge spanning the Hooghly River during a radiant sunset with expressive skies and river reflections.',
    palette: ['#0B1B3D', '#1C355E', '#E65100', '#FF8F00', '#FFD54F'],
    tags: ['howrah', 'kolkata', 'bridge', 'sunset', 'hooghly', 'river', 'landmark', 'golden', 'oil painting', 'impressionist'],
    thumbnail_url: '/themes/thumbnails/howrah_bridge.webp',
    full_url: '/themes/wallpapers/howrah_bridge.webp',
    overlay_style: 'dark',
    default_opacity: 0.65,
    is_featured: true,
    is_travel_wallpaper: true,
    tokens: {
      mode: 'balanced',
      textPrimary: '#FFFFFF',
      textSecondary: 'rgba(255, 255, 255, 0.90)',
      textMuted: 'rgba(255, 255, 255, 0.70)',
      textShadow: '0 1px 3px rgba(0, 0, 0, 0.65), 0 0 1px rgba(0, 0, 0, 0.85)',
      accent: '#FF9F1C',
      accentHover: '#E65100',
      accentText: '#0B1B3D',
      accentSoft: 'rgba(255, 159, 28, 0.22)',
      iconColor: '#FFD54F',
      glassPrimaryBg: 'rgba(255, 255, 255, 0.20)',
      glassPrimaryBorder: 'rgba(255, 255, 255, 0.34)',
      glassPrimaryHighlight: 'inset 0 1px 1.5px 0 rgba(255, 255, 255, 0.55)',
      glassPrimaryShadow: '0 16px 40px -8px rgba(0, 0, 0, 0.28)',
      glassSecondaryBg: 'rgba(255, 255, 255, 0.15)',
      glassSecondaryBorder: 'rgba(255, 255, 255, 0.25)',
      glassSecondaryHighlight: 'inset 0 1px 1px 0 rgba(255, 255, 255, 0.40)',
      glassSecondaryShadow: '0 8px 24px -4px rgba(0, 0, 0, 0.18)',
      glassInteractiveBg: 'rgba(255, 255, 255, 0.18)',
      glassInteractiveHover: 'rgba(255, 255, 255, 0.28)',
      glassInteractiveBorder: 'rgba(255, 255, 255, 0.32)',
      glassNavBg: 'rgba(255, 255, 255, 0.24)',
      glassNavBorder: 'rgba(255, 255, 255, 0.36)',
      glassModalBg: 'rgba(255, 255, 255, 0.28)',
      glassModalBorder: 'rgba(255, 255, 255, 0.42)',
      glassSolidBg: 'rgba(255, 255, 255, 0.34)',
      glassSolidBorder: 'rgba(255, 255, 255, 0.48)',
      glassInputBg: 'rgba(255, 255, 255, 0.14)',
      glassInputBorder: 'rgba(255, 255, 255, 0.28)',
      glassInputText: '#FFFFFF',
      glassInputPlaceholder: 'rgba(255, 255, 255, 0.50)',
      glassInputFocusBorder: '#FF9F1C',
      moneyPositive: '#22C55E',
      moneyOwed: '#EF4444',
      moneyNeutral: 'rgba(255, 255, 255, 0.85)',
    },
  },
  {
    id: 'chennai_central',
    name: 'Chennai Central — Exterior View',
    category: 'chennai',
    category_label: 'Chennai',
    description: 'Impressionist oil painting of the iconic red-brick Victorian-Gothic station facade with its soaring clock tower viewed from outside in warm evening golden-hour light.',
    palette: ['#8B1E1E', '#B83B26', '#E07A5F', '#F4A261', '#2B2D42'],
    tags: ['chennai', 'central', 'station', 'clock tower', 'heritage', 'exterior', 'architecture', 'oil painting', 'impressionist'],
    thumbnail_url: '/themes/thumbnails/chennai_central.webp',
    full_url: '/themes/wallpapers/chennai_central.webp',
    overlay_style: 'dark',
    default_opacity: 0.70,
    is_travel_wallpaper: true,
    tokens: {
      mode: 'balanced',
      textPrimary: '#FFFFFF',
      textSecondary: 'rgba(255, 255, 255, 0.90)',
      textMuted: 'rgba(255, 255, 255, 0.70)',
      textShadow: '0 1px 3px rgba(0, 0, 0, 0.70), 0 0 1px rgba(0, 0, 0, 0.88)',
      accent: '#F4A261',
      accentHover: '#E76F51',
      accentText: '#1A1A1A',
      accentSoft: 'rgba(244, 162, 97, 0.22)',
      iconColor: '#F4A261',
      glassPrimaryBg: 'rgba(255, 255, 255, 0.21)',
      glassPrimaryBorder: 'rgba(255, 255, 255, 0.35)',
      glassPrimaryHighlight: 'inset 0 1px 1.5px 0 rgba(255, 255, 255, 0.55)',
      glassPrimaryShadow: '0 16px 40px -8px rgba(0, 0, 0, 0.30)',
      glassSecondaryBg: 'rgba(255, 255, 255, 0.16)',
      glassSecondaryBorder: 'rgba(255, 255, 255, 0.26)',
      glassSecondaryHighlight: 'inset 0 1px 1px 0 rgba(255, 255, 255, 0.40)',
      glassSecondaryShadow: '0 8px 24px -4px rgba(0, 0, 0, 0.20)',
      glassInteractiveBg: 'rgba(255, 255, 255, 0.19)',
      glassInteractiveHover: 'rgba(255, 255, 255, 0.30)',
      glassInteractiveBorder: 'rgba(255, 255, 255, 0.34)',
      glassNavBg: 'rgba(255, 255, 255, 0.25)',
      glassNavBorder: 'rgba(255, 255, 255, 0.38)',
      glassModalBg: 'rgba(255, 255, 255, 0.30)',
      glassModalBorder: 'rgba(255, 255, 255, 0.44)',
      glassSolidBg: 'rgba(255, 255, 255, 0.35)',
      glassSolidBorder: 'rgba(255, 255, 255, 0.50)',
      glassInputBg: 'rgba(255, 255, 255, 0.15)',
      glassInputBorder: 'rgba(255, 255, 255, 0.30)',
      glassInputText: '#FFFFFF',
      glassInputPlaceholder: 'rgba(255, 255, 255, 0.52)',
      glassInputFocusBorder: '#F4A261',
      moneyPositive: '#22C55E',
      moneyOwed: '#EF4444',
      moneyNeutral: 'rgba(255, 255, 255, 0.85)',
    },
  },
  {
    id: 'kochi_coast',
    name: 'Kochi — Natural Coastal Artwork',
    category: 'kochi',
    category_label: 'Kochi',
    description: 'Authentic Fort Kochi waterfront oil painting featuring historic Chinese fishing nets, leaning coconut palms, and tranquil Arabian Sea shores in evening light.',
    palette: ['#0A3641', '#175E54', '#4A8568', '#F4A261', '#E76F51'],
    tags: ['kochi', 'kerala', 'chinese fishing nets', 'coastal', 'arabian sea', 'fort kochi', 'palms', 'oil painting', 'impressionist'],
    thumbnail_url: '/themes/thumbnails/kochi_coast.webp',
    full_url: '/themes/wallpapers/kochi_coast.webp',
    overlay_style: 'dark',
    default_opacity: 0.68,
    is_travel_wallpaper: true,
    tokens: {
      mode: 'balanced',
      textPrimary: '#FFFFFF',
      textSecondary: 'rgba(255, 255, 255, 0.90)',
      textMuted: 'rgba(255, 255, 255, 0.70)',
      textShadow: '0 1px 3px rgba(0, 0, 0, 0.65), 0 0 1px rgba(0, 0, 0, 0.85)',
      accent: '#2DD4BF',
      accentHover: '#0D9488',
      accentText: '#042F2E',
      accentSoft: 'rgba(45, 212, 191, 0.22)',
      iconColor: '#2DD4BF',
      glassPrimaryBg: 'rgba(255, 255, 255, 0.19)',
      glassPrimaryBorder: 'rgba(255, 255, 255, 0.32)',
      glassPrimaryHighlight: 'inset 0 1px 1.5px 0 rgba(255, 255, 255, 0.55)',
      glassPrimaryShadow: '0 16px 40px -8px rgba(0, 0, 0, 0.28)',
      glassSecondaryBg: 'rgba(255, 255, 255, 0.14)',
      glassSecondaryBorder: 'rgba(255, 255, 255, 0.24)',
      glassSecondaryHighlight: 'inset 0 1px 1px 0 rgba(255, 255, 255, 0.38)',
      glassSecondaryShadow: '0 8px 24px -4px rgba(0, 0, 0, 0.18)',
      glassInteractiveBg: 'rgba(255, 255, 255, 0.17)',
      glassInteractiveHover: 'rgba(255, 255, 255, 0.28)',
      glassInteractiveBorder: 'rgba(255, 255, 255, 0.30)',
      glassNavBg: 'rgba(255, 255, 255, 0.23)',
      glassNavBorder: 'rgba(255, 255, 255, 0.35)',
      glassModalBg: 'rgba(255, 255, 255, 0.28)',
      glassModalBorder: 'rgba(255, 255, 255, 0.40)',
      glassSolidBg: 'rgba(255, 255, 255, 0.33)',
      glassSolidBorder: 'rgba(255, 255, 255, 0.46)',
      glassInputBg: 'rgba(255, 255, 255, 0.13)',
      glassInputBorder: 'rgba(255, 255, 255, 0.26)',
      glassInputText: '#FFFFFF',
      glassInputPlaceholder: 'rgba(255, 255, 255, 0.50)',
      glassInputFocusBorder: '#2DD4BF',
      moneyPositive: '#22C55E',
      moneyOwed: '#EF4444',
      moneyNeutral: 'rgba(255, 255, 255, 0.85)',
    },
  },
  {
    id: 'kanyakumari_statue',
    name: 'Kanyakumari — Thiruvalluvar Statue',
    category: 'kanyakumari',
    category_label: 'Kanyakumari',
    description: 'Monumental 133-foot stone Thiruvalluvar Statue and Vivekananda Rock Memorial rendered in heavy-impasto oil brushstrokes rising from ocean waters at sunset.',
    palette: ['#1C2541', '#3A506B', '#F35B04', '#F18701', '#F7B801'],
    tags: ['kanyakumari', 'thiruvalluvar', 'statue', 'vivekananda', 'memorial', 'ocean', 'sunset', 'monument', 'oil painting', 'impressionist'],
    thumbnail_url: '/themes/thumbnails/kanyakumari_statue.webp',
    full_url: '/themes/wallpapers/kanyakumari_statue.webp',
    overlay_style: 'dark',
    default_opacity: 0.68,
    is_travel_wallpaper: true,
    tokens: {
      mode: 'balanced',
      textPrimary: '#FFFFFF',
      textSecondary: 'rgba(255, 255, 255, 0.90)',
      textMuted: 'rgba(255, 255, 255, 0.70)',
      textShadow: '0 1px 3px rgba(0, 0, 0, 0.70), 0 0 1px rgba(0, 0, 0, 0.88)',
      accent: '#FB923C',
      accentHover: '#EA580C',
      accentText: '#1C2541',
      accentSoft: 'rgba(251, 146, 60, 0.22)',
      iconColor: '#F7B801',
      glassPrimaryBg: 'rgba(255, 255, 255, 0.20)',
      glassPrimaryBorder: 'rgba(255, 255, 255, 0.34)',
      glassPrimaryHighlight: 'inset 0 1px 1.5px 0 rgba(255, 255, 255, 0.55)',
      glassPrimaryShadow: '0 16px 40px -8px rgba(0, 0, 0, 0.28)',
      glassSecondaryBg: 'rgba(255, 255, 255, 0.15)',
      glassSecondaryBorder: 'rgba(255, 255, 255, 0.25)',
      glassSecondaryHighlight: 'inset 0 1px 1px 0 rgba(255, 255, 255, 0.40)',
      glassSecondaryShadow: '0 8px 24px -4px rgba(0, 0, 0, 0.18)',
      glassInteractiveBg: 'rgba(255, 255, 255, 0.18)',
      glassInteractiveHover: 'rgba(255, 255, 255, 0.29)',
      glassInteractiveBorder: 'rgba(255, 255, 255, 0.32)',
      glassNavBg: 'rgba(255, 255, 255, 0.24)',
      glassNavBorder: 'rgba(255, 255, 255, 0.36)',
      glassModalBg: 'rgba(255, 255, 255, 0.29)',
      glassModalBorder: 'rgba(255, 255, 255, 0.42)',
      glassSolidBg: 'rgba(255, 255, 255, 0.34)',
      glassSolidBorder: 'rgba(255, 255, 255, 0.48)',
      glassInputBg: 'rgba(255, 255, 255, 0.14)',
      glassInputBorder: 'rgba(255, 255, 255, 0.28)',
      glassInputText: '#FFFFFF',
      glassInputPlaceholder: 'rgba(255, 255, 255, 0.50)',
      glassInputFocusBorder: '#FB923C',
      moneyPositive: '#22C55E',
      moneyOwed: '#EF4444',
      moneyNeutral: 'rgba(255, 255, 255, 0.85)',
    },
  },
  {
    id: 'chennai_traffic',
    name: 'Chennai Traffic — City Traffic',
    category: 'chennai',
    category_label: 'Chennai',
    description: 'Vibrant evening Chennai streetscape oil painting with yellow auto-rickshaws, MTC buses, illuminated rain-slicked asphalt, and twilight sky.',
    palette: ['#0D0D11', '#191924', '#E63946', '#FFBE0B', '#00F5D4'],
    tags: ['chennai', 'traffic', 'auto rickshaw', 'mtc bus', 'city', 'night', 'street', 'urban', 'oil painting', 'impressionist'],
    thumbnail_url: '/themes/thumbnails/chennai_traffic.webp',
    full_url: '/themes/wallpapers/chennai_traffic.webp',
    overlay_style: 'dark',
    default_opacity: 0.60,
    is_travel_wallpaper: true,
    tokens: {
      mode: 'dark',
      textPrimary: '#FFFFFF',
      textSecondary: 'rgba(255, 255, 255, 0.92)',
      textMuted: 'rgba(255, 255, 255, 0.72)',
      textShadow: '0 1px 3px rgba(0, 0, 0, 0.85), 0 0 1px rgba(0, 0, 0, 0.95)',
      accent: '#FACC15',
      accentHover: '#EAB308',
      accentText: '#0F172A',
      accentSoft: 'rgba(250, 204, 21, 0.22)',
      iconColor: '#FACC15',
      glassPrimaryBg: 'rgba(255, 255, 255, 0.16)',
      glassPrimaryBorder: 'rgba(255, 255, 255, 0.32)',
      glassPrimaryHighlight: 'inset 0 1px 1.5px 0 rgba(255, 255, 255, 0.50)',
      glassPrimaryShadow: '0 16px 40px -8px rgba(0, 0, 0, 0.35)',
      glassSecondaryBg: 'rgba(255, 255, 255, 0.12)',
      glassSecondaryBorder: 'rgba(255, 255, 255, 0.22)',
      glassSecondaryHighlight: 'inset 0 1px 1px 0 rgba(255, 255, 255, 0.35)',
      glassSecondaryShadow: '0 8px 24px -4px rgba(0, 0, 0, 0.25)',
      glassInteractiveBg: 'rgba(255, 255, 255, 0.15)',
      glassInteractiveHover: 'rgba(255, 255, 255, 0.26)',
      glassInteractiveBorder: 'rgba(255, 255, 255, 0.28)',
      glassNavBg: 'rgba(255, 255, 255, 0.20)',
      glassNavBorder: 'rgba(255, 255, 255, 0.32)',
      glassModalBg: 'rgba(255, 255, 255, 0.25)',
      glassModalBorder: 'rgba(255, 255, 255, 0.38)',
      glassSolidBg: 'rgba(255, 255, 255, 0.30)',
      glassSolidBorder: 'rgba(255, 255, 255, 0.42)',
      glassInputBg: 'rgba(255, 255, 255, 0.12)',
      glassInputBorder: 'rgba(255, 255, 255, 0.24)',
      glassInputText: '#FFFFFF',
      glassInputPlaceholder: 'rgba(255, 255, 255, 0.48)',
      glassInputFocusBorder: '#FACC15',
      moneyPositive: '#22C55E',
      moneyOwed: '#EF4444',
      moneyNeutral: 'rgba(255, 255, 255, 0.85)',
    },
  },
  {
    id: 'mumbai_gateway',
    name: 'Mumbai — Gateway of India',
    category: 'mumbai',
    category_label: 'Mumbai',
    description: 'Masterpiece impressionist oil painting of the basalt arch at Apollo Bunder in radiant golden sunset light with thick impasto palette-knife strokes and harbour boats.',
    palette: ['#1B2A4A', '#2E4C6D', '#D97706', '#F59E0B', '#FDE68A'],
    tags: ['mumbai', 'gateway of india', 'apollo bunder', 'arabian sea', 'harbour', 'sunset', 'monument', 'oil painting', 'impressionist'],
    thumbnail_url: '/themes/thumbnails/mumbai_gateway.webp',
    full_url: '/themes/wallpapers/mumbai_gateway.webp',
    overlay_style: 'dark',
    default_opacity: 0.65,
    is_travel_wallpaper: true,
    tokens: {
      mode: 'balanced',
      textPrimary: '#FFFFFF',
      textSecondary: 'rgba(255, 255, 255, 0.90)',
      textMuted: 'rgba(255, 255, 255, 0.70)',
      textShadow: '0 1px 3px rgba(0, 0, 0, 0.65), 0 0 1px rgba(0, 0, 0, 0.85)',
      accent: '#F59E0B',
      accentHover: '#D97706',
      accentText: '#1B2A4A',
      accentSoft: 'rgba(245, 158, 11, 0.22)',
      iconColor: '#F59E0B',
      glassPrimaryBg: 'rgba(255, 255, 255, 0.20)',
      glassPrimaryBorder: 'rgba(255, 255, 255, 0.34)',
      glassPrimaryHighlight: 'inset 0 1px 1.5px 0 rgba(255, 255, 255, 0.55)',
      glassPrimaryShadow: '0 16px 40px -8px rgba(0, 0, 0, 0.28)',
      glassSecondaryBg: 'rgba(255, 255, 255, 0.15)',
      glassSecondaryBorder: 'rgba(255, 255, 255, 0.25)',
      glassSecondaryHighlight: 'inset 0 1px 1px 0 rgba(255, 255, 255, 0.40)',
      glassSecondaryShadow: '0 8px 24px -4px rgba(0, 0, 0, 0.18)',
      glassInteractiveBg: 'rgba(255, 255, 255, 0.18)',
      glassInteractiveHover: 'rgba(255, 255, 255, 0.29)',
      glassInteractiveBorder: 'rgba(255, 255, 255, 0.32)',
      glassNavBg: 'rgba(255, 255, 255, 0.24)',
      glassNavBorder: 'rgba(255, 255, 255, 0.36)',
      glassModalBg: 'rgba(255, 255, 255, 0.29)',
      glassModalBorder: 'rgba(255, 255, 255, 0.42)',
      glassSolidBg: 'rgba(255, 255, 255, 0.34)',
      glassSolidBorder: 'rgba(255, 255, 255, 0.48)',
      glassInputBg: 'rgba(255, 255, 255, 0.14)',
      glassInputBorder: 'rgba(255, 255, 255, 0.28)',
      glassInputText: '#FFFFFF',
      glassInputPlaceholder: 'rgba(255, 255, 255, 0.50)',
      glassInputFocusBorder: '#F59E0B',
      moneyPositive: '#22C55E',
      moneyOwed: '#EF4444',
      moneyNeutral: 'rgba(255, 255, 255, 0.85)',
    },
  },
  {
    id: 'mumbai_csmt',
    name: 'Mumbai — Chhatrapati Shivaji Maharaj Terminus (CSMT)',
    category: 'mumbai',
    category_label: 'Mumbai',
    description: 'Majestic Victorian-Gothic heritage terminus exterior with high central dome, clock tower, and bustling street of iconic black-and-yellow taxis under twilight skies.',
    palette: ['#1E1B4B', '#4338CA', '#D97706', '#FBBF24', '#312E81'],
    tags: ['mumbai', 'csmt', 'victoria terminus', 'railway', 'gothic', 'heritage', 'taxis', 'architecture', 'oil painting', 'impressionist'],
    thumbnail_url: '/themes/thumbnails/mumbai_csmt.webp',
    full_url: '/themes/wallpapers/mumbai_csmt.webp',
    overlay_style: 'dark',
    default_opacity: 0.68,
    is_travel_wallpaper: true,
    tokens: {
      mode: 'dark',
      textPrimary: '#FFFFFF',
      textSecondary: 'rgba(255, 255, 255, 0.90)',
      textMuted: 'rgba(255, 255, 255, 0.70)',
      textShadow: '0 1px 3px rgba(0, 0, 0, 0.75), 0 0 1px rgba(0, 0, 0, 0.90)',
      accent: '#FBBF24',
      accentHover: '#F59E0B',
      accentText: '#1E1B4B',
      accentSoft: 'rgba(251, 191, 36, 0.22)',
      iconColor: '#FBBF24',
      glassPrimaryBg: 'rgba(255, 255, 255, 0.17)',
      glassPrimaryBorder: 'rgba(255, 255, 255, 0.30)',
      glassPrimaryHighlight: 'inset 0 1px 1.5px 0 rgba(255, 255, 255, 0.52)',
      glassPrimaryShadow: '0 16px 40px -8px rgba(0, 0, 0, 0.32)',
      glassSecondaryBg: 'rgba(255, 255, 255, 0.13)',
      glassSecondaryBorder: 'rgba(255, 255, 255, 0.22)',
      glassSecondaryHighlight: 'inset 0 1px 1px 0 rgba(255, 255, 255, 0.36)',
      glassSecondaryShadow: '0 8px 24px -4px rgba(0, 0, 0, 0.22)',
      glassInteractiveBg: 'rgba(255, 255, 255, 0.16)',
      glassInteractiveHover: 'rgba(255, 255, 255, 0.27)',
      glassInteractiveBorder: 'rgba(255, 255, 255, 0.28)',
      glassNavBg: 'rgba(255, 255, 255, 0.21)',
      glassNavBorder: 'rgba(255, 255, 255, 0.33)',
      glassModalBg: 'rgba(255, 255, 255, 0.26)',
      glassModalBorder: 'rgba(255, 255, 255, 0.39)',
      glassSolidBg: 'rgba(255, 255, 255, 0.31)',
      glassSolidBorder: 'rgba(255, 255, 255, 0.44)',
      glassInputBg: 'rgba(255, 255, 255, 0.13)',
      glassInputBorder: 'rgba(255, 255, 255, 0.25)',
      glassInputText: '#FFFFFF',
      glassInputPlaceholder: 'rgba(255, 255, 255, 0.48)',
      glassInputFocusBorder: '#FBBF24',
      moneyPositive: '#22C55E',
      moneyOwed: '#EF4444',
      moneyNeutral: 'rgba(255, 255, 255, 0.85)',
    },
  },
  {
    id: 'thanjavur_temple',
    name: 'Thanjavur — Brihadeeswarar Temple (Periya Kovil)',
    category: 'tamil_nadu',
    category_label: 'Tamil Nadu',
    description: 'Monumental 216-foot granite Vimana of the Great Living Chola Temple soaring into sunset skies with stone Nandi mandapam courtyard in warm golden ochre hues.',
    palette: ['#3D2612', '#78350F', '#B45309', '#F59E0B', '#FDE68A'],
    tags: ['thanjavur', 'brihadeeswarar', 'periya kovil', 'chola', 'temple', 'vimana', 'granite', 'heritage', 'tamil nadu', 'oil painting', 'impressionist'],
    thumbnail_url: '/themes/thumbnails/thanjavur_temple.webp',
    full_url: '/themes/wallpapers/thanjavur_temple.webp',
    overlay_style: 'dark',
    default_opacity: 0.68,
    is_travel_wallpaper: true,
    tokens: {
      mode: 'balanced',
      textPrimary: '#FFFFFF',
      textSecondary: 'rgba(255, 255, 255, 0.90)',
      textMuted: 'rgba(255, 255, 255, 0.70)',
      textShadow: '0 1px 4px rgba(0, 0, 0, 0.72), 0 0 1px rgba(0, 0, 0, 0.90)',
      accent: '#F59E0B',
      accentHover: '#D97706',
      accentText: '#3D2612',
      accentSoft: 'rgba(245, 158, 11, 0.22)',
      iconColor: '#FDE68A',
      glassPrimaryBg: 'rgba(255, 255, 255, 0.22)',
      glassPrimaryBorder: 'rgba(255, 255, 255, 0.36)',
      glassPrimaryHighlight: 'inset 0 1px 1.5px 0 rgba(255, 255, 255, 0.58)',
      glassPrimaryShadow: '0 16px 40px -8px rgba(0, 0, 0, 0.30)',
      glassSecondaryBg: 'rgba(255, 255, 255, 0.16)',
      glassSecondaryBorder: 'rgba(255, 255, 255, 0.26)',
      glassSecondaryHighlight: 'inset 0 1px 1px 0 rgba(255, 255, 255, 0.42)',
      glassSecondaryShadow: '0 8px 24px -4px rgba(0, 0, 0, 0.20)',
      glassInteractiveBg: 'rgba(255, 255, 255, 0.19)',
      glassInteractiveHover: 'rgba(255, 255, 255, 0.30)',
      glassInteractiveBorder: 'rgba(255, 255, 255, 0.34)',
      glassNavBg: 'rgba(255, 255, 255, 0.25)',
      glassNavBorder: 'rgba(255, 255, 255, 0.38)',
      glassModalBg: 'rgba(255, 255, 255, 0.30)',
      glassModalBorder: 'rgba(255, 255, 255, 0.44)',
      glassSolidBg: 'rgba(255, 255, 255, 0.36)',
      glassSolidBorder: 'rgba(255, 255, 255, 0.50)',
      glassInputBg: 'rgba(255, 255, 255, 0.15)',
      glassInputBorder: 'rgba(255, 255, 255, 0.30)',
      glassInputText: '#FFFFFF',
      glassInputPlaceholder: 'rgba(255, 255, 255, 0.52)',
      glassInputFocusBorder: '#F59E0B',
      moneyPositive: '#22C55E',
      moneyOwed: '#EF4444',
      moneyNeutral: 'rgba(255, 255, 255, 0.85)',
    },
  },
  {
    id: 'hampi_heritage',
    name: 'Hampi — Historic Heritage Landscape',
    category: 'karnataka',
    category_label: 'Karnataka',
    description: "Monolithic Vijayanagara Stone Chariot at the Vittala Temple complex framed by Hampi's surreal balancing granite boulders under a fiery twilight sky.",
    palette: ['#292524', '#78350F', '#D97706', '#EA580C', '#FEF3C7'],
    tags: ['hampi', 'vittala', 'stone chariot', 'boulders', 'karnataka', 'vijayanagara', 'heritage', 'landscape', 'oil painting', 'impressionist'],
    thumbnail_url: '/themes/thumbnails/hampi_heritage.webp',
    full_url: '/themes/wallpapers/hampi_heritage.webp',
    overlay_style: 'dark',
    default_opacity: 0.68,
    is_travel_wallpaper: true,
    tokens: {
      mode: 'balanced',
      textPrimary: '#FFFFFF',
      textSecondary: 'rgba(255, 255, 255, 0.90)',
      textMuted: 'rgba(255, 255, 255, 0.70)',
      textShadow: '0 1px 3px rgba(0, 0, 0, 0.70), 0 0 1px rgba(0, 0, 0, 0.88)',
      accent: '#FB923C',
      accentHover: '#EA580C',
      accentText: '#292524',
      accentSoft: 'rgba(251, 146, 60, 0.22)',
      iconColor: '#FEF3C7',
      glassPrimaryBg: 'rgba(255, 255, 255, 0.18)',
      glassPrimaryBorder: 'rgba(255, 255, 255, 0.32)',
      glassPrimaryHighlight: 'inset 0 1px 1.5px 0 rgba(255, 255, 255, 0.55)',
      glassPrimaryShadow: '0 16px 40px -8px rgba(0, 0, 0, 0.28)',
      glassSecondaryBg: 'rgba(255, 255, 255, 0.14)',
      glassSecondaryBorder: 'rgba(255, 255, 255, 0.24)',
      glassSecondaryHighlight: 'inset 0 1px 1px 0 rgba(255, 255, 255, 0.38)',
      glassSecondaryShadow: '0 8px 24px -4px rgba(0, 0, 0, 0.18)',
      glassInteractiveBg: 'rgba(255, 255, 255, 0.17)',
      glassInteractiveHover: 'rgba(255, 255, 255, 0.28)',
      glassInteractiveBorder: 'rgba(255, 255, 255, 0.30)',
      glassNavBg: 'rgba(255, 255, 255, 0.23)',
      glassNavBorder: 'rgba(255, 255, 255, 0.35)',
      glassModalBg: 'rgba(255, 255, 255, 0.28)',
      glassModalBorder: 'rgba(255, 255, 255, 0.40)',
      glassSolidBg: 'rgba(255, 255, 255, 0.33)',
      glassSolidBorder: 'rgba(255, 255, 255, 0.46)',
      glassInputBg: 'rgba(255, 255, 255, 0.13)',
      glassInputBorder: 'rgba(255, 255, 255, 0.26)',
      glassInputText: '#FFFFFF',
      glassInputPlaceholder: 'rgba(255, 255, 255, 0.50)',
      glassInputFocusBorder: '#FB923C',
      moneyPositive: '#22C55E',
      moneyOwed: '#EF4444',
      moneyNeutral: 'rgba(255, 255, 255, 0.85)',
    },
  },
  {
    id: 'badami_lake',
    name: 'Badami — Agastya Lake',
    category: 'karnataka',
    category_label: 'Karnataka',
    description: 'Ancient red sandstone cliffs and rock-cut cave temples cradling the tranquil waters of sacred Agastya Lake with Bhutanatha Temple reflections.',
    palette: ['#134E4A', '#831843', '#9A3412', '#D97706', '#0D9488'],
    tags: ['badami', 'agastya lake', 'bhutanatha', 'cave temples', 'cliffs', 'sandstone', 'karnataka', 'heritage', 'oil painting', 'impressionist'],
    thumbnail_url: '/themes/thumbnails/badami_lake.webp',
    full_url: '/themes/wallpapers/badami_lake.webp',
    overlay_style: 'dark',
    default_opacity: 0.65,
    is_travel_wallpaper: true,
    tokens: {
      mode: 'balanced',
      textPrimary: '#FFFFFF',
      textSecondary: 'rgba(255, 255, 255, 0.90)',
      textMuted: 'rgba(255, 255, 255, 0.70)',
      textShadow: '0 1px 3px rgba(0, 0, 0, 0.65), 0 0 1px rgba(0, 0, 0, 0.85)',
      accent: '#2DD4BF',
      accentHover: '#0D9488',
      accentText: '#134E4A',
      accentSoft: 'rgba(45, 212, 191, 0.22)',
      iconColor: '#2DD4BF',
      glassPrimaryBg: 'rgba(255, 255, 255, 0.20)',
      glassPrimaryBorder: 'rgba(255, 255, 255, 0.34)',
      glassPrimaryHighlight: 'inset 0 1px 1.5px 0 rgba(255, 255, 255, 0.55)',
      glassPrimaryShadow: '0 16px 40px -8px rgba(0, 0, 0, 0.28)',
      glassSecondaryBg: 'rgba(255, 255, 255, 0.15)',
      glassSecondaryBorder: 'rgba(255, 255, 255, 0.25)',
      glassSecondaryHighlight: 'inset 0 1px 1px 0 rgba(255, 255, 255, 0.40)',
      glassSecondaryShadow: '0 8px 24px -4px rgba(0, 0, 0, 0.18)',
      glassInteractiveBg: 'rgba(255, 255, 255, 0.18)',
      glassInteractiveHover: 'rgba(255, 255, 255, 0.29)',
      glassInteractiveBorder: 'rgba(255, 255, 255, 0.32)',
      glassNavBg: 'rgba(255, 255, 255, 0.24)',
      glassNavBorder: 'rgba(255, 255, 255, 0.36)',
      glassModalBg: 'rgba(255, 255, 255, 0.29)',
      glassModalBorder: 'rgba(255, 255, 255, 0.42)',
      glassSolidBg: 'rgba(255, 255, 255, 0.34)',
      glassSolidBorder: 'rgba(255, 255, 255, 0.48)',
      glassInputBg: 'rgba(255, 255, 255, 0.14)',
      glassInputBorder: 'rgba(255, 255, 255, 0.28)',
      glassInputText: '#FFFFFF',
      glassInputPlaceholder: 'rgba(255, 255, 255, 0.50)',
      glassInputFocusBorder: '#2DD4BF',
      moneyPositive: '#22C55E',
      moneyOwed: '#EF4444',
      moneyNeutral: 'rgba(255, 255, 255, 0.85)',
    },
  },
  {
    id: 'konark_sun_temple',
    name: 'Odisha — Konark Sun Temple',
    category: 'odisha',
    category_label: 'Odisha',
    description: 'Colossal intricately sculpted 24-spoke stone Chariot Wheel of the 13th-century Sun Temple bathed in the first golden rays of morning sunrise.',
    palette: ['#312E81', '#7C2D12', '#C2410C', '#F59E0B', '#FEF08A'],
    tags: ['konark', 'sun temple', 'surya', 'wheel', 'chariot', 'odisha', 'stone relief', 'sunrise', 'heritage', 'oil painting', 'impressionist'],
    thumbnail_url: '/themes/thumbnails/konark_sun_temple.webp',
    full_url: '/themes/wallpapers/konark_sun_temple.webp',
    overlay_style: 'dark',
    default_opacity: 0.68,
    is_travel_wallpaper: true,
    tokens: {
      mode: 'light',
      textPrimary: '#FFFFFF',
      textSecondary: 'rgba(255, 255, 255, 0.92)',
      textMuted: 'rgba(255, 255, 255, 0.72)',
      textShadow: '0 1px 4px rgba(0, 0, 0, 0.78), 0 0 1px rgba(0, 0, 0, 0.95)',
      accent: '#F59E0B',
      accentHover: '#D97706',
      accentText: '#312E81',
      accentSoft: 'rgba(245, 158, 11, 0.25)',
      iconColor: '#FEF08A',
      glassPrimaryBg: 'rgba(255, 255, 255, 0.24)',
      glassPrimaryBorder: 'rgba(255, 255, 255, 0.38)',
      glassPrimaryHighlight: 'inset 0 1px 1.5px 0 rgba(255, 255, 255, 0.60)',
      glassPrimaryShadow: '0 16px 40px -8px rgba(0, 0, 0, 0.30)',
      glassSecondaryBg: 'rgba(255, 255, 255, 0.18)',
      glassSecondaryBorder: 'rgba(255, 255, 255, 0.28)',
      glassSecondaryHighlight: 'inset 0 1px 1px 0 rgba(255, 255, 255, 0.44)',
      glassSecondaryShadow: '0 8px 24px -4px rgba(0, 0, 0, 0.20)',
      glassInteractiveBg: 'rgba(255, 255, 255, 0.21)',
      glassInteractiveHover: 'rgba(255, 255, 255, 0.32)',
      glassInteractiveBorder: 'rgba(255, 255, 255, 0.35)',
      glassNavBg: 'rgba(255, 255, 255, 0.26)',
      glassNavBorder: 'rgba(255, 255, 255, 0.40)',
      glassModalBg: 'rgba(255, 255, 255, 0.32)',
      glassModalBorder: 'rgba(255, 255, 255, 0.46)',
      glassSolidBg: 'rgba(255, 255, 255, 0.38)',
      glassSolidBorder: 'rgba(255, 255, 255, 0.52)',
      glassInputBg: 'rgba(255, 255, 255, 0.16)',
      glassInputBorder: 'rgba(255, 255, 255, 0.32)',
      glassInputText: '#FFFFFF',
      glassInputPlaceholder: 'rgba(255, 255, 255, 0.55)',
      glassInputFocusBorder: '#F59E0B',
      moneyPositive: '#22C55E',
      moneyOwed: '#EF4444',
      moneyNeutral: 'rgba(255, 255, 255, 0.85)',
    },
  },
  {
    id: 'punjab_heritage',
    name: 'Punjab — Turban and Ceremonial Kirpan at Sunrise',
    category: 'punjab',
    category_label: 'Punjab',
    description: 'Expansive impressionist oil painting of Punjab heritage at sunrise, featuring a distant figure in a royal blue dastar and ceremonial kirpan beside a peaceful sarovar pond with vast golden wheat fields and glowing dawn skies.',
    palette: ['#1E3A8A', '#B45309', '#F59E0B', '#FEF08A', '#78350F'],
    tags: ['punjab', 'turban', 'dastar', 'kirpan', 'sarovar', 'amritsar', 'fields', 'sunrise', 'heritage', 'oil painting', 'impressionist', 'landscape'],
    thumbnail_url: '/themes/thumbnails/punjab_heritage.webp',
    full_url: '/themes/wallpapers/punjab_heritage.webp',
    overlay_style: 'dark',
    default_opacity: 0.65,
    is_travel_wallpaper: true,
    tokens: {
      mode: 'light',
      textPrimary: '#FFFFFF',
      textSecondary: 'rgba(255, 255, 255, 0.94)',
      textMuted: 'rgba(255, 255, 255, 0.76)',
      textShadow: '0 1px 4px rgba(0, 0, 0, 0.82), 0 0 1px rgba(0, 0, 0, 0.98)',
      accent: '#3B82F6',
      accentHover: '#2563EB',
      accentText: '#FFFFFF',
      accentSoft: 'rgba(59, 130, 246, 0.25)',
      iconColor: '#FEF08A',
      glassPrimaryBg: 'rgba(255, 255, 255, 0.26)',
      glassPrimaryBorder: 'rgba(255, 255, 255, 0.40)',
      glassPrimaryHighlight: 'inset 0 1px 1.5px 0 rgba(255, 255, 255, 0.65)',
      glassPrimaryShadow: '0 16px 40px -8px rgba(0, 0, 0, 0.32)',
      glassSecondaryBg: 'rgba(255, 255, 255, 0.20)',
      glassSecondaryBorder: 'rgba(255, 255, 255, 0.30)',
      glassSecondaryHighlight: 'inset 0 1px 1px 0 rgba(255, 255, 255, 0.48)',
      glassSecondaryShadow: '0 8px 24px -4px rgba(0, 0, 0, 0.22)',
      glassInteractiveBg: 'rgba(255, 255, 255, 0.22)',
      glassInteractiveHover: 'rgba(255, 255, 255, 0.34)',
      glassInteractiveBorder: 'rgba(255, 255, 255, 0.38)',
      glassNavBg: 'rgba(255, 255, 255, 0.28)',
      glassNavBorder: 'rgba(255, 255, 255, 0.42)',
      glassModalBg: 'rgba(255, 255, 255, 0.34)',
      glassModalBorder: 'rgba(255, 255, 255, 0.48)',
      glassSolidBg: 'rgba(255, 255, 255, 0.40)',
      glassSolidBorder: 'rgba(255, 255, 255, 0.54)',
      glassInputBg: 'rgba(255, 255, 255, 0.18)',
      glassInputBorder: 'rgba(255, 255, 255, 0.34)',
      glassInputText: '#FFFFFF',
      glassInputPlaceholder: 'rgba(255, 255, 255, 0.58)',
      glassInputFocusBorder: '#3B82F6',
      moneyPositive: '#22C55E',
      moneyOwed: '#EF4444',
      moneyNeutral: 'rgba(255, 255, 255, 0.88)',
    },
  },
  {
    id: 'konkan_railway',
    name: 'Konkan Railway — Coastal Train Journey',
    category: 'western_ghats',
    category_label: 'Western Ghats',
    description: 'Impressionist oil painting of a blue passenger train emerging from a lush Western Ghats tunnel curving along a rain-washed station platform, mountain waterfalls, and misty green hills.',
    palette: ['#2E5A27', '#1E5FA8', '#8A4B38', '#9BAAB2', '#A89A8C'],
    tags: ['konkan', 'railway', 'train', 'tunnel', 'western ghats', 'monsoon', 'station', 'waterfall', 'hills', 'journey', 'oil painting', 'impressionist'],
    thumbnail_url: '/themes/thumbnails/konkan_railway.webp',
    full_url: '/themes/wallpapers/konkan_railway.webp',
    overlay_style: 'dark',
    default_opacity: 0.68,
    is_travel_wallpaper: true,
    tokens: {
      mode: 'balanced',
      textPrimary: '#FFFFFF',
      textSecondary: 'rgba(255, 255, 255, 0.90)',
      textMuted: 'rgba(255, 255, 255, 0.70)',
      textShadow: '0 1px 3px rgba(0, 0, 0, 0.70), 0 0 1px rgba(0, 0, 0, 0.88)',
      accent: '#34D399',
      accentHover: '#10B981',
      accentText: '#064E3B',
      accentSoft: 'rgba(52, 211, 153, 0.22)',
      iconColor: '#34D399',
      glassPrimaryBg: 'rgba(255, 255, 255, 0.18)',
      glassPrimaryBorder: 'rgba(255, 255, 255, 0.32)',
      glassPrimaryHighlight: 'inset 0 1px 1.5px 0 rgba(255, 255, 255, 0.55)',
      glassPrimaryShadow: '0 16px 40px -8px rgba(0, 0, 0, 0.28)',
      glassSecondaryBg: 'rgba(255, 255, 255, 0.14)',
      glassSecondaryBorder: 'rgba(255, 255, 255, 0.24)',
      glassSecondaryHighlight: 'inset 0 1px 1px 0 rgba(255, 255, 255, 0.38)',
      glassSecondaryShadow: '0 8px 24px -4px rgba(0, 0, 0, 0.18)',
      glassInteractiveBg: 'rgba(255, 255, 255, 0.17)',
      glassInteractiveHover: 'rgba(255, 255, 255, 0.28)',
      glassInteractiveBorder: 'rgba(255, 255, 255, 0.30)',
      glassNavBg: 'rgba(255, 255, 255, 0.23)',
      glassNavBorder: 'rgba(255, 255, 255, 0.35)',
      glassModalBg: 'rgba(255, 255, 255, 0.28)',
      glassModalBorder: 'rgba(255, 255, 255, 0.40)',
      glassSolidBg: 'rgba(255, 255, 255, 0.33)',
      glassSolidBorder: 'rgba(255, 255, 255, 0.46)',
      glassInputBg: 'rgba(255, 255, 255, 0.13)',
      glassInputBorder: 'rgba(255, 255, 255, 0.26)',
      glassInputText: '#FFFFFF',
      glassInputPlaceholder: 'rgba(255, 255, 255, 0.50)',
      glassInputFocusBorder: '#34D399',
      moneyPositive: '#22C55E',
      moneyOwed: '#EF4444',
      moneyNeutral: 'rgba(255, 255, 255, 0.85)',
    },
  },
  {
    id: 'jodhpur_blue_city',
    name: 'Jodhpur — The Blue City',
    category: 'rajasthan',
    category_label: 'Rajasthan',
    description: 'Vibrant cerulean, cobalt, and indigo cubic Brahmin facades with ornate sandstone jharokhas and sunlit stone steps in the historic old city below Mehrangarh.',
    palette: ['#1E3A8A', '#2563EB', '#60A5FA', '#D97706', '#F8FAFC'],
    tags: ['jodhpur', 'blue city', 'rajasthan', 'mehrangarh', 'jharokha', 'brahmin', 'heritage', 'street', 'oil painting', 'impressionist'],
    thumbnail_url: '/themes/thumbnails/jodhpur_blue_city.webp',
    full_url: '/themes/wallpapers/jodhpur_blue_city.webp',
    overlay_style: 'dark',
    default_opacity: 0.65,
    is_travel_wallpaper: true,
    tokens: {
      mode: 'balanced',
      textPrimary: '#FFFFFF',
      textSecondary: 'rgba(255, 255, 255, 0.92)',
      textMuted: 'rgba(255, 255, 255, 0.72)',
      textShadow: '0 1px 3px rgba(0, 0, 0, 0.75), 0 0 1px rgba(0, 0, 0, 0.90)',
      accent: '#38BDF8',
      accentHover: '#0284C7',
      accentText: '#0F172A',
      accentSoft: 'rgba(56, 189, 248, 0.22)',
      iconColor: '#60A5FA',
      glassPrimaryBg: 'rgba(255, 255, 255, 0.20)',
      glassPrimaryBorder: 'rgba(255, 255, 255, 0.34)',
      glassPrimaryHighlight: 'inset 0 1px 1.5px 0 rgba(255, 255, 255, 0.55)',
      glassPrimaryShadow: '0 16px 40px -8px rgba(15, 23, 42, 0.35)',
      glassSecondaryBg: 'rgba(255, 255, 255, 0.15)',
      glassSecondaryBorder: 'rgba(255, 255, 255, 0.25)',
      glassSecondaryHighlight: 'inset 0 1px 1px 0 rgba(255, 255, 255, 0.40)',
      glassSecondaryShadow: '0 8px 24px -4px rgba(15, 23, 42, 0.22)',
      glassInteractiveBg: 'rgba(255, 255, 255, 0.18)',
      glassInteractiveHover: 'rgba(255, 255, 255, 0.28)',
      glassInteractiveBorder: 'rgba(255, 255, 255, 0.32)',
      glassNavBg: 'rgba(255, 255, 255, 0.24)',
      glassNavBorder: 'rgba(255, 255, 255, 0.36)',
      glassModalBg: 'rgba(255, 255, 255, 0.28)',
      glassModalBorder: 'rgba(255, 255, 255, 0.42)',
      glassSolidBg: 'rgba(255, 255, 255, 0.34)',
      glassSolidBorder: 'rgba(255, 255, 255, 0.48)',
      glassInputBg: 'rgba(255, 255, 255, 0.14)',
      glassInputBorder: 'rgba(255, 255, 255, 0.28)',
      glassInputText: '#FFFFFF',
      glassInputPlaceholder: 'rgba(255, 255, 255, 0.50)',
      glassInputFocusBorder: '#38BDF8',
      moneyPositive: '#22C55E',
      moneyOwed: '#EF4444',
      moneyNeutral: 'rgba(255, 255, 255, 0.85)',
    },
  },
];

export const DEFAULT_THEME_ID = 'howrah_bridge';
export const DEFAULT_THEME: ThemeItem = THEMES_CATALOG[0];
export const FEATURED_THEME: ThemeItem = THEMES_CATALOG[0];

export const TRAVEL_WALLPAPERS_MAP: Record<string, boolean> = {
  howrah_bridge: true,
  chennai_central: true,
  kochi_coast: true,
  kanyakumari_statue: true,
  chennai_traffic: true,
  mumbai_gateway: true,
  mumbai_csmt: true,
  thanjavur_temple: true,
  hampi_heritage: true,
  badami_lake: true,
  konark_sun_temple: true,
  punjab_heritage: true,
  konkan_railway: true,
  jodhpur_blue_city: true,
};

export function getThemeById(id?: string | null): ThemeItem {
  if (!id) return DEFAULT_THEME;
  // Support legacy IDs gracefully by mapping to the canonical 13
  if (id === 'default' || id === 'city_howrah_bridge') return THEMES_CATALOG[0];
  if (id === 'train_chennai_central') return THEMES_CATALOG[1];
  if (id === 'nature_beachside_escape') return THEMES_CATALOG[2];
  if (id === 'nature_western_ghats' || id === 'nature_ooty_morning') return THEMES_CATALOG[3];
  if (id === 'city_chennai_rain' || id === 'car_night_drive') return THEMES_CATALOG[4];
  return THEMES_CATALOG.find((t) => t.id === id) || DEFAULT_THEME;
}

export function getThemeTokens(themeId?: string | null): ThemeColorTokens {
  const theme = getThemeById(themeId);
  return theme.tokens;
}

export function applyThemeTokens(tokens: ThemeColorTokens): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  
  root.style.setProperty('--theme-mode', tokens.mode);
  root.style.setProperty('--theme-text-primary', tokens.textPrimary);
  root.style.setProperty('--theme-text-secondary', tokens.textSecondary);
  root.style.setProperty('--theme-text-muted', tokens.textMuted);
  root.style.setProperty('--theme-text-shadow', tokens.textShadow);
  
  root.style.setProperty('--theme-accent', tokens.accent);
  root.style.setProperty('--theme-accent-hover', tokens.accentHover);
  root.style.setProperty('--theme-accent-text', tokens.accentText);
  root.style.setProperty('--theme-accent-soft', tokens.accentSoft);
  root.style.setProperty('--theme-icon', tokens.iconColor);
  
  root.style.setProperty('--theme-glass-primary-bg', tokens.glassPrimaryBg);
  root.style.setProperty('--theme-glass-primary-border', tokens.glassPrimaryBorder);
  root.style.setProperty('--theme-glass-primary-highlight', tokens.glassPrimaryHighlight);
  root.style.setProperty('--theme-glass-primary-shadow', tokens.glassPrimaryShadow);
  
  root.style.setProperty('--theme-glass-secondary-bg', tokens.glassSecondaryBg);
  root.style.setProperty('--theme-glass-secondary-border', tokens.glassSecondaryBorder);
  root.style.setProperty('--theme-glass-secondary-highlight', tokens.glassSecondaryHighlight);
  root.style.setProperty('--theme-glass-secondary-shadow', tokens.glassSecondaryShadow);
  
  root.style.setProperty('--theme-glass-interactive-bg', tokens.glassInteractiveBg);
  root.style.setProperty('--theme-glass-interactive-hover', tokens.glassInteractiveHover);
  root.style.setProperty('--theme-glass-interactive-border', tokens.glassInteractiveBorder);
  
  root.style.setProperty('--theme-glass-nav-bg', tokens.glassNavBg);
  root.style.setProperty('--theme-glass-nav-border', tokens.glassNavBorder);
  
  root.style.setProperty('--theme-glass-modal-bg', tokens.glassModalBg);
  root.style.setProperty('--theme-glass-modal-border', tokens.glassModalBorder);
  
  root.style.setProperty('--theme-glass-solid-bg', tokens.glassSolidBg);
  root.style.setProperty('--theme-glass-solid-border', tokens.glassSolidBorder);
  
  root.style.setProperty('--theme-glass-input-bg', tokens.glassInputBg);
  root.style.setProperty('--theme-glass-input-border', tokens.glassInputBorder);
  root.style.setProperty('--theme-glass-input-text', tokens.glassInputText);
  root.style.setProperty('--theme-glass-input-placeholder', tokens.glassInputPlaceholder);
  root.style.setProperty('--theme-glass-input-focus-border', tokens.glassInputFocusBorder);
  
  root.style.setProperty('--theme-money-positive', tokens.moneyPositive);
  root.style.setProperty('--theme-money-owed', tokens.moneyOwed);
  root.style.setProperty('--theme-money-neutral', tokens.moneyNeutral);
}

export function isTravelWallpaper(themeId?: string | null): boolean {
  if (!themeId) return false;
  return Boolean(TRAVEL_WALLPAPERS_MAP[themeId]);
}

export const isAnimatedTheme = () => false;

export function searchThemes(query: string, category?: string): ThemeItem[] {
  const cleanQ = query.trim().toLowerCase();
  return THEMES_CATALOG.filter((theme) => {
    const matchesCat = !category || category === 'all' || theme.category === category;
    if (!matchesCat) return false;

    if (!cleanQ) return true;
    return (
      theme.name.toLowerCase().includes(cleanQ) ||
      theme.description.toLowerCase().includes(cleanQ) ||
      theme.category_label.toLowerCase().includes(cleanQ) ||
      theme.tags.some((tag) => tag.toLowerCase().includes(cleanQ))
    );
  });
}
