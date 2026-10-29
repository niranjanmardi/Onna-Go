import { Trip } from '@/types';

export type AddExpenseRouteAction =
  | { type: 'CURRENT_TRIP'; tripId: string }
  | { type: 'SHOW_CREATE_FIRST_TRIP_SHEET' }
  | { type: 'NAVIGATE_TO_TRIP'; tripId: string; url: string }
  | { type: 'SHOW_TRIP_PICKER'; trips: Trip[] };

/**
 * Determines the add-expense behavior based on current route and available active trips.
 * Rules:
 * 1. On a trip page (/trips/:id): add an expense to this current trip.
 * 2. Elsewhere with 0 active trips: show 'Create a trip to start adding expenses' sheet.
 * 3. Elsewhere with 1 active trip: navigate to that trip with ?action=add-expense.
 * 4. Elsewhere with several active trips: show trip picker (most recently used first).
 */
export function determineAddExpenseAction(
  pathname: string,
  trips: Trip[]
): AddExpenseRouteAction {
  // Check if currently on a specific trip detail page
  const tripMatch = pathname.match(/^\/trips\/([a-zA-Z0-9_-]+)$/);
  if (tripMatch) {
    const routeId = tripMatch[1];
    // Exclude special sub-routes
    if (routeId !== 'new' && routeId !== 'join' && routeId !== 'history') {
      return { type: 'CURRENT_TRIP', tripId: routeId };
    }
  }

  // Filter for active (non-completed, non-archived) trips
  const activeTrips = trips.filter(
    (t) => !t.is_archived && !t.completed_at && t.status !== 'COMPLETED' && t.status !== 'CANCELLED'
  );

  // Sort by most recently updated / created
  const sortedTrips = [...activeTrips].sort((a, b) => {
    const timeA = new Date(a.updated_at || a.created_at || 0).getTime();
    const timeB = new Date(b.updated_at || b.created_at || 0).getTime();
    return timeB - timeA;
  });

  if (sortedTrips.length === 0) {
    return { type: 'SHOW_CREATE_FIRST_TRIP_SHEET' };
  }

  if (sortedTrips.length === 1) {
    const singleTrip = sortedTrips[0];
    return {
      type: 'NAVIGATE_TO_TRIP',
      tripId: singleTrip.id,
      url: `/trips/${singleTrip.id}?action=add-expense`,
    };
  }

  return {
    type: 'SHOW_TRIP_PICKER',
    trips: sortedTrips,
  };
}

/**
 * Suggests a category based on the expense description text.
 */
export function suggestCategoryFromTitle(title: string): string | null {
  const lower = title.toLowerCase().trim();
  if (!lower) return null;

  // Fuel / Petrol
  if (/\b(petrol|diesel|fuel|gas|cng|shell|hp|ioc|bpcl|petrol bunk|fuel pump)\b/.test(lower)) {
    return 'Petrol / Fuel';
  }

  // Food / Dining
  if (
    /\b(dhaba|dinner|lunch|breakfast|food|cafe|coffee|tea|snack|snacks|restaurant|swiggy|zomato|biryani|pizza|burger|drinks|bar|pub|meal|meals|juice|chai|bakery)\b/.test(
      lower
    )
  ) {
    return 'Food';
  }

  // Transport / Toll
  if (
    /\b(toll|fastag|cab|uber|ola|auto|taxi|train|bus|flight|parking|metro|driver|fare|ticket bus|railway)\b/.test(
      lower
    )
  ) {
    return 'Transport';
  }

  // Accommodation
  if (/\b(hotel|resort|airbnb|stay|room|lodge|hostel|villa|homestay|cottage|camp|tent)\b/.test(lower)) {
    return 'Accommodation';
  }

  // Activities
  if (/\b(entry|ticket|tickets|safari|trek|trekking|museum|boating|scuba|kayak|rafting|park|sightseeing|show)\b/.test(lower)) {
    return 'Activities';
  }

  // Shopping
  if (/\b(mall|souvenir|souvenirs|clothes|market|groceries|supermarket|mart|shopping|gift|gifts)\b/.test(lower)) {
    return 'Shopping';
  }

  return null;
}
