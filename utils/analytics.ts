import { generateRequestId } from './request-id';

export interface AnalyticsEvent {
  event: string;
  properties: Record<string, any>;
  timestamp?: number;
}

export interface LandingPageViewEvent {
  event: 'landing_page_view';
  properties: {
    sessionId?: string;
    deviceType: 'mobile' | 'tablet' | 'desktop';
    timestamp: number;
    userAgent: string;
    requestId: string;
  };
}

export interface CtaClickEvent {
  event: 'cta_click';
  properties: {
    sessionId?: string;
    buttonText: string;
    destination: string;
    timestamp: number;
    requestId: string;
  };
}

export interface ConsentInteractionEvent {
  event: 'consent_interaction';
  properties: {
    sessionId?: string;
    action: 'accept' | 'decline';
    timestamp: number;
    requestId: string;
  };
}

export interface PrefsViewEvent {
  event: 'prefs_view';
  properties: {
    sessionId?: string;
    deviceType: 'mobile' | 'tablet' | 'desktop';
    timestamp: number;
    userAgent: string;
    requestId: string;
  };
}

export interface PrefsSubmitEvent {
  event: 'prefs_submit';
  properties: {
    sessionId?: string;
    budgetBand: string;
    moodTags: string[];
    timeWindow: string;
    timestamp: number;
    requestId: string;
  };
}

/**
 * Detect device type based on viewport width and user agent
 */
export function detectDeviceType(): 'mobile' | 'tablet' | 'desktop' {
  if (typeof window === 'undefined') return 'desktop';

  const width = window.innerWidth;
  const userAgent = window.navigator.userAgent.toLowerCase();

  if (width <= 768 || /mobile|android|iphone/i.test(userAgent)) {
    return 'mobile';
  } else if (width <= 1024 || /tablet|ipad/i.test(userAgent)) {
    return 'tablet';
  } else {
    return 'desktop';
  }
}

/**
 * Fire analytics event - placeholder implementation for MVP
 * In production, this would integrate with analytics service
 */
export function fireEvent(event: AnalyticsEvent): void {
  // For development, log to console
  if (process.env.NODE_ENV === 'development') {
    console.log('[Analytics]', event);
  }

  // TODO: Integrate with actual analytics service (PostHog, etc.)
  // For now, just ensure the structure is correct
  if (!event.timestamp) {
    event.timestamp = Date.now();
  }
}

/**
 * Fire landing page view event
 */
export function fireLandingPageView(sessionId?: string): void {
  const event: LandingPageViewEvent = {
    event: 'landing_page_view',
    properties: {
      sessionId,
      deviceType: detectDeviceType(),
      timestamp: Date.now(),
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : '',
      requestId: generateRequestId(),
    },
  };

  fireEvent(event);
}

/**
 * Fire CTA click event
 */
export function fireCtaClick(buttonText: string, destination: string, sessionId?: string): void {
  const event: CtaClickEvent = {
    event: 'cta_click',
    properties: {
      sessionId,
      buttonText,
      destination,
      timestamp: Date.now(),
      requestId: generateRequestId(),
    },
  };

  fireEvent(event);
}

/**
 * Check if user has an active session
 */
export function hasActiveSession(): boolean {
  if (typeof document === 'undefined') return false;

  const cookies = document.cookie.split(';');
  return cookies.some(cookie => {
    const [name] = cookie.trim().split('=');
    return name === 'sid';
  });
}

/**
 * Fire preferences page view event
 */
export function firePrefsView(sessionId?: string): void {
  const event: PrefsViewEvent = {
    event: 'prefs_view',
    properties: {
      sessionId,
      deviceType: detectDeviceType(),
      timestamp: Date.now(),
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : '',
      requestId: generateRequestId(),
    },
  };

  fireEvent(event);
}

/**
 * Fire preferences submit event
 */
export function firePrefsSubmit(
  budgetBand: string,
  moodTags: string[],
  timeWindow: string,
  sessionId?: string
): void {
  const event: PrefsSubmitEvent = {
    event: 'prefs_submit',
    properties: {
      sessionId,
      budgetBand,
      moodTags,
      timeWindow,
      timestamp: Date.now(),
      requestId: generateRequestId(),
    },
  };

  fireEvent(event);
}

/**
 * Create a new anonymous session
 */
export async function createSession(): Promise<string | null> {
  try {
    const response = await fetch('/api/sessions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userAgent: navigator.userAgent,
        deviceType: detectDeviceType(),
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to create session');
    }

    const data = await response.json();
    return data.sessionId;
  } catch (error) {
    console.error('Failed to create session:', error);
    return null;
  }
}