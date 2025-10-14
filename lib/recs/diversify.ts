import { Destination } from '@/data/destinations.seed';

// Define primary categories based on tags
const TAG_CATEGORIES: Record<string, string> = {
  'cultural': 'cultural',
  'foodie': 'food',
  'social': 'entertainment',
  'romantic': 'romantic',
  'adventure': 'adventure',
  'chill': 'relaxation'
};

/**
 * Get the primary category for a destination based on its tags
 */
function getPrimaryCategory(destination: Destination): string {
  // Find the first tag that maps to a category
  for (const tag of destination.tags) {
    if (TAG_CATEGORIES[tag]) {
      return TAG_CATEGORIES[tag];
    }
  }
  // Default category if no tags match
  return 'other';
}

/**
 * Apply category diversity rule: no more than 2 consecutive items from same category
 * This ensures variety in the recommendations while maintaining quality order
 */
export function applyDiversityRule(destinations: Destination[]): Destination[] {
  if (destinations.length <= 2) {
    return destinations;
  }

  const result: Destination[] = [];
  const remaining = [...destinations];

  while (remaining.length > 0 && result.length < 20) { // Cap at 20 to prevent infinite loops
    let selected: Destination | null = null;
    let selectedIndex = -1;

    // If we have less than 2 items, just take the next highest ranked
    if (result.length < 2) {
      selected = remaining[0];
      selectedIndex = 0;
    } else {
      // Check the categories of the last 2 items
      const lastCategory = getPrimaryCategory(result[result.length - 1]);
      const secondLastCategory = getPrimaryCategory(result[result.length - 2]);

      // If last 2 items are from same category, we need to avoid that category
      const avoidCategory = lastCategory === secondLastCategory ? lastCategory : null;

      // Find the first item that doesn't match the avoid category
      for (let i = 0; i < remaining.length; i++) {
        const candidate = remaining[i];
        const candidateCategory = getPrimaryCategory(candidate);

        if (!avoidCategory || candidateCategory !== avoidCategory) {
          selected = candidate;
          selectedIndex = i;
          break;
        }
      }

      // If all remaining items are from the avoided category, just take the next one
      if (!selected && remaining.length > 0) {
        selected = remaining[0];
        selectedIndex = 0;
      }
    }

    if (selected) {
      result.push(selected);
      remaining.splice(selectedIndex, 1);
    } else {
      // Safety break to prevent infinite loop
      break;
    }
  }

  return result;
}

/**
 * Get category distribution for analytics/debugging
 */
export function getCategoryDistribution(destinations: Destination[]): Record<string, number> {
  const distribution: Record<string, number> = {};

  destinations.forEach(destination => {
    const category = getPrimaryCategory(destination);
    distribution[category] = (distribution[category] || 0) + 1;
  });

  return distribution;
}

/**
 * Validate that diversity rule is working correctly
 * Returns array of positions where consecutive same-category violations occur
 */
export function validateDiversityRule(destinations: Destination[]): number[] {
  const violations: number[] = [];

  for (let i = 2; i < destinations.length; i++) {
    const current = getPrimaryCategory(destinations[i]);
    const previous = getPrimaryCategory(destinations[i - 1]);
    const beforePrevious = getPrimaryCategory(destinations[i - 2]);

    if (current === previous && previous === beforePrevious) {
      violations.push(i);
    }
  }

  return violations;
}