import { describe, it, expect } from 'vitest';
import {
  determineAddExpenseAction,
  suggestCategoryFromTitle,
} from '../lib/add-expense-coordinator';
import { Trip } from '@/types';

const mockTrip = (id: string, name: string, updatedAt: string, isArchived = false, completedAt: string | null = null): Trip => ({
  id,
  name,
  description: '',
  destination: 'Goa',
  currency: 'INR',
  invite_code: `CODE_${id}`,
  is_archived: isArchived,
  completed_at: completedAt,
  created_by_id: 'user_1',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: updatedAt,
  members_count: 2,
  total_expenses_paise: 100000,
  expenses_count: 3,
});

describe('Add Expense Routing Logic', () => {
  it('opens add-expense for current trip when on a trip detail page', () => {
    const trips = [mockTrip('trip-1', 'Goa Trip', '2026-01-02T10:00:00Z')];
    const action = determineAddExpenseAction('/trips/trip-1', trips);
    expect(action).toEqual({
      type: 'CURRENT_TRIP',
      tripId: 'trip-1',
    });
  });

  it('does not treat special routes like /trips/new or /trips/join as a trip detail page', () => {
    const trips = [mockTrip('trip-1', 'Goa Trip', '2026-01-02T10:00:00Z')];
    const actionNew = determineAddExpenseAction('/trips/new', trips);
    expect(actionNew.type).toBe('NAVIGATE_TO_TRIP');

    const actionJoin = determineAddExpenseAction('/trips/join', trips);
    expect(actionJoin.type).toBe('NAVIGATE_TO_TRIP');
  });

  it('shows create-your-first-trip sheet when user has 0 active trips', () => {
    const action = determineAddExpenseAction('/dashboard', []);
    expect(action).toEqual({
      type: 'SHOW_CREATE_FIRST_TRIP_SHEET',
    });
  });

  it('shows create-your-first-trip sheet when all trips are archived or completed', () => {
    const trips = [
      mockTrip('trip-old', 'Completed Trip', '2026-01-01T00:00:00Z', true, '2026-01-02T00:00:00Z'),
    ];
    const action = determineAddExpenseAction('/dashboard', trips);
    expect(action).toEqual({
      type: 'SHOW_CREATE_FIRST_TRIP_SHEET',
    });
  });

  it('navigates to the single active trip with action=add-expense when exactly 1 active trip exists', () => {
    const trips = [mockTrip('trip-solo', 'Ooty Ride', '2026-02-01T12:00:00Z')];
    const action = determineAddExpenseAction('/dashboard', trips);
    expect(action).toEqual({
      type: 'NAVIGATE_TO_TRIP',
      tripId: 'trip-solo',
      url: '/trips/trip-solo?action=add-expense',
    });
  });

  it('shows trip picker sorted by most recently updated first when several active trips exist', () => {
    const tripOlder = mockTrip('trip-older', 'Older Trip', '2026-01-10T10:00:00Z');
    const tripNewest = mockTrip('trip-newest', 'Newest Trip', '2026-02-15T10:00:00Z');
    const tripMiddle = mockTrip('trip-middle', 'Middle Trip', '2026-02-01T10:00:00Z');

    const action = determineAddExpenseAction('/dashboard', [tripOlder, tripNewest, tripMiddle]);
    expect(action.type).toBe('SHOW_TRIP_PICKER');
    if (action.type === 'SHOW_TRIP_PICKER') {
      expect(action.trips.map((t) => t.id)).toEqual(['trip-newest', 'trip-middle', 'trip-older']);
    }
  });
});

describe('Smart Category Suggestion from Title', () => {
  it('suggests Petrol / Fuel for petrol keywords', () => {
    expect(suggestCategoryFromTitle('Petrol refill at Shell')).toBe('Petrol / Fuel');
    expect(suggestCategoryFromTitle('Highway diesel pump')).toBe('Petrol / Fuel');
    expect(suggestCategoryFromTitle('CNG filling')).toBe('Petrol / Fuel');
  });

  it('suggests Food for food and dining keywords', () => {
    expect(suggestCategoryFromTitle('Dinner at Highway Dhaba')).toBe('Food');
    expect(suggestCategoryFromTitle('Morning coffee & snacks')).toBe('Food');
    expect(suggestCategoryFromTitle('Biryani lunch')).toBe('Food');
  });

  it('suggests Transport for transit and toll keywords', () => {
    expect(suggestCategoryFromTitle('Toll gate fastag recharge')).toBe('Transport');
    expect(suggestCategoryFromTitle('Uber ride to airport')).toBe('Transport');
  });

  it('suggests Accommodation for stays and hotels', () => {
    expect(suggestCategoryFromTitle('Resort stay booking')).toBe('Accommodation');
    expect(suggestCategoryFromTitle('Airbnb villa deposit')).toBe('Accommodation');
  });

  it('returns null for unclassified titles', () => {
    expect(suggestCategoryFromTitle('Random item')).toBeNull();
  });
});
