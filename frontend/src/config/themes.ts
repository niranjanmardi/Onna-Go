// ONNA-GO EXACTLY 13 PREMIUM STATIC TRAVEL ARTWORK THEMES
// Master Impressionist Oil Painting Series
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
  | 'western_ghats';

export interface ThemeCategoryInfo {
  id: ThemeCategory;
  label: string;
}

export const THEME_CATEGORIES: ThemeCategoryInfo[] = [
  { id: 'all', label: 'All Themes (13)' },
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
  },
  {
    id: 'punjab_heritage',
    name: 'Punjab — Turban and Ceremonial Kirpan at Sunrise',
    category: 'punjab',
    category_label: 'Punjab',
    description: 'Dignified cultural composition of a Punjabi Sikh figure in royal blue dastar holding a ceremonial kirpan before a radiant sarovar and golden sunrise.',
    palette: ['#1E3A8A', '#1D4ED8', '#B45309', '#F59E0B', '#FEF08A'],
    tags: ['punjab', 'turban', 'dastar', 'kirpan', 'sarovar', 'amritsar', 'golden temple', 'sunrise', 'heritage', 'oil painting', 'impressionist'],
    thumbnail_url: '/themes/thumbnails/punjab_heritage.webp',
    full_url: '/themes/wallpapers/punjab_heritage.webp',
    overlay_style: 'dark',
    default_opacity: 0.65,
    is_travel_wallpaper: true,
  },
  {
    id: 'konkan_railway',
    name: 'Konkan Railway — Coastal Train Journey',
    category: 'western_ghats',
    category_label: 'Western Ghats',
    description: 'Scenic passenger train crossing a soaring curved viaduct over lush tropical valleys, coconut groves, and mist-crowned Western Ghats hills.',
    palette: ['#064E3B', '#047857', '#0284C7', '#F59E0B', '#10B981'],
    tags: ['konkan', 'railway', 'train', 'viaduct', 'bridge', 'western ghats', 'monsoon', 'hills', 'journey', 'oil painting', 'impressionist'],
    thumbnail_url: '/themes/thumbnails/konkan_railway.webp',
    full_url: '/themes/wallpapers/konkan_railway.webp',
    overlay_style: 'dark',
    default_opacity: 0.68,
    is_travel_wallpaper: true,
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
};

export function getThemeById(id?: string | null): ThemeItem {
  if (!id) return DEFAULT_THEME;
  // Support legacy IDs gracefully by mapping to the new themes
  if (id === 'default' || id === 'city_howrah_bridge') return THEMES_CATALOG[0];
  if (id === 'train_chennai_central') return THEMES_CATALOG[1];
  if (id === 'nature_beachside_escape') return THEMES_CATALOG[2];
  if (id === 'nature_western_ghats' || id === 'nature_ooty_morning') return THEMES_CATALOG[3];
  if (id === 'city_chennai_rain' || id === 'car_night_drive') return THEMES_CATALOG[4];
  return THEMES_CATALOG.find((t) => t.id === id) || DEFAULT_THEME;
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
