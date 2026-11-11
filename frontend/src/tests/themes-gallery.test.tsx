// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import {
  THEMES_CATALOG,
  THEME_CATEGORIES,
  DEFAULT_THEME,
  getThemeById,
  searchThemes,
  isTravelWallpaper,
  FEATURED_THEME,
  TRAVEL_WALLPAPERS_MAP,
} from '../config/themes';
import { ThemeGalleryModal } from '../components/themes/ThemeGalleryModal';
import { ThemeProvider } from '../context/ThemeContext';
import { FeedbackProvider } from '../context/FeedbackContext';

describe('ONNA-GO Impressionist Travel Themes Specification', () => {
  it('contains unique artistic travel themes', () => {
    expect(THEMES_CATALOG.length).toBeGreaterThanOrEqual(13);
    const ids = new Set(THEMES_CATALOG.map((t) => t.id));
    expect(ids.size).toBe(THEMES_CATALOG.length);
  });

  it('verifies the canonical theme IDs including temples and expansion themes', () => {
    const expectedIds = [
      'howrah_bridge',
      'chennai_central',
      'kochi_coast',
      'kanyakumari_statue',
      'chennai_traffic',
      'mumbai_gateway',
      'mumbai_csmt',
      'thanjavur_temple',
      'hampi_heritage',
      'badami_lake',
      'konark_sun_temple',
      'punjab_heritage',
      'konkan_railway',
      'jodhpur_blue_city',
    ];
    const actualIds = THEMES_CATALOG.map((t) => t.id);
    expect(actualIds).toEqual(expectedIds);
  });

  it('ensures every theme has valid non-empty fields and WebP asset paths', () => {
    for (const theme of THEMES_CATALOG) {
      expect(theme.id.trim().length).toBeGreaterThan(0);
      expect(theme.name.trim().length).toBeGreaterThan(0);
      expect(theme.description.trim().length).toBeGreaterThan(10);
      expect(theme.thumbnail_url).toBe(`/themes/thumbnails/${theme.id}.webp`);
      expect(theme.full_url).toBe(`/themes/wallpapers/${theme.id}.webp`);
      expect(Array.isArray(theme.palette)).toBe(true);
      expect(theme.palette.length).toBeGreaterThanOrEqual(3);
      expect(Array.isArray(theme.tags)).toBe(true);
      expect(theme.tags.length).toBeGreaterThan(0);
      expect(['dark', 'light', 'glass']).toContain(theme.overlay_style);
      expect(theme.default_opacity).toBeGreaterThanOrEqual(0.5);
      expect(theme.default_opacity).toBeLessThanOrEqual(0.85);
      expect(theme.is_travel_wallpaper).toBe(true);
    }
  });

  it('verifies that all 13 themes are flagged as static travel wallpapers', () => {
    for (const theme of THEMES_CATALOG) {
      expect(isTravelWallpaper(theme.id)).toBe(true);
      expect(TRAVEL_WALLPAPERS_MAP[theme.id]).toBe(true);
    }
  });

  it('verifies non-existent IDs return false for isTravelWallpaper', () => {
    expect(isTravelWallpaper('default')).toBe(false);
    expect(isTravelWallpaper('abstract_cosmic_neon')).toBe(false);
    expect(isTravelWallpaper(null)).toBe(false);
  });

  it('filters by category accurately', () => {
    const kolkata = searchThemes('', 'kolkata');
    expect(kolkata).toHaveLength(1);
    expect(kolkata[0].id).toBe('howrah_bridge');

    const chennai = searchThemes('', 'chennai');
    expect(chennai).toHaveLength(2);
    expect(chennai.map((t) => t.id)).toEqual(['chennai_central', 'chennai_traffic']);

    const mumbai = searchThemes('', 'mumbai');
    expect(mumbai).toHaveLength(2);
    expect(mumbai.map((t) => t.id)).toEqual(['mumbai_gateway', 'mumbai_csmt']);

    const all = searchThemes('', 'all');
    expect(all).toHaveLength(14);

    const rajasthan = searchThemes('', 'rajasthan');
    expect(rajasthan).toHaveLength(1);
    expect(rajasthan[0].id).toBe('jodhpur_blue_city');
  });

  it('searches case-insensitively across name, category, and keywords', () => {
    const howrahResults = searchThemes('howrah');
    expect(howrahResults).toHaveLength(1);
    expect(howrahResults[0].id).toBe('howrah_bridge');

    const chennaiResults = searchThemes('chennai');
    expect(chennaiResults.length).toBeGreaterThanOrEqual(2);

    const gatewayResults = searchThemes('gateway');
    expect(gatewayResults).toHaveLength(1);
    expect(gatewayResults[0].id).toBe('mumbai_gateway');

    const csmtResults = searchThemes('csmt');
    expect(csmtResults).toHaveLength(1);
    expect(csmtResults[0].id).toBe('mumbai_csmt');

    const hampiResults = searchThemes('hampi');
    expect(hampiResults).toHaveLength(1);
    expect(hampiResults[0].id).toBe('hampi_heritage');

    const noResults = searchThemes('nonexistent_journey_xyz_123');
    expect(noResults).toHaveLength(0);
  });

  it('safely handles unknown and legacy theme IDs with fallback', () => {
    const fallback = getThemeById('non_existent_id');
    expect(fallback.id).toBe(DEFAULT_THEME.id);
    expect(fallback.id).toBe('howrah_bridge');

    // Legacy ID mapping
    expect(getThemeById('city_howrah_bridge').id).toBe('howrah_bridge');
    expect(getThemeById('train_chennai_central').id).toBe('chennai_central');
    expect(getThemeById('nature_beachside_escape').id).toBe('kochi_coast');
  });
});

describe('ThemeGalleryModal UI Component', () => {
  beforeEach(() => {
    localStorage.clear();
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  afterEach(() => {
    cleanup();
  });

  const renderModal = (isOpen = true, onClose = vi.fn()) => {
    return render(
      <FeedbackProvider>
        <ThemeProvider>
          <ThemeGalleryModal isOpen={isOpen} onClose={onClose} />
        </ThemeProvider>
      </FeedbackProvider>
    );
  };

  it('does not render when isOpen is false', () => {
    const { container } = renderModal(false);
    expect(container.firstChild).toBeNull();
  });

  it('renders gallery header, title, search input, and category tabs', () => {
    renderModal(true);

    expect(screen.getByText('Your World')).toBeTruthy();
    expect(screen.getByText(/Choose the static travel wallpaper/i)).toBeTruthy();

    const searchInput = screen.getByPlaceholderText(/Search wallpapers/i);
    expect(searchInput).toBeTruthy();

    // Check category tabs
    expect(screen.getByRole('button', { name: /All Themes/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Chennai' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Mumbai' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Kochi' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Kanyakumari' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Rajasthan' })).toBeTruthy();
  });

  it('renders the featured Howrah Bridge card and the 13 themes', () => {
    renderModal(true);
    expect(screen.getByText('Featured Travel Wallpaper')).toBeTruthy();
    expect(screen.getAllByText(/Howrah Bridge/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Chennai Central/i)).toBeTruthy();
    expect(screen.getByText(/Kochi — Natural Coastal/i)).toBeTruthy();
    expect(screen.getByText(/Kanyakumari — Thiruvalluvar/i)).toBeTruthy();
    expect(screen.getByText(/Chennai Traffic/i)).toBeTruthy();
    expect(screen.getByText(/Mumbai — Gateway of India/i)).toBeTruthy();
    expect(screen.getByText(/Mumbai — Chhatrapati Shivaji Maharaj Terminus/i)).toBeTruthy();
    expect(screen.getByText(/Thanjavur — Brihadeeswarar/i)).toBeTruthy();
    expect(screen.getByText(/Hampi — Historic Heritage/i)).toBeTruthy();
    expect(screen.getByText(/Badami — Agastya Lake/i)).toBeTruthy();
    expect(screen.getByText(/Odisha — Konark Sun Temple/i)).toBeTruthy();
    expect(screen.getByText(/Punjab — Turban and Ceremonial Kirpan/i)).toBeTruthy();
    expect(screen.getByText(/Konkan Railway — Coastal Train/i)).toBeTruthy();
  });

  it('filters gallery when clicking category tab', async () => {
    renderModal(true);
    const kochiTab = screen.getByRole('button', { name: 'Kochi' });
    fireEvent.click(kochiTab);

    await waitFor(() => {
      expect(screen.getByText(/Kochi — Natural Coastal/i)).toBeTruthy();
      expect(screen.queryByText(/Chennai Central/i)).toBeNull();
    });
  });

  it('filters gallery themes when typing into search input', async () => {
    renderModal(true);
    const searchInput = screen.getByPlaceholderText(/Search wallpapers/i);

    fireEvent.change(searchInput, { target: { value: 'Thiruvalluvar' } });

    await waitFor(() => {
      expect(screen.getByText(/Kanyakumari — Thiruvalluvar/i)).toBeTruthy();
      expect(screen.queryByText(/Chennai Central/i)).toBeNull();
    });
  });

  it('shows empty search results state when query does not match', async () => {
    renderModal(true);
    const searchInput = screen.getByPlaceholderText(/Search wallpapers/i);

    fireEvent.change(searchInput, { target: { value: 'xyz_invalid_nothing' } });

    await waitFor(() => {
      expect(screen.getByText('No matching wallpapers found')).toBeTruthy();
      expect(screen.getByRole('button', { name: /Clear Filters/i })).toBeTruthy();
    });

    // Clicking clear filters resets query
    fireEvent.click(screen.getByRole('button', { name: /Clear Filters/i }));
    await waitFor(() => {
      expect(screen.queryByText('No matching wallpapers found')).toBeNull();
    });
  });

  it('opens static preview drawer without animation controls when clicking a theme card', async () => {
    renderModal(true);

    // Click on Chennai Central theme card
    const chennaiCard = screen.getByText(/Chennai Central — Exterior View/i);
    fireEvent.click(chennaiCard);

    // Preview drawer should now appear
    await waitFor(() => {
      expect(screen.getByText('Wallpaper Preview')).toBeTruthy();
      expect(screen.getByRole('button', { name: /Apply Wallpaper/i })).toBeTruthy();
      expect(screen.getByRole('button', { name: /Cancel/i })).toBeTruthy();
      // Verify no animated controls exist
      expect(screen.queryByText('Living Scene')).toBeNull();
      expect(screen.queryByText('Paused')).toBeNull();
    });

    // Clicking cancel closes the preview drawer
    fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));
    await waitFor(() => {
      expect(screen.queryByText('Wallpaper Preview')).toBeNull();
    });
  });

  it('applies theme and updates active theme preference in localStorage', async () => {
    renderModal(true);

    const themeCard = screen.getByText(/Chennai Central — Exterior View/i);
    fireEvent.click(themeCard);

    const applyButton = await screen.findByRole('button', { name: /Apply Wallpaper/i });
    fireEvent.click(applyButton);

    await waitFor(() => {
      const saved = localStorage.getItem('onnago_wallpaper_theme');
      expect(saved).not.toBeNull();
      const parsed = JSON.parse(saved!);
      expect(parsed.themeId).toBe('chennai_central');
    });
  });

  it('calls onClose when clicking back arrow', () => {
    const handleClose = vi.fn();
    renderModal(true, handleClose);

    const backButton = screen.getAllByRole('button', { name: 'Back' })[0];
    fireEvent.click(backButton);
    expect(handleClose).toHaveBeenCalled();
  });
});
