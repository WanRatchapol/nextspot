import { Destination } from '@/data/destinations.seed';

export interface PreferencesFilter {
  budgetBand: 'low' | 'mid' | 'high';
  moodTags: string[];
  timeWindow: 'evening' | 'halfday' | 'fullday';
}

// Map timeWindow preferences to compatible destination timeWindows
const TIME_WINDOW_MAPPING: Record<string, string[]> = {
  'evening': ['evening', 'halfday'], // Evening prefs can include halfday activities
  'halfday': ['halfday', 'evening'], // Halfday prefs can include evening activities
  'fullday': ['fullday', 'halfday']  // Fullday prefs can include halfday activities
};

/**
 * Filter destinations based on user preferences
 */
export function filterDestinations(
  destinations: Destination[],
  preferences: PreferencesFilter
): Destination[] {
  const { budgetBand, moodTags, timeWindow } = preferences;

  // Get compatible time windows
  const compatibleTimeWindows = TIME_WINDOW_MAPPING[timeWindow] || [timeWindow];

  return destinations.filter(destination => {
    // Budget band must match exactly
    if (destination.budgetBand !== budgetBand) {
      return false;
    }

    // Time window must be compatible
    if (!compatibleTimeWindows.includes(destination.timeWindow)) {
      return false;
    }

    // Must have at least one matching mood tag
    const hasMatchingMood = destination.tags.some(tag => moodTags.includes(tag));
    if (!hasMatchingMood) {
      return false;
    }

    return true;
  });
}

/**
 * Sort destinations by popularity score (descending)
 */
export function sortByPopularity(destinations: Destination[]): Destination[] {
  return [...destinations].sort((a, b) => b.popularityScore - a.popularityScore);
}

/**
 * Get filter match metrics for logging
 */
export function getFilterMetrics(
  allDestinations: Destination[],
  filteredDestinations: Destination[],
  preferences: PreferencesFilter
) {
  const budgetMatches = allDestinations.filter(d => d.budgetBand === preferences.budgetBand).length;
  const timeMatches = allDestinations.filter(d => {
    const compatibleTimeWindows = TIME_WINDOW_MAPPING[preferences.timeWindow] || [preferences.timeWindow];
    return compatibleTimeWindows.includes(d.timeWindow);
  }).length;
  const moodMatches = allDestinations.filter(d =>
    d.tags.some(tag => preferences.moodTags.includes(tag))
  ).length;

  return {
    total: allDestinations.length,
    filtered: filteredDestinations.length,
    budgetMatches,
    timeMatches,
    moodMatches,
    preferences: {
      budgetBand: preferences.budgetBand,
      moodTags: preferences.moodTags,
      timeWindow: preferences.timeWindow
    }
  };
}