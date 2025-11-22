// Helper functions for managing intro screen flow

export const hasSeenIntro = (): boolean => {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('nextspot-intro-seen') === 'true';
};

export const markIntroAsSeen = (): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem('nextspot-intro-seen', 'true');
};

export const resetIntroFlow = (): void => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('nextspot-intro-seen');
  localStorage.removeItem('nextspot-visited');
};

export const hasVisitedBefore = (): boolean => {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('nextspot-visited') === 'true';
};

export const markAsVisited = (): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem('nextspot-visited', 'true');
};