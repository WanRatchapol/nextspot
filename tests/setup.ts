import { vi } from 'vitest';
import '@testing-library/jest-dom';

// Mock console methods during tests
global.console = {
  ...console,
  warn: vi.fn(),
  error: vi.fn(),
};

// Mock window.location
Object.defineProperty(window, 'location', {
  value: {
    href: 'http://localhost:3000',
    pathname: '/',
    search: '',
    hash: '',
  },
  writable: true,
});

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  disconnect: vi.fn(),
  unobserve: vi.fn(),
  root: null,
  rootMargin: '0px',
  thresholds: [0],
  takeRecords: vi.fn(() => []),
}));